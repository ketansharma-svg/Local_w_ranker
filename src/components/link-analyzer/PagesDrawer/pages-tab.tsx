"use client";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Settings2,
  RefreshCw,
  Search,
  Info,
  SlidersHorizontal,
  Eye,
  ClipboardList,
  Trash2,
  Download,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Drawers, { type PageDrawerData, type PageDrawerOutlink } from "./Drawers";
import RemoveFromTrackingDemo from "./RemoveFromTrackingDemo";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
import { BASE_URL_WR } from "@/src/util/api";
import TabLoadingState from "../TabLoadingState";
import { Drawer as AntdDrawer } from "antd";
import Cookies from "js-cookie";


const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  textStrong: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  pastelBrand: "var(--wr-pastelBrand, #D9EEF8)",
  valueBlue: "var(--wr-action, #0077FF)",
  success: "var(--wr-good, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 6px)",
};

type PageType = string;
type Status = "Healthy" | "Dangling" | "Orphan";

type Row = {
  id: string;
  url: string;
  inlinks: number;
  outlinks: number;
  pils: number; // 0–100
  aqs: number;  // 0–100
  status: Status;
  depth: number; // 0..5
  type: PageType;
  raw?: PageDrawerData | unknown;
};

type DrawerData = PageDrawerData;

type ColumnKey = keyof Row | "select" | "expander" | "actions";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

// Column descriptions shown on header hover (no extra icon)
const columnDescriptions: any = {
  select: "Select rows for bulk actions.",
  expander: "Expand to view page details and actions.",
  url: "Canonical page URL discovered by the crawl.",
  inlinks: "Number of internal links pointing TO this page.",
  outlinks: "Number of internal links going OUT from this page.",
  pils: "Page Interlinking Strength (PILS): composite of incoming link volume, relevance and placement. 0–100.",
  aqs: "Authority & Quality Score (AQS): on-page quality and authority heuristics combined. 0–100.",
  status: "Crawl status — Healthy (linked), Dangling (weakly connected), Orphan (no internal inlinks).",
  depth: "Click depth from the homepage/root.",
  type: "Content template or page type classification.",
  actions: "Quick actions (View, Create Task, Remove).",
};

const MiniBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="relative h-2 rounded bg-gray-200" style={{ width: 88 }}>
      <div
        className="h-2 rounded"
        style={{
          width: `${value}%`,
          maxWidth: 88,
          backgroundColor:
            value >= 80
              ? TOKENS.success
              : value >= 60
              ? TOKENS.warning
              : TOKENS.critical,
        }}
      />
    </div>
    <span className="text-[13px] leading-none">{value}%</span>
  </div>
);

const StatusDot = ({ s }: { s: Status }) => (
  <span className="inline-flex items-center gap-2">
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{
        width: 10,
        height: 10,
        backgroundColor:
          s === "Healthy"
            ? TOKENS.success
            : s === "Dangling"
            ? TOKENS.warning
            : TOKENS.critical,
      }}
    />
    <span className="text-[13px] leading-none">{s}</span>
  </span>
);

const normalizeStatus = (value: unknown): Status => {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (text === "healthy") return "Healthy";
  if (text === "dangling") return "Dangling";
  if (text === "orphan") return "Orphan";
  return "Healthy";
};

const normalizeType = (value: unknown): PageType => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "Page";
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const mapPageRow = (item: any, index: number): Row => {
  const url = typeof item?.url === "string" && item.url.length ? item.url : "-";
  return {
    id:
      item?.id !== undefined && item?.id !== null
        ? String(item.id)
        : `row-${index + 1}`,
    url,
    inlinks: toNumber(item?.inlinks),
    outlinks: toNumber(item?.outlinks),
    pils: toNumber(item?.pils),
    aqs: toNumber(item?.aqs),
    status: normalizeStatus(item?.status),
    depth: toNumber(item?.depth),
    type: normalizeType(item?.page_type ?? item?.pageType),
    raw: item,
  };
};

