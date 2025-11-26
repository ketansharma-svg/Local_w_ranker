"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Layers,
  Link2,
  SlidersHorizontal,
  Download,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
import { Badge, Modal, Tag } from "antd";

/* ───────────────────────── Tokens & small utils ───────────────────────── */

const TK = {
  // Brand & accents
  brand: "#008CCD",
  actionBlue: "#0077FF",     // primary actions/links
  valueBlue: "#0077FF",      // KPI/value blue (alias of actionBlue)
  brandPastel: "#D9EEF8",    // pastel fill for active toggles, chips, etc.

  // Text & neutrals
  text: "#111827",
  muted: "#6B7280",
  iconGray: "#9E9E9E",

  // Borders & surfaces
  borderLight: "#EFF0F6",    // light separators (tables, cards)
  border: "#EFF0F6",         // keep for backward compatibility
  borderStrong: "#E5E7EB",   // stronger dividers
  appBg: "#F5F7FA",
  surface: "#FFFFFF",

  // Status
  success: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",

  // Shape
  radius: 6,                 // per current design spec
} as const;

const WR_FONT: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

function cn(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

const downloadText = (name: string, text: string, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return ref;
}

/* ───────────────────────── Mock data (deterministic) ───────────────────────── */

const REDIRECT_TYPES = ["301", "302", "307", "Meta", "JS"] as const;
type RedirectType = (typeof REDIRECT_TYPES)[number];
type LinkType = "internal" | "external";

type ChainHop = { url: string; status: number };
type Row = {
  id: string;
  anchor: string;
  anchorType: "text" | "image";
  sourcePath: string;
  sourceUrl: string;
  originalTarget: string;
  finalUrl: string;
  redirectType: RedirectType;
  chainDepth: number; // 1,2,3(+)
  chain: ChainHop[];
  linkType: LinkType;
  lastVerified: string; // ISO
};

function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function makeRow(i: number): Row {
  const r = (n: number) => rand(i * 97 + n);
  const chainDepth = r(1) > 0.75 ? 3 : r(1) > 0.45 ? 2 : 1;
  const rt = r(2);
  const redirectType: RedirectType = rt > 0.8 ? "JS" : rt > 0.6 ? "Meta" : rt > 0.4 ? "307" : rt > 0.2 ? "302" : "301";
  const linkType: LinkType = r(3) > 0.65 ? "external" : "internal";
  const id = `r-${i}`;
  const sourcePath =
    ["/blog/old-post-", "/guide/legacy-", "/docs/v1/", "/news/", "/product/"][Math.floor(r(4) * 5)] +
    (10 + (i % 90));
  const host = "https://example.com";
  const sourceUrl = host + sourcePath;
  const originalTargetRoot = r(5) > 0.5 ? "http://oldsite.com" : "https://redirector.net";
  const finalRoot = r(6) > 0.5 ? "https://example.com" : "https://newsite.io";
  const originalTarget = `${originalTargetRoot}/page-${(i % 70) + 1}`;
  const finalUrl = `${finalRoot}/${r(7) > 0.5 ? "resources" : "new"}-page-${(i % 50) + 1}`;
  const anchor = r(8) > 0.8 ? "" : r(8) > 0.5 ? "click here" : r(8) > 0.25 ? "read more" : "view details";
  const lastVerified = new Date(Date.now() - Math.floor(r(9) * 14) * 86400000 - i * 1007).toISOString();
  const chain: ChainHop[] = [
    { url: originalTarget, status: redirectType === "301" ? 301 : redirectType === "302" ? 302 : redirectType === "307" ? 307 : 302 },
  ];
  if (chainDepth >= 2) chain.push({ url: "https://hop.example/h1", status: 302 });
  if (chainDepth >= 3) chain.push({ url: "https://hop.example/h2", status: 301 });
  chain.push({ url: finalUrl, status: 200 });
  return {
    id,
    anchor,
    anchorType: anchor ? "text" : "image",
    sourcePath,
    sourceUrl,
    originalTarget,
    finalUrl,
    redirectType,
    chainDepth,
    chain,
    linkType,
    lastVerified,
  };
}
function generateRows(n = 240) {
  return Array.from({ length: n }, (_, i) => makeRow(i + 1));
}

/* ───────────────────────── Badges & pills (branded icons) ───────────────────────── */

const TypePill = ({ type }: { type: RedirectType }) => {

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ color: TK.text }}
    >
      <Link2 size={14} style={{ color: TK.brand }} />
      {type}
    </span>
  );
};

