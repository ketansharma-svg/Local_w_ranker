"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrokenLinksData, BrokenLinksRow } from "../broken-links-tab";
import {
  Unlink,
  Columns3,
  Download,
  Filter,
  RefreshCw,
  Search,
  X,
  Calendar as CalendarIcon,
  AlertTriangle,
  ServerCrash,
  Timer,
  WifiOff,
  Link2,
  ExternalLink,
  Image as ImageIcon,
  Type as TypeIcon,
  MousePointerClick,
  Wrench,
  ClipboardList,
  ClipboardCopy,
  Eye,
} from "lucide-react";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/** ───────────────────────── Tokens & small utils ───────────────────────── */

const TK = {
  brand: "#008CCD", // branded icons
  actionBlue: "#0077FF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  bg: "#FFFFFF",
  appBg: "#F5F7FA",
  critical: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  radius: 8,
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

/** ───────────────────────── Mock data ───────────────────────── */

type StatusCode = "404" | "410" | "timeout" | "dns" | "5xx" | "error" | "other";

type Row = {
  id: string;
  anchor: string;
  anchorType: "text" | "generic" | "image";
  sourcePath: string;
  sourceUrl: string;
  targetUrl: string;
  linkType: "internal" | "external";
  statusCode: StatusCode;
  lastChecked: string;
  priorityScore: number;
  raw?: unknown;
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeStatusCode = (value: unknown): StatusCode => {
  if (value === 404 || value === "404") return "404";
  if (value === 410 || value === "410") return "410";
  const str = String(value ?? "").toLowerCase();
  if (str.includes("timeout")) return "timeout";
  if (str.includes("dns")) return "dns";
  if (str.startsWith("5")) return "5xx";
  if (str.includes("error")) return "error";
  return "other";
};

const normalizeAnchorType = (value: unknown): Row["anchorType"] => {
  const str = String(value ?? "").toLowerCase();
  if (str === "image" || str === "img") return "image";
  if (str === "generic") return "generic";
  return "text";
};

const parseUrlPath = (input: unknown): { url: string; path: string } => {
  if (typeof input !== "string" || !input) return { url: "", path: "" };
  try {
    const url = new URL(input);
    return { url: url.toString(), path: url.pathname || "/" };
  } catch {
    return { url: input, path: input.startsWith("http") ? "/" : input };
  }
};

const mapRow = (item: BrokenLinksRow | undefined, index: number): Row => {
  const anchorText =
    (typeof item?.anchor_text === "string" && item?.anchor_text.trim()) ||
    (typeof (item as any)?.anchor === "string" && (item as any)?.anchor.trim()) ||
    "Untitled anchor";
  const anchorType = normalizeAnchorType(item?.anchor_type ?? (item as any)?.anchor_type);
  const source = parseUrlPath(
    item?.source_url ?? item?.source_page ?? (item as any)?.page_url ?? (item as any)?.page,
  );
  const target =
    typeof (item as any)?.target_url === "string"
      ? (item as any)?.target_url
      : typeof (item as any)?.broken_target_url === "string"
      ? (item as any)?.broken_target_url
      : "";
  const linkType =
    String(item?.link_type ?? (item as any)?.link_type ?? "").toLowerCase() === "external"
      ? "external"
      : "internal";
  const lastChecked =
    (typeof item?.last_checked === "string" && item?.last_checked) ||
    (typeof (item as any)?.last_crawled === "string" && (item as any)?.last_crawled) ||
    new Date().toISOString();
  const statusCode = normalizeStatusCode(
    item?.status_code ?? (item as any)?.status_code ?? (item as any)?.http_status?.code,
  );
  const priorityScore = Math.max(
    0,
    Math.min(
      100,
      toNumber(
        (item as any)?.priority_score ??
          (item as any)?.priority ??
          (item as any)?.priorityScore ??
          (item as any)?.priority_score,
      ),
    ),
  );

  return {
    id: item?.id !== undefined ? String(item.id) : `row-${index + 1}`,
    anchor: anchorText,
    anchorType,
    sourcePath: source.path || "/",
    sourceUrl: source.url || source.path || "",
    targetUrl: target,
    linkType,
    statusCode,
    lastChecked,
    priorityScore,
    raw: item,
  };
};

const STATUS_OPTIONS: StatusCode[] = ["404", "410", "timeout", "dns", "5xx", "error", "other"];
const ANCHOR_OPTIONS: Row["anchorType"][] = ["text", "generic", "image"];

/** ───────────────────────── Icons & badges ───────────────────────── */

const LinkTypeBadge = ({ type }: { type: Row["linkType"] }) => {
  const Icon = type === "internal" ? Link2 : ExternalLink;
  const label = type === "internal" ? "Internal" : "External";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <Icon size={14} style={{ color: TK.brand }} />
      <span>{label}</span>
    </span>
  );
};

const AnchorTypeBadge = ({ a }: { a: Row["anchorType"] }) => {
  const Icon = a === "image" ? ImageIcon : a === "generic" ? MousePointerClick : TypeIcon;
  const label = a === "image" ? "Image" : a === "generic" ? "Generic" : "Text";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <Icon size={14} style={{ color: TK.brand }} />
      <span>{label}</span>
    </span>
  );
};

