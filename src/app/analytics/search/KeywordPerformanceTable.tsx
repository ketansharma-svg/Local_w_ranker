// KeywordPerformanceTable.tsx
// Drop-in React TSX implementing “Section 2: Keyword (Query) Performance Table”
// Refined: Inter fonts, no emoji, branded (#008CCD) icons, modular chips/toggles,
// single Export (dropdown), bulk bar above first selected row, intent colored dot,
// brand action icons (borderless), row expander mini-table w/ headers & actions.

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Download,
  Search as SearchIcon, Info, X, Monitor, Smartphone, Tablet, PanelRightOpen,
  NotebookPen, RefreshCcw, Calendar, Check, Globe2, Columns, ExternalLink, Plug, BarChart3,Eye
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import KeywordHeaderDemoCanvas from "./keyword-drawer/KeywordHeaderDemoCanvas";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  brandSoft: "rgba(0,140,205,0.10)",
  valueBlue: "#0077FF",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  surfaceAlt: "#FAFBFF",
  radius: "var(--wr-radius, 8px)",
};

/* ───────────────────────── Types ───────────────────────── */
export type DeviceType = "mobile" | "desktop" | "tablet";
export type Intent = "Informational" | "Commercial" | "Navigational" | null;

export type QueryRow = {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;           // percent value, e.g. 3.2
  avgPosition: number;
  topDevice?: DeviceType;
  topCountry?: { code: string; name: string };
  intent?: Intent;
  topUrl: string;
  topUrls?: Array<{ url: string; title: string; clicks: number; impressions: number }>;
};

/* ───────────────────────── Utils ───────────────────────── */
const fmtNumber = (n: number | null | undefined) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "—";
const fmtPct1 = (n: number | null | undefined) =>
  typeof n === "number" ? `${n.toFixed(1)}%` : "—";
const fmtPos1 = (n: number | null | undefined) =>
  typeof n === "number" ? n.toFixed(1) : "—";
const clampNum = (n: unknown, fallback = 0) => {
  const x = typeof n === "number" && isFinite(n) ? n : Number(n);
  return isFinite(x) ? x : fallback;
};

/** Tri-state sort type */
type SortKey = "query" | "clicks" | "impressions" | "ctr" | "avgPosition";
type SortDir = "desc" | "asc" | "off";

/* ───────────────────────── Mock data (remove when wiring) ───────────────────────── */
function randomPick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
const COUNTRIES = [
  { code: "US", name: "USA" },
  { code: "IN", name: "India" },
  { code: "GB", name: "UK" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "AU", name: "Australia" },
];
const DEVICES: DeviceType[] = ["mobile", "desktop", "tablet"];
const INTENTS: Intent[] = ["Informational", "Commercial", "Navigational", null];

function makeRows(n = 120): QueryRow[] {
  const rows: QueryRow[] = [];
  for (let i = 0; i < n; i++) {
    const q =
      i % 7 === 0 ? `seo audit service ${i + 1}` :
      i % 7 === 1 ? `best seo tools ${i + 1}` :
      i % 7 === 2 ? `keyword planner ${i + 1}` :
      i % 7 === 3 ? `technical seo checklist ${i + 1}` :
      i % 7 === 4 ? `on-page optimization ${i + 1}` :
      i % 7 === 5 ? `what is robots.txt ${i + 1}` :
      `site audit software ${i + 1}`;
    const impressions = Math.floor(200 + Math.random() * 60000);
    const clicks = Math.floor(impressions * (0.002 + Math.random() * 0.08));
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const avgPosition = +(1 + Math.random() * 40).toFixed(1);
    const country = randomPick(COUNTRIES);
    const topUrl = `/blog/${q.replace(/\s+/g, "-")}`;
    const topUrls = [
      { url: topUrl, title: `Guide: ${q}`, clicks: Math.floor(clicks * 0.7), impressions: Math.floor(impressions * 0.6) },
      { url: `${topUrl}-v2`, title: `Checklist: ${q}`, clicks: Math.floor(clicks * 0.3), impressions: Math.floor(impressions * 0.4) },
    ];
    rows.push({
      id: `${q}|${topUrl}`,
      query: q,
      clicks,
      impressions,
      ctr: +ctr.toFixed(1),
      avgPosition,
      topDevice: randomPick(DEVICES),
      topCountry: country,
      intent: randomPick(INTENTS),
      topUrl,
      topUrls,
    });
  }
  return rows;
}

/* ───────────────────────── Columns ───────────────────────── */
type ColKey =
  | "select" | "query" | "clicks" | "impressions" | "ctr" | "avgPosition"
  | "device" | "country" | "intent" | "action";
type ColDef = {
  key: ColKey; label: string; tooltip?: string; sortable?: boolean; sticky?: boolean; minW?: number;
};
const COLS: ColDef[] = [
  { key: "select", label: "", sticky: true, minW: 44 },
  { key: "query", label: "Query", tooltip: "Search query typed by users.", sortable: true, sticky: true, minW: 320 },
  { key: "clicks", label: "Clicks", tooltip: "GSC clicks for this query.", sortable: true, minW: 120 },
  { key: "impressions", label: "Impressions", tooltip: "GSC impressions for this query.", sortable: true, minW: 140 },
  { key: "ctr", label: "CTR (%)", tooltip: "CTR = Clicks ÷ Impressions.", sortable: true, minW: 130 },
  { key: "avgPosition", label: "Avg. Position", tooltip: "Average search position (lower is better).", sortable: true, minW: 140 },
  { key: "device", label: "Device", tooltip: "Top device by impression share.", minW: 110 },
  { key: "country", label: "Country", tooltip: "Top country by impressions.", minW: 160 },
  { key: "intent", label: "Intent Type", tooltip: "Query intent (Wranker model).", minW: 160 },
  { key: "action", label: "Actions", tooltip: "Analyze / Task.", minW: 140 },
];