const DepthPill = ({ d }: { d: number }) => {
  const depth = d >= 3 ? 3 : d;
  const label = depth === 1 ? "1‑hop" : depth === 2 ? "2‑hop" : "3+";
  const border = depth === 1 ? TK.success : depth === 2 ? TK.warning : TK.critical;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ border: `1px solid ${border}`, color: TK.text }}
    >
      <Layers size={14} style={{ color: TK.brand }} />
      {label}
    </span>
  );
};

/* ───────────────────────── Column control popover ───────────────────────── */

function ColumnsPopover({
  open,
  onClose,
  visible,
  setVisible,
}: {
  open: boolean;
  onClose: () => void;
  visible: Record<string, boolean>;
  setVisible: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const ref = useOutsideClose<HTMLDivElement>(onClose);
  if (!open) return null;
  return (
    <div ref={ref} className="absolute right-0 mt-2 z-50 min-w-[260px]">
      <div
        className="bg-white border rounded shadow p-2"
        style={{ borderColor: TK.border }}
      >
        <div className="text-sm font-medium mb-1">Show / Hide Columns</div>
        <div className="grid gap-1 max-h-[260px] overflow-auto pr-1">
          {[
            { key: "select", label: "Select" },
            { key: "anchor", label: "Anchor Text" },
            { key: "source", label: "Source Page" },
            { key: "original", label: "Original Target URL" },
            { key: "final", label: "Final Destination URL" },
            { key: "type", label: "Redirect Type" },
            { key: "depth", label: "Chain Depth" },
            { key: "last", label: "Last Verified" },
            { key: "actions", label: "Actions" },
          ].map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 text-sm"
            >
              <input
                type="checkbox"
                checked={visible[c.key] !== false}
                onChange={(e) =>
                  setVisible((v) => ({ ...v, [c.key]: e.target.checked }))
                }
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          <button
            type="button"
            className="px-2.5 py-1.5 border rounded text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border }}
            onClick={() =>
              setVisible({
                select: true,
                anchor: true,
                source: true,
                original: true,
                final: true,
                type: true,
                depth: true,
                last: true,
                actions: true,
              })
            }
          >
            Reset
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 border rounded text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Filters bar ───────────────────────── */

type Filters = {
  types: RedirectType[];
  depths: number[]; // 1,2,3 (3 means 3+)
  linkType: "all" | LinkType;
  qAnchor: string;
  qTarget: string;
};

function FiltersBar({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  const { types, depths, linkType, qAnchor, qTarget } = filters;
  return (
    <>
      {/* Bar */}
      <div className="bg-white border-b" style={{ borderColor: TK.border }}>
        <div className="px-3 py-3 flex flex-wrap items-center gap-2">
          {/* Redirect Type chips */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B7280]">Type:</span>
            {REDIRECT_TYPES.map((t) => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-2 rounded-full border text-sm",
                    on ? "ring-2" : "hover:bg-gray-50"
                  )}
                  style={{
                    borderColor:
                      t === "301"
                        ? TK.success
                        : t === "302" || t === "307"
                          ? TK.warning
                          : TK.critical,
                    boxShadow: on ? `0 0 0 2px ${TK.brand}33` : undefined,
                  }}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      types: on ? f.types.filter((x) => x !== t) : [...f.types, t],
                    }))
                  }
                >
                  <TypePill type={t} />
                </button>
              );
            })}
          </div>

          {/* Chain Depth chips */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B7280] ml-1">Depth:</span>
            {[1, 2, 3].map((d) => {
              const on = depths.includes(d);
              return (
                <button
                  key={d}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-2 rounded-full border text-sm",
                    on ? "ring-2" : "hover:bg-gray-50"
                  )}
                  style={{
                    borderColor: d === 1 ? TK.success : d === 2 ? TK.warning : TK.critical,
                    boxShadow: on ? `0 0 0 2px ${TK.brand}33` : undefined,
                  }}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      depths: on ? f.depths.filter((x) => x !== d) : [...f.depths, d],
                    }))
                  }
                >
                  <DepthPill d={d} />
                </button>
              );
            })}
          </div>

          {/* Link type segmented */}
          <div
            className="inline-flex rounded-lg overflow-hidden border ml-1"
            style={{ borderColor: TK.border }}
          >
            {(["all", "internal", "external"] as const).map((t, i) => (
              <button
                key={t}
                className={cn(
                  "px-3 h-8 text-sm",
                  i !== 2 && "border-r",
                  linkType === t ? "bg-[#D9EEF8] text-[#0b5f7e]" : "bg-white text-[#111827] hover:bg-gray-50"
                )}
                style={{ borderColor: TK.border }}
                onClick={() => setFilters((f) => ({ ...f, linkType: t }))}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Search: anchor */}
          <div className="relative ml-1">
            <input
              value={qAnchor}
              onChange={(e) => setFilters((f) => ({ ...f, qAnchor: e.target.value }))}
              placeholder="Search anchor…"
              className="h-8 pl-8 pr-3 rounded border text-sm"
              style={{ borderColor: TK.border }}
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Search: target */}
          <div className="relative">
            <input
              value={qTarget}
              onChange={(e) => setFilters((f) => ({ ...f, qTarget: e.target.value }))}
              placeholder="Domain / Target URL…"
              className="h-8 pl-8 pr-3 rounded border text-sm"
              style={{ borderColor: TK.border }}
            />
            <Filter className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Date range (placeholder) */}
          <button
            type="button"
            className="ml-auto px-2.5 h-8 rounded border text-sm inline-flex items-center gap-2 hover:bg-gray-50"
            style={{ borderColor: TK.border }}
          >
            <Calendar className="w-4 h-4" /> Last Verified
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      <div className="px-3 py-2 bg-white border-b" style={{ borderColor: TK.border }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#6B7280] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Active:
          </span>
          {types.map((t) => (
            <Chip key={`t-${t}`} onRemove={() => setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) }))}>
              <Link2 size={13} style={{ color: TK.brand }} /> Type: {t}
            </Chip>
          ))}
          {depths.map((d) => (
            <Chip key={`d-${d}`} onRemove={() => setFilters((f) => ({ ...f, depths: f.depths.filter((x) => x !== d) }))}>
              <Layers size={13} style={{ color: TK.brand }} /> Depth: {d === 3 ? "3+" : d}
            </Chip>
          ))}
          {linkType !== "all" && (
            <Chip onRemove={() => setFilters((f) => ({ ...f, linkType: "all" }))}>
              <ArrowRightLeft size={13} style={{ color: TK.brand }} /> Link: {linkType}
            </Chip>
          )}
          {qAnchor && (
            <Chip onRemove={() => setFilters((f) => ({ ...f, qAnchor: "" }))}>
              <Search size={13} style={{ color: TK.brand }} /> {qAnchor}
            </Chip>
          )}
          {qTarget && (
            <Chip onRemove={() => setFilters((f) => ({ ...f, qTarget: "" }))}>
              <Filter size={13} style={{ color: TK.brand }} /> {qTarget}
            </Chip>
          )}
          {!types.length && !depths.length && linkType === "all" && !qAnchor && !qTarget && (
            <span className="text-xs text-[#9CA3AF]">None</span>
          )}
        </div>
      </div>
    </>
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#D9EEF8] text-[#0b5f7e] text-[12px]"
      role="button"
    >
      {children}
      {onRemove && (
        <button aria-label="Remove" onClick={onRemove} className="hover:opacity-80">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
}

/* ───────────────────────── Icon button for actions ───────────────────────── */

function IconButton({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded border hover:bg-gray-50",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
      style={{ borderColor: TK.border, color: TK.brand }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Main Section: Redirect Table ───────────────────────── */

export default function RedirectTableSection({ apiRows }) {

  const [rows, setRows] = useState<Row[]>(apiRows);
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();
  const projectId = selectedProject?.id ?? null;
  const handleCreateTask = useCallback(
    (row: Row) => {
      const title = row.anchor?.trim() ? row.anchor : row.sourceUrl;
      openTaskDrawer({
        title,
        description: `Review redirect from ${row.sourceUrl} to ${row.finalUrl}.`,
        projectId,
        type: "createNew",
      });
    },
    [openTaskDrawer, projectId],
  );

  useEffect(() => {
    setRows(apiRows ?? []);
    setSelected({});         // clear selection as dataset changed
    setPage(1);              // go back to page 1
  }, [apiRows]);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    types: [],
    depths: [],
    linkType: "all",
    qAnchor: "",
    qTarget: "",
  });

  // Columns control
  const [colsOpen, setColsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    select: true,
    anchor: true,
    source: true,
    original: true,
    final: true,
    type: true,
    depth: true,
    last: true,
    actions: true,
  });

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  // Filtered dataset (reference design: filter → paginate)
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filters.types.length && !filters.types.includes(r.redirectType)) return false;
      if (filters.depths.length) {
        const d = r.chainDepth >= 3 ? 3 : r.chainDepth;
        if (!filters.depths.includes(d)) return false;
      }
      if (filters.linkType !== "all" && r.linkType !== filters.linkType) return false;
      if (filters.qAnchor && !((r.anchor || "(image)").toLowerCase().includes(filters.qAnchor.toLowerCase())))
        return false;
      if (
        filters.qTarget &&
        !(r.originalTarget + " " + r.finalUrl).toLowerCase().includes(filters.qTarget.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, filters]);

  // Pagination (reference pattern)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );  

  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);
  const someOnPage = pageRows.some((r) => selected[r.id]) && !allOnPage;

  const toggleSelectAllPage = (on: boolean) => {
    const next = { ...selected };
    pageRows.forEach((r) => (next[r.id] = on));
    setSelected(next);
  };

  // Export CSV (filtered; if any selected → only selected)
  const exportCSV = () => {
    const dataset = selectedIds.length ? filtered.filter((r) => selected[r.id]) : filtered;
    const cols = [
      "id",
      "anchor",
      "sourcePath",
      "sourceUrl",
      "originalTarget",
      "finalUrl",
      "redirectType",
      "chainDepth",
      "linkType",
      "lastVerified",
    ] as const;
    const header = cols.join(",");
    const lines = dataset
      .map((r) => cols.map((k) => JSON.stringify((r as any)[k] ?? "")).join(","))
      .join("\n");
    downloadText("redirects.csv", `${header}\n${lines}`);
  };

  // Reset filters
  const resetAll = () =>
    setFilters({ types: [], depths: [], linkType: "all", qAnchor: "", qTarget: "" });

  // state