export default function PagesTabAdvancedTable({ isActive = false }: { isActive?: boolean }) {
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();
  const authTokenValue = Cookies.get("login_access_token_wrank");;

  // Base data
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const lastFetchedProjectId = useRef<string | null>(null);
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null);

  const fetchPagesData = useCallback(
    async (projectId: string, options: { force?: boolean; silent?: boolean } = {}) => {
      const { force = false, silent = false } = options;
      if (!authTokenValue) {
        setFetchError("Authentication required. Please sign in again.");
        setRows([]);
        return;
      }
      if (!force && lastFetchedProjectId.current === projectId) return;

      if (!silent) setLoadingData(true);
      setFetchError(null);

      try {
        const response = await fetch(`${BASE_URL_WR}pages/${projectId}/`, {
          headers: {
            Authorization: `Bearer ${authTokenValue}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load pages (${response.status})`);
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const mapped: Row[] = items.map((item: unknown, index: number) =>
          mapPageRow(item, index),
        );
        setRows(mapped);
        lastFetchedProjectId.current = projectId;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load pages.";
        setFetchError(message);
        setRows([]);
      } finally {
        if (!silent) setLoadingData(false);
      }
    },
    [authTokenValue],
  );

  useEffect(() => {
    if (!selectedProject?.id) {
      lastFetchedProjectId.current = null;
      return;
    }
    if (lastFetchedProjectId.current && lastFetchedProjectId.current !== String(selectedProject.id)) {
      lastFetchedProjectId.current = null;
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!isActive) return;
    const projectId = selectedProject?.id;
    if (!projectId) {
      setFetchError("Select a project to load pages data.");
      setRows([]);
      return;
    }
    if (!authTokenValue) {
      setFetchError("Authentication required. Please sign in again.");
      setRows([]);
      return;
    }
    fetchPagesData(String(projectId));
  }, [authTokenValue, fetchPagesData, isActive, selectedProject?.id]);

  const handleRefresh = useCallback(() => {
    const projectId = selectedProject?.id;
    if (!projectId) {
      setFetchError("Select a project to refresh data.");
      return;
    }
    if (!authTokenValue) {
      setFetchError("Authentication required. Please sign in again.");
      return;
    }
    fetchPagesData(String(projectId), { force: true });
  }, [authTokenValue, fetchPagesData, selectedProject?.id]);

  // Filters
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<PageType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [depthFilter, setDepthFilter] = useState<number | "All">("All");
  const [includeOrphans, setIncludeOrphans] = useState(true);
  const [pilsMin, setPilsMin] = useState(0);
  const [pilsMax, setPilsMax] = useState(100);
  const pilsActive = pilsMin > 0 || pilsMax < 100;

  // Selection / bulk
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );
  const anySelected = selectedIds.length > 0;
  useEffect(() => {
    setSelected({});
  }, [rows]);
  const typeOptions = useMemo<(PageType | "All")[]>(() => {
    const unique = new Set<PageType>();
    rows.forEach((row) => {
      if (row.type) unique.add(row.type);
    });
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  useEffect(() => {
    if (typeFilter === "All") return;
    if (!typeOptions.includes(typeFilter)) {
      setTypeFilter("All");
    }
  }, [typeFilter, typeOptions]);

  // Expand single / multiple
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true; // open only this
      return next; // collapse others
    });
  };

  // Infinite vs pagination
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortBy, setSortBy] = useState<keyof Row>("pils");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColumnKey) => {
    if (key === "select" || key === "expander" || key === "actions") return;
    const k = key as keyof Row;
    if (sortBy !== k) {
      setSortBy(k);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  // Hydrate sort from URL on mount
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const sb = sp.get("sortBy");
      const sd = sp.get("sortDir");
      const allowed: (keyof Row)[] = [
        "url",
        "inlinks",
        "outlinks",
        "pils",
        "aqs",
        "status",
        "depth",
        "type",
      ];
      if (sb && (allowed as unknown as string[]).includes(sb))
        setSortBy(sb as keyof Row);
      if (sd === "asc" || sd === "desc") setSortDir(sd as "asc" | "desc");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Persist sort to URL
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set("sortBy", String(sortBy));
      sp.set("sortDir", String(sortDir));
      const url = `${window.location.pathname}?${sp.toString()}${window.location.hash}`;
      window.history.replaceState({}, "", url);
    } catch {}
  }, [sortBy, sortDir]);

  // Columns & visibility
  const columns: ColumnDef[] = [
    { key: "select", label: "", width: 36, align: "center" },
    { key: "expander", label: "", width: 36, align: "center" },
    { key: "url", label: "Page URL", width: 320, sortable: true },
    { key: "inlinks", label: "Inlinks", width: 110, sortable: true },
    { key: "outlinks", label: "Outlinks", width: 110, sortable: true },
    { key: "pils", label: "PILS", width: 140, sortable: true },
    { key: "aqs", label: "AQS", width: 140, sortable: true },
    { key: "status", label: "Status", width: 140, sortable: true },
    { key: "depth", label: "Depth", width: 90, sortable: true },
    { key: "type", label: "Page Type", width: 150, sortable: true },
    { key: "actions", label: "Actions", width: 200, align: "left" },
  ];

  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true,
    expander: true,
    url: true,
    inlinks: true,
    outlinks: true,
    pils: true,
    aqs: true,
    status: true,
    depth: true,
    type: true,
    actions: true,
  } as Record<ColumnKey, boolean>);

  // Ensure visibleColumns is always defined
  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols[c.key] !== false),
    [columns, visibleCols]
  );

  // Sticky helpers for frozen left block (select + expander + URL)
  const stickyStyle = (key: ColumnKey) =>
    key === "select"
      ? {
          position: "sticky" as const,
          left: 0,
          zIndex: 40,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : key === "expander"
      ? {
          position: "sticky" as const,
          left: 36,
          zIndex: 40,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : key === "url"
      ? {
          position: "sticky" as const,
          left: 72,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : {};

  // Derived pipeline: filter → sort → window
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !r.url.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (typeFilter !== "All" && r.type !== typeFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (depthFilter !== "All" && r.depth !== depthFilter) return false;
      if (!includeOrphans && r.status === "Orphan") return false;
      if (!(r.pils >= pilsMin && r.pils <= pilsMax)) return false;
      return true;
    });
  }, [
    rows,
    query,
    typeFilter,
    statusFilter,
    depthFilter,
    includeOrphans,
    pilsMin,
    pilsMax,
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a: any, b: any) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const windowedRows = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  // Infinite loader
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("scroll-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting)
        setVisibleCount((v) => Math.min(sorted.length, v + 50));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);
type Row = {
  id: string | number;
  url: string;
  inlinks: number;
  outlinks: number;
  pils: number;
  aqs: number;
  status: string;
  depth: number;
  type: string;
  // ...other props
};

  // Bulk helpers
  const visibleIds = windowedRows.map((r) => r.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected =
    visibleIds.some((id) => selected[id]) && !allVisibleSelected;

  const openTaskForRow = useCallback(
    (row: Row) => {
      const summary = [
        `URL: ${row.url}`,
        `Status: ${row.status}`,
        `Depth: ${row.depth}`,
        `Internal links: ${row.inlinks}`,
        `Outgoing links: ${row.outlinks}`,
        `PILS: ${row.pils}`,
        `AQS: ${row.aqs}`,
      ].join("\n");

      openTaskDrawer({
        title: `Improve linking: ${row.url}`,
        description: summary,
        projectId: selectedProject?.id ?? null,
        type: "createNew",
      });
    },
    [openTaskDrawer, selectedProject?.id],
  );

  const createTasksForSelection = useCallback(() => {
    const selectedRows = rows.filter((r) => selected[r.id]);
    if (!selectedRows.length) return;

    const preview = selectedRows.slice(0, 5).map((r) => `- ${r.url} (PILS ${r.pils}, depth ${r.depth})`);
    const summary = [
      `Pages selected: ${selectedRows.length}`,
      ...preview,
      selectedRows.length > preview.length ? "- ..." : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    openTaskDrawer({
      title: `Improve linking for ${selectedRows.length} page${selectedRows.length > 1 ? "s" : ""}`,
      description: summary,
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }, [openTaskDrawer, rows, selected, selectedProject?.id]);

  const bulkRecalculate = () => console.info("Recalculate scores for:", selectedIds);
  const bulkExport = () => console.info("Export selection:", selectedIds);
  const bulkRemove = () => console.info("Remove from tracking:", selectedIds);

  // Export CSV (selected only when any selected; otherwise full filtered+sorted dataset)
  const exportCSV = (onlySelected: boolean = false) => {
    const cols: (keyof Row)[] = [
      "url",
      "inlinks",
      "outlinks",
      "pils",
      "aqs",
      "status",
      "depth",
      "type",
    ];
    const dataset = onlySelected
      ? sorted.filter((r) => !!selected[r.id])
      : sorted;
    const header = cols.join(",");
    const lines = dataset
      .map((r) =>
        cols.map((k) => JSON.stringify((r as any)[k] ?? "")).join(",")
      )
      .join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected
      ? "pages-export-selected.csv"
      : "pages-export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setQuery("");
    setTypeFilter("All");
    setStatusFilter("All");
    setDepthFilter("All");
    setIncludeOrphans(true);
    setPilsMin(0);
    setPilsMax(100);
  };
  const [tracking, setTracking] = useState(false);

  const opentracking = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (e) e.stopPropagation();
    setTracking(true);
  };
  // This function will handle closing the drawer
const closetracking = () => {
  setTracking(false);
};

  const handleOpenDrawer = (row: any) => {
    const raw = (row.raw ?? {}) as PageDrawerData;
    let candidateOutlinks: unknown = null;
    if (Array.isArray(raw?.outlinks_details)) {
      candidateOutlinks = raw.outlinks_details;
    } else if (Array.isArray((raw as any)?.outlinksDetails)) {
      candidateOutlinks = (raw as any).outlinksDetails;
    } else if (Array.isArray((row.raw as any)?.outlinks_details)) {
      candidateOutlinks = (row.raw as any).outlinks_details;
    }

    const normalizedOutlinks: PageDrawerOutlink[] = Array.isArray(candidateOutlinks)
      ? (candidateOutlinks as PageDrawerOutlink[])
      : [];

    const normalizedStatus =
      typeof raw?.status === "string" && raw.status.trim().length
        ? raw.status
        : typeof row.status === "string"
        ? row.status.toLowerCase()
        : undefined;

    const normalizedPageType =
      typeof raw?.page_type === "string" && raw.page_type.trim().length
        ? raw.page_type
        : typeof (raw as any)?.pageType === "string" && (raw as any).pageType.trim().length
        ? (raw as any).pageType
        : row.type;

    setDrawerData({
      ...raw,
      url: typeof raw?.url === "string" && raw.url.trim().length ? raw.url : row.url,
      inlinks: raw?.inlinks ?? row.inlinks,
      outlinks: raw?.outlinks ?? row.outlinks,
      pils: raw?.pils ?? row.pils,
      aqs: raw?.aqs ?? row.aqs,
      status: normalizedStatus,
      depth: raw?.depth ?? row.depth,
      page_type: normalizedPageType,
      outlinks_details: normalizedOutlinks,
      outlinksDetails: normalizedOutlinks,
    });
  };

  const closeDrawer = () => {
    setDrawerData(null);
  };
  // Expanded row content (with CTAs)
  const renderExpanded = (row: Row) => (
    <div
      className="grid grid-cols-2 gap-4 p-4 rounded-md border"
      style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}
    >
      <div>
        <div className="text-sm text-muted-foreground">URL</div>
        <a
          href={row.url}
          className="text-sm font-medium underline cursor-pointer"
          target="_blank"
          rel="noreferrer"
          style={{ color: TOKENS.valueBlue }}
        >
          {row.url}
        </a>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Link Depth</div>
        <div className="text-sm font-medium">{row.depth}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">PILS</div>
        <MiniBar value={row.pils} />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">AQS</div>
        <MiniBar value={row.aqs} />
      </div>
      <div className="col-span-2">
        <div className="text-sm text-muted-foreground mb-1">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="cursor-pointer"
            style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
          >
            Analyze Full Page Audit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            style={{ color: TOKENS.brand }}
            onClick={() => openTaskForRow(row)}
          >
            Create Task
          </Button>
          <Button size="sm" variant="outline" className="cursor-pointer">Assign Owner</Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => exportCSV(false)}
          >
            Export Page Data
          </Button>
        </div>
      </div>
    </div>
  );

  if (loadingData && rows.length === 0) {
    return <TabLoadingState />;
  }

  return (
    <section
      className="space-y-3"
      style={{ fontFamily: 'Inter, Inter Fallback, ui-sans-serif, system-ui' }}
    >
      <AntdDrawer
        title={drawerData?.url ?? "Page details"}
        open={!!drawerData}
        width={1200}
        onClose={closeDrawer}
        destroyOnClose
        styles={{
          body: { padding: 0, background: "#fff" },
          header: { borderBottom: "none" },
        }}
      >
        {drawerData && <Drawers data={drawerData} onClose={closeDrawer} />}
      </AntdDrawer>
                                             {tracking && (
                 <div
            style={{
              display:"hidden",
              position: "absolute",
              zIndex: 1001,
              padding: "20px",
            }}
            onClick={e => e.stopPropagation()}
          >
                      <RemoveFromTrackingDemo    onClose={closetracking} />
        </div>
                  )}
      <Card
        className="border mx-4"
        style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}
      >
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Pages</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Infinite */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              <Switch
                className="cursor-pointer"
                checked={infinite}
                onCheckedChange={(v) => {
                  setInfinite(Boolean(v));
                  if (Boolean(v)) setVisibleCount(50);
                }}
              />
            </div>
            {/* Expand multiple rows */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expand multiple rows</span>
              <Switch className="cursor-pointer" checked={multiExpand} onCheckedChange={setMultiExpand} />
            </div>
            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground hover:bg-[#F7FAFC] cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {columns.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          className="cursor-pointer"
                          disabled={
                            c.key === "select" || c.key === "expander" || c.key === "url"
                          }
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) =>
                            setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))
                          }
                        />
                        <span>{c.label || c.key}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setVisibleCols({
                        select: true,
                        expander: true,
                        url: true,
                        inlinks: true,
                        outlinks: true,
                        pils: true,
                        aqs: true,
                        status: true,
                        depth: true,
                        type: true,
                        actions: true,
                      } as Record<ColumnKey, boolean>)
                    }
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export in header */}
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportCSV(anySelected)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>

            {/* Refresh demo data */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 cursor-pointer"
              onClick={handleRefresh}
              disabled={loadingData}
            >
              <RefreshCw className="h-4 w-4 animate-spin" style={{ animationPlayState: loadingData ? "running" : "paused" }} />{" "}
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Bulk bar */}
        {anySelected && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t"
            style={{ borderColor: TOKENS.borderLight, background: TOKENS.pastelBrand }}
          >
            <div className="text-sm" style={{ color: TOKENS.textStrong }}>
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="cursor-pointer"
                style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                onClick={createTasksForSelection}
              >
                Create Tasks
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={bulkRecalculate}>
                Recalculate Scores
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => exportCSV(true)}>
                Export Selection
              </Button>
              <Button size="sm" variant="destructive" className="cursor-pointer" onClick={opentracking}>
                Remove from Tracking
              </Button>
            </div>
          </div>
        )}

        {/* Filters Row */}
        <CardContent className="border-t pt-4" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" /> Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Use filters to segment pages by interlinking signals.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Clear all */}
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearAllFilters}>
              Clear all
            </Button>

            {/* Search by URL */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Page URL, Slug…"
                className="w-[260px] pl-7"
              />
            </div>

            {/* Page Type */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 w-[170px] cursor-pointer">
                <span className="truncate">
                  {typeFilter === "All" ? "Page Types - All" : `Page Types - ${typeFilter}`}
                </span>
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t as any}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 w-[160px] cursor-pointer">
                <span className="truncate">
                  {statusFilter === "All" ? "Status - All" : `Status - ${statusFilter}`}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(["All", "Orphan", "Dangling", "Healthy"] as const).map((s) => (
                  <SelectItem key={s} value={s as any}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Depth */}
            <Select
              value={String(depthFilter)}
              onValueChange={(v) => setDepthFilter(v === "All" ? "All" : Number(v))}
            >
              <SelectTrigger className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 w-[140px] cursor-pointer">
                <span className="truncate">
                  {depthFilter === "All" ? "Depth - All" : `Depth - ${depthFilter}`}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(["All", 0, 1, 2, 3, 4, 5] as const).map((d) => (
                  <SelectItem key={String(d)} value={String(d)}>
                    {String(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* PILS – Score */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer">
                  <Settings2 className="h-4 w-4" /> PILS – Score{" "}
                  {pilsActive ? `${pilsMin}–${pilsMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Score range</span>
                    <span className="text-muted-foreground">
                      {pilsMin} – {pilsMax}
                    </span>
                  </div>
                  <Slider
                    className="cursor-pointer"
                    value={[pilsMin, pilsMax]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      const [a, b] = v as [number, number];
                      setPilsMin(a);
                      setPilsMax(b);
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pilsMin}
                      onChange={(e) =>
                        setPilsMin(
                          Math.max(0, Math.min(Number(e.target.value) || 0, pilsMax))
                        )
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pilsMax}
                      onChange={(e) =>
                        setPilsMax(
                          Math.max(pilsMin, Math.min(Number(e.target.value) || 0, 100))
                        )
                      }
                      className="w-20"
                    />
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          setPilsMin(0);
                          setPilsMax(100);
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        className="cursor-pointer"
                        style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Include Orphans */}
            <label
              htmlFor="include-orphans"
              className="inline-flex items-center gap-2 text-sm ml-1 cursor-pointer select-none"
            >
              <Checkbox
                id="include-orphans"
                className="cursor-pointer"
                checked={includeOrphans}
                onCheckedChange={(v) => setIncludeOrphans(Boolean(v))}
              />
              <span className="inline-flex items-center gap-1">
                Include Orphans
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: TOKENS.critical }}
                />
              </span>
            </label>
          </div>
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div
            className="relative max-h-[520px] overflow-auto border-t"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <Table className="text-sm">
              <TableHeader className="sticky ">
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c.key) }}
                      className={
                        c.align === "center"
                          ? "text-center"
                          : c.align === "right"
                          ? "text-right"
                          : undefined
                      }
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            className="cursor-pointer"
                            checked={
                              someVisibleSelected ? "indeterminate" : allVisibleSelected
                            }
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              visibleIds.forEach((id) => (patch[id] = on));
                              setSelected((s) => ({ ...s, ...patch }));
                            }}
                          />
                        </div>
                      ) : c.key === "expander" || !c.sortable ? (
                        <span className="relative group inline-block">
                          {c.label}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground relative group cursor-pointer"
                          onClick={() => toggleSort(c.key)}
                        >
                          <span>{c.label}</span>
                          {sortBy === (c.key as keyof Row) ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length}>
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        {loadingData
                          ? "Loading pages..."
                          : fetchError ?? "No pages match the current filters."}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {windowedRows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow className="hover:bg-[#F5F7FA]">
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle("select") as any}>
                          <Checkbox
                            className="cursor-pointer"
                            checked={!!selected[row.id]}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [row.id]: Boolean(v) }))
                            }
                          />
                        </TableCell>
                      )}
                      {visibleCols.expander !== false && (
                        <TableCell style={stickyStyle("expander") as any}>
                          <button
                            // onClick={() => toggleExpand(row.id)}
                            aria-label={expanded[row.id] ? "Collapse" : "Expand"}
                            className="rounded-md border p-1 hover:bg-muted cursor-pointer"
                          >
                            {expanded[row.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      {visibleCols.url !== false && (
                        <TableCell style={stickyStyle("url") as any}>
                      <a
                        // href={row.url}
                        className="underline cursor-pointer"
                        style={{ color: TOKENS.valueBlue }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenDrawer(row);
                        }}
                      >
                        {row.url}
                      </a>
                        </TableCell>
                      )}
                      {visibleCols.inlinks !== false && (
                        <TableCell>{row.inlinks}</TableCell>
                      )}
                      {visibleCols.outlinks !== false && (
                        <TableCell>{row.outlinks}</TableCell>
                      )}
                      {visibleCols.pils !== false && (
                        <TableCell>
                          <MiniBar value={row.pils} />
                        </TableCell>
                      )}
                      {visibleCols.aqs !== false && (
                        <TableCell>
                          <MiniBar value={row.aqs} />
                        </TableCell>
                      )}
                      {visibleCols.status !== false && (
                        <TableCell>
                          {/* <StatusDot s={row.status} /> */}
                        </TableCell>
                      )}
                      {visibleCols.depth !== false && (
                        <TableCell>{row.depth}</TableCell>
                      )}
                      {visibleCols.type !== false && <TableCell>{row.type}</TableCell>}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="View"
                                className="text-[color:var(--wr-action,#0077FF)] cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDrawer(row);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">View</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Create Task"
                                    className="text-[color:var(--wr-action,#0077FF)] cursor-pointer"
                                    onClick={() => openTaskForRow(row)}
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Create Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled
                                    aria-label="Remove from tracking"
                                    className="text-red-600 cursor-pointer disabled:cursor-not-allowed"
                                    onClick={opentracking}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Remove from tracking
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    {expanded[row.id] && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length}>
                          {renderExpanded(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {infinite && <div id="scroll-sentinel" className="h-8" />}
            {loadingData && rows.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <span className="text-sm text-muted-foreground">Refreshing data...</span>
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination (when Infinite OFF) */}
        {!infinite && (
          <div
            className="flex items-center justify-between p-3 border-t"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of{" "}
              {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" disabled={page === 1} onClick={() => setPage(1)}>
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <div className="text-sm w-16 text-center">{page}</div>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page * pageSize >= sorted.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page * pageSize >= sorted.length}
                onClick={() => setPage(Math.ceil(sorted.length / pageSize))}
              >
                Last
              </Button>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px] h-8 cursor-pointer">
                  <SelectValue placeholder="Page size" />
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


