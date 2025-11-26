"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  // Header & actions
  Anchor as AnchorIcon,
  Info,
  Download,
  Settings,
  Search,
  MoreHorizontal,
  // Table & affordances
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  LineChart,
  GitCompare,
  Wrench,
  Brain,
  AlertTriangle,
  Tag,
  X,
  // Type icons (branded)
  Crosshair,   // exact
  Quote,       // phrase
  ScanText,    // partial
  BadgeCheck,  // branded
  Image as ImageIcon, // image-only / empty
} from "lucide-react";
import AnchorTargetsDrawerDemo from "./drawers/AnchorTargetsDrawerDemo";
import DemoUsageGraphPopup from "./drawers/DemoUsageGraphPopup";
import CompetitorAnchorComparisonDrawerUpdated from "./drawers/CompetitorAnchorComparisonDrawerUpdated"
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
/**
 * Wranker — Anchors Tab (Section 4: Anchor Usage Table)
 * Drop-in single-file component (React + Tailwind only)
 * (Fixes)
 * - Table header misalignment: make thead sticky at top-0 inside scroll container.
 * - Pointer cursors for all clickable elements.
 */

/* ----------------------------- Design Tokens ----------------------------- */
const TOKENS = {
  brand: "#008CCD",
  brandPastel: "#D9EEF8",
  borderLight: "#EFF0F6",
  borderStrong: "#D1D5DB", // slightly darker than borderLight (for Export)
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  // Anchor type palette:
  type: {
    exact: "#0B63D6",
    phrase: "#4AA3FF",
    partial: "#0EA5A6",
    branded: "#6366F1",
    generic: "#9CA3AF",
    empty: "#F43F5E",
  },
  // Status colors:
  success: "#34A853",
  warning: "#F59E0B",
  critical: "#E94134",
};

/* ------------------------------- Types ---------------------------------- */
export type AnchorRow = {
  anchorId: string;
  anchorText: string;
  anchorType: "exact" | "phrase" | "partial" | "branded" | "generic" | "empty";
  totalLinks: number;
  internal: number;
  external: number;
  pagesUsing: number;
  targetPages: number;
  aqs: number; // 0-100
  lastFound: string; // ISO
  nofollow?: boolean;
  flags?: { overused?: boolean; imageOnly?: boolean };
};

export type AnchorInstance = {
  sourcePage: string;
  snippet: string;
  targetUrl: string;
  linkType: "follow" | "nofollow";
  lastFound: string; // ISO
};

/* ---------------------------- Mock Data/API ----------------------------- */
function seededRandom(seed: number) {
  let t = seed % 2147483647;
  return () => (t = (t * 16807) % 2147483647) / 2147483647;
}

function makeMockRows(count = 48): AnchorRow[] {
  const rnd = seededRandom(12345);
  const types: AnchorRow["anchorType"][] = ["exact", "phrase", "partial", "branded", "generic", "empty"];
  const anchors = [
    "buy iphone 15 pro",
    "learn more",
    "contact us",
    "wRanker",
    "best seo tools",
    "read more",
    "pricing",
    "about company",
    "download guide",
    "image-only",
  ];
  return Array.from({ length: count }).map((_, i) => {
    const t = types[Math.floor(rnd() * types.length)];
    const base = anchors[Math.floor(rnd() * anchors.length)];
    const isEmpty = t === "empty";
    const total = Math.floor(rnd() * 150) + (isEmpty ? 4 : 12);
    const internal = Math.floor(total * (0.5 + rnd() * 0.4));
    const ext = total - internal;
    const pagesUsing = Math.max(1, Math.floor(total * (0.2 + rnd() * 0.3)));
    const targetPages = Math.max(1, Math.floor(total * (0.05 + rnd() * 0.1)));
    const aqs = Math.max(5, Math.min(98, Math.floor(rnd() * 100)));
    const overused = pagesUsing > 50;
    const imageOnly = isEmpty;
    return {
      anchorId: `a-${i + 1}`,
      anchorText: isEmpty ? "(Image only)" : base,
      anchorType: t,
      totalLinks: total,
      internal,
      external: ext,
      pagesUsing,
      targetPages,
      aqs,
      lastFound: new Date(Date.now() - Math.floor(rnd() * 10) * 86400000).toISOString(),
      nofollow: rnd() > 0.7,
      flags: { overused, imageOnly },
    };
  });
}

function mockFetchInstances(anchorId: string, page = 0, size = 5): Promise<AnchorInstance[]> {
  const rnd = seededRandom(Number(anchorId.replace(/\D/g, "")) + page * 7 + size);
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = Array.from({ length: size }).map((_, i) => ({
        sourcePage: `/blog/seo-tips-${Math.floor(rnd() * 120)}`,
        snippet: `... improve your <a href=\"#\">anchor strategy</a> by diversifying ...`,
        targetUrl: `/tools/keyword-analyzer-${Math.floor(rnd() * 18)}`,
        linkType: rnd() > 0.2 ? "follow" : "nofollow",
        lastFound: new Date(Date.now() - Math.floor(rnd() * 30) * 3600_000).toISOString(),
      }));
      resolve("rows in" in window ? (window as any).rows : rows);
    }, 300);
  });
}