const [chainModalOpen, setChainModalOpen] = React.useState(false);
const [chainRow, setChainRow] = React.useState<any | null>(null);

// open/close
const openChainModal = (row: any) => {
  setChainRow(row);
  setChainModalOpen(true);
};
const closeChainModal = () => {
  setChainModalOpen(false);
  setChainRow(null);
};

// status chip
const statusTag = (code: number) => {
  const family = Math.floor(code / 100);
  if (family === 2) return <Tag color="green">{code}</Tag>;
  if (family === 3) return <Tag color="gold">{code}</Tag>;
  if (family === 4 || family === 5) return <Tag color="red">{code}</Tag>;
  return <Tag>{code}</Tag>;
};

// summary
const chainSummary = (row: any) => {
  if (!row) return { totalRedirects: 0, finalStatus: null, loop: false };
  const chain: Array<{ url: string; status: number }> = row.chain || [];
  const totalRedirects = Math.max(0, (row.chainDepth ?? chain.length - 1) || 0);
  const finalStatus = chain.length ? chain[chain.length - 1].status : null;
  const seen = new Set<string>();
  let loop = false;
  chain.forEach(s => {
    if (seen.has(s.url)) loop = true;
    seen.add(s.url);
  });
  return { totalRedirects, finalStatus, loop };
};


  /* ───────────────────────── Render ───────────────────────── */

  return (
    <section className="border" >
      <div className="w-full mx-auto">
        {/* Header bar (title • columns • export) */}
        <div className="bg-white border rounded-t-md px-3 py-3 flex items-center justify-between" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            {/* Branded icon for section title */}
            <ArrowRightLeft className="h-5 w-5" style={{ color: TK.brand }} aria-hidden />
            <h3 className="m-0 text-[16px] font-medium" style={{ color: TK.text }}>
              Redirect Table
            </h3>
          </div>
          <div className="relative flex items-center gap-2">
            {/* Column control button (reference design) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColsOpen((v) => !v)}
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.border }}
              >
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </button>
              <ColumnsPopover
                open={colsOpen}
                onClose={() => setColsOpen(false)}
                visible={visibleCols}
                setVisible={setVisibleCols}
              />
            </div>

            {/* Export — plain button (no colored background) */}
            <button
              type="button"
              onClick={exportCSV}
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.border }}
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {/* Filters bar (immediately below header) */}
        <FiltersBar filters={filters} setFilters={setFilters} />

        {/* Bulk bar (reference pattern): simple count + quick clear */}
        {selectedIds.length > 0 && (
          <div
            className="bg-white border-b px-3 py-2 flex items-center gap-2"
            style={{ borderColor: TK.border }}
          >
            <div className="text-sm">
              <strong>{selectedIds.length}</strong> selected
            </div>
            <button
              type="button"
              className="ml-auto px-2.5 h-8 rounded border text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border }}
              onClick={() => setSelected({})}
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border-b border-x" style={{ borderColor: TK.border }}>
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: TK.border }}>
                <tr className="text-left text-[12px] text-[#6B7280]">
                  {visibleCols.select && (
                    <th className="w-12 px-3 py-2 sticky left-0 bg-white z-20">
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        ref={(el) => {
                          if (el) el.indeterminate = someOnPage;
                        }}
                        onChange={(e) => toggleSelectAllPage(e.target.checked)}
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
                  {visibleCols.anchor && (
                    <th className="px-3 py-2 sticky left-12 bg-white z-10">Anchor Text</th>
                  )}
                  {visibleCols.source && <th className="px-3 py-2">Source Page</th>}
                  {visibleCols.original && <th className="px-3 py-2">Original Target URL</th>}
                  {visibleCols.final && <th className="px-3 py-2">Final Destination URL</th>}
                  {visibleCols.type && <th className="px-3 py-2">Redirect Type</th>}
                  {visibleCols.depth && <th className="px-3 py-2">Chain Depth</th>}
                  {visibleCols.last && <th className="px-3 py-2">Last Verified</th>}
                  {visibleCols.actions && <th className="px-3 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const isDanger = r.chainDepth >= 3;
                  return (
                    <tr
                      key={r.id}
                      className={cn("border-b hover:bg-[#F9FAFB]", isDanger && "bg-red-50/40")}
                      style={{ borderColor: TK.border }}
                    >
                      {visibleCols.select && (
                        <td className="px-3 py-2 sticky left-0 bg-white z-20">
                          <input
                            type="checkbox"
                            checked={!!selected[r.id]}
                            onChange={(e) =>
                              setSelected((s) => ({ ...s, [r.id]: e.target.checked }))
                            }
                            aria-label={`Select ${r.id}`}
                          />
                        </td>
                      )}

                      {visibleCols.anchor && (
                        <td className="px-3 py-2 sticky left-12 bg-white z-10 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            {r.anchor ? (
                              <span className="text-[#111827] font-medium">{r.anchor}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-[#6B7280] border rounded px-1.5 py-0.5">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-3.5 h-3.5"
                                >
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <path d="M21 15l-5-5L5 21" />
                                </svg>
                                Image only
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#6B7280]">Source anchor</div>
                        </td>
                      )}

                      {visibleCols.source && (
                        <td className="px-3 py-2 min-w-[200px]">
                          <a
                            href={r.sourceUrl}
                            className="hover:underline"
                            style={{ color: TK.actionBlue }}
                            title={r.sourceUrl}
                          >
                            {r.sourcePath}
                          </a>
                        </td>
                      )}

                      {visibleCols.original && (
                        <td className="px-3 py-2 min-w-[280px]">
                          <div className="flex items-center gap-2">
                            <a
                              className="truncate max-w-[280px] hover:underline"
                              style={{ color: TK.actionBlue }}
                              href={r.originalTarget}
                              target="_blank"
                              rel="noreferrer"
                              title={r.originalTarget}
                            >
                              {r.originalTarget}
                            </a>
                            <IconButton
                              title="Copy URL"
                              onClick={() => navigator.clipboard?.writeText(r.originalTarget)}
                            >
                              <Copy size={16} />
                            </IconButton>
                            <IconButton
                              title="Open in new tab"
                              onClick={() => window.open(r.originalTarget, "_blank")}
                            >
                              <ExternalLink size={16} />
                            </IconButton>
                          </div>
                        </td>
                      )}

                      {visibleCols.final && (
                        <td className="px-3 py-2 min-w-[280px]">
                          <div className="flex items-center gap-2">
                            <a
                              className="truncate max-w-[280px] hover:underline"
                              style={{ color: TK.actionBlue }}
                              href={r.finalUrl}
                              target="_blank"
                              rel="noreferrer"
                              title={r.finalUrl}
                            >
                              {r.finalUrl}
                            </a>
                            {r.originalTarget !== r.finalUrl && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border"
                                style={{ borderColor: TK.warning }}
                              >
                                <ChevronRight className="w-3 h-3" /> redirected
                              </span>
                            )}
                          </div>
                          {/* tiny chain preview */}
                          <div className="mt-1 text-xs text-[#6B7280] flex items-center gap-1">
                            {r.chain.slice(0, 3).map((c, idx) => (
                              <React.Fragment key={idx}>
                                <span
                                  className="truncate max-w-[140px]"
                                  title={`${c.url} (${c.status})`}
                                >
                                  {new URL(c.url).hostname}
                                </span>
                                {idx < r.chain.length - 1 && <ChevronRight className="w-3 h-3" />}
                              </React.Fragment>
                            ))}
                            {r.chain.length > 3 && <span className="text-gray-400">…</span>}
                          </div>
                        </td>
                      )}

                      {visibleCols.type && (
                        <td className="px-3 py-2">
                          <TypePill type={r.redirectType} />
                        </td>
                      )}

                      {visibleCols.depth && (
                        <td className="px-3 py-2">
                          <DepthPill d={r.chainDepth} />
                        </td>
                      )}

                      {visibleCols.last && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(r.lastVerified).toLocaleString()}
                        </td>
                      )}

                      {visibleCols.actions && (
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <IconButton
                              title="View redirect chain"
  onClick={() => openChainModal(r)}
                            >
                              <Layers size={16} />
                            </IconButton>
                            <IconButton
                              title="Replace link with final"
                              onClick={() =>
                                openTaskDrawer({
                                  title: "Replace link with final",
                                  description: [
                                    `Update the source page to use the final destination URL.`,
                                    ``,
                                    `Source page: ${r.sourceUrl}`,
                                    `Original target: ${r.originalTarget}`,
                                    `Final destination: ${r.finalUrl}`,
                                    ``,
                                    `Acceptance: Source page updated so anchor points to final destination (no redirect hop).`
                                  ].join("\n"),
                                  projectId,
                                  type: "createNew",
                                })
                              }
                            >
                              <ChevronRight size={16} />
                            </IconButton>

                            <IconButton
                              title="Create fix task"
                              onClick={() => handleCreateTask(r)}
                            >
                              <ClipboardList size={16} />
                            </IconButton>
                            <IconButton title="Mark resolved (disabled — API not available)" disabled>
                              <Check size={16} />
                            </IconButton>


                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: pagination (reference pattern) */}
        <div
          className="bg-white border border-t-0 rounded-b-md px-3 py-3 flex items-center justify-between text-sm"
          style={{ borderColor: TK.border }}
        >
          <div className="flex items-center gap-3">
            <div>
              Showing{" "}
              <span className="font-medium">
                {filtered.length ? (page - 1) * pageSize + 1 : 0}
              </span>
              –
              <span className="font-medium">
                {Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="font-medium">{filtered.length}</span>
            </div>
            <div className="flex items-center gap-1">
              {[10, 25, 50, 100].map((sz) => (
                <button
                  key={sz}
                  className={cn(
                    "px-2 h-7 rounded-full border text-xs",
                    pageSize === sz
                      ? "ring-2 ring-[#4286F5] border-[#4286F5] font-medium"
                      : "border-gray-200"
                  )}
                  onClick={() => {
                    setPageSize(sz);
                    setPage(1);
                  }}
                >
                  {sz}/pg
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 h-8 rounded border disabled:opacity-40"
              style={{ borderColor: TK.border }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              Page {page} / {pageCount}
            </div>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-2 h-8 rounded border disabled:opacity-40"
              style={{ borderColor: TK.border }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Clear all filters (utility) */}
            <button
              type="button"
              onClick={resetAll}
              className="ml-2 px-2.5 h-8 rounded border text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <Modal
  open={chainModalOpen}
  onCancel={closeChainModal}
  title="Redirect Chain Analysis"
  width={720}
  footer={[
    <button
      key="close"
      onClick={closeChainModal}
      className="px-3 py-1.5 rounded border"
      style={{ borderColor: TK.border }}
    >
      Close
    </button>,
    <button
      key="task"
      onClick={() => {
        if (!chainRow) return;
        openTaskDrawer({
          title: "Create Fix Task",
          description: [
            `Investigate and fix the redirect chain for the link.`,
            ``,
            `Anchor: ${chainRow.anchor}`,
            `Source page: ${chainRow.sourceUrl}`,
            `Original target: ${chainRow.originalTarget}`,
            `Final destination: ${chainRow.finalUrl}`,
            ``,
            `Current chain:`,
            ...(chainRow.chain || []).map((c: any, i: number) => `  ${i + 1}. [${c.status}] ${c.url}`),
            ``,
            `Acceptance: Either remove the hop(s) or update the page to link directly to the final destination.`
          ].join("\n"),
          projectId,
          type: "createNew",
        });
      }}
      className="px-3 py-1.5 rounded text-white"
      style={{ backgroundColor: TK.valueBlue }}
    >
      Create Fix Task
    </button>,
  ]}
>
  {(() => {
    const { totalRedirects, finalStatus, loop } = chainSummary(chainRow);
    const chain: Array<{ url: string; status: number }> = chainRow?.chain || [];

    return (
      <div className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 rounded-md p-3"
             style={{ backgroundColor: "#F8FAFC", border: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <span className="font-medium">Total Redirects</span>
            <Badge count={totalRedirects} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Final Status</span>
            {finalStatus != null ? statusTag(finalStatus) : <Tag>—</Tag>}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Loop Detected</span>
            {loop ? (
              <span className="inline-flex items-center gap-1 text-red-600">
                <X size={16} /> Yes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-green-600">
                <Check size={16} /> No
              </span>
            )}
          </div>
        </div>

        {/* Chain table */}
        <div className="rounded-md border" style={{ borderColor: TK.borderLight }}>
          <div className="grid grid-cols-[56px_1fr_120px_160px] text-sm font-medium border-b"
               style={{ borderColor: TK.borderLight, background: "#FCFDFF" }}>
            <div className="px-3 py-2">#</div>
            <div className="px-3 py-2">Redirect URL</div>
            <div className="px-3 py-2">HTTP STATUS</div>
            <div className="px-3 py-2">NOTES</div>
          </div>

          {chain.map((hop, idx) => {
            const isFinal = idx === chain.length - 1;
            const notes = isFinal ? "Final destination" : "Hop";
            return (
              <div
                key={hop.url + idx}
                className="grid grid-cols-[56px_1fr_120px_160px] text-sm border-b items-center"
                style={{ borderColor: TK.borderLight }}
              >
                <div className="px-3 py-2">{idx + 1}</div>
                <div className="px-3 py-2 break-words ">
                  <a href={hop.url} target="_blank" rel="noreferrer" className="text-[#0077FF] hover:underline ">
                    {hop.url}
                  </a>
                </div>
                <div className="px-3 py-2">{statusTag(hop.status)}</div>
                <div className="px-3 py-2 text-gray-500 italic">{notes}</div>
              </div>
            );
          })}
          {chain.length === 0 && (
            <div className="p-3 text-sm text-gray-500">No chain data available for this row.</div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: "#10B981" }} />
            <span>200 OK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
            <span>3xx Redirects</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: "#EF4444" }} />
            <span>4xx/5xx Errors</span>
          </div>
        </div>
      </div>
    );
  })()}
</Modal>

    </section>
  );
}
