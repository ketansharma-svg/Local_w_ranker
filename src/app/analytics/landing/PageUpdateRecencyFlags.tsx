"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  // Header / actions
  Flag,
  Info,
  Download,
  RefreshCw,
  RotateCcw,
  // Filters & table controls
  Search as SearchIcon,
  Columns3,
  Lock,
  // Pagination icons
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  // Sort glyphs
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  // Row actions
  ClipboardList,
  ExternalLink,
  Search as AnalyzerIcon,
  X,
} from "lucide-react";
import DemoDrawerHeaderPage from "./drawer/DemoDrawerHeaderPage";
/**
 * Wranker · Analytics · Tab 3 → Section 3.6: Page Update Recency Flags
 *
 * Refinements implemented per spec:
 *  - Inter / Inter Fallback font stack
 *  - No emojis (all replaced with lucide icons / color dots)
 *  - Branded (#008CCD) icons for section title & action types
 *  - Pointer cursor on all clickable elements
 *  - Modular chips and segmented toggles (same pattern as recent tables)
 *  - Single Export button with dropdown (CSV free, XLSX/PDF locked)
 *  - Bulk action bar appears just above the first selected row and remains sticky on scroll
 *  - Table follows the same pattern as recent tables (sticky header, left‑aligned, sticky first column)
 *  - Actions column uses icon-only branded icons (no borders)
 */

type Status = "Fresh" | "Aging" | "Stale" | "Unknown";

type ColumnKey =
  | "select"
  | "url"
  | "sessions"
  | "lastUpdated"
  | "status"
  | "lastActivity"
  | "actions";

type SortDir = "asc" | "desc" | null;

export type RecencyRow = {
  id: string;
  url: string;
  title?: string;
  sessions?: number; // GA4 context (optional)
  lastUpdated?: string; // ISO; from CMS/Crawler/Meta
  lastUpdatedSource?: "CMS" | "Crawler" | "Meta";
  lastActivity?: string; // ISO; GA4 most recent session timestamp (optional)
  cmsEditorUrl?: string; // editor deeplink
};

const TK = {
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

const HEADER_META: Record<ColumnKey, { label: string; tooltip?: string }> = {
  select: { label: "" },
  url: { label: "Page URL / Title", tooltip: "Open Page Analyzer" },
  sessions: { label: "Sessions", tooltip: "GA4 sessions for context" },
  lastUpdated: { label: "Last Updated", tooltip: "Exact timestamp via tooltip" },
  status: { label: "Recency Status", tooltip: "Fresh ≤30d · Aging 31–90d · Stale >90d · Unknown" },
  lastActivity: { label: "Last GA4 Activity", tooltip: "Most recent session for the page" },
  actions: { label: "Actions", tooltip: "Analyzer · Create Task · Open in Editor" },
};

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  select: true,
  url: true,
  sessions: true,
  lastUpdated: true,
  status: true,
  lastActivity: true,
  actions: true,
};

/* ------------------------------- Utilities ------------------------------- */

const nf = new Intl.NumberFormat("en-US");

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
function timeAgo(iso?: string): string {
  const d = daysSince(iso);
  if (d === null) return "Unknown";
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}
function tooltipAbs(label: string, iso?: string, source?: string) {
  if (!iso) return `${label}: Unknown`;
  const dt = new Date(iso);
  return `${label}: ${dt.toLocaleString()}${source ? ` · Source: ${source}` : ""}`;
}

function classifyStatus(iso?: string): {
  status: Status;
  badgeClass: string;
  dotColor: string;
  severity: number; // Stale 3 > Aging 2 > Fresh 1 > Unknown 0
} {
  const d = daysSince(iso);
  if (d === null) {
    return { status: "Unknown", badgeClass: "bg-gray-200 text-gray-700", dotColor: "#9CA3AF", severity: 0 };
  }
  if (d <= 30) {
    return { status: "Fresh", badgeClass: "bg-emerald-100 text-emerald-700", dotColor: TK.success, severity: 1 };
  }
  if (d <= 90) {
    return { status: "Aging", badgeClass: "bg-amber-100 text-amber-700", dotColor: TK.warning, severity: 2 };
  }
  return { status: "Stale", badgeClass: "bg-red-100 text-red-700", dotColor: TK.danger, severity: 3 };
}