const statusMeta: Record<
  string,
  { label: string; color: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  "404": { label: "Not Found", color: TK.critical, Icon: AlertTriangle },
  "410": { label: "Gone", color: TK.critical, Icon: AlertTriangle },
  timeout: { label: "Timeout", color: TK.warning, Icon: Timer },
  dns: { label: "DNS Error", color: TK.warning, Icon: WifiOff },
  "5xx": { label: "Server Error", color: TK.critical, Icon: ServerCrash },
  error: { label: "Error", color: TK.warning, Icon: AlertTriangle },
  other: { label: "Other", color: TK.muted, Icon: AlertTriangle },
};

const StatusBadge = ({ code }: { code: Row["statusCode"] }) => {
  const meta = statusMeta[code] ?? statusMeta.other;
  const { label, color, Icon } = meta;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <Icon size={14} />
      <span className="tabular-nums">{code}</span>
      <span className="text-[#6B7280]">({label})</span>
    </span>
  );
};

/** ───────────────────────── Tiny primitives ───────────────────────── */

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#D9EEF8] text-[#0b5f7e] text-[12px]">
      {children}
      {onRemove && (
        <button
          aria-label="Remove filter"
          onClick={onRemove}
          className="hover:opacity-80"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
}

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

/** ───────────────────────── Filters Bar ───────────────────────── */

type Filters = {
  linkType: "all" | "internal" | "external";
  statusCodes: Row["statusCode"][];
  anchorType: "" | Row["anchorType"];
  q: string;
};

function FiltersBar({
  filters,
  setFilters,
  statusCounts,
  onColumns,
  onExport,
  onReset,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  statusCounts: Partial<Record<Row["statusCode"], number>>;
  onColumns: () => void;
  onExport: () => void;
  onReset: () => void;
}) {
  const [openStatus, setOpenStatus] = useState(false);
  const [openAnchor, setOpenAnchor] = useState(false);
  const statusRef = useOutsideClose<HTMLDivElement>(() => setOpenStatus(false));
  const anchorRef = useOutsideClose<HTMLDivElement>(() => setOpenAnchor(false));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-white" style={{ borderColor: TK.border }}>
        {/* Section header title with branded icon */}
        <div className="flex items-center gap-2 mr-2 w-full">
          <Unlink className="h-5 w-5" style={{ color: TK.brand }} aria-hidden />
          <h3 className="m-0 text-[15px] font-medium" style={{ color: TK.text }}>
            Broken Links
          </h3>
        </div>

        {/* Link type segmented */}
        <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: TK.border }}>
          {(["all", "internal", "external"] as const).map((t, i) => (
            <button
              key={t}
              type="button"
              className={cn(
                "px-3 py-1.5 text-xs",
                i !== 2 && "border-r",
                filters.linkType === t ? "bg-[#D9EEF8] text-[#0b5f7e]" : "bg-white text-[#111827] hover:bg-gray-50"
              )}
              style={{ borderColor: TK.border }}
              onClick={() => setFilters((f) => ({ ...f, linkType: t }))}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Status filter (popover) */}
        <div className="relative" ref={statusRef}>
          <button
            type="button"
            onClick={() => setOpenStatus((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 border rounded text-xs hover:bg-gray-50"
            style={{ borderColor: TK.border }}
          >
            <Filter className="w-4 h-4" /> Status
          </button>
          {openStatus && (
            <div className="absolute z-40 mt-1 min-w-[220px] bg-white border rounded shadow p-1" style={{ borderColor: TK.border }}>
              {STATUS_OPTIONS.filter((s) => statusCounts[s] || filters.statusCodes.includes(s)).map((s) => (
                <label key={s} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.statusCodes.includes(s)}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        statusCodes: e.target.checked ? [...f.statusCodes, s] : f.statusCodes.filter((x) => x !== s),
                      }))
                    }
                  />
                  <StatusBadge code={s} />
                  <span className="ml-auto text-[12px] text-[#6B7280]">({statusCounts[s] || 0})</span>
                </label>
              ))}
              <div className="px-2 py-1.5">
                <button
                  type="button"
                  className="text-xs text-[#6B7280] underline"
                  onClick={() => setFilters((f) => ({ ...f, statusCodes: [] }))}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Anchor type (popover) */}
        <div className="relative" ref={anchorRef}>
          <button
            type="button"
            onClick={() => setOpenAnchor((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 border rounded text-xs hover:bg-gray-50"
            style={{ borderColor: TK.border }}
          >
            <Filter className="w-4 h-4" /> Anchor Type
          </button>
          {openAnchor && (
            <div className="absolute z-40 mt-1 min-w-[200px] bg-white border rounded shadow p-1" style={{ borderColor: TK.border }}>
              {ANCHOR_OPTIONS.map((a) => (
                <label key={a} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 text-sm">
                  <input
                    type="radio"
                    name="anchorType"
                    checked={filters.anchorType === a}
                    onChange={() => setFilters((f) => ({ ...f, anchorType: a }))}
                  />
                  <AnchorTypeBadge a={a} />
                </label>
              ))}
              <div className="px-2 py-1.5">
                <button
                  type="button"
                  className="text-xs text-[#6B7280] underline"
                  onClick={() => setFilters((f) => ({ ...f, anchorType: "" }))}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 border rounded ml-1" style={{ borderColor: TK.border }}>
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="outline-none text-sm w-56"
            placeholder="Search domain / path…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>

        {/* Right-side controls: Date, Columns, Export, Reset */}
        <div className="ml-auto flex items-center gap-2">
          {/* <button disabled type="button" className="flex items-center gap-2 px-2.5 py-1.5 border rounded hover:bg-gray-50" style={{ borderColor: TK.border }}>
            <CalendarIcon className="w-4 h-4" /> Date range
          </button> */}

          <button
            type="button"
            onClick={onColumns}
            className="flex items-center gap-2 px-2.5 py-1.5 border rounded hover:bg-gray-50"
            style={{ borderColor: TK.border }}
          >
            <Columns3 className="w-4 h-4" /> Columns
          </button>

          {/* Plain export button (no colored background) */}
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 px-2.5 py-1.5 border rounded hover:bg-gray-50"
            style={{ borderColor: TK.border }}
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 px-2.5 py-1.5 border rounded hover:bg-gray-50"
            style={{ borderColor: TK.border }}
          >
            <X className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Filter chips row */}
      <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b bg-white" style={{ borderColor: TK.border }}>
        <span className="text-xs text-[#6B7280] flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Active filters:
        </span>
        {filters.linkType !== "all" && (
          <Chip onRemove={() => setFilters((f) => ({ ...f, linkType: "all" }))}>
            <Link2 size={13} style={{ color: TK.brand }} /> Link: {filters.linkType}
          </Chip>
        )}
        {filters.statusCodes.map((s) => (
          <Chip key={s} onRemove={() => setFilters((f) => ({ ...f, statusCodes: f.statusCodes.filter((x) => x !== s) }))}>
            {React.createElement((statusMeta[s] ?? statusMeta.other).Icon, { size: 13 })}
            Status: {s}
          </Chip>
        ))}
        {!!filters.anchorType && (
          <Chip onRemove={() => setFilters((f) => ({ ...f, anchorType: "" }))}>
            {React.createElement(
              filters.anchorType === "image" ? ImageIcon : filters.anchorType === "generic" ? MousePointerClick : TypeIcon,
              { size: 13, style: { color: TK.brand } }
            )}
            Anchor: {filters.anchorType}
          </Chip>
        )}
        {!!filters.q && (
          <Chip onRemove={() => setFilters((f) => ({ ...f, q: "" }))}>
            <Search size={13} style={{ color: TK.brand }} /> {filters.q}
          </Chip>
        )}
        {!(
          filters.linkType !== "all" ||
          filters.statusCodes.length ||
          filters.anchorType ||
          filters.q
        ) && <span className="text-xs text-[#9CA3AF]">None</span>}
      </div>
    </>
  );
}

/** ───────────────────────── Column Control Popover ───────────────────────── */

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
  const ref = useOutsideClose<HTMLDivElement>(() => onClose());
  if (!open) return null;
  return (
    <div className="absolute right-3 top-[70px] z-50" ref={ref}>
      <div className="min-w-[260px] bg-white border rounded shadow p-2" style={{ borderColor: TK.border }}>
        <div className="text-sm font-medium mb-1">Show / Hide Columns</div>
        <div className="grid grid-cols-1 gap-1 max-h-[260px] overflow-auto pr-1">
          {[
            { key: "select", label: "Select" },
            { key: "anchor", label: "Anchor" },
            { key: "anchorType", label: "Anchor Type" },
            { key: "source", label: "Source Page" },
            { key: "target", label: "Broken Target URL" },
            { key: "linkType", label: "Link Type" },
            { key: "status", label: "HTTP Status" },
            { key: "last", label: "Last Checked" },
            { key: "actions", label: "Actions" },
          ].map((c) => (
            <label key={c.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 text-sm">
              <input
                type="checkbox"
                checked={visible[c.key] !== false}
                onChange={(e) => setVisible((v) => ({ ...v, [c.key]: e.target.checked }))}
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
                anchorType: true,
                source: true,
                target: true,
                linkType: true,
                status: true,
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

/** ───────────────────────── Table Section ───────────────────────── */

export default function BrokenLinksTableSection() {
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();
  const [filters, setFilters] = useState<Filters>({
    linkType: "all",
    statusCodes: [],
    anchorType: "",
    q: "",
  });
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    select: true,
    anchor: true,
    anchorType: true, // ← NEW COLUMN
    source: true,
    target: true,
    linkType: true,
    status: true,
    last: true,
    actions: true,
  });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const { data: apiData, loading, error, refetch } = useBrokenLinksData();

  const rows = useMemo(
    () => (Array.isArray(apiData?.rows) ? apiData?.rows.map((row, index) => mapRow(row, index)) : []),
    [apiData?.rows],
  );

  useEffect(() => {
    setSelected({});
    setPage(1);
  }, [rows]);

  useEffect(() => {
    setPage(1);
  }, [filters.linkType, filters.statusCodes, filters.anchorType, filters.q]);

  const visibleColumnCount = useMemo(
    () => Object.entries(visibleCols).filter(([, value]) => value !== false).length,
    [visibleCols],
  );

  // Filtered rows
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filters.linkType !== "all" && r.linkType !== filters.linkType) return false;
      if (filters.statusCodes.length && !filters.statusCodes.includes(r.statusCode)) return false;
      if (filters.anchorType && r.anchorType !== filters.anchorType) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (
          !r.targetUrl.toLowerCase().includes(q) &&
          !r.sourcePath.toLowerCase().includes(q) &&
          !r.anchor.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [filters, rows]);
  const selectedRows = useMemo(() => filtered.filter((r) => selected[r.id]), [filtered, selected]);

  const statusCounts = useMemo(() => {
    // counts that respect all filters except statusCodes
    const base = rows.filter((r) => {
      if (filters.linkType !== "all" && r.linkType !== filters.linkType) return false;
      if (filters.anchorType && r.anchorType !== filters.anchorType) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!r.targetUrl.toLowerCase().includes(q) && !r.sourcePath.toLowerCase().includes(q) && !r.anchor.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
    return base.reduce<Partial<Record<Row["statusCode"], number>>>((acc, r) => {
      acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
      return acc;
    }, {});
  }, [filters.linkType, filters.anchorType, filters.q, rows]);

  const pageRows = filtered.slice(0, page * pageSize);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);
  const toggleSelectAllPage = () => {
    if (allOnPageSelected) {
      const next = { ...selected };
      pageRows.forEach((r) => delete next[r.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      pageRows.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  };

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;

  /** Export CSV (filtered; if any selected → only selected) */
  const onExport = () => {
    const dataset = selectedCount ? filtered.filter((r) => selected[r.id]) : filtered;
    const cols = [
      "id",
      "anchor",
      "anchorType",
      "sourcePath",
      "sourceUrl",
      "targetUrl",
      "linkType",
      "statusCode",
      "lastChecked",
    ] as const;
    const header = cols.join(",");
    const lines = dataset
      .map((r) => cols.map((k) => JSON.stringify((r as any)[k] ?? "")).join(","))
      .join("\n");
    downloadText("broken-links.csv", `${header}\n${lines}`);
  };

  return (
    <section className="border">
      <div className="w-full mx-auto">
        {/* Filters bar + chips */}
        <div className="relative">
          <FiltersBar
            filters={filters}
            setFilters={setFilters}
            statusCounts={statusCounts}
            onColumns={() => setColumnsOpen(true)}
            onExport={onExport}
            onReset={() => {
              setFilters({ linkType: "all", statusCodes: [], anchorType: "", q: "" });
              setSelected({});
              setPage(1);
            }}
          />
          <ColumnsPopover
            open={columnsOpen}
            onClose={() => setColumnsOpen(false)}
            visible={visibleCols}
            setVisible={setVisibleCols}
          />
        </div>

        {/* Bulk bar */}
        {selectedCount > 0 && (
          <div
            className="mx-0 my-3 bg-white border rounded p-2 flex items-center gap-2"
            style={{ borderColor: TK.border }}
          >
            <div className="text-sm px-2 py-1 rounded bg-gray-50 border" style={{ borderColor: TK.border }}>
              <b>{selectedCount}</b> selected
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="px-2.5 py-1.5 border rounded hover:bg-gray-50 text-sm"
                style={{ borderColor: TK.border }}
                title="Create Fix Task"
                onClick={() => {
                  if (!selectedRows.length) return;
                  const preview = selectedRows.slice(0, 10).map((row) => {
                    const status = row.statusCode.toUpperCase();
                    return `- ${row.sourcePath || row.sourceUrl} → ${row.targetUrl} (${status})`;
                  });

                  openTaskDrawer({
                    title: `Fix broken links (${selectedRows.length} selected)`,
                    description: [
                      `Links selected: ${selectedRows.length}`,
                      ...preview,
                      selectedRows.length > preview.length ? "- ..." : undefined,
                    ]
                      .filter(Boolean)
                      .join("\n"),
                    projectId: selectedProject?.id ?? null,
                    type: "createNew",
                  });
                }}
              >
                <ClipboardList className="w-4 h-4 inline -mt-0.5 mr-1" style={{ color: TK.brand }} />
                Create Fix Task
              </button>
<button
  type="button"
  className="px-2.5 py-1.5 border rounded hover:bg-gray-50 text-sm"
  style={{ borderColor: TK.border }}
  title="Replace Links"
  onClick={() => {
    if (!selectedRows.length) return;
    const preview = selectedRows.slice(0, 10).map((row) => {
      const status = row.statusCode.toUpperCase();
      return `- ${row.sourcePath || row.sourceUrl} → ${row.targetUrl} (${status})`;
    });

    openTaskDrawer({
      title: `Replace Links (${selectedRows.length} selected)`,
      description: [
        `Links selected: ${selectedRows.length}`,
        ...preview,
        selectedRows.length > preview.length ? "- ..." : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }}
>
  <Wrench className="w-4 h-4 inline -mt-0.5 mr-1" style={{ color: TK.brand }} />
  Replace Links
</button>

              <button
                type="button"
                className="px-2.5 py-1.5 border rounded hover:bg-gray-50 text-sm"
                style={{ borderColor: TK.border }}
                title="Export Selection"
                onClick={onExport}
              >
                <Download className="w-4 h-4 inline -mt-0.5 mr-1" />
                Export Selection
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border rounded" style={{ borderColor: TK.border }}>
          <div className="relative max-h-[600px] overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: TK.border }}>
                <tr className="text-left text-[12px] text-[#6B7280]">
                  {visibleCols.select && (
                    <th className="px-3 py-2 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllPage}
                      />
                    </th>
                  )}
                  {visibleCols.anchor && <th className="px-3 py-2 w-[260px]">Anchor</th>}
                  {visibleCols.anchorType && <th className="px-3 py-2 w-[140px]">Anchor Type</th>}
                  {visibleCols.source && <th className="px-3 py-2 w-[220px]">Source Page</th>}
                  {visibleCols.target && <th className="px-3 py-2 w-[300px]">Broken Target URL</th>}
                  {visibleCols.linkType && <th className="px-3 py-2 w-[130px]">Link Type</th>}
                  {visibleCols.status && <th className="px-3 py-2 w-[170px]">HTTP Status</th>}
                  {visibleCols.last && <th className="px-3 py-2 w-[180px]">Last Checked</th>}
                  {visibleCols.actions && <th className="px-3 py-2 text-right w-[200px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(visibleColumnCount, 1)} className="px-3 py-8 text-center text-sm text-[#6B7280]">
                      {loading ? (
                        "Loading broken links..."
                      ) : error ? (
                        <span className="flex flex-col items-center gap-2">
                          <span>{error}</span>
                          <button
                            type="button"
                            onClick={() => refetch({ silent: false })}
                            className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                            style={{ borderColor: TK.border }}
                          >
                            Retry
                          </button>
                        </span>
                      ) : (
                        "No broken links match the current filters."
                      )}

                    </td>
                  </tr>
                )}
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-[#F9FAFB]" style={{ borderColor: TK.border }}>
                    {visibleCols.select && (
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={!!selected[r.id]}
                          onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                          aria-label={`Select ${r.id}`}
                        />
                      </td>
                    )}

                    {visibleCols.anchor && (
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          {/* Branded icon for anchor text */}
                          {r.anchorType === "image" ? (
                            <ImageIcon size={16} style={{ color: TK.brand }} />
                          ) : r.anchorType === "generic" ? (
                            <MousePointerClick size={16} style={{ color: TK.brand }} />
                          ) : (
                            <TypeIcon size={16} style={{ color: TK.brand }} />
                          )}
                          <span className="text-[#111827]">{r.anchor}</span>
                        </div>
                      </td>
                    )}

                    {visibleCols.anchorType && (
                      <td className="px-3 py-2 align-top">
                        <AnchorTypeBadge a={r.anchorType} />
                      </td>
                    )}

                    {visibleCols.source && (
                      <td className="px-3 py-2 align-top">
                        <a href={r.sourceUrl} className="hover:underline" style={{ color: TK.actionBlue }} title="Open source page">
                          {r.sourcePath}
                        </a>
                      </td>
                    )}

                    {visibleCols.target && (
                      <td className="px-3 py-2 align-top">
                        <a
                          href={r.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline break-all"
                          style={{ color: TK.actionBlue }}
                          title="Open target URL"
                        >
                          {r.targetUrl}
                        </a>
                      </td>
                    )}

                    {visibleCols.linkType && (
                      <td className="px-3 py-2 align-top">
                        <LinkTypeBadge type={r.linkType} />
                      </td>
                    )}

                    {visibleCols.status && (
                      <td className="px-3 py-2 align-top">
                        <StatusBadge code={r.statusCode} />
                      </td>
                    )}

                    {visibleCols.last && (
                      <td className="px-3 py-2 align-top">
                        <span className="text-[13px] text-[#111827]">
                          {new Date(r.lastChecked).toLocaleString()}
                        </span>
                      </td>
                    )}

                    {visibleCols.actions && (
                      <td className="px-3 py-2 text-right align-top">
                        <div className="inline-flex items-center gap-1.5">
                          <IconButton
                            title="View Source Page"
                            onClick={() => window.open(r.sourceUrl, "_blank")}
                          >
                            <Eye size={16} />
                          </IconButton>
                          <IconButton
                            title="Open Target URL"
                            onClick={() => window.open(r.targetUrl, "_blank")}
                          >
                            <ExternalLink size={16} />
                          </IconButton>
                          <IconButton
                            title="Copy Target URL"
                            onClick={() => navigator.clipboard?.writeText(r.targetUrl)}
                          >
                            <ClipboardCopy size={16} />
                          </IconButton>
<IconButton
  title="Replace Link"
  onClick={() => {
    const details = [
      `Source page: ${r.sourceUrl}`,
      `Broken target: ${r.targetUrl}`,
      `Anchor text: ${r.anchor}`,
      `Link type: ${r.linkType}`,
      `Status: ${r.statusCode.toUpperCase()}`,
      `Last checked: ${new Date(r.lastChecked).toLocaleString()}`,
    ].join("\n");

    openTaskDrawer({
      title: `Replace Link on ${r.sourcePath || r.sourceUrl}`,
      description: details,
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }}
>
  <Wrench size={16} />
</IconButton>

                          <IconButton
                            title="Create Fix Task"
                            onClick={() => {
                              const details = [
                                `Source page: ${r.sourceUrl}`,
                                `Broken target: ${r.targetUrl}`,
                                `Anchor text: ${r.anchor}`,
                                `Link type: ${r.linkType}`,
                                `Status: ${r.statusCode.toUpperCase()}`,
                                `Last checked: ${new Date(r.lastChecked).toLocaleString()}`,
                              ].join("\n");

                              openTaskDrawer({
                                title: `Fix broken link on ${r.sourcePath || r.sourceUrl}`,
                                description: details,
                                projectId: selectedProject?.id ?? null,
                                type: "createNew",
                              });
                            }}
                          >
                            <ClipboardList size={16} />
                          </IconButton>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <span className="text-sm text-[#6B7280]">Loading broken links...</span>
              </div>
            )}
          </div>

          {page * pageSize < filtered.length && (
            <div className="p-3 flex justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"
                style={{ borderColor: TK.border, opacity: loading ? 0.5 : 1 }}
                disabled={loading}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


function IconButton({
  children,
  title,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: TK.border, color: TK.brand }}
    >
      {children}
    </button>
  );
}