/* ------------------------------ Utilities ------------------------------- */
function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/* -------------------------- Reusable Primitives -------------------------- */
function IconChip({
  children,
  icon,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 h-8 px-3 rounded-full border text-[13px] transition-colors cursor-pointer",
        active ? "font-semibold" : "font-medium"
      )}
      style={{
        borderColor: active ? TOKENS.brand : TOKENS.borderLight,
        backgroundColor: active ? TOKENS.brandPastel : TOKENS.chipBg,
        color: active ? TOKENS.brand : TOKENS.text,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function GhostIconButton({
  label,
  onClick,
  children,
}: React.PropsWithChildren<{ label: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="inline-grid place-items-center h-8 w-8 rounded border cursor-pointer"
      style={{ borderColor: TOKENS.borderLight, backgroundColor: TOKENS.chipBg, color: TOKENS.brand }}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function SecondaryWhiteButton({
  onClick,
  children,
}: React.PropsWithChildren<{ onClick?: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 h-8 px-3 rounded text-sm cursor-pointer"
      style={{
        backgroundColor: "#FFFFFF",
        color: TOKENS.brand,
        border: `1px solid ${TOKENS.borderStrong}`,
      }}
    >
      {children}
    </button>
  );
}

function Tooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] text-white">
        {tip}
      </span>
    </span>
  );
}

function AQSBar({ value }: { value: number }) {
  let tone = TOKENS.critical;
  if (value >= 75) tone = TOKENS.success;
  else if (value >= 50) tone = TOKENS.warning;
  return (
    <div className="w-full flex items-center gap-2" title={`AQS ${value}%`}>
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden" aria-hidden>
        <div className="h-full transition-all" style={{ width: `${value}%`, backgroundColor: tone }} />
      </div>
      <span className="text-[12px] font-semibold tabular-nums" style={{ color: tone }}>{value}%</span>
    </div>
  );
}

/* ----------------------------- Anchor Type UI ---------------------------- */
const TypeIconMap: Record<AnchorRow["anchorType"], React.ReactNode> = {
  exact: <Crosshair size={14} />,
  phrase: <Quote size={14} />,
  partial: <ScanText size={14} />,
  branded: <BadgeCheck size={14} />,
  generic: <Tag size={14} />,
  empty: <ImageIcon size={14} />,
};

function AnchorTypePill({ type, onClick }: { type: AnchorRow["anchorType"]; onClick?: () => void }) {
  const color = TOKENS.type[type];
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-medium border cursor-pointer"
      style={{
        backgroundColor: `${color}14`,
        borderColor: `${color}55`,
        color,
      }}
      aria-label={`Filter by type: ${label}`}
      title={label}
    >
      <span className="text-[currentColor]">{TypeIconMap[type]}</span>
      {label}
    </button>
  );
}