/* ───────────────────────── Intent colored dot ───────────────────────── */
function intentColor(v: Intent) {
  if (v === "Commercial") return "#10B981";
  if (v === "Navigational") return "#F59E0B";
  return "#0077FF"; // Informational
}
const IntentDot: React.FC<{ v: Intent }> = ({ v }) => {
  if (!v) return <span className="text-xs" style={{ color: TK.muted }}>—</span>;
  const col = intentColor(v);
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: col }} />
      <span style={{ color: TK.text }}>{v}</span>
    </span>
  );
};

/* ───────────────────────── Flags (no emoji) ───────────────────────── */
function Flags({ r }: { r: QueryRow }) {
  const hasImpr = r.impressions > 0;
  const ctr = hasImpr ? r.ctr : 0;
  const red = r.avgPosition < 10 && ctr < 3.0 && hasImpr;
  const amber = r.impressions > 1000 && r.clicks < 20;
  const green = r.avgPosition < 5 && ctr > 5.0;
  return (
    <span className="inline-flex items-center gap-1.5">
      {red && <span className="inline-block h-2.5 w-2.5 rounded-full" title="Low CTR / Good Rank" style={{ background: TK.critical }} />}
      {amber && <span className="inline-block h-2.5 w-2.5 rounded-full" title="High Impressions, Low Clicks" style={{ background: TK.warn }} />}
      {green && <span className="inline-block h-2.5 w-2.5 rounded-full" title="High Intent Winner" style={{ background: TK.ok }} />}
    </span>
  );
}

/* ───────────────────────── CTR chip ───────────────────────── */
function ctrTone(r: QueryRow) {
  if (r.impressions <= 0) return { bg: "rgba(17,24,39,0.06)", col: TK.muted, label: "CTR" };
  const c = r.ctr, pos = r.avgPosition;
  if (pos < 10 && c < 2.5) return { bg: "rgba(239,68,68,0.08)", col: TK.critical, label: "Low CTR" };
  if (pos < 10 && c >= 2.5 && c < 3.0) return { bg: "rgba(245,158,11,0.12)", col: TK.warn, label: "Near threshold" };
  return { bg: "rgba(17,24,39,0.06)", col: TK.muted, label: "CTR" };
}
const CtrChip: React.FC<{ r: QueryRow }> = ({ r }) => {
  const { bg, col, label } = ctrTone(r);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" title="CTR = Clicks ÷ Impressions." style={{ background: bg, color: col }}>
      {label} {r.impressions > 0 ? r.ctr.toFixed(1) + "%" : "—"}
    </span>
  );
};

/* ───────────────────────── Component ───────────────────────── */
type Mode = "pages" | "infinite";
type Preset = "all" | "lowCtr" | "hiImprLowClicks" | "winners";

