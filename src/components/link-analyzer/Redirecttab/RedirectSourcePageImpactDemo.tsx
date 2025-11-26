"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Table as TableIcon,
  LayoutGrid,
  ChevronRight,
  ChevronUp,
  Search,
  Calendar,
  SlidersHorizontal,
  ExternalLink,
  MoreHorizontal,
  X,
  Loader2,
  Link2,
  Layers,
  ClipboardList,
  ReplaceAll,
  Eye,
} from "lucide-react";

/**
 * Wranker — Redirects Tab (Section 4)
 * Redirect Source Page Impact View — Updated to match recent table patterns
 * - Inter / Inter Fallback fonts
 * - Branded icons for section title, action types, redirect types
 * - Modular buttons / toggles
 * - Pointer cursor for all hyperlinked elements
 * - No emojis
 */

/* ---------------------- helpers & tokens ---------------------- */
const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

const TOKENS = {
  brand: "#008CCD",
  coreBlue: "#4286F5",
  success: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  appBg: "#F5F7FA",
  radius: "6px",
};

const rootVars: React.CSSProperties = {
  ["--wr-brand" as any]: TOKENS.brand,
  ["--wr-core" as any]: TOKENS.coreBlue,
  ["--wr-text" as any]: TOKENS.text,
  ["--wr-muted" as any]: TOKENS.muted,
  ["--wr-border" as any]: TOKENS.border,
  ["--wr-success" as any]: TOKENS.success,
  ["--wr-warning" as any]: TOKENS.warning,
  ["--wr-critical" as any]: TOKENS.critical,
  ["--wr-radius" as any]: TOKENS.radius,
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const severityOf = (count: number) => (count >= 5 ? "high" : count >= 3 ? "medium" : count >= 1 ? "low" : "none");
const chainBand = (depth: number) => (depth >= 3 ? "3+" : String(depth));

/* ---------------------- mock data ---------------------- */
type LinkItem = { anchor: string; original: string; final: string; type: "301" | "302" | "307" | "Meta" | "JS"; depth: number };
type Row = {
  pagePath: string;
  pageUrl: string;
  redirectedCount: number;
  internalCount: number;
  externalCount: number;
  avgChainDepth: number;
  topAnchors: { text: string; count: number }[];
  lastVerified: string;
  priority: "high" | "medium" | "low";
  inMainNav: boolean;
  links: LinkItem[];
};

const MOCK_ROWS: Row[] = [
  {
    pagePath: "/services",
    pageUrl: "https://example.com/services",
    redirectedCount: 7,
    internalCount: 5,
    externalCount: 2,
    avgChainDepth: 2.6,
    topAnchors: [
      { text: "click here", count: 4 },
      { text: "learn more", count: 2 },
    ],
    lastVerified: "2025-08-22T09:12:00Z",
    priority: "high",
    inMainNav: true,
    links: [
      { anchor: "click here", original: "http://old.example.com/legacy-a", final: "https://example.com/new-a", type: "301", depth: 2 },
      { anchor: "learn more", original: "http://old.example.com/legacy-b", final: "https://example.com/new-b", type: "302", depth: 3 },
      { anchor: "read more", original: "http://redir.net/x", final: "https://example.com/resources", type: "301", depth: 3 },
    ],
  },
  {
    pagePath: "/blog/old-post",
    pageUrl: "https://example.com/blog/old-post",
    redirectedCount: 4,
    internalCount: 2,
    externalCount: 2,
    avgChainDepth: 1.8,
    topAnchors: [
      { text: "read more", count: 3 },
      { text: "details", count: 1 },
    ],
    lastVerified: "2025-08-21T14:32:00Z",
    priority: "medium",
    inMainNav: false,
    links: [
      { anchor: "read more", original: "http://old.example.com/article-x", final: "https://example.com/blog/article-x", type: "301", depth: 1 },
      { anchor: "details", original: "http://redir.net/y", final: "https://example.com/blog/article-y", type: "302", depth: 2 },
    ],
  },
  {
    pagePath: "/pricing",
    pageUrl: "https://example.com/pricing",
    redirectedCount: 2,
    internalCount: 2,
    externalCount: 0,
    avgChainDepth: 1.2,
    topAnchors: [{ text: "pricing", count: 2 }],
    lastVerified: "2025-08-20T12:10:00Z",
    priority: "low",
    inMainNav: true,
    links: [
      { anchor: "pricing", original: "http://old.example.com/old-pricing", final: "https://example.com/pricing", type: "301", depth: 1 },
      { anchor: "pricing", original: "http://redir.net/p", final: "https://example.com/pricing", type: "301", depth: 1 },
    ],
  },
  {
    pagePath: "/about",
    pageUrl: "https://example.com/about",
    redirectedCount: 1,
    internalCount: 1,
    externalCount: 0,
    avgChainDepth: 1,
    topAnchors: [{ text: "about us", count: 1 }],
    lastVerified: "2025-08-19T08:20:00Z",
    priority: "low",
    inMainNav: true,
    links: [{ anchor: "about us", original: "http://old.example.com/about", final: "https://example.com/about", type: "301", depth: 1 }],
  },
];

/* ---------------------- UI primitives ---------------------- */
const Button = ({
  variant = "brand",
  size = "sm",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "brand" | "outline" | "ghost" | "danger" | "chip"; size?: "sm" | "xs" }) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center gap-2 rounded-[6px] transition cursor-pointer",
      size === "sm" && "h-9 px-3 text-sm",
      size === "xs" && "h-8 px-2 text-xs",
      variant === "brand" && "bg-[color:var(--wr-brand)] text-white hover:opacity-95",
      variant === "outline" && "border border-[color:var(--wr-border)] bg-white text-[color:var(--wr-text)] hover:bg-[#F5F7FA]",
      variant === "ghost" && "bg-transparent text-[color:var(--wr-text)] hover:bg-[#F5F7FA]",
      variant === "danger" && "bg-[color:var(--wr-critical)] text-white hover:opacity-95",
      variant === "chip" && "border border-[color:var(--wr-border)] bg-white hover:bg-[#F5F7FA] text-sm",
      className
    )}
  />
);