export default function AnchorsUsageTable(props?: {
  rowsOverride?: Array<{
    anchorId: string; anchorText: string;
    anchorType: "exact" | "phrase" | "partial" | "branded" | "generic" | "empty";
    totalLinks: number; internal: number; external: number;
    pagesUsing: number; targetPages: number; aqs: number; lastFound: string;
    nofollow?: boolean;
    instances?: {
      sourcePage: string; snippet: string; targetUrl: string;
      linkType: "follow" | "nofollow"; lastFound: string;
    }[];
  }>;
}) {
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const [rows, setRows] = useState<AnchorRow[]>([]);
  useEffect(() => {
    if (props?.rowsOverride?.length) {
      setRows(props.rowsOverride.map(r => ({
        anchorId: r.anchorId,
        anchorText: r.anchorText,
        anchorType: r.anchorType,
        totalLinks: r.totalLinks,
        internal: r.internal,
        external: r.external,
        pagesUsing: r.pagesUsing,
        targetPages: r.targetPages,
        aqs: r.aqs ?? 0,
        lastFound: r.lastFound,
        nofollow: r.nofollow,
        flags: { overused: r.pagesUsing > 50, imageOnly: r.anchorType === "empty" },
      })));
    } else {
      setRows(makeMockRows(64));
    }
  }, [props?.rowsOverride]);
  /* Filters */
  const [selectedTypes, setSelectedTypes] = useState<Set<AnchorRow["anchorType"]>>(new Set());
  const [aqsRange, setAqsRange] = useState<[number, number]>([0, 100]);
  const [search, setSearch] = useState<string>("");
  const [includeNoFollow, setIncludeNoFollow] = useState<boolean>(true);
  const [quickPreset, setQuickPreset] = useState<{ overused?: boolean; underOptimized?: boolean; genericOnly?: boolean; brandedOnly?: boolean }>({});
  const [graphRow, setGraphRow] = useState<AnchorRow | null>(null);

  /* Column manager */
  const allColumns = {
    anchorText: true,
    type: true,
    totalLinks: true,
    internal: true,
    external: true,
    pagesUsing: true,
    targetPages: true,
    aqs: true,
    lastFound: true,
    actions: true,
  } as const;
  const [visibleCols, setVisibleCols] = useState<Record<keyof typeof allColumns, boolean>>({ ...allColumns });

  /* Sorting */
  type SortKey = keyof Pick<AnchorRow, "anchorText" | "anchorType" | "totalLinks" | "pagesUsing" | "aqs" | "lastFound">;
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "aqs", dir: "desc" });

  /* Pagination / Infinite */
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [infinite, setInfinite] = useState(false);

  /* Selection & expansion */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [instancesCache, setInstancesCache] = useState<Record<string, AnchorInstance[] | undefined>>({});
  useEffect(() => {
    if (!props?.rowsOverride) return;
    const seed: Record<string, AnchorInstance[] | undefined> = {};
    props.rowsOverride.forEach(r => {
      if (r.instances?.length) {
        seed[r.anchorId] = r.instances.map(i => ({
          sourcePage: i.sourcePage,
          snippet: i.snippet,
          targetUrl: i.targetUrl,
          linkType: i.linkType,
          lastFound: i.lastFound,
        }));
      }
    });
    setInstancesCache(seed);
  }, [props?.rowsOverride]);
  /* UI modals */
  const [showExport, setShowExport] = useState(false);
  const [showColumnMgr, setShowColumnMgr] = useState(false);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);

  /* Derived — filtering */
  const filtered = useMemo(() => {
    let list = rows.slice();
    if (selectedTypes.size) list = list.filter((r) => selectedTypes.has(r.anchorType));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.anchorText.toLowerCase().includes(q));
    }
    list = list.filter((r) => r.aqs >= aqsRange[0] && r.aqs <= aqsRange[1]);
    if (!includeNoFollow) list = list.filter((r) => r.nofollow !== true);
    if (quickPreset.overused) list = list.filter((r) => r.flags?.overused);
    if (quickPreset.underOptimized) list = list.filter((r) => r.aqs < 50);
    if (quickPreset.genericOnly) list = list.filter((r) => r.anchorType === "generic");
    if (quickPreset.brandedOnly) list = list.filter((r) => r.anchorType === "branded");
    return list;
  }, [rows, selectedTypes, search, aqsRange, includeNoFollow, quickPreset]);

  /* Sorting */
  const sorted = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      let av: any = a[sort.key];
      let bv: any = b[sort.key];
      if (sort.key === "lastFound") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (sort.key === "anchorText" || sort.key === "anchorType") {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [filtered, sort]);
  const selectedAnchors = useMemo(() => sorted.filter((r) => selected.has(r.anchorId)), [sorted, selected]);

  const buildAnchorTaskDescription = useCallback((anchor: AnchorRow, instance?: AnchorInstance) => {
    const lines = [
      `Anchor text: ${anchor.anchorText}`,
      `Type: ${anchor.anchorType}`,
      `Total links: ${anchor.totalLinks} (internal ${anchor.internal}, external ${anchor.external})`,
      `Pages using anchor: ${anchor.pagesUsing}`,
      `Target pages: ${anchor.targetPages}`,
      `AQS: ${anchor.aqs}%`,
      `Last found: ${new Date(anchor.lastFound).toLocaleString()}`,
      anchor.nofollow ? "Includes nofollow links" : null,
    ];

    if (instance) {
      lines.push(
        "",
        "Example instance:",
        `- Source page: ${instance.sourcePage}`,
        `- Target URL: ${instance.targetUrl}`,
        `- Link type: ${instance.linkType}`,
        `- Seen: ${new Date(instance.lastFound).toLocaleString()}`
      );
    }

    return lines.filter(Boolean).join("\n");
  }, []);

  const openTaskWithTitle = useCallback(
    (anchor: AnchorRow, title: string, instance?: AnchorInstance) => {
      openTaskDrawer({
        title,
        description: buildAnchorTaskDescription(anchor, instance),
        projectId: selectedProject?.id ?? null,
        type: "createNew",
      });
    },
    [buildAnchorTaskDescription, openTaskDrawer, selectedProject?.id],
  );

  const openTaskForAnchor = useCallback(
    (anchor: AnchorRow, instance?: AnchorInstance) => {
      openTaskWithTitle(anchor, `Optimize anchor "${anchor.anchorText}"`, instance);
    },
    [openTaskWithTitle],
  );

  const openReplacementTask = useCallback(
    (anchor: AnchorRow) => {
      openTaskWithTitle(anchor, "Replace Anchor");
    },
    [openTaskWithTitle],
  );

  const openFlagTask = useCallback(
    (anchor: AnchorRow) => {
      openTaskWithTitle(anchor, "Flag as Problematic");
    },
    [openTaskWithTitle],
  );

  const openTaskForSelection = useCallback(() => {
    if (!selectedAnchors.length) return;

    const preview = selectedAnchors
      .slice(0, 10)
      .map(
        (anchor) =>
          `- ${anchor.anchorText} (${anchor.anchorType}, ${anchor.totalLinks} links, AQS ${anchor.aqs}%)`
      );

    const description = [
      `Anchors selected: ${selectedAnchors.length}`,
      ...preview,
      selectedAnchors.length > preview.length ? "- ..." : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    openTaskDrawer({
      title: `Optimize ${selectedAnchors.length} anchor${selectedAnchors.length > 1 ? "s" : ""}`,
      description,
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }, [openTaskDrawer, selectedAnchors, selectedProject?.id]);

  /* Pagination slice */
  const paged = useMemo(() => {
    if (infinite) return sorted.slice(0, (page + 1) * pageSize);
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize, infinite]);

  /* Chips display (active filters) */
  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (selectedTypes.size) {
      chips.push({
        key: "types",
        label: `Types: ${Array.from(selectedTypes).map((t) => t[0].toUpperCase() + t.slice(1)).join(", ")}`,
        onRemove: () => setSelectedTypes(new Set()),
      });
    }
    if (search.trim()) chips.push({ key: "search", label: `Search: “${search}”`, onRemove: () => setSearch("") });
    if (aqsRange[0] !== 0 || aqsRange[1] !== 100)
      chips.push({ key: "aqs", label: `AQS: ${aqsRange[0]}–${aqsRange[1]}`, onRemove: () => setAqsRange([0, 100]) });
    if (!includeNoFollow) chips.push({ key: "nf", label: "Exclude NoFollow", onRemove: () => setIncludeNoFollow(true) });
    if (quickPreset.overused) chips.push({ key: "overused", label: "Overused Anchors", onRemove: () => setQuickPreset((s) => ({ ...s, overused: false })) });
    if (quickPreset.underOptimized) chips.push({ key: "uo", label: "Under-optimized", onRemove: () => setQuickPreset((s) => ({ ...s, underOptimized: false })) });
    if (quickPreset.genericOnly) chips.push({ key: "go", label: "Generic Only", onRemove: () => setQuickPreset((s) => ({ ...s, genericOnly: false })) });
    if (quickPreset.brandedOnly) chips.push({ key: "bo", label: "Branded Only", onRemove: () => setQuickPreset((s) => ({ ...s, brandedOnly: false })) });
    return chips;
  }, [selectedTypes, search, aqsRange, includeNoFollow, quickPreset]);

  /* Helpers */
  const toggleType = (t: AnchorRow["anchorType"]) => {
    const next = new Set(selectedTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setSelectedTypes(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleExpand = async (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      if (!instancesCache[id]) {
        // live didn't provide instances for this row; fall back to demo
        const data = await mockFetchInstances(id, 0, 6);
        setInstancesCache((m) => ({ ...m, [id]: data }));
      }
    }
    setExpanded(next);
  };

  const allOnPageIds = paged.map((r) => r.anchorId);
  const allOnPageSelected = allOnPageIds.every((id) => selected.has(id)) && allOnPageIds.length > 0;
  const [drawerRow, setDrawerRow] = useState(false);
  const [demoUsage, setDemoUsage] = useState(false);
  const [compareDrawer, setCompareDrawer] = useState(false);

  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
  const openDemo = () => {
    setDemoUsage(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeDemo = () => {
    setDemoUsage(false);
  };
  const openCompare = () => {
    setCompareDrawer(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeCompare = () => {
    setCompareDrawer(false);
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
        <aside className="absolute right-0 top-0 h-full overflow-auto bg-white p-4 shadow-xl">
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

  /* ------------------------------ Render UI ------------------------------- */
  return (
    <div
      className="w-full"
      style={{
        color: TOKENS.text,
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      {/* Card container */}
      <section className="w-full bg-white rounded-md border" style={{ borderColor: TOKENS.borderLight }}>
        {drawerRow && (
          <Drawer title="Anchor Target" onClose={closeDrawer}>
            <AnchorTargetsDrawerDemo />
          </Drawer>
        )}

        {graphRow && (
<DemoUsageGraphPopup
  open={!!graphRow}
  onClose={() => setGraphRow(null)}
  projectId={selectedProject?.id ?? undefined}
  anchor={{ id: graphRow.anchorId, text: graphRow.anchorText, aqs: graphRow.aqs }}
  instances={
    (instancesCache[graphRow.anchorId]?.map(i => ({
      source_page: i.sourcePage,
      snippet: i.snippet,
      target_url: i.targetUrl,
      rel_type: i.linkType === "nofollow" ? "nofollow" : "dofollow",
      last_found: i.lastFound,
    })) ??
    (props?.rowsOverride?.find(x => x.anchorId === graphRow.anchorId)?.instances?.map(i => ({
      source_page: i.sourcePage,
      snippet: i.snippet,
      target_url: i.targetUrl,
      rel_type: i.linkType === "nofollow" ? "nofollow" : "dofollow",
      last_found: i.lastFound,
    })) ?? []))
  }
/>

        )}

        {compareDrawer && (
          <Drawer title="Compare With Competitor" onClose={closeCompare}>
            <CompetitorAnchorComparisonDrawerUpdated />
          </Drawer>
        )}
        {/* Section header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 border-b bg-white/95 backdrop-blur"
          style={{ borderColor: TOKENS.borderLight }}
        >
          <div className="flex items-center gap-2">
            <AnchorIcon size={18} style={{ color: TOKENS.brand }} aria-hidden />
            <h2 className="text-[18px] font-semibold">Anchor Usage Table</h2>
            <Tooltip tip="This table lists every anchor across your domain with type, usage and quality (AQS).">
              <Info size={16} className="text-gray-500" />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {/* Modular Columns control chip */}
            <IconChip icon={<Settings size={16} style={{ color: TOKENS.brand }} />} onClick={() => setShowColumnMgr((s) => !s)}>
              Columns
            </IconChip>

            {/* White Export button with darker border */}
            <SecondaryWhiteButton onClick={() => setShowExport(true)}>
              <Download size={16} />
              Export
            </SecondaryWhiteButton>
          </div>
        </header>

        {/* Sticky filter bar */}
        <div className="sticky top-[44px] z-10 border-b bg-white/95 backdrop-blur px-4 py-2" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div
              className="flex items-center gap-2 h-8 px-2 rounded-full border"
              style={{ borderColor: TOKENS.borderLight, backgroundColor: TOKENS.chipBg }}
            >
              <Search size={16} style={{ color: TOKENS.textMuted }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anchor text…"
                className="outline-none text-sm w-56 bg-transparent"
              />
            </div>

            {/* Type filters (modular chip toggles) */}
            {(["exact", "phrase", "partial", "branded", "generic", "empty"] as AnchorRow["anchorType"][]).map((t) => (
              <IconChip
                key={t}
                icon={<span className="text-[currentColor]">{TypeIconMap[t]}</span>}
                active={selectedTypes.has(t)}
                onClick={() => toggleType(t)}
                title={`Toggle ${t}`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </IconChip>
            ))}

            {/* AQS range chip (modular) */}
            <AqsChip aqsRange={aqsRange} onChange={setAqsRange} />

            {/* NoFollow toggle (modular) */}
            <IconChip
              icon={<Tag size={14} style={{ color: includeNoFollow ? TOKENS.brand : TOKENS.textMuted }} />}
              active={!includeNoFollow}
              onClick={() => setIncludeNoFollow((v) => !v)}
              title="Toggle NoFollow"
            >
              {includeNoFollow ? "Include NoFollow" : "Exclude NoFollow"}
            </IconChip>

            {/* Quick presets (modular) */}
            <IconChip
              icon={<AlertTriangle size={14} style={{ color: quickPreset.overused ? TOKENS.brand : TOKENS.textMuted }} />}
              active={!!quickPreset.overused}
              onClick={() => setQuickPreset((s) => ({ ...s, overused: !s.overused }))}
            >
              Overused Anchors
            </IconChip>

            <IconChip
              icon={<AlertTriangle size={14} style={{ color: quickPreset.underOptimized ? TOKENS.brand : TOKENS.textMuted }} />}
              active={!!quickPreset.underOptimized}
              onClick={() => setQuickPreset((s) => ({ ...s, underOptimized: !s.underOptimized }))}
            >
              Under-optimized
            </IconChip>

            <IconChip
              icon={<Tag size={14} style={{ color: quickPreset.genericOnly ? TOKENS.brand : TOKENS.textMuted }} />}
              active={!!quickPreset.genericOnly}
              onClick={() => setQuickPreset((s) => ({ ...s, genericOnly: !s.genericOnly, brandedOnly: false }))}
            >
              Generic Only
            </IconChip>

            <IconChip
              icon={<BadgeCheck size={14} style={{ color: quickPreset.brandedOnly ? TOKENS.brand : TOKENS.textMuted }} />}
              active={!!quickPreset.brandedOnly}
              onClick={() => setQuickPreset((s) => ({ ...s, brandedOnly: !s.brandedOnly, genericOnly: false }))}
            >
              Branded Only
            </IconChip>

            {/* Pagination vs Infinite */}
            <div className="ml-auto flex items-center gap-2 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={infinite} onChange={(e) => setInfinite(e.target.checked)} />
                Infinite scroll
              </label>
              {!infinite && (
                <>
                  <select
                    className="border rounded px-2 py-1 cursor-pointer"
                    style={{ borderColor: TOKENS.borderLight }}
                    value={pageSize}
                    onChange={(e) => {
                      setPage(0);
                      setPageSize(parseInt(e.target.value));
                    }}
                  >
                    {[10, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s}/page
                      </option>
                    ))}
                  </select>
                  <div className="inline-flex items-center gap-1">
                    <button
                      className="px-2 py-1 border rounded cursor-pointer"
                      style={{ borderColor: TOKENS.borderLight }}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-600">Page {page + 1}</span>
                    <button
                      className="px-2 py-1 border rounded cursor-pointer"
                      style={{ borderColor: TOKENS.borderLight }}
                      onClick={() => setPage((p) => ((p + 1) * pageSize < sorted.length ? p + 1 : p))}
                      disabled={(page + 1) * pageSize >= sorted.length}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active filter chips row (read-only tokens) */}
          {filterChips.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {filterChips.map((c) => (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] border"
                  style={{ borderColor: TOKENS.borderLight, backgroundColor: TOKENS.chipBg }}
                >
                  {c.label}
                  <button onClick={c.onRemove} className="hover:text-red-600 cursor-pointer" aria-label={`Remove filter ${c.key}`}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bulk actions toolbar */}
        {selectedAnchors.length > 0 && (
          <div
            className="sticky top-[98px] z-10 bg-blue-50/80 backdrop-blur border-y px-4 py-2 flex items-center gap-3"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <span className="text-sm font-medium" style={{ color: TOKENS.brand }}>
              {selectedAnchors.length} anchors selected
            </span>
            <div className="h-5 w-px bg-blue-300" />
            <IconChip icon={<Wrench size={16} style={{ color: TOKENS.brand }} />}>Replace (bulk)</IconChip>
            <IconChip icon={<Brain size={16} style={{ color: TOKENS.brand }} />} onClick={openTaskForSelection}>
              Create Optimization Task
            </IconChip>
            {/* Export button (white + darker border) */}
            <SecondaryWhiteButton onClick={() => setShowExport(true)}>
              <Download size={16} />
              Export Selected
            </SecondaryWhiteButton>
            <span className="ml-auto text-xs" style={{ color: TOKENS.text }}>
              Fix Summary: {selectedAnchors.length} selected
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto">
          <table className="min-w-[960px] w-full text-sm">
            {/* FIX: thead sticks at the very top of this scroll container */}
            <thead className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: TOKENS.borderLight }}>
              <tr className="text-left text-[12px] text-gray-600">
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) allOnPageIds.forEach((id) => next.add(id));
                      else allOnPageIds.forEach((id) => next.delete(id));
                      setSelected(next);
                    }}
                  />
                </th>
                {visibleCols.anchorText && (
                  <SortableTh label="Anchor Text" sort={sort} k="anchorText" setSort={setSort} />
                )}
                {visibleCols.type && <SortableTh label="Type" sort={sort} k="anchorType" setSort={setSort} />}
                {visibleCols.totalLinks && <SortableTh label="Total Links" sort={sort} k="totalLinks" setSort={setSort} />}
                {visibleCols.internal && <th className="px-3 py-2">Internal</th>}
                {visibleCols.external && <th className="px-3 py-2">External</th>}
                {visibleCols.pagesUsing && <SortableTh label="Pages Using It" sort={sort} k="pagesUsing" setSort={setSort} />}
                {visibleCols.targetPages && <th className="px-3 py-2">Target Pages</th>}
                {visibleCols.aqs && <SortableTh label="AQS" sort={sort} k="aqs" setSort={setSort} />}
                {visibleCols.lastFound && <SortableTh label="Last Found" sort={sort} k="lastFound" setSort={setSort} />}
                {visibleCols.actions && <th className="px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <React.Fragment key={r.anchorId}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="w-10 px-4 py-2 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select anchor ${r.anchorText}`}
                        checked={selected.has(r.anchorId)}
                        onChange={() => toggleSelectRow(r.anchorId)}
                      />
                    </td>

                    {/* Anchor Text */}
                    {visibleCols.anchorText && (
                      <td className="px-3 py-2 align-top max-w-[280px]">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleExpand(r.anchorId)}
                            className="mt-0.5 text-gray-500 hover:text-gray-800 cursor-pointer"
                            aria-label="Expand row"
                          >
                            {expanded.has(r.anchorId) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold truncate max-w-[180px]" title={r.anchorText}>
                                {r.anchorText}
                              </span>

                              {r.flags?.imageOnly && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[12px] font-medium border"
                                  style={{ backgroundColor: `${TOKENS.type.empty}10`, color: TOKENS.type.empty, borderColor: `${TOKENS.type.empty}50` }}
                                  title="Image-only anchor"
                                >
                                  <ImageIcon size={12} /> Image Only
                                </span>
                              )}

                              {r.flags?.overused && (
                                <Tooltip tip="Appears on 50+ pages">
                                  <AlertTriangle size={14} className="text-amber-500" />
                                </Tooltip>
                              )}

                              {r.aqs < 40 && (
                                <Tooltip tip="Low AQS; consider rephrasing to phrase/partial">
                                  <AlertTriangle size={14} className="text-red-500" />
                                </Tooltip>
                              )}

                              <Tooltip tip="AI suggestion available">
                                <Brain size={14} style={{ color: TOKENS.brand }} />
                              </Tooltip>

                              <button
                                className="ml-1 p-1 rounded hover:bg-gray-100 cursor-pointer"
                                onClick={() => navigator.clipboard.writeText(r.anchorText)}
                                aria-label="Copy anchor text"
                                title="Copy anchor text"
                                style={{ color: TOKENS.brand }}
                              >
                                <Copy size={14} />
                              </button>
                            </div>

                            <div className="text-[12px] text-gray-600">
                              Hover to preview context — Last found {new Date(r.lastFound).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Type (now includes branded icon) */}
                    {visibleCols.type && (
                      <td className="px-3 py-2 align-top">
                        <AnchorTypePill type={r.anchorType} onClick={() => toggleType(r.anchorType)} />
                      </td>
                    )}

                    {/* Total Links */}
                    {visibleCols.totalLinks && (
                      <td className="px-3 py-2 align-top">
                        <button className="text-blue-700 hover:underline cursor-pointer" title="View all source instances (modal)">
                          {r.totalLinks}
                        </button>
                      </td>
                    )}

                    {/* Internal / External */}
                    {visibleCols.internal && <td className="px-3 py-2 align-top" title="Internal links">{r.internal}</td>}
                    {visibleCols.external && <td className="px-3 py-2 align-top" title="External links">{r.external}</td>}

                    {/* Pages Using It */}
                    {visibleCols.pagesUsing && (
                      <td className="px-3 py-2 align-top">
                        <button className="text-blue-700 hover:underline cursor-pointer" title="Open Page Drawer (filtered)">
                          {r.pagesUsing}
                        </button>
                      </td>
                    )}

                    {/* Target Pages */}
                    {visibleCols.targetPages && (
                      <td className="px-3 py-2 align-top">
                        <button className="text-blue-700 hover:underline cursor-pointer" title="Open Target Pages mini-drawer" onClick={openDrawer}>
                          {r.targetPages}
                        </button>
                      </td>
                    )}

                    {/* AQS */}
                    {visibleCols.aqs && (
                      <td className="px-3 py-2 align-top min-w-[160px]">
                        <AQSBar value={r.aqs} />
                      </td>
                    )}

                    {/* Last Found */}
                    {visibleCols.lastFound && (
                      <td className="px-3 py-2 align-top">
                        {new Date(r.lastFound).toLocaleDateString()}
                      </td>
                    )}

                    {/* Actions */}
                    {visibleCols.actions && (
                      <td className="px-3 py-2 align-top relative">
                        <GhostIconButton label="Row actions" onClick={() => setActionsOpenId(actionsOpenId === r.anchorId ? null : r.anchorId)}>
                          <MoreHorizontal size={18} />
                        </GhostIconButton>
                        {actionsOpenId === r.anchorId && (
                          <div
                            className="absolute right-2 mt-1 w-56 rounded border bg-white shadow-lg z-20"
                            style={{ borderColor: TOKENS.borderLight }}
                            role="menu"
                          >
                            <MenuItem
                              icon={<LineChart size={16} />}
                              label="View Usage Graph"
                              onClick={() => {
                                setActionsOpenId(null);
                                setGraphRow(r);
                              }}
                            />                            <MenuItem disabled onClick={openCompare} icon={<GitCompare size={16} onClick={openCompare} />} label="Compare with Competitor" />
                            <MenuItem
                              onClick={() => {
                                openTaskForAnchor(r);
                                setActionsOpenId(null);
                              }}
                              icon={<Brain size={16} />}
                              label="Create Task"
                            />
                            <MenuItem disabled icon={<ExternalLink size={16} />} label="Open in Page Analyzer" />
                            <MenuItem
                              icon={<Wrench size={16} />}
                              label="Replace Anchor"
                              onClick={() => {
                                openReplacementTask(r);
                                setActionsOpenId(null);
                              }}
                            />
                            <MenuItem
                              icon={<AlertTriangle size={16} />}
                              label="Flag as Problematic"
                              onClick={() => {
                                openFlagTask(r);
                                setActionsOpenId(null);
                              }}
                            />
                          </div>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Expanded row */}
                  {expanded.has(r.anchorId) && (
                    <tr className="bg-gray-50">
                      <td></td>
                      <td colSpan={Object.values(visibleCols).filter(Boolean).length - 1} className="px-3 py-3">
                        <InstancesPane
                          anchor={r}
                          cached={instancesCache[r.anchorId]}
                          onNeedLoad={async () => {
                            const data = await mockFetchInstances(r.anchorId, 0, 8);
                            setInstancesCache((m) => ({ ...m, [r.anchorId]: data }));
                          }}
                          onCreateTask={openTaskForAnchor}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {paged.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-gray-500">
                    No anchors match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer (pagination mirror) */}
        {!infinite && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm text-gray-600">
              Showing {Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 border rounded cursor-pointer"
                style={{ borderColor: TOKENS.borderLight }}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </button>
              <span className="text-xs text-gray-600">Page {page + 1}</span>
              <button
                className="px-2 py-1 border rounded cursor-pointer"
                style={{ borderColor: TOKENS.borderLight }}
                onClick={() => setPage((p) => ((p + 1) * pageSize < sorted.length ? p + 1 : p))}
                disabled={(page + 1) * pageSize >= sorted.length}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Column Manager */}
      {showColumnMgr && (
        <Dialog onClose={() => setShowColumnMgr(false)} title="Column Manager">
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(visibleCols).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={(visibleCols as any)[k]}
                  onChange={(e) => setVisibleCols((m) => ({ ...(m as any), [k]: e.target.checked }))}
                />
                <span className="capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
              </label>
            ))}
          </div>
        </Dialog>
      )}

      {/* Export Modal */}
      {showExport && (
        <Dialog onClose={() => setShowExport(false)} title="Export Anchors">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium mb-1">Scope</div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer"><input name="scope" type="radio" defaultChecked /> Visible rows</label>
                <label className="inline-flex items-center gap-2 cursor-pointer"><input name="scope" type="radio" /> Full result set</label>
                <label className="inline-flex items-center gap-2 cursor-pointer"><input name="scope" type="radio" /> Selected rows</label>
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Format</div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer"><input name="fmt" type="radio" defaultChecked /> CSV</label>
                <label className="inline-flex items-center gap-2 cursor-pointer"><input name="fmt" type="radio" /> Excel</label>
                <label className="inline-flex items-center gap-2 cursor-pointer"><input name="fmt" type="radio" /> PDF</label>
              </div>
            </div>
            <div className="text-xs text-gray-600">Export will include projectId, filters, and timestamp metadata.</div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button className="px-3 py-1.5 rounded border text-sm cursor-pointer" style={{ borderColor: TOKENS.borderLight }} onClick={() => setShowExport(false)}>Cancel</button>
              <button
                className="px-3 py-1.5 rounded text-white text-sm cursor-pointer"
                style={{ backgroundColor: TOKENS.brand }}
                onClick={() => {
                  setShowExport(false);
                  console.log("anchor_export_requested", { timestamp: Date.now() });
                }}
              >
                Export
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/* --------------------------- Subcomponents --------------------------- */
function SortableTh({
  label,
  k,
  sort,
  setSort,
}: {
  label: string;
  k: any;
  sort: { key: any; dir: "asc" | "desc" };
  setSort: any;
}) {
  const isActive = sort.key === k;
  return (
    <th
      role="button"
      tabIndex={0}
      onClick={() => setSort({ key: k, dir: isActive && sort.dir === "asc" ? "desc" : "asc" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setSort({ key: k, dir: isActive && sort.dir === "asc" ? "desc" : "asc" });
      }}
      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className="px-3 py-2 select-none cursor-pointer"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ChevronsUpDown size={14} className={clsx("text-gray-400", isActive && "text-gray-700")} />
      </span>
    </th>
  );
}

function InstancesPane({
  anchor,
  cached,
  onNeedLoad,
  onCreateTask,
}: {
  anchor: AnchorRow;
  cached?: AnchorInstance[];
  onNeedLoad: () => void;
  onCreateTask: (anchor: AnchorRow, instance?: AnchorInstance) => void;
}) {
  useEffect(() => {
    if (!cached) onNeedLoad();
  }, [cached, onNeedLoad]);
  return (
    <div>
      <div className="mb-2 text-[13px] text-gray-700 font-medium">
        Instances for {anchor.anchorText} ({anchor.anchorId})
      </div>
      {!cached ? (
        <div className="text-gray-500 text-sm">Loading instances…</div>
      ) : (
        <div className="max-h-56 overflow-auto rounded border" style={{ borderColor: TOKENS.borderLight }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="text-left text-[12px] text-gray-600">
                <th className="px-3 py-2">Source Page</th>
                <th className="px-3 py-2">Snippet</th>
                <th className="px-3 py-2">Target URL</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Last Found</th>
                <th className="px-3 py-2">Quick</th>
              </tr>
            </thead>
            <tbody>
              {cached.map((inst, i) => (
                <tr key={i} className="border-b last:border-b-0" style={{ borderColor: TOKENS.borderLight }}>
                  <td className="px-3 py-2 text-blue-700 hover:underline cursor-pointer">{inst.sourcePage}</td>
                  <td
                    className="px-3 py-2 text-[12px] text-gray-700"
                    dangerouslySetInnerHTML={{ __html: inst.snippet }}
                  />
                  <td className="px-3 py-2 text-blue-700 hover:underline cursor-pointer">{inst.targetUrl}</td>
                  <td className="px-3 py-2">{inst.linkType}</td>
                  <td className="px-3 py-2">{new Date(inst.lastFound).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {/* Branded quick actions */}
                    <div className="flex items-center gap-2">
                      <GhostIconButton label="Replace">
                        <Wrench size={16} />
                      </GhostIconButton>
                      <GhostIconButton label="Create Task" onClick={() => onCreateTask(anchor, inst)}>
                        <Brain size={16} />
                      </GhostIconButton>
                      <GhostIconButton label="Ignore">
                        <X size={16} />
                      </GhostIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string, onClick?: () => void, disabled?: any }) {
  return (
    <button
      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      role="menuitem"
      style={{ color: TOKENS.text }}
      onClick={onClick}
      disabled={disabled}
    >
      <span style={{ color: TOKENS.brand }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute left-1/2 top-10 -translate-x-1/2 w-full max-w-xl rounded-md bg-white shadow-xl border"
        style={{ borderColor: TOKENS.borderLight }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TOKENS.borderLight }}>
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} aria-label="Close dialog" className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* AQS Chip (modular control) */
function AqsChip({ aqsRange, onChange }: { aqsRange: [number, number]; onChange: (r: [number, number]) => void }) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(aqsRange[0]);
  const [max, setMax] = useState(aqsRange[1]);

  useEffect(() => {
    setMin(aqsRange[0]);
    setMax(aqsRange[1]);
  }, [aqsRange]);
  return (
    <div className="relative">
      <IconChip icon={<LineChart size={14} style={{ color: TOKENS.brand }} />} onClick={() => setOpen((o) => !o)}>
        AQS: {aqsRange[0]}–{aqsRange[1]}
      </IconChip>
      {open && (
        <div
          className="absolute z-20 mt-2 w-64 rounded border bg-white p-3 shadow-lg"
          style={{ borderColor: TOKENS.borderLight }}
        >
          <div className="text-[12px] text-gray-700 mb-2">Adjust AQS range</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              className="w-16 border rounded px-2 py-1"
              style={{ borderColor: TOKENS.borderLight }}
              value={min}
              onChange={(e) => setMin(Math.max(0, Math.min(100, Number(e.target.value))))}
            />
            <span>to</span>
            <input
              type="number"
              min={0}
              max={100}
              className="w-16 border rounded px-2 py-1"
              style={{ borderColor: TOKENS.borderLight }}
              value={max}
              onChange={(e) => setMax(Math.max(0, Math.min(100, Number(e.target.value))))}
            />
            <button
              className="ml-auto px-3 py-1.5 rounded text-white text-sm cursor-pointer"
              style={{ backgroundColor: TOKENS.brand }}
              onClick={() => {
                onChange([Math.min(min, max), Math.max(min, max)] as [number, number]);
                setOpen(false);
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