export default function KeywordPerformanceTable(props: {
  rows?: QueryRow[];
  gscConnected?: boolean;
  initialMode?: Mode;
  initialPageSize?: number;
  onCreateTask?: (payload: { query: string; url: string }) => Promise<void> | void;
  gscPropertyUrl?: string;
}) {
  /* Data / status */
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "noPermission">("loading");
  const [rows, setRows] = useState<QueryRow[]>(props.rows ?? []);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (props.gscConnected === false) { setStatus("noPermission"); return; }
        if (!props.rows) {
          await new Promise((r) => setTimeout(r, 400));
          if (!mounted) return;
          setRows(makeRows(160));
        }
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };
    load();
    return () => { mounted = false; };
  }, [props.rows, props.gscConnected]);

  /* Layout refs */
  const tableRef = useRef<HTMLDivElement>(null);

  /* Mode + pagination */
  const [mode, setMode] = useState<Mode>(props.initialMode ?? "pages");
  const [pageSize, setPageSize] = useState<number>(props.initialPageSize ?? 20);
  const [page, setPage] = useState<number>(1);
  const [infiniteCount, setInfiniteCount] = useState<number>(40);

  /* Sorting (tri-state) */
  const [sortKey, setSortKey] = useState<SortKey>("clicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const cycleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); return; }
    setSortDir((prev) => (prev === "desc" ? "asc" : prev === "asc" ? "off" : "desc"));
  };
  const ariaSort = (key: SortKey): React.AriaAttributes["aria-sort"] =>
    sortKey !== key || sortDir === "off" ? "none" : sortDir === "asc" ? "ascending" : "descending";

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
    select: true, query: true, clicks: true, impressions: true, ctr: true, avgPosition: true, device: true, country: true, intent: true, action: true,
  });

  /* Filters & chips */
  const [qSearch, setQSearch] = useState("");
  const [preset, setPreset] = useState<Preset>("all");
  const [device, setDevice] = useState<"all" | DeviceType>("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [ctrRange, setCtrRange] = useState<[number, number]>([0, 20]);
  const [posRange, setPosRange] = useState<[number, number]>([1, 100]);
  const [time, setTime] = useState<"7d" | "28d" | "90d" | "custom">("28d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  /* Selection / bulk */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.entries(selected).filter(([_, v]) => v).map(([k]) => k), [selected]);

  /* Expanders */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  /* Country popover */
  const [openCountry, setOpenCountry] = useState(false);

  /* Drawer state (FIX: define sheet) */
  const [sheet, setSheet] = useState<null | { type: "analyzer" | "task"; row: QueryRow }>(null);

  /* Sticky header shadow on scroll */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* Infinite sentinel */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "infinite") return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setInfiniteCount((c) => c + 20); });
    }, { root: scrollRef.current ?? undefined, rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  /* Reset */
  const resetAll = () => {
    setMode("pages"); setPageSize(20); setPage(1); setInfiniteCount(40);
    setSortKey("clicks"); setSortDir("desc");
    setQSearch(""); setPreset("all"); setDevice("all"); setCountries([]);
    setCtrRange([0, 20]); setPosRange([1, 100]);
    setTime("28d"); setCustomStart(""); setCustomEnd("");
    setSelected({}); setExpanded({}); setSheet(null);
    setVisibleCols({ select: true, query: true, clicks: true, impressions: true, ctr: true, avgPosition: true, device: true, country: true, intent: true, action: true });
  };

  /* Derived: filter & sort */
  const filtered = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.query.toLowerCase().includes(q)) return false;
      const hasImpr = r.impressions > 0;
      const ctr = hasImpr ? r.ctr : 0;
      if (preset === "lowCtr" && !(r.avgPosition < 10 && ctr < 3.0 && hasImpr)) return false;
      if (preset === "hiImprLowClicks" && !(r.impressions > 1000 && r.clicks < 20)) return false;
      if (preset === "winners" && !(r.avgPosition < 5 && ctr > 5.0)) return false;
      if (device !== "all" && r.topDevice !== device) return false;
      if (countries.length > 0 && (!r.topCountry || !countries.includes(r.topCountry.code))) return false;
      if (hasImpr) {
        if (r.ctr < ctrRange[0] || r.ctr > ctrRange[1]) return false;
      }
      if (r.avgPosition < posRange[0] || r.avgPosition > posRange[1]) return false;
      return true;
    });
  }, [rows, qSearch, preset, device, countries, ctrRange, posRange]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const defaultCompare = (a: QueryRow, b: QueryRow) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      if (b.impressions !== a.impressions) return b.impressions - a.impressions;
      return b.ctr - a.ctr;
    };
    if (sortDir === "off") { arr.sort(defaultCompare); return arr; }
    const getVal = (r: QueryRow) =>
      sortKey === "query" ? r.query :
      sortKey === "clicks" ? r.clicks :
      sortKey === "impressions" ? r.impressions :
      sortKey === "ctr" ? r.ctr : r.avgPosition;
    arr.sort((a, b) => {
      const va = getVal(a) as any, vb = getVal(b) as any;
      if (va === vb) return defaultCompare(a, b);
      if (sortDir === "asc") return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  /* Windowed rows */
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const windowRows = mode === "pages" ? sorted.slice(pageStart, pageStart + pageSize) : sorted.slice(0, Math.min(infiniteCount, sorted.length));

  const pageIds = useMemo(() => windowRows.map((r) => r.id), [windowRows]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected((prev) => {
      const next = { ...prev };
      pageIds.forEach((id) => { next[id] = checked; });
      return next;
    });
  };

  /* Export helpers */
  const visibleColOrder = useMemo(() => COLS.filter((c) => visibleCols[c.key] !== false), [visibleCols]);
  const filenameBase = () => {
    const d = new Date();
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    const range = time === "custom" ? "custom" : time;
    const sel = selectedIds.length > 0 ? "__selected" : "";
    return `queries_${yyyymmdd}_${range}${sel}`;
  };
  const exportCSV = (selectedOnly = selectedIds.length > 0) => {
    const headers = visibleColOrder.filter(c => !["select","action"].includes(c.key)).map(c => c.label);
    const rowsToWrite = selectedOnly ? sorted.filter(r => selected[r.id]) : sorted;
    const mapVal = (r: QueryRow, key: ColKey) => {
      switch (key) {
        case "query": return r.query;
        case "clicks": return r.clicks;
        case "impressions": return r.impressions;
        case "ctr": return r.impressions > 0 ? r.ctr.toFixed(1) + "%" : "—";
        case "avgPosition": return r.avgPosition.toFixed(1);
        case "device": return r.topDevice ?? "";
        case "country": return r.topCountry ? `${r.topCountry.code} ${r.topCountry.name}` : "";
        case "intent": return r.intent ?? "";
        default: return "";
      }
    };
    const csvRows = rowsToWrite.map(r =>
      visibleColOrder
        .filter(c => !["select","action"].includes(c.key))
        .map(c => JSON.stringify(mapVal(r, c.key)))
        .join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filenameBase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportPNG = async () => {
    try {
      const node = tableRef.current;
      if (!node) return;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filenameBase()}.png`;
      a.click();
    } catch (e) {
      console.warn("PNG export needs 'html-to-image' installed.", e);
      alert("PNG export requires the optional 'html-to-image' package.\nInstall with: npm i html-to-image");
    }
  };

  /*Drawer */
  const [drawerRow, setDrawerRow] = useState(false);

  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
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
      <aside className="absolute right-0 top-0 h-full w-[72vw] overflow-auto bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer"
          >
            ✕
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}


  /* Header cell */
  const HeaderCell: React.FC<{ col: ColDef; sortKeyLocal?: SortKey }> = ({ col, sortKeyLocal }) => {
    const showSort = col.sortable && sortKeyLocal;
    const isActive = showSort && sortKey === sortKeyLocal;
    const icon = !isActive || sortDir === "off"
      ? <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      : sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
    return (
      <TableHead
        className="whitespace-nowrap"
        style={{
          minWidth: col.minW,
          position: col.sticky ? "sticky" as const : undefined,
          left: col.sticky ? (col.key === "select" ? 0 : 44) : undefined,
          zIndex: col.sticky ? 30 : undefined,
          background: "#fff",
          boxShadow: col.sticky ? "inset -1px 0 0 rgba(0,0,0,0.06)" : undefined,
        }}
        aria-sort={showSort ? ariaSort(sortKeyLocal!) : "none"}
        title={col.tooltip}
      >
        {showSort ? (
          <button onClick={() => cycleSort(sortKeyLocal!)} className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer">
            <span>{col.label}</span>{icon}
          </button>
        ) : col.label}
      </TableHead>
    );
  };

  /* Country chips (selected) */
  const countryChips = countries
    .map((code) => COUNTRIES.find((c) => c.code === code))
    .filter(Boolean) as { code: string; name: string }[];

  /* Data states */
  const StateShell = () => {
    if (status === "loading") {
      return (
        <div className="space-y-3 p-4">
          <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 w-full bg-gray-100 rounded animate-pulse" />)}
        </div>
      );
    }
    if (status === "noPermission") {
      return (
        <div className="p-8 text-center">
          <div className="mb-2 flex justify-center">
            <Plug className="h-8 w-8" style={{ color: TK.brand }} />
          </div>
          <div className="text-lg font-medium mb-1" style={{ color: TK.text }}>Connect Google Search Console</div>
          <div className="text-sm mb-4" style={{ color: TK.muted }}>We need GSC access to show keyword performance.</div>
          <Button style={{ background: TK.brand, color: "#fff" }} className="cursor-pointer">Connect GSC</Button>
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="p-4">
          <div className="rounded border p-3 bg-red-50 border-red-200 text-red-700 flex items-center justify-between">
            <span>We couldn't load keyword data. Please retry.</span>
            <Button variant="outline" onClick={() => { setStatus("loading"); setTimeout(() => setStatus("ready"), 400); }} className="cursor-pointer">Retry</Button>
          </div>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="p-8 text-center">
          <div className="text-xl mb-1" style={{ color: TK.text }}>No keywords match your filters.</div>
          <div className="text-sm mb-4" style={{ color: TK.muted }}>Try broadening your filters or resetting to defaults.</div>
          <Button variant="outline" onClick={resetAll} className="cursor-pointer">Reset Filters</Button>
        </div>
      );
    }
    return null;
  };

  /* Visible columns count */
  const visibleColCount = COLS.filter((c) => visibleCols[c.key] !== false).length;
  /* First selected index (for bulk bar placement) */
  const firstSelectedIdx = windowRows.findIndex((r) => selected[r.id]);

  /* Device icon (brand) */
  const DeviceIcon = ({ d }: { d?: DeviceType }) => {
    const common = { className: "h-4 w-4", style: { color: TK.brand } } as any;
    if (d === "mobile") return <Smartphone {...common} />;
    if (d === "tablet") return <Tablet {...common} />;
    return <Monitor {...common} />;
  };

  return (
    <section
      className="space-y-3 mt-4"
      style={{
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue'",
      }}
    >
      <Card className="border" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
                      {drawerRow && (
              <Drawer    title="Keyword Query" onClose={closeDrawer}>
                   <KeywordHeaderDemoCanvas />
              </Drawer>
              )}
        <CardHeader className="gap-2 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: TK.brand }} />
              <CardTitle className="text-[17px]" style={{ color: TK.text }}>Keyword Performance (Search Queries)</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-4 w-4" style={{ color: TK.muted }} /></TooltipTrigger>
                  <TooltipContent>Keywords from Google Search Console. Use filters to surface optimization opportunities.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode segmented toggle */}
              <div className="inline-flex rounded border overflow-hidden" style={{ borderColor: TK.border }}>
                <button className={`h-8 px-3 text-sm cursor-pointer ${mode === "pages" ? "bg-white font-medium" : "bg-[#F8FAFC]"}`} onClick={() => setMode("pages")}>Pages</button>
                <button className={`h-8 px-3 text-sm cursor-pointer ${mode === "infinite" ? "bg-white font-medium" : "bg-[#F8FAFC]"}`} onClick={() => setMode("infinite")}>Infinite</button>
              </div>

              {/* Columns */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{ borderColor: TK.border }}>
                    <Columns className="h-4 w-4" style={{ color: TK.brand }} /> Columns
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <div className="text-sm font-medium mb-2" style={{ color: TK.text }}>Show / Hide Columns</div>
                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                    {(["device","country","intent"] as ColKey[]).map((k) => {
                      const col = COLS.find(c => c.key === k)!;
                      return (
                        <label key={k} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={visibleCols[k] !== false} onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [k]: Boolean(v) }))} />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => setVisibleCols(s => ({ ...s, device: true, country: true, intent: true }))} className="cursor-pointer">Reset</Button>
                    <Button size="sm" style={{ background: TK.brand, color: "#fff" }} className="cursor-pointer">Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Single Export button */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{ borderColor: TK.border }}>
                    <Download className="h-4 w-4" style={{ color: TK.brand }} /> Export
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56">
                  <div className="space-y-1">
                    <button className="w-full h-8 px-2 rounded text-left hover:bg-[#F8FAFC] cursor-pointer" onClick={() => exportCSV(false)}>CSV — all rows</button>
                    <button className="w-full h-8 px-2 rounded text-left hover:bg-[#F8FAFC] cursor-pointer" onClick={() => exportCSV(true)}>CSV — selected / visible</button>
                    <button className="w-full h-8 px-2 rounded text-left hover:bg-[#F8FAFC] cursor-pointer" onClick={exportPNG}>PNG — snapshot</button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Reset */}
              <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={resetAll}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: TK.muted }} />
              <Input className="w-[300px] pl-7" placeholder="Search query…" value={qSearch}
                     onChange={(e)=>{ setQSearch(e.target.value); mode==="pages" && setPage(1); }} />
            </div>

            {/* Preset chips */}
            {([
              { k: "all", label: "All Queries" },
              { k: "lowCtr", label: "Low CTR" },
              { k: "hiImprLowClicks", label: "High Impr, Low Clicks" },
              { k: "winners", label: "High Intent Winners" },
            ] as Array<{k: Preset; label: string}>).map(ch => (
              <button key={ch.k}
                onClick={() => { setPreset(ch.k); mode==="pages" && setPage(1); }}
                className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${preset === ch.k ? "font-semibold" : ""}`}
                title={ch.k === "lowCtr" ? "Good rank but low CTR — improve meta title/description and snippet." : undefined}
                style={{ borderColor: TK.borderLight, background: preset === ch.k ? TK.brandSoft : "#fff", color: preset === ch.k ? TK.valueBlue : "inherit" }}>
                {ch.label}
              </button>
            ))}

            {/* Country (multi) */}
            <Popover open={openCountry} onOpenChange={setOpenCountry}>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{ borderColor: TK.border }}>
                  <Globe2 className="h-4 w-4" style={{ color: TK.brand }} /> Country
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="text-sm font-medium mb-2" style={{ color: TK.text }}>Country</div>
                <div className="space-y-2">
                  {COUNTRIES.map(c => (
                    <label key={c.code} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={countries.includes(c.code)}
                        onCheckedChange={(v) => setCountries(prev => {
                          const on = Boolean(v);
                          return on ? [...new Set([...prev, c.code])] : prev.filter(x => x !== c.code);
                        })}
                      />
                      <span className="inline-flex items-center gap-2">
                        <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
                        <span>{c.name}</span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ border: `1px solid ${TK.border}`, color: TK.valueBlue, background: "#F5F7FA" }}>
                          {c.code}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Button size="sm" variant="outline" onClick={() => setCountries([])} className="cursor-pointer">Clear</Button>
                  <Button size="sm" onClick={() => setOpenCountry(false)} style={{ background: TK.brand, color: "#fff" }} className="cursor-pointer">Apply</Button>
                </div>
              </PopoverContent>
            </Popover>
            {/* Selected country chips */}
            {countryChips.map(c => (
              <span key={c.code} className="inline-flex items-center gap-2 h-8 px-2 rounded-full border text-sm" style={{ borderColor: TK.borderLight, background: "#fff" }}>
                <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
                <span>{c.name}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ border: `1px solid ${TK.border}`, color: TK.valueBlue, background: "#F5F7FA" }}>{c.code}</span>
                <button className="ml-1 cursor-pointer" onClick={() => setCountries(prev => prev.filter(x => x !== c.code))} title="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {/* Device */}
            <Select value={device} onValueChange={(v: any) => { setDevice(v); mode==="pages" && setPage(1); }}>
              <SelectTrigger className="h-8 px-3 w-[160px]"><SelectValue placeholder="Device" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            {/* CTR slider */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: TK.muted }}>CTR%</span>
              <div className="w-[160px]">
                <Slider value={ctrRange} min={0} max={20} step={0.5}
                        onValueChange={(v: any)=>{ setCtrRange([v[0], v[1]]); mode==="pages" && setPage(1); }} />
              </div>
              <span className="text-xs w-[120px]" style={{ color: TK.muted }}>
                {ctrRange[0] === 0 ? "≤" : "≥"} {ctrRange[0].toFixed(1)}% – {ctrRange[1].toFixed(1)}%
              </span>
            </div>

            {/* Position slider */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: TK.muted }}>Position</span>
              <div className="w-[180px]">
                <Slider value={posRange} min={1} max={100} step={1}
                        onValueChange={(v: any)=>{ setPosRange([v[0], v[1]]); mode==="pages" && setPage(1); }} />
              </div>
              <span className="text-xs w-[120px]" style={{ color: TK.muted }}>
                {posRange[0]} – {posRange[1]}
              </span>
            </div>

            {/* Time chips */}
            <div className="ml-auto flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: TK.muted }} />
              <div className="inline-flex rounded border overflow-hidden" style={{ borderColor: TK.border }}>
                {(["7d","28d","90d","custom"] as const).map(t => (
                  <button key={t} className={`h-8 px-3 text-sm cursor-pointer ${time===t ? "bg-white font-medium" : "bg-[#F8FAFC]"}`} onClick={() => setTime(t)}>
                    {t === "7d" ? "Last 7d" : t === "28d" ? "Last 28d" : t === "90d" ? "Last 90d" : "Custom"}
                  </button>
                ))}
              </div>
              {time === "custom" && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customStart} onChange={(e)=>setCustomStart(e.target.value)} className="h-8 w-[150px]" />
                  <span style={{ color: TK.muted }}>–</span>
                  <Input type="date" value={customEnd} onChange={(e)=>setCustomEnd(e.target.value)} className="h-8 w-[150px]" />
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Data states OR Table */}
        {status !== "ready" || filtered.length === 0 ? (
          <StateShell />
        ) : (
          <>
            <CardContent className="p-0">
              <div ref={scrollRef} className="max-h-[64vh] overflow-auto border-top border-t" style={{ borderColor: TK.borderLight }}>
                <div ref={tableRef}>
                  <Table className="text-sm">
                    <TableHeader className={`bg-white ${scrolled ? "shadow-[0_1px_0_0_rgba(0,0,0,0.06)]" : ""}`}>
                      <TableRow>
                        {visibleCols.select !== false && (
                          <TableHead style={{ position: "sticky", left: 0, zIndex: 30, background: "#fff", minWidth: 44, boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}>
                            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select page rows" />
                          </TableHead>
                        )}
                        {visibleCols.query !== false && <HeaderCell col={COLS[1]} sortKeyLocal="query" />}
                        {visibleCols.clicks !== false && <HeaderCell col={COLS[2]} sortKeyLocal="clicks" />}
                        {visibleCols.impressions !== false && <HeaderCell col={COLS[3]} sortKeyLocal="impressions" />}
                        {visibleCols.ctr !== false && <HeaderCell col={COLS[4]} sortKeyLocal="ctr" />}
                        {visibleCols.avgPosition !== false && <HeaderCell col={COLS[5]} sortKeyLocal="avgPosition" />}
                        {visibleCols.device !== false && <HeaderCell col={COLS[6]} />}
                        {visibleCols.country !== false && <HeaderCell col={COLS[7]} />}
                        {visibleCols.intent !== false && <HeaderCell col={COLS[8]} />}
                        {visibleCols.action !== false && <HeaderCell col={COLS[9]} />}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {windowRows.map((r, idx) => {
                        const isSelected = !!selected[r.id];
                        const insertBulkBar = selectedIds.length > 0 && idx === firstSelectedIdx;

                        return (
                          <React.Fragment key={r.id}>
                            {/* Bulk bar above first selected row */}
                            {insertBulkBar && (
                              <TableRow>
                                <TableCell colSpan={visibleColCount} className="p-0">
                                  <div className="flex items-center gap-2 px-3 py-2"
                                       style={{ background: "#F5F7FA", borderTop: `1px solid ${TK.borderLight}`, borderBottom: `1px solid ${TK.borderLight}` }}>
                                    <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
                                    <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                                    <button className="inline-flex items-center gap-1 text-sm rounded px-2 py-1 hover:bg-white cursor-pointer"
                                            onClick={() => { const first = rows.find(row => selected[row.id]); if (first) setSheet({ type: "task", row: first }); }}
                                            title="Create Task">
                                      <NotebookPen className="h-4 w-4" style={{ color: TK.brand }} /> Create Task
                                    </button>
                                    <button className="inline-flex items-center gap-1 text-sm rounded px-2 py-1 hover:bg-white cursor-pointer"
                                            onClick={() => exportCSV(true)} title="Export selected to CSV">
                                      <Download className="h-4 w-4" style={{ color: TK.brand }} /> Export CSV
                                    </button>
                                    <button className="inline-flex items-center gap-1 text-sm rounded px-2 py-1 hover:bg-white cursor-pointer"
                                            onClick={exportPNG} title="Export snapshot (PNG)">
                                      <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} /> PNG
                                    </button>
                                    <div className="ml-auto">
                                      <button className="text-sm underline-offset-2 hover:underline cursor-pointer" onClick={() => setSelected({})}>Clear</button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}

                            {/* Main row */}
                            <TableRow className={`hover:bg-[#F8FAFC] ${isSelected ? "" : ""}`}>
                              {/* Select */}
                              {visibleCols.select !== false && (
                                <TableCell style={{ position: "sticky", left: 0, zIndex: 20, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}>
                                  <Checkbox checked={!!selected[r.id]} onCheckedChange={(v)=>setSelected(s=>({ ...s, [r.id]: Boolean(v) }))} aria-label="Select row" />
                                </TableCell>
                              )}
                              {/* Query */}
                              {visibleCols.query !== false && (
                                <TableCell style={{ position: "sticky", left: 44, zIndex: 20, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}>
                                  <div className="flex items-center gap-2">
                                    <button className="rounded p-1 hover:bg-gray-50 cursor-pointer" aria-label={expanded[r.id] ? "Collapse" : "Expand"} onClick={() => toggleExpand(r.id)} title="Expand row">
                                      {expanded[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <button   onClick={openDrawer} className="font-medium truncate text-left cursor-pointer" title={r.query} style={{ color: TK.text }}>
                                      {r.query}
                                    </button>
                                    <Flags r={r} />
                                  </div>
                                </TableCell>
                              )}
                              {/* Clicks */}
                              {visibleCols.clicks !== false && <TableCell className="whitespace-nowrap">{fmtNumber(r.clicks)}</TableCell>}
                              {/* Impressions */}
                              {visibleCols.impressions !== false && <TableCell className="whitespace-nowrap">{fmtNumber(r.impressions)}</TableCell>}
                              {/* CTR */}
                              {visibleCols.ctr !== false && <TableCell><CtrChip r={r} /></TableCell>}
                              {/* Avg. Position */}
                              {visibleCols.avgPosition !== false && <TableCell>{fmtPos1(r.avgPosition)}</TableCell>}
                              {/* Device */}
                              {visibleCols.device !== false && (
                                <TableCell>
                                  <span className="inline-flex items-center gap-2">
                                    <DeviceIcon d={r.topDevice} />
                                    <span className="hidden md:inline" style={{ color: TK.text }}>
                                      {r.topDevice ? r.topDevice[0].toUpperCase() + r.topDevice.slice(1) : "—"}
                                    </span>
                                  </span>
                                </TableCell>
                              )}
                              {/* Country */}
                              {visibleCols.country !== false && (
                                <TableCell title={r.topCountry ? `${r.topCountry.name}` : ""}>
                                  {r.topCountry ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
                                      <span style={{ color: TK.text }}>{r.topCountry.name}</span>
                                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ border: `1px solid ${TK.border}`, color: TK.valueBlue, background: "#F5F7FA" }}>
                                        {r.topCountry.code}
                                      </span>
                                    </span>
                                  ) : "—"}
                                </TableCell>
                              )}
                              {/* Intent */}
                              {visibleCols.intent !== false && <TableCell><IntentDot v={r.intent ?? null} /></TableCell>}
                              {/* Actions */}
                              {visibleCols.action !== false && (
                                <TableCell>
                                  <div className="inline-flex items-center gap-2">
                                            <button className="p-1.5 rounded hover:bg-gray-50 cursor-pointer" title="View" onClick={openDrawer}>
                                      <Eye className="h-4 w-4" style={{ color: TK.brand }} />
                                    </button>
                                    <button className="p-1.5 rounded hover:bg-gray-50 cursor-pointer" title="Open Analyzer" onClick={() => setSheet({ type: "analyzer", row: r })}>
                                      <PanelRightOpen className="h-4 w-4" style={{ color: TK.brand }} />
                                    </button>
                                    <button className="p-1.5 rounded hover:bg-gray-50 cursor-pointer" title="Create Task" onClick={() => setSheet({ type: "task", row: r })}>
                                      <NotebookPen className="h-4 w-4" style={{ color: TK.brand }} />
                                    </button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>

                            {/* Expander */}
                            {expanded[r.id] && (
                              <TableRow>
                                <TableCell colSpan={visibleColCount} className="bg-white">
                                  <div className="p-3 rounded-md border" style={{ borderColor: TK.borderLight, background: TK.surfaceAlt }}>
                                    <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: TK.text }}>
                                      Top URLs for “{r.query}”
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-[600px] w-full text-sm bg-white rounded-md border" style={{ borderColor: TK.borderLight }}>
                                        <thead className="bg-gray-50 text-xs uppercase" style={{ color: TK.muted }}>
                                          <tr>
                                            <th className="px-3 py-2 text-left">Page URL</th>
                                            <th className="px-3 py-2 text-right">Clicks</th>
                                            <th className="px-3 py-2 text-right">Impr</th>
                                            <th className="px-3 py-2 text-right">CTR</th>
                                            <th className="px-3 py-2 text-right">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(r.topUrls ?? [{ url: r.topUrl, title: r.query, clicks: r.clicks, impressions: r.impressions }]).slice(0, 5).map((u, i) => {
                                            const ctrU = u.impressions > 0 ? (u.clicks / u.impressions) * 100 : 0;
                                            return (
                                              <tr key={i} className="border-t transition-all hover:bg-gray-50 hover:-translate-y-0.5" style={{ borderColor: TK.borderLight }}>
                                                <td className="px-3 py-2">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#F5F7FA", color: TK.valueBlue, border: `1px solid ${TK.border}` }}>{i + 1}</span>
                                                    <a className="truncate underline cursor-pointer" href={u.url} target="_blank" rel="noreferrer" style={{ color: TK.valueBlue }} title={u.url}>{u.title}</a>
                                                  </div>
                                                </td>
                                                <td className="px-3 py-2 text-right">{fmtNumber(u.clicks)}</td>
                                                <td className="px-3 py-2 text-right">{fmtNumber(u.impressions)}</td>
                                                <td className="px-3 py-2 text-right">{fmtPct1(+ctrU.toFixed(1))}</td>
                                                <td className="px-3 py-2">
                                                  <div className="flex justify-end items-center gap-2">
                                                    <a href={u.url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-gray-100 cursor-pointer" title="Open URL">
                                                      <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} />
                                                    </a>
                                                    <button className="p-1.5 rounded hover:bg-gray-100 cursor-pointer" title="Analyze Page" onClick={() => setSheet({ type: "analyzer", row: r })}>
                                                      <PanelRightOpen className="h-4 w-4" style={{ color: TK.brand }} />
                                                    </button>
                                                    <button className="p-1.5 rounded hover:bg-gray-100 cursor-pointer" title="Create Task" onClick={() => setSheet({ type: "task", row: r })}>
                                                      <NotebookPen className="h-4 w-4" style={{ color: TK.brand }} />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Infinite footer */}
                {mode === "infinite" && windowRows.length < sorted.length && (
                  <div className="sticky bottom-0 bg-gradient-to-t from-white to-transparent pt-8">
                    <div className="flex items-center justify-center py-3">
                      <Button variant="outline" onClick={() => setInfiniteCount(c => c + 20)} className="cursor-pointer">Load more</Button>
                    </div>
                    <div ref={sentinelRef} />
                  </div>
                )}
              </div>
            </CardContent>

            {/* Pagination (pages mode) */}
            {mode === "pages" && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
                <div className="text-sm" style={{ color: TK.muted }}>
                  Showing {sorted.length === 0 ? 0 : pageStart + 1}–{Math.min(sorted.length, pageStart + windowRows.length)} of {sorted.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page<=1} onClick={()=>setPage(1)}>First</Button>
                  <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
                  <div className="text-sm w-16 text-center" style={{ color: TK.text }}>{page} / {totalPages}</div>
                  <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
                  <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page>=totalPages} onClick={()=>setPage(totalPages)}>Last</Button>
                  <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                    <SelectContent>
                      {[10,20,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Drawer: Analyzer / Create Task */}
      <Sheet open={!!sheet} onOpenChange={(o) => { if (!o) setSheet(null); }}>
        <SheetContent side="right" className="w-[480px] sm:w-[520px]">
          {sheet && (
            <>
              <SheetHeader>
                <SheetTitle>{sheet.type === "analyzer" ? "Page Analyzer" : "Create Task"}</SheetTitle>
                <SheetDescription>
                  {sheet.type === "analyzer" ? "Metrics & quick suggestions for the selected query." : "Prefilled task to optimize the page for this query."}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="text-sm">
                  <div style={{ color: TK.muted }}>Query</div>
                  <div className="font-medium" style={{ color: TK.text }}>{sheet.row.query}</div>
                </div>

                <div className="text-sm">
                  <div style={{ color: TK.muted }}>Top URL</div>
                  <a className="underline inline-flex items-center gap-1 cursor-pointer" href={sheet.row.topUrl} target="_blank" rel="noreferrer" style={{ color: TK.valueBlue }}>
                    {sheet.row.topUrl} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>Clicks<br/><strong>{fmtNumber(sheet.row.clicks)}</strong></div>
                  <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>Impressions<br/><strong>{fmtNumber(sheet.row.impressions)}</strong></div>
                  <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>CTR<br/><strong>{fmtPct1(sheet.row.impressions > 0 ? sheet.row.ctr : undefined)}</strong></div>
                  <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>Avg. Position<br/><strong>{fmtPos1(sheet.row.avgPosition)}</strong></div>
                </div>

                {sheet.type === "analyzer" ? (
                  <>
                    <div className="text-sm">
                      <div className="font-medium mb-1" style={{ color: TK.text }}>Recommendations</div>
                      <ul className="list-disc pl-5 space-y-1" style={{ color: TK.text }}>
                        <li>Ensure target term is in title and H1.</li>
                        <li>Improve meta description to entice clicks.</li>
                        <li>Consider FAQ/HowTo schema if applicable.</li>
                        <li>Refresh content if older than 6 months.</li>
                      </ul>
                    </div>
                    {props.gscPropertyUrl && (
                      <a className="inline-flex items-center gap-2 text-sm underline cursor-pointer" href={props.gscPropertyUrl} target="_blank" rel="noreferrer" style={{ color: TK.valueBlue }}>
                        Open in GSC <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </>
                ) : (
                  <TaskForm
                    defaultTitle={`Optimize: ${sheet.row.query} → ${sheet.row.topUrl}`}
                    onSubmit={async () => {
                      // Call out with minimal payload expected by prop
                      await (props.onCreateTask?.({ query: sheet.row.query, url: sheet.row.topUrl })
                        ?? new Promise((r) => setTimeout(r, 500)));
                      setSheet(null);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

/* ───────────────────────── Small Task Form ───────────────────────── */
const TaskForm: React.FC<{ defaultTitle: string; onSubmit: (p: { title: string; priority: string; due?: string; notes?: string }) => Promise<void> | void; }> =
({ defaultTitle, onSubmit }) => {
  const [title, setTitle] = useState(defaultTitle);
  const [priority, setPriority] = useState("Medium");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      await onSubmit({ title, priority, due, notes });
      setSaving(false);
    }}>
      <div className="space-y-1">
        <label className="text-sm" style={{ color: TK.text }}>Title</label>
        <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm" style={{ color: TK.text }}>Priority</label>
          <Select value={priority} onValueChange={(v:any)=>setPriority(v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Low","Medium","High","Urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm" style={{ color: TK.text }}>Due</label>
          <Input type="date" value={due} onChange={(e)=>setDue(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm" style={{ color: TK.text }}>Notes</label>
        <textarea className="w-full border rounded p-2 text-sm" rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)} />
      </div>
      <div className="pt-1 flex items-center gap-2">
        <Button type="submit" disabled={saving} style={{ background: TK.brand, color: "#fff" }} className="cursor-pointer">
          {saving ? "Saving…" : (<><Check className="h-4 w-4 mr-1" /> Save Task</>)}
        </Button>
        <span className="text-xs" style={{ color: TK.muted }}>This is a stub action in Phase 1.</span>
      </div>
    </form>
  );
};

/* ───────────────────────── Test helper ───────────────────────── */
export function __tests__keywordTable() {
  let dir: SortDir = "desc";
  const cycle = () => (dir = dir === "desc" ? "asc" : dir === "asc" ? "off" : "desc");
  const s1 = cycle(); const s2 = cycle(); const s3 = cycle();
  const ex: QueryRow = { id: "1", query: "q", clicks: 10, impressions: 2000, ctr: 0.5, avgPosition: 8.2, topDevice: "mobile", topCountry: { code: "US", name: "USA" }, intent: "Informational", topUrl: "/x" };
  const hasImpr = ex.impressions > 0;
  const flags = { red: ex.avgPosition < 10 && (hasImpr ? ex.ctr : 0) < 3.0 && hasImpr, amber: ex.impressions > 1000 && ex.clicks < 20, green: ex.avgPosition < 5 && ex.ctr > 5.0 };
  return { s1, s2, s3, flags };
}