function mockRecencyRows(count = 56): RecencyRow[] {
  const urls = [
    "/seo-guide-2023",
    "/blog/google-ranking-factors",
    "/features/page-analyzer",
    "/pricing",
    "/about",
    "/case-studies/saas-growth",
    "/blog/technical-seo-checklist",
    "/landing/ebook-seo",
    "/services/seo-audit",
  ];
  const titles = [
    "SEO Guide 2023",
    "Google Ranking Factors",
    "Page Analyzer",
    "Pricing",
    "About Us",
    "SaaS Growth Case Study",
    "Technical SEO Checklist",
    "SEO eBook Landing",
    "SEO Audit Services",
  ];
  const rows: RecencyRow[] = [];
  for (let i = 0; i < count; i++) {
    const k = i % urls.length;
    const sess = 100 + Math.floor(Math.random() * 16000);
    const updDays = Math.random() < 0.1 ? null : Math.floor(Math.random() * 360); // 10% unknown
    const lastUpdated = updDays === null ? undefined : new Date(Date.now() - updDays * 86400000).toISOString();
    const lastActivityDays = Math.random() < 0.2 ? null : Math.floor(Math.random() * 45);
    const lastActivity = lastActivityDays === null ? undefined : new Date(Date.now() - lastActivityDays * 86400000).toISOString();
    const src = Math.random() < 0.6 ? "CMS" : Math.random() < 0.5 ? "Crawler" : "Meta";
    rows.push({
      id: `row_${i}`,
      url: urls[k],
      title: titles[k],
      sessions: sess,
      lastUpdated,
      lastUpdatedSource: lastUpdated ? (src as RecencyRow["lastUpdatedSource"]) : undefined,
      lastActivity,
      cmsEditorUrl: Math.random() < 0.4 ? `https://cms.example.com/edit${urls[k]}` : undefined,
    });
  }
  // deterministic example
  rows[0] = {
    id: "row_example",
    url: "/seo-guide-2023",
    title: "SEO Guide 2023",
    sessions: 8210,
    lastUpdated: new Date(Date.now() - 120 * 86400000).toISOString(),
    lastUpdatedSource: "CMS",
    lastActivity: new Date(Date.now() - 3 * 86400000).toISOString(),
    cmsEditorUrl: "https://cms.example.com/edit/seo-guide-2023",
  };
  return rows;
}