const Chip = ({
  children,
  tone = "default",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "default" | "brand" | "muted" | "success" | "warning" | "critical";
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border",
      tone === "brand" && "bg-[#D9EEF8] text-[#0b5f7e]",
      tone === "muted" && "bg-gray-100 text-gray-600",
      tone === "success" && "bg-[#ECFDF5] text-[#047857] border-[#D1FAE5]",
      tone === "warning" && "bg-[#FFF7ED] text-[#92400E] border-[#FFEDD5]",
      tone === "critical" && "bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]",
      tone === "default" && "bg-gray-50 text-gray-700",
      className
    )}
    style={{ borderColor: TOKENS.border }}
  >
    {children}
  </span>
);

const Segmented = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: any;
  options: { label: React.ReactNode; value: string }[];
}) => (
  <div className="inline-flex overflow-hidden rounded-md border border-[color:var(--wr-border)]">
    {options.map((o, idx) => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={cn(
          "px-3 py-1.5 text-sm",
          idx > 0 && "border-l border-[color:var(--wr-border)]",
          value === o.value ? "bg-[color:var(--wr-core)] text-white" : "bg-white hover:bg-[#F5F7FA]"
        )}
        aria-pressed={value === o.value}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/** Redirect Type badge with brand icon */
const RedirectTypeBadge = ({ type }: { type: LinkItem["type"] }) => {
  const tone =
    type === "301" ? "success" : type === "302" || type === "307" ? "warning" : ("critical" as const);
  return (
    <Chip tone={tone}>
      <Link2 className="h-3.5 w-3.5" />
      <span className="tabular-nums">{type}</span>
    </Chip>
  );
};

/** Chain depth badge */
const ChainDepthBadge = ({ depth }: { depth: number }) => (
  <Chip tone={depth >= 3 ? "warning" : "muted"}>
    <Layers className="h-3.5 w-3.5" /> {depth >= 3 ? "3+" : depth}
  </Chip>
);

/* ---------------------- Export Modal (simple) ---------------------- */
const ExportModal = ({
  open,
  onClose,
  scope,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  scope: string;
  onExport: (opts: { format: string; includeAnchors: boolean; includeDepths: boolean; includeLastVerified: boolean }) => void;
}) => {
  const [format, setFormat] = useState("xlsx");
  const [includeAnchors, setIncludeAnchors] = useState(true);
  const [includeDepths, setIncludeDepths] = useState(true);
  const [includeLastVerified, setIncludeLastVerified] = useState(true);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] max-w-[92vw] bg-white rounded-lg shadow border border-[color:var(--wr-border)] p-5" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[color:var(--wr-text)]">Export Page Impact Summary</h3>
          <button className="p-1 rounded hover:bg-gray-100 cursor-pointer" onClick={onClose} aria-label="Close export modal">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-[color:var(--wr-muted)]">Scope</div>
            <div className="font-medium">{scope}</div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[color:var(--wr-muted)]">Format</label>
            <select className="border rounded px-2 py-1 cursor-pointer" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeAnchors} onChange={(e) => setIncludeAnchors(e.target.checked)} /> Include anchor breakdown
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeDepths} onChange={(e) => setIncludeDepths(e.target.checked)} /> Include chain depths
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeLastVerified} onChange={(e) => setIncludeLastVerified(e.target.checked)} /> Include last verified timestamp
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onExport({ format, includeAnchors, includeDepths, includeLastVerified })}
          >
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------- Main demo component ---------------------- */
export default function RedirectSourcePageImpactDemo({apiItems }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // view + filters
  const [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState("");
  const [minCount, setMinCount] = useState(1);
  const [linkType, setLinkType] = useState<"all" | "internal" | "external">("all");
  const [depthFilter, setDepthFilter] = useState<"all" | "1" | "2" | "3+">("all");
  const [sortBy, setSortBy] = useState<"redirectedCountDesc" | "avgDepthDesc" | "lastVerifiedDesc">("redirectedCountDesc");
  const [datePreset, setDatePreset] = useState<"7d" | "30d" | "all">("30d");

  // selection & expansion
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // export modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState("Visible rows");

  // progress
  const [jobProgress, setJobProgress] = useState<{ label: string; pct: number } | null>(null);

 const incoming = useMemo(() => {
   if (!apiItems) return null
   // map API → Row[]
   return apiItems.map((it) => ({
     pagePath: new URL(it.source_page).pathname || "/",
     pageUrl: it.source_page,
     redirectedCount: it.broken,
     internalCount: it.internal,
     externalCount: it.external,
     avgChainDepth: Math.max(1, Math.min(3, Math.round(
       (it.c404 + it.c410 + it.timeout + it.error + it.s5xx) ? 2 : 1
     ))),
     topAnchors: [],              // backend doesn’t provide; safe empty
     lastVerified: it.last_crawled,
     priority: it.severity?.toLowerCase().includes("high") ? "high"
              : it.severity?.toLowerCase().includes("moderate") ? "medium" : "low",
     inMainNav: false,
     links: [],                   // optional: hydrate later if API available
   }))
 }, [apiItems])
 const filteredBase = incoming || [];
  // derived data
  const filtered = useMemo(() => {
    let rows = [...filteredBase];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((r) => r.pagePath.toLowerCase().includes(needle));
    }
    rows = rows.filter((r) => r.redirectedCount >= (minCount || 0));
    if (linkType !== "all") {
      rows = rows.filter((r) => (linkType === "internal" ? r.internalCount > 0 : r.externalCount > 0));
    }
    if (depthFilter !== "all") {
      rows = rows.filter((r) => {
        const band = r.avgChainDepth >= 3 ? "3+" : String(Math.round(r.avgChainDepth));
        return band === depthFilter;
      });
    }
    if (datePreset !== "all") {
      const now = Date.now();
      const days = datePreset === "7d" ? 7 : 30;
      rows = rows.filter((r) => now - new Date(r.lastVerified).getTime() <= days * 86400000);
    }
    switch (sortBy) {
      case "avgDepthDesc":
        rows.sort((a, b) => b.avgChainDepth - a.avgChainDepth);
        break;
      case "lastVerifiedDesc":
        rows.sort((a, b) => +new Date(b.lastVerified) - +new Date(a.lastVerified));
        break;
      default:
        rows.sort((a, b) => b.redirectedCount - a.redirectedCount);
    }
    return rows;
  }, [filteredBase,q, minCount, linkType, depthFilter, sortBy, datePreset]);

  const allSelectedOnPage = filtered.length > 0 && filtered.every((r) => selected.has(r.pagePath));

  const toggleSelectAllPage = () => {
    const next = new Set(selected);
    if (allSelectedOnPage) filtered.forEach((r) => next.delete(r.pagePath));
    else filtered.forEach((r) => next.add(r.pagePath));
    setSelected(next);
  };

  const selectMatching = () => {
    const next = new Set(selected);
    filtered.forEach((r) => next.add(r.pagePath));
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const onExport = (opts: { format: string }) => {
    setExportOpen(false);
    setJobProgress({ label: `Exporting (${opts.format.toUpperCase()})…`, pct: 0 });
    const id = setInterval(() => {
      setJobProgress((p) => {
        if (!p) return null;
        const pct = Math.min(100, p.pct + Math.random() * 25);
        if (pct >= 100) clearInterval(id);
        return { ...p, pct };
      });
    }, 350);
  };

  // filter bar shadow on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const bar = el.querySelector("[data-filter-bar]") as HTMLElement | null;
    const onScroll = () => bar?.classList.toggle("shadow-sm", el.scrollTop > 8);
    const setBarHeightVar = () => {
      if (!bar) return;
      const h = bar.getBoundingClientRect().height || 56;
      el.style.setProperty("--fbh", h + "px");
    };
    setBarHeightVar();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setBarHeightVar) : null;
    ro?.observe(bar as Element);
    el.addEventListener("scroll", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="h-[calc(100vh-120px)] overflow-auto" style={rootVars}>
      <section className="w-full p-4">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b pb-3 border-[color:var(--wr-border)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4" style={{ color: TOKENS.brand }} />
              <h2 className="text-[color:var(--wr-text)] text-xl font-semibold">Redirect Source Page Impact</h2>
            </div>
            <p className="text-[color:var(--wr-muted)] text-sm">Find pages that contain redirected links and prioritise fixes.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle (segmented) */}
            <Segmented
              value={view}
              onChange={(v) => setView(v as any)}
              options={[
                {
                  value: "table",
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <TableIcon className="h-4 w-4" /> Table
                    </span>
                  ),
                },
                {
                  value: "grid",
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <LayoutGrid className="h-4 w-4" /> Grid
                    </span>
                  ),
                },
              ]}
            />
            <Button
              onClick={() => {
                setExportScope("Visible rows");
                setExportOpen(true);
              }}
            >
              <Download size={16} />
              Export
            </Button>
          </div>
        </div>

        {/* Filters Bar (sticky) */}
        <div data-filter-bar className="sticky top-0 z-20 bg-white border-b border-[color:var(--wr-border)] mt-3">
          <div className="flex flex-wrap items-center gap-2 p-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--wr-muted)]" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter by page path…"
                className="pl-7 pr-3 py-1.5 border rounded-md w-[240px] outline-none focus:ring-2 focus:ring-[color:var(--wr-core)]"
              />
            </div>

            {/* Redirects threshold */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-[color:var(--wr-muted)]" />
              <label className="text-sm text-[color:var(--wr-muted)]">Redirects ≥</label>
              <input
                type="range"
                min={0}
                max={7}
                value={minCount}
                onChange={(e) => setMinCount(Number(e.target.value))}
              />
              <span className="text-sm font-medium w-6 text-center">{minCount}</span>
            </div>

            {/* Link type */}
            <Segmented
              value={linkType}
              onChange={(v) => setLinkType(v as any)}
              options={[
                { label: "All", value: "all" },
                { label: "Internal", value: "internal" },
                { label: "External", value: "external" },
              ]}
            />

            {/* Avg chain depth */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--wr-muted)]">Avg Chain</span>
              <Segmented
                value={depthFilter}
                onChange={setDepthFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3+", label: "3+" },
                ]}
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--wr-muted)]">Sort</span>
              <select
                className="border rounded px-2 py-1 text-sm cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="redirectedCountDesc">Redirected Links (desc)</option>
                <option value="avgDepthDesc">Avg Chain Depth</option>
                <option value="lastVerifiedDesc">Last Verified</option>
              </select>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[color:var(--wr-muted)]" />
              <select
                className="border rounded px-2 py-1 text-sm cursor-pointer"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {/* Active filter chips */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {q && (
                <Chip tone="muted">
                  Path: {q}
                  <button className="ml-1 hover:underline cursor-pointer" onClick={() => setQ("")}>
                    ×
                  </button>
                </Chip>
              )}
              {minCount > 0 && (
                <Chip tone="muted">
                  Redirects ≥ {minCount}
                  <button className="ml-1 hover:underline cursor-pointer" onClick={() => setMinCount(0)}>
                    ×
                  </button>
                </Chip>
              )}
              {linkType !== "all" && (
                <Chip tone="muted">
                  {linkType}
                  <button className="ml-1 hover:underline cursor-pointer" onClick={() => setLinkType("all")}>
                    ×
                  </button>
                </Chip>
              )}
              {depthFilter !== "all" && (
                <Chip tone="muted">
                  Avg {depthFilter}
                  <button className="ml-1 hover:underline cursor-pointer" onClick={() => setDepthFilter("all")}>
                    ×
                  </button>
                </Chip>
              )}
              {datePreset !== "all" && (
                <Chip tone="muted">
                  Date: {datePreset}
                  <button className="ml-1 hover:underline cursor-pointer" onClick={() => setDatePreset("all")}>
                    ×
                  </button>
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Toolbar (just below filter bar) */}
        {selected.size > 0 && (
          <BulkToolbar
            selectedCount={selected.size}
            rows={filtered.filter((r) => selected.has(r.pagePath))}
            onClear={clearSelection}
            onSelectMatching={selectMatching}
            onExport={() => {
              setExportScope("Selected rows");
              setExportOpen(true);
            }}
          />
        )}

        {/* Body */}
        <div className="mt-3">
          {view === "table" ? (
            <ImpactTable
              rows={filtered}
              selected={selected}
              setSelected={setSelected}
              expanded={expanded}
              setExpanded={setExpanded}
              onToggleSelectAllPage={toggleSelectAllPage}
              allSelectedOnPage={allSelectedOnPage}
              onExportClick={() => {
                setExportScope("Selected rows");
                setExportOpen(true);
              }}
            />
          ) : (
            <ImpactGrid rows={filtered} />
          )}
        </div>

        {/* Export Modal */}
        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} scope={exportScope} onExport={onExport} />

        {/* Progress Toast */}
        {jobProgress && (
          <div className="fixed bottom-4 right-4 bg-white rounded-md shadow p-3 border border-[color:var(--wr-border)] w-[300px]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="animate-spin" size={16} /> {jobProgress.label}
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded">
              <div className="h-2 bg-[color:var(--wr-brand)] rounded" style={{ width: `${jobProgress.pct}%` }} />
            </div>
            {jobProgress.pct >= 100 && (
              <div className="mt-2 text-xs text-[color:var(--wr-muted)]">
                Done. You can close this.
                <button className="ml-2 underline cursor-pointer" onClick={() => setJobProgress(null)}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------------- Table View ---------------------- */
function ImpactTable({
  rows,
  selected,
  setSelected,
  expanded,
  setExpanded,
  onToggleSelectAllPage,
  allSelectedOnPage,
  onExportClick,
}: {
  rows: Row[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  expanded: Set<string>;
  setExpanded: (s: Set<string>) => void;
  onToggleSelectAllPage: () => void;
  allSelectedOnPage: boolean;
  onExportClick: () => void;
}) {
  const toggleRow = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="relative border border-[color:var(--wr-border)] rounded-lg overflow-hidden bg-white">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          {/* Sticky header */}
          <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
            <tr className="text-left text-[13px] text-[color:var(--wr-muted)]">
              <th className="w-10 px-3 py-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={onToggleSelectAllPage} />
                </label>
              </th>
              <th className="px-3 py-2">Page URL</th>
              <th className="px-3 py-2">Redirected Links</th>
              <th className="px-3 py-2">Avg Chain Depth</th>
              <th className="px-3 py-2">Top Anchors</th>
              <th className="px-3 py-2">Last Verified</th>
              <th className="px-3 py-2 w-10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sev = severityOf(r.redirectedCount);
              const sevTone = sev === "high" ? "critical" : sev === "medium" ? "warning" : sev === "low" ? "success" : "muted";
              return (
                <React.Fragment key={r.pagePath}>
                  <tr className={cn("border-t border-[color:var(--wr-border)] hover:bg-[#F5F7FA]")}>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(r.pagePath)}
                        onChange={() => toggleRow(r.pagePath)}
                        aria-label={`Select ${r.pagePath}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleExpand(r.pagePath)}
                          className="mt-0.5 p-1 rounded hover:bg-gray-100 cursor-pointer"
                          aria-expanded={expanded.has(r.pagePath)}
                          aria-label={expanded.has(r.pagePath) ? "Collapse" : "Expand"}
                        >
                          {expanded.has(r.pagePath) ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div>
                          <a
                            href={r.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[color:var(--wr-core)] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            {r.pagePath} <ExternalLink size={14} />
                          </a>
                          <div className="mt-1 flex items-center gap-2">
                            {r.inMainNav && <Chip tone="brand">Priority Page</Chip>}
                            {r.priority === "high" && <Chip tone="critical">High Priority</Chip>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <Chip tone={sevTone}>
                          <strong className="tabular-nums">{r.redirectedCount}</strong>
                        </Chip>
                        <Chip tone="muted" className="tabular-nums">
                          {r.internalCount} internal
                        </Chip>
                        <Chip tone="muted" className="tabular-nums">
                          {r.externalCount} external
                        </Chip>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium">{r.avgChainDepth.toFixed(1)}</span>
                      <div className="text-xs text-[color:var(--wr-muted)]">
                        {r.avgChainDepth >= 3 ? "risk: multi-hop" : "mostly short"}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {r.topAnchors.map((a, i) => (
                          <Chip key={i} tone="default">
                            {a.text} · <span className="tabular-nums">{a.count}x</span>
                          </Chip>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-[color:var(--wr-text)]">{fmtDate(r.lastVerified)}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <RowActions onExportClick={onExportClick} />
                    </td>
                  </tr>

                  {/* Expansion: Redirected links on the page */}
                  {expanded.has(r.pagePath) && (
                    <tr className="bg-white">
                      <td />
                      <td colSpan={6} className="px-3 pb-4">
                        <div className="mt-2 border rounded-md border-[color:var(--wr-border)] overflow-hidden">
                          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm font-medium">Redirected links on this page</div>
                            <div className="text-xs text-[color:var(--wr-muted)]">
                              Showing first {Math.min(5, r.links.length)} of {r.links.length}
                            </div>
                          </div>
                          <div className="overflow-auto max-h-[300px]">
                            <table className="min-w-full text-sm">
                              <thead className="bg-white">
                                <tr className="text-left text-[13px] text-[color:var(--wr-muted)]">
                                  <th className="px-3 py-2">Anchor</th>
                                  <th className="px-3 py-2">Original Target</th>
                                  <th className="px-3 py-2">Final URL</th>
                                  <th className="px-3 py-2">Type</th>
                                  <th className="px-3 py-2">Depth</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.links.slice(0, 5).map((l, idx) => (
                                  <tr key={idx} className="border-t border-[color:var(--wr-border)] hover:bg-[#F5F7FA]">
                                    <td className="px-3 py-2">{l.anchor}</td>
                                    <td className="px-3 py-2">
                                      <a
                                        className="text-[color:var(--wr-core)] hover:underline cursor-pointer"
                                        href={l.original}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {l.original}
                                      </a>
                                    </td>
                                    <td className="px-3 py-2">
                                      <a
                                        className="text-[color:var(--wr-core)] hover:underline cursor-pointer"
                                        href={l.final}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {l.final}
                                      </a>
                                    </td>
                                    <td className="px-3 py-2">
                                      <RedirectTypeBadge type={l.type} />
                                    </td>
                                    <td className="px-3 py-2">
                                      <ChainDepthBadge depth={l.depth} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                            <a className="text-[color:var(--wr-core)] text-sm hover:underline cursor-pointer" href="#">
                              Open Page Drawer
                            </a>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="xs" onClick={() => alert("Create Task")}>
                                <ClipboardList className="h-4 w-4" /> Create Task
                              </Button>
                              <Button size="xs" onClick={() => alert("Replace All Links")}>
                                <ReplaceAll className="h-4 w-4" /> Replace All Links
                              </Button>
                            </div>
                          </div>
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
    </div>
  );
}

function RowActions({ onExportClick }: { onExportClick: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button variant="ghost" size="xs" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} title="Row actions">
        <MoreHorizontal size={18} />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-[color:var(--wr-border)] rounded-md shadow z-20">
          <button
            className="w-full text-left px-3 py-2 hover:bg-[#F5F7FA] text-sm inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setOpen(false);
              alert("View in Page Drawer");
            }}
          >
            <Eye className="h-4 w-4" /> View in Page Drawer
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-[#F5F7FA] text-sm inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setOpen(false);
              alert("Create Task");
            }}
          >
            <ClipboardList className="h-4 w-4" /> Create Task
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-[#F5F7FA] text-sm inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setOpen(false);
              alert("Replace All Links");
            }}
          >
            <ReplaceAll className="h-4 w-4" /> Replace All Links
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-[#F5F7FA] text-sm inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setOpen(false);
              onExportClick();
            }}
          >
            <Download className="h-4 w-4" /> Export rows
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------- Grid View ---------------------- */
function ImpactGrid({ rows }: { rows: Row[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {rows.map((r) => (
        <div key={r.pagePath} className="border border-[color:var(--wr-border)] rounded-lg p-3 shadow-sm bg-white">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <a
                href={r.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--wr-core)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {r.pagePath} <ExternalLink size={14} />
              </a>
              <div className="mt-1 flex items-center gap-2">
                {r.inMainNav && <Chip tone="brand">Priority Page</Chip>}
                {r.priority === "high" && <Chip tone="critical">High Priority</Chip>}
              </div>
            </div>
            <SeverityBadge count={r.redirectedCount} />
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div>
              <div className="text-[color:var(--wr-muted)]">Avg Chain</div>
              <div className="font-medium">{r.avgChainDepth.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[color:var(--wr-muted)]">Internal / External</div>
              <div className="font-medium">
                <span className="tabular-nums">{r.internalCount}</span> /{" "}
                <span className="tabular-nums">{r.externalCount}</span>
              </div>
            </div>
            <div>
              <div className="text-[color:var(--wr-muted)]">Last Verified</div>
              <div className="font-medium">{fmtDate(r.lastVerified)}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[color:var(--wr-muted)] text-sm mb-1">Top anchors</div>
            <div className="flex flex-wrap gap-1">
              {r.topAnchors.map((a, i) => (
                <Chip tone="default" key={i}>
                  {a.text} · <span className="tabular-nums">{a.count}x</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="xs" onClick={() => alert("Create Task")}>
              <ClipboardList className="h-4 w-4" /> Create Task
            </Button>
            <Button size="xs" onClick={() => alert("Fix Links on This Page")}>
              <ReplaceAll className="h-4 w-4" /> Fix Links
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SeverityBadge({ count }: { count: number }) {
  const sev = severityOf(count);
  const tone = sev === "high" ? "critical" : sev === "medium" ? "warning" : sev === "low" ? "success" : "muted";
  return (
    <Chip tone={tone}>
      Redirected links: <strong className="tabular-nums">{count}</strong>
    </Chip>
  );
}

/* ---------------------- Bulk Toolbar (docked under filter bar) ---------------------- */
function BulkToolbar({
  selectedCount,
  rows,
  onClear,
  onSelectMatching,
  onExport,
}: {
  selectedCount: number;
  rows: Row[];
  onClear: () => void;
  onSelectMatching: () => void;
  onExport: () => void;
}) {
  const multiHop = rows.filter((r) => r.avgChainDepth >= 2).length;
  const high = rows.filter((r) => r.redirectedCount >= 5).length;
  return (
    <div className="sticky z-20" style={{ top: "var(--fbh, 56px)" }} aria-live="polite">
      <div className="mx-auto max-w-[1200px] p-3 pt-2">
        <div className="bg-white border border-[color:var(--wr-border)] rounded-lg shadow-sm px-3 py-2 flex items-center justify-between">
          <div className="text-sm flex items-center gap-2">
            <Chip tone="brand">
              <span className="tabular-nums">{selectedCount}</span> Selected
            </Chip>
            <Chip tone={multiHop ? "warning" : "muted"}>
              <span className="tabular-nums">{multiHop}</span> Multi-hop
            </Chip>
            <Chip tone={high ? "critical" : "muted"}>
              <span className="tabular-nums">{high}</span> High severity
            </Chip>
            <button className="ml-2 text-[color:var(--wr-core)] text-sm hover:underline cursor-pointer" onClick={onSelectMatching}>
              Select all matching
            </button>
            <button className="text-[color:var(--wr-core)] text-sm hover:underline cursor-pointer" onClick={onClear}>
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="xs" onClick={() => alert("Replace with Final URL")}>
              <ReplaceAll className="h-4 w-4" /> Replace with Final URL
            </Button>
            <Button variant="outline" size="xs" onClick={() => alert("Create Task for All")}>
              <ClipboardList className="h-4 w-4" /> Create Task for All
            </Button>
            <Button variant="outline" size="xs" onClick={() => alert("Mark as Reviewed")}>
              Mark as Reviewed
            </Button>
            <Button variant="outline" size="xs" onClick={onExport}>
              <Download className="h-4 w-4" /> Export Selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