function exportRowsToCSV(filename: string, cols: ColumnKey[], rows: RecencyRow[]) {
  const headers = cols.filter((c) => c !== "select" && c !== "actions").map((c) => HEADER_META[c].label);
  const mapCell = (r: RecencyRow, c: ColumnKey) => {
    switch (c) {
      case "url":
        return r.url + (r.title ? ` (${r.title})` : "");
      case "sessions":
        return r.sessions ?? "";
      case "lastUpdated":
        return r.lastUpdated ? new Date(r.lastUpdated).toISOString() : "";
      case "status":
        return classifyStatus(r.lastUpdated).status;
      case "lastActivity":
        return r.lastActivity ? new Date(r.lastActivity).toISOString() : "";
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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* -------------------------------- Component ------------------------------- */

export default function PageUpdateRecencyFlags({ rows: initial }: { rows?: RecencyRow[] }) {
  const [rows, setRows] = useState<RecencyRow[]>(() => initial ?? mockRecencyRows(56));
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const ALL_STATUSES: Status[] = ["Fresh", "Aging", "Stale", "Unknown"];
  const [query, setQuery] = useState("");
  const [statusSet, setStatusSet] = useState<Set<Status>>(new Set(ALL_STATUSES));
  const [updatedWithin, setUpdatedWithin] = useState<"all" | "30" | "90" | "180" | "365">("all");
  const [onlyStale, setOnlyStale] = useState(false);

  // Columns
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({ ...DEFAULT_VISIBLE });

  // Sorting
  const [sortKey, setSortKey] = useState<ColumnKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Mode / Pagination
  const [mode, setMode] = useState<"pagination" | "infinite">("pagination");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [infiniteCount, setInfiniteCount] = useState(20);

  // Selection & Drawer
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerRow, setDrawerRow] = useState<RecencyRow | null>(null);
  const [drawerRoww, setDrawerRoww] = useState(false);
  // Export dropdown
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

  // Scroll / sticky header height (for bulk bar offset)
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

  // Infinite scroll
  useEffect(() => {
    if (mode !== "infinite") return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        setInfiniteCount((n) => Math.min(n + 20, filteredSorted.length));
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  });

  // Derived rows (filters + sorting)
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const inUpdatedWindow = (r: RecencyRow) => {
      if (updatedWithin === "all") return true;
      const d = daysSince(r.lastUpdated);
      if (d === null) return false;
      return d <= parseInt(updatedWithin, 10);
    };

    let out = rows.filter((r) => {
      const matchQ =
        !q ||
        r.url.toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        r.url.replace(/^https?:\/\//, "").toLowerCase().includes(q);

      const cls = classifyStatus(r.lastUpdated).status;
      const matchStatus = onlyStale ? cls === "Stale" : statusSet.has(cls);

      return matchQ && matchStatus && inUpdatedWindow(r);
    });

    const toNum = (r: RecencyRow, key: ColumnKey): number => {
      switch (key) {
        case "sessions":
          return r.sessions ?? -Infinity;
        case "lastUpdated": {
          const t = r.lastUpdated ? Date.parse(r.lastUpdated) : NaN;
          return isNaN(t) ? -Infinity : t;
        }
        case "lastActivity": {
          const t = r.lastActivity ? Date.parse(r.lastActivity) : NaN;
          return isNaN(t) ? -Infinity : t;
        }
        case "status":
          return classifyStatus(r.lastUpdated).severity;
        default:
          return 0;
      }
    };

    if (sortDir) {
      out = [...out].sort((a, b) => {
        let A = toNum(a, sortKey);
        let B = toNum(b, sortKey);

        // status tie-breaker: oldest first
        if (sortKey === "status" && A === B) {
          const ta = a.lastUpdated ? Date.parse(a.lastUpdated) : Infinity;
          const tb = b.lastUpdated ? Date.parse(b.lastUpdated) : Infinity;
          return sortDir === "asc" ? ta - tb : tb - ta;
        }

        // handle unknowns for timestamp sorts
        if ((sortKey === "lastUpdated" || sortKey === "lastActivity") && (A === -Infinity || B === -Infinity)) {
          if (A === -Infinity && B !== -Infinity) return 1;
          if (B === -Infinity && A !== -Infinity) return -1;
          return 0;
        }

        return sortDir === "asc" ? A - B : B - A;
      });
    }

    return out;
  }, [rows, query, statusSet, updatedWithin, onlyStale, sortKey, sortDir]);

  const visibleColumns = useMemo(
    () => (Object.keys(visible) as ColumnKey[]).filter((k) => visible[k]),
    [visible],
  );

  const pagedRows = useMemo(() => {
    if (mode === "infinite") return filteredSorted.slice(0, infiniteCount);
    const start = page * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, mode, infiniteCount, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));

  // Selection helpers
  const allOnPageSelected = pagedRows.length > 0 && pagedRows.every((r) => selected.has(r.id));
  const someOnPageSelected = pagedRows.some((r) => selected.has(r.id)) && !allOnPageSelected;
  const toggleAllOnPage = (checked: boolean) => {
    const copy = new Set(selected);
    pagedRows.forEach((r) => (checked ? copy.add(r.id) : copy.delete(r.id)));
    setSelected(copy);
  };
  const toggleRow = (id: string, checked: boolean) => {
    const copy = new Set(selected);
    if (checked) copy.add(id);
    else copy.delete(id);
    setSelected(copy);
  };

  const toggleSort = (k: ColumnKey) => {
    if (k === "select" || k === "actions" || k === "url") return;
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir(k === "status" ? "desc" : "asc");
    } else {
      setSortDir(sortDir === "desc" ? "asc" : sortDir === "asc" ? null : k === "status" ? "desc" : "asc");
    }
  };

  const resetAll = () => {
    setQuery("");
    setStatusSet(new Set(ALL_STATUSES));
    setUpdatedWithin("all");
    setOnlyStale(false);
    setSortKey("status");
    setSortDir("desc");
    setPage(0);
    setInfiniteCount(20);
    setVisible({ ...DEFAULT_VISIBLE });
    setSelected(new Set());
  };

  const refreshDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      setRows(mockRecencyRows(56));
      setIsLoading(false);
    }, 450);
  };

  const unknownRatio =
    rows.length === 0 ? 0 : rows.filter((r) => classifyStatus(r.lastUpdated).status === "Unknown").length / rows.length;

  // Bulk bar positioning
  const firstSelectedIdx = pagedRows.findIndex((r) => selected.has(r.id));
  const colCount = visibleColumns.length;

  const openDrawer = () => {
    setDrawerRoww(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRoww(false);
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


  /* -------------------------------- Render -------------------------------- */

  return (
    <section
      className=" "
      style={{
        fontFamily:
          "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
        ["--wr-brand" as any]: TK.brand,
        ["--wr-value-blue" as any]: TK.valueBlue,
        ["--wr-pastel-blue" as any]: TK.pastelBlue,
        ["--wr-text" as any]: TK.text,
        ["--wr-muted" as any]: TK.muted,
        ["--wr-border" as any]: TK.border,
        ["--wr-borderLight" as any]: TK.borderLight,
        ["--wr-success" as any]: TK.success,
        ["--wr-warning" as any]: TK.warning,
        ["--wr-danger" as any]: TK.danger,
        ["--wr-card-bg" as any]: TK.cardBg,
        ["--wr-radius" as any]: TK.radius,
      }}
    >
                                                  {drawerRoww && (
                                                            <Drawer title="Drawer" onClose={closeDrawer}>
                                                              <DemoDrawerHeaderPage   />
                                                            </Drawer>
                                                          )}
      <div className="rounded-[var(--wr-radius)] border bg-[var(--wr-card-bg)]" style={{ borderColor: "var(--wr-border)" }}>
        {/* Header */}
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4" color={TK.brand} />
            <div className="text-lg font-semibold">Page Update Recency Flags</div>
            <Info className="h-4 w-4 text-gray-500" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode segmented */}
            <div className="flex items-center overflow-hidden rounded-md border" style={{ borderColor: "var(--wr-border)" }}>
              <button
                onClick={() => setMode("pagination")}
                className={`px-3 py-2 text-sm cursor-pointer ${mode === "pagination" ? "bg-[var(--wr-pastel-blue)] text-[var(--wr-value-blue)]" : "bg-white"}`}
                title="Pagination"
              >
                Pages
              </button>
              <button
                onClick={() => setMode("infinite")}
                className={`px-3 py-2 text-sm cursor-pointer ${mode === "infinite" ? "bg-[var(--wr-pastel-blue)] text-[var(--wr-value-blue)]" : "bg-white"}`}
                title="Infinite scroll"
              >
                Infinite
              </button>
            </div>

            {/* Column manager */}
            <ColumnManager
              visible={visible}
              onChange={setVisible}
              togglable={["sessions", "lastActivity"]}
            />

            {/* Single Export (dropdown) */}
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
                      exportRowsToCSV("recency-flags.csv", visibleColumns, filteredSorted);
                    }}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> CSV
                  </button>
                  <button
                    disabled
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-400"
                    title="Pro feature"
                  >
                    <Columns3 className="h-4 w-4" /> XLSX <Lock className="ml-auto h-4 w-4" />
                  </button>
                  <button
                    disabled
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-400"
                    title="Pro feature"
                  >
                    <Columns3 className="h-4 w-4" /> PDF <Lock className="ml-auto h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Refresh / Reset */}
            <button
              onClick={refreshDemo}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              title="Refresh demo data"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              title="Reset filters & sorting"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Optional CMS hint */}
        {unknownRatio > 0.4 && (
          <div className="mx-3 mt-3 rounded-md border bg-[#F8FAFC] p-3 text-xs text-[var(--wr-muted)]" style={{ borderColor: "var(--wr-borderLight)" }}>
            Many pages show <b>Unknown</b> last updated. Connect your CMS or enable the Wranker Crawler to improve recency accuracy.
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by URL or title…"
              className="w-[280px] rounded-md border border-[var(--wr-border)] bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--wr-brand)]"
            />
          </div>

          {/* Status chips (multi) */}
          {(["Fresh", "Aging", "Stale", "Unknown"] as Status[]).map((s) => (
            <ChipToggle
              key={s}
              active={statusSet.has(s)}
              label={s}
              onClick={() => {
                const next = new Set(statusSet);
                if (next.has(s)) next.delete(s);
                else next.add(s);
                if (next.size === 0) return;
                setStatusSet(next);
                setOnlyStale(false);
                setPage(0);
              }}
              title={`Status: ${s}`}
            />
          ))}

          {/* Updated within (single) */}
          {([
            ["all", "Any time"],
            ["30", "Within 30d"],
            ["90", "Within 90d"],
            ["180", "Within 6m"],
            ["365", "Within 12m"],
          ] as const).map(([v, label]) => (
            <ChipToggle
              key={v}
              active={updatedWithin === v}
              label={label}
              onClick={() => {
                setUpdatedWithin(v);
                setPage(0);
              }}
              title={`Updated: ${label}`}
            />
          ))}

          {/* Stale-only toggle */}
          <label
            className="ml-1 flex cursor-pointer items-center gap-2 rounded-full border px-3 text-sm"
            style={{ borderColor: "var(--wr-borderLight)" }}
            title='Show only "Stale (>90d)"'
          >
            <input
              type="checkbox"
              checked={onlyStale}
              onChange={(e) => {
                setOnlyStale(e.target.checked);
                if (e.target.checked) setStatusSet(new Set(["Stale"]));
              }}
            />
            <span>Stale (&gt;90d) only</span>
          </label>

          {/* Pagination controls (when pagination) */}
          {mode === "pagination" && (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm cursor-pointer"
                title="Rows per page"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer"
                title="First"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer"
                title="Prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm">
                {page + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.max(0, pageCount - 1))}
                disabled={page >= pageCount - 1}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer"
                title="Last"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && <SkeletonTable visible={visible} />}

        {/* Table */}
        {!isLoading && (
          <div ref={scrollRef} className="relative max-h-[64vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead ref={theadRef} className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_var(--wr-border)]">
                <tr className="text-left">
                  {visible.select && (
                    <th className="sticky left-0 z-30 bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={allOnPageSelected}
                        ref={(el) => el && ((el as any).indeterminate = someOnPageSelected)as any}
                        onChange={(e) => toggleAllOnPage(e.target.checked)}
                      />
                    </th>
                  )}

                  {visible.url && (
                    <Th
                      colKey="url"
                      label={HEADER_META.url.label}
                      tooltip={HEADER_META.url.tooltip}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      stickyLeft
                      leftPx={visible.select ? 44 : 0}
                      widthClass="min-w-[280px]"
                    />
                  )}

                  {/* Optional columns follow recent table design (left-aligned) */}
                  <ConditionalTh visible={visible.sessions} meta={HEADER_META.sessions} colKey="sessions" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} extraClass="hidden md:table-cell" />
                  {visible.lastUpdated && (
                    <Th
                      colKey="lastUpdated"
                      label={HEADER_META.lastUpdated.label}
                      tooltip={HEADER_META.lastUpdated.tooltip}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  )}
                  {visible.status && (
                    <Th
                      colKey="status"
                      label={HEADER_META.status.label}
                      tooltip={HEADER_META.status.tooltip}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  )}
                  <ConditionalTh visible={visible.lastActivity} meta={HEADER_META.lastActivity} colKey="lastActivity" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} extraClass="hidden md:table-cell" />

                  {visible.actions && <th className="px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)]">{HEADER_META.actions.label}</th>}
                </tr>
              </thead>

              <tbody className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
                {pagedRows.map((r, idx) => {

                  const stat = classifyStatus(r.lastUpdated);
                  const d = daysSince(r.lastUpdated) ?? -1;
                  const severeStale = stat.status === "Stale" && d > 180;
                  const highTrafficStale = stat.status === "Stale" && (r.sessions ?? 0) >= 5000;

                  // Bulk action bar — just above the first selected row; sticky under the table header
                  const showBulkHere = selected.size > 0 && idx === firstSelectedIdx;
                  return (
                    <React.Fragment key={r.id}>
                      {showBulkHere && (
                        <tr>
                          <td colSpan={colCount} className="px-3 py-2">
                            <div
                              className="sticky z-30 flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm"
                              style={{ top: theadH, borderColor: TK.border }}
                            >
                              <div className="text-sm">
                                <span className="font-medium">{selected.size}</span> selected
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                  onClick={() =>
                                    exportRowsToCSV(
                                      "recency-flags-selected.csv",
                                      visibleColumns,
                                      pagedRows.filter((row) => selected.has(row.id)),
                                    )
                                  }
                                >
                                  <Download className="h-4 w-4" /> CSV
                                </button>
                                <button
                                  className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                  onClick={() => alert("Bulk task creation — connect to your Task module")}
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

                      <tr className={`bg-white hover:bg-[#F9FAFB] ${severeStale ? "[&>td]:relative" : ""}`}>
                        {/* left edge indicator for severe stale */}
                        {severeStale && <td className="absolute left-0 top-0 h-full w-1 bg-red-200/70" aria-hidden />}

                        {visible.select && (
                          <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              aria-label={`Select ${r.url}`}
                              checked={selected.has(r.id)}
                              onChange={(e) => toggleRow(r.id, e.target.checked)}
                            />
                          </td>
                        )}

                        {/* URL / Title */}
                        {visible.url && (
                          <td className={`sticky ${visible.select ? "left-[44px]" : "left-0"} z-10 bg-white px-3 py-3 align-top`}>
                            <div className="max-w-[360px]">
                              <a
                                className="line-clamp-1 font-medium text-[var(--wr-brand)] hover:underline cursor-pointer"
                                href="#"
                                // onClick={(e) => {
                                //   e.preventDefault();
                                //   setDrawerRow(r);
                                // }}
                                onClick={openDrawer}
                                title="Open Page Analyzer"
                              >
                                {r.title ?? r.url}
                              </a>
                              <div className="truncate text-xs text-[var(--wr-muted)]">{r.url}</div>
                              {highTrafficStale && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                    High traffic, stale content
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Sessions (opt) */}
                        {visible.sessions && (
                          <td className="hidden px-3 py-3 align-top md:table-cell">
                            <span className="font-medium">{r.sessions !== undefined ? nf.format(r.sessions) : "—"}</span>
                          </td>
                        )}

                        {/* Last Updated */}
                        {visible.lastUpdated && (
                          <td className="px-3 py-3 align-top">
                            <button
                              className="text-xs text-[var(--wr-muted)] underline-offset-2 hover:underline cursor-pointer"
                              title={tooltipAbs("Last updated", r.lastUpdated, r.lastUpdatedSource)}
                              // onClick={() => setDrawerRow(r)}
                            >
                              {timeAgo(r.lastUpdated)}
                            </button>
                          </td>
                        )}

                        {/* Status (badge + color dot) */}
                        {visible.status && (
                          <td className="px-3 py-3 align-top">
                            <button
                              // onClick={() => setDrawerRow(r)}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${stat.badgeClass}`}
                              aria-label={`Last updated ${daysSince(r.lastUpdated) ?? "Unknown"} days ago — ${stat.status}`}
                              title={tooltipAbs("Recency", r.lastUpdated, r.lastUpdatedSource)}
                            >
                              <span
                                className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
                                style={{ backgroundColor: stat.dotColor }}
                              />
                              {stat.status}
                            </button>
                          </td>
                        )}

                        {/* Last Activity (opt) */}
                        {visible.lastActivity && (
                          <td className="hidden px-3 py-3 align-top md:table-cell">
                            {r.lastActivity ? (
                              <span className="text-xs text-[var(--wr-muted)]" title={tooltipAbs("Last activity", r.lastActivity)}>
                                {timeAgo(r.lastActivity)}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--wr-muted)]">Unknown</span>
                            )}
                          </td>
                        )}

                        {/* Actions — icon-only, branded, no borders */}
                        {visible.actions && (
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                                title="Open Analyzer"
                                // onClick={() => setDrawerRow(r)}
                              >
                                <AnalyzerIcon className="h-4 w-4" color={TK.brand} />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                                title="Create Task"
                                // onClick={() => setDrawerRow(r)}
                              >
                                <ClipboardList className="h-4 w-4" color={TK.brand} />
                              </button>
                              {r.cmsEditorUrl && (
                                <a
                                  className="p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                                  title="Open in Editor"
                                  href={r.cmsEditorUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" color={TK.brand} />
                                </a>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Infinite footer */}
            {mode === "infinite" && infiniteCount < filteredSorted.length && (
              <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent p-3 text-center">
                <button
                  onClick={() => setInfiniteCount((n) => Math.min(n + 20, filteredSorted.length))}
                  className="rounded-md border border-[var(--wr-border)] bg-white px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  Load more
                </button>
              </div>
            )}

            {/* Empty */}
            {filteredSorted.length === 0 && (
              <div className="p-6 text-center text-sm text-[var(--wr-muted)]">
                No pages match your filters.{" "}
                <button className="text-[var(--wr-brand)] underline cursor-pointer" onClick={resetAll} title="Clear filters">
                  Show All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer range (pagination) */}
        {mode === "pagination" && filteredSorted.length > 0 && !isLoading && (
          <div className="flex items-center justify-between border-t p-3 text-xs text-[var(--wr-muted)]" style={{ borderColor: "var(--wr-borderLight)" }}>
            <div>
              Showing <b>{filteredSorted.length === 0 ? 0 : page * pageSize + 1}</b>–<b>{Math.min(filteredSorted.length, (page + 1) * pageSize)}</b> of{" "}
              <b>{filteredSorted.length}</b>
            </div>
          </div>
        )}
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
              <Kpi label="Sessions (GA4)" value={drawerRow.sessions !== undefined ? nf.format(drawerRow.sessions) : "—"} />
              <Kpi label="Last Updated" value={drawerRow.lastUpdated ? new Date(drawerRow.lastUpdated).toLocaleDateString() : "Unknown"} />
              <Kpi label="Recency Status" value={classifyStatus(drawerRow.lastUpdated).status} />
              <Kpi label="Last GA4 Activity" value={drawerRow.lastActivity ? timeAgo(drawerRow.lastActivity) : "Unknown"} />
            </div>
          </div>
        </Drawer>
      )}
    </section>
  );
}

/* -------------------------------- Sub-UI ---------------------------------- */

function Th(props: {
  colKey: ColumnKey;
  label: string;
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
      className={`px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)] ${props.widthClass ?? ""} ${
        props.stickyLeft ? "sticky bg-white z-20" : ""
      }`}
      style={props.stickyLeft ? { left: `${props.leftPx ?? 0}px` } : undefined}
    >
      <button
        onClick={() => props.onSort(props.colKey)}
        className="flex items-center whitespace-nowrap cursor-pointer"
        title={props.tooltip}
      >
        <span>{props.label}</span>
        <SortGlyph active={isActive} dir={props.sortDir} />
      </button>
    </th>
  );
}

function ConditionalTh({
  visible,
  meta,
  colKey,
  sortKey,
  sortDir,
  onSort,
  extraClass = "",
}: {
  visible: boolean;
  meta: { label: string; tooltip?: string };
  colKey: ColumnKey;
  sortKey: ColumnKey;
  sortDir: SortDir;
  onSort: (k: ColumnKey) => void;
  extraClass?: string;
}) {
  if (!visible) return null;
  return (
    <Th
      colKey={colKey}
      label={meta.label}
      tooltip={meta.tooltip}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      widthClass={extraClass}
    />
  );
}

function SortGlyph({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || dir === null) return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-70" />;
  return dir === "asc" ? <ChevronUp className="ml-1 h-4 w-4 opacity-70" /> : <ChevronDown className="ml-1 h-4 w-4 opacity-70" />;
}

function ChipToggle({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 rounded-full border px-3 text-sm cursor-pointer ${active ? "font-semibold" : ""}`}
      style={{
        borderColor: "var(--wr-borderLight)",
        background: active ? "var(--wr-pastel-blue)" : "#fff",
        color: active ? "var(--wr-value-blue)" : "inherit",
      }}
    >
      {label}
    </button>
  );
}

function ColumnManager({
  visible,
  onChange,
  togglable,
}: {
  visible: Record<ColumnKey, boolean>;
  onChange: (v: Record<ColumnKey, boolean>) => void;
  togglable: ColumnKey[];
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
        title="Choose columns"
      >
        <Columns3 className="h-4 w-4" color={TK.brand} />
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
              onClick={() => onChange({ ...DEFAULT_VISIBLE })}
            >
              Reset
            </button>
            <button className="rounded-md bg-[var(--wr-brand)] px-3 py-1.5 text-xs text-white hover:brightness-105 cursor-pointer" onClick={() => setOpen(false)}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[380px] max-w-[90vw] overflow-auto bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Close
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

function SkeletonTable({ visible }: { visible: Record<ColumnKey, boolean> }) {
  const cols = (Object.keys(visible) as ColumnKey[]).filter((k) => visible[k]);
  const Row = () => (
    <tr>
      {cols.map((key, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
  return (
    <div className="relative max-h-[64vh] overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            {cols.map((k) => (
              <th key={k} className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--wr-muted)]">
                {HEADER_META[k].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Row key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
