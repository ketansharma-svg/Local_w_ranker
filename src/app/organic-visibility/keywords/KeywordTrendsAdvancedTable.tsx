"use client";

import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Download,
  ExternalLink,
  Star,
  CircleHelp,
  Image as ImageIcon,
  PlaySquare,
  MapPin,
  Newspaper,
  BadgePlus,
  Tag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* --------------------------- Wranker design tokens --------------------------- */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // updated brand color
  action: "var(--wr-action, #008CCD)",
  pastelBrand: "var(--wr-brand-50, #D2EFFF)",
  success: "var(--wr-success, #2ECC71)",
  danger: "var(--wr-danger, #FF6B6B)",
  neutral: "var(--wr-neutral, #9CA3AF)",
  appBg: "var(--wr-bg-subtle, #F5F7FA)",
  radius: "var(--wr-radius-lg, 16px)",
};

/* ------------------------------ Modular UI (chips / toggles) ------------------------------ */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          }`}
          type="button"
          title={typeof it.label === "string" ? it.label : undefined}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TOKENS.border, color: active ? TOKENS.text : TOKENS.muted }}
      title={title || label}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{
          borderColor: active ? TOKENS.brand : TOKENS.border,
          background: active ? "rgba(0,140,205,0.15)" : TOKENS.appBg,
        }}
        aria-hidden
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{ background: active ? TOKENS.brand : "#CBD5E1", transform: active ? "translateX(20px)" : "translateX(2px)" }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

/* --------------------------------- Types ---------------------------------- */
type Intent = "Informational" | "Navigational" | "Commercial" | "Transactional";
type SerpFeature = "FS" | "PAA" | "VIDEO" | "IMAGE" | "LOCAL" | "TOPSTORIES" | "KP";

type Row = {
  id: string;
  keyword: string;
  intent: Intent;
  branded: boolean;
  serp_features: SerpFeature[];
  current_position: number | null; // 1..100 or null
  previous_position: number | null; // 1..100 or null
  traffic: number; // estimated visits
  traffic_share: number; // 0..100
  volume: number;
  kd: number; // 0..100
  cpc: number; // USD
  target_url: string;
  last_updated: string; // ISO
};

type ColumnKey =
  | "select"
  | "expander"
  | "keyword"
  | "intent"
  | "position"
  | "serp"
  | "traffic"
  | "share"
  | "volume"
  | "kd"
  | "cpc"
  | "url"
  | "updated"
  | "actions";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

/* ------------------------- Helpers & demo generators ------------------------ */
const fmt = (n: number) => n.toLocaleString();
const money = (n: number) => `$${n.toFixed(2)}`;

const INTENT_COLOR: Record<Intent, string> = {
  Informational: TOKENS.brand,
  Navigational: "#00B3A6",
  Commercial: "#F59E0B",
  Transactional: "#EF4444",
};

const FEATURE_ICON: Record<SerpFeature, ReactElement> = {
  FS: <Star className="h-3.5 w-3.5" style={{ color: "#34D399" }} />,
  PAA: <CircleHelp className="h-3.5 w-3.5" style={{ color: "#3B82F6" }} />,
  VIDEO: <PlaySquare className="h-3.5 w-3.5" style={{ color: "#8B5CF6" }} />,
  IMAGE: <ImageIcon className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />,
  LOCAL: <MapPin className="h-3.5 w-3.5" style={{ color: "#10B981" }} />,
  TOPSTORIES: <Newspaper className="h-3.5 w-3.5" style={{ color: "#EF4444" }} />,
  KP: <CircleHelp className="h-3.5 w-3.5" style={{ color: "#14B8A6" }} />,
};

const INTENTS: Intent[] = ["Informational", "Navigational", "Commercial", "Transactional"];
const FEATURES: SerpFeature[] = ["FS", "PAA", "VIDEO", "IMAGE", "LOCAL", "TOPSTORIES", "KP"];

function randomFrom<T>(arr: T[], k: number) {
  const a = [...arr];
  const out: T[] = [];
  for (let i = 0; i < k && a.length; i++) {
    const j = Math.floor(Math.random() * a.length);
    out.push(a.splice(j, 1)[0]);
  }
  return out;
}

function makeRows(count = 250): Row[] {
  const baseKw = [
    "seo checklist",
    "wranker pricing",
    "best seo tool",
    "semrush vs ahrefs",
    "schema generator",
    "buy backlinks",
    "content optimizer",
    "seo writing guide",
    "technical seo audit",
    "onpage seo",
    "wranker login",
    "keyword difficulty tool",
    "internal linking",
    "image alt text",
    "json-ld how to",
    "website speed test",
    "local seo service",
    "youtube seo tips",
    "blog post template",
    "search console errors",
  ];

  return Array.from({ length: count }, (_, i) => {
    const kw = `${baseKw[i % baseKw.length]} ${i + 1}`;
    const intent = INTENTS[i % 4];
    const branded = /wranker/i.test(kw);
    const prev = Math.random() > 0.08 ? Math.floor(Math.random() * 100) + 1 : null;
    const cur =
      prev === null
        ? Math.random() > 0.2
          ? Math.floor(Math.random() * 100) + 1
          : null
        : Math.min(100, Math.max(1, prev + Math.floor(Math.random() * 21 - 10)));
    const volume = 200 + Math.floor(Math.random() * 6000);
    const kd = Math.floor(Math.random() * 100);
    const cpc = +(Math.random() * 8).toFixed(2);
    const traffic = Math.round((Math.max(0, 110 - (cur ?? 110)) / 110) * volume * 0.2);
    const share = Math.min(100, Math.max(0, +((traffic / 2000) * 100).toFixed(1)));
    const feats = randomFrom(FEATURES, Math.random() > 0.6 ? 1 : Math.random() > 0.85 ? 2 : 0);

    return {
      id: `kw-${i + 1}`,
      keyword: kw,
      intent,
      branded,
      serp_features: feats,
      previous_position: prev,
      current_position: cur,
      traffic,
      traffic_share: share,
      volume,
      kd,
      cpc,
      target_url: `/${intent.toLowerCase()}/page-${(i % 30) + 1}`,
      last_updated: new Date(Date.now() - Math.random() * 8.64e7 * 7).toISOString(),
    };
  });
}

/* --------------------------- Small visual widgets --------------------------- */
const MiniBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="relative h-2 rounded bg-gray-200" style={{ width: 88 }}>
      <div
        className="h-2 rounded"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          maxWidth: 88,
          backgroundColor: value >= 8 ? TOKENS.success : value >= 4 ? "#F59E0B" : TOKENS.danger,
        }}
      />
    </div>
    <span className="text-[13px] leading-none">{value.toFixed(1)}%</span>
  </div>
);

const IntentChip = ({ intent }: { intent: Intent }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs"
    style={{ borderColor: TOKENS.border, color: INTENT_COLOR[intent] }}
  >
    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: INTENT_COLOR[intent] }} />
    {intent}
  </span>
);

const FeatureBadges = ({ list }: { list: SerpFeature[] }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {list.slice(0, 3).map((f) => (
      <span key={f} className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700">
        {FEATURE_ICON[f]}
        {f}
      </span>
    ))}
    {list.length > 3 && <span className="rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700">+{list.length - 3}</span>}
    {!list.length && <span className="text-[12px] text-gray-400">—</span>}
  </div>
);

/* Chevron delta badge (no emoji) */
function DeltaBadge({ delta, prev }: { delta: number | null; prev?: number | null }) {
  if (delta === null) return <span className="text-xs text-gray-400">—</span>;
  const improved = delta > 0;
  const declined = delta < 0;
  const baseCls = "text-xs inline-flex items-center gap-1 rounded px-1.5 py-[2px]";
  if (improved)
    return (
      <span className={`${baseCls} bg-green-50 text-green-700`} title={typeof prev === "number" ? `Prev: ${prev}` : undefined}>
        <ChevronUp className="h-3.5 w-3.5" /> {Math.abs(delta)}
      </span>
    );
  if (declined)
    return (
      <span className={`${baseCls} bg-red-50 text-red-700`} title={typeof prev === "number" ? `Prev: ${prev}` : undefined}>
        <ChevronDown className="h-3.5 w-3.5" /> {Math.abs(delta)}
      </span>
    );
  return (
    <span className={`${baseCls} bg-gray-100 text-gray-600`} title={typeof prev === "number" ? `Prev: ${prev}` : undefined}>
      — 0
    </span>
  );
}

/* -------------------------------- Component -------------------------------- */
export default function KeywordTrendsAdvancedTable() {
  /* ------------------------------ Base dataset ------------------------------ */
  const [rows, setRows] = useState<Row[]>(() => makeRows());

  /* -------------------------------- Filters -------------------------------- */
  const [query, setQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<Intent | "All">("All");
  const [brandFilter, setBrandFilter] = useState<"all" | "branded" | "nonbranded">("all");
  const [featureFilter, setFeatureFilter] = useState<SerpFeature | "All">("All");
  const [withFeaturesOnly, setWithFeaturesOnly] = useState(false);
  const [posMin, setPosMin] = useState(1);
  const [posMax, setPosMax] = useState(100);
  const posActive = posMin !== 1 || posMax !== 100;

  /* ----------------------- Selection & expanded rows ------------------------ */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true;
      return next;
    });

  /* -------------------------- Infinite vs pagination ------------------------ */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(60);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* -------------------------------- Sorting -------------------------------- */
  type SortKey = Extract<ColumnKey, "keyword" | "intent" | "position" | "traffic" | "share" | "volume" | "kd" | "cpc" | "updated">;
  const [sortBy, setSortBy] = useState<SortKey>("traffic");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColumnKey) => {
    const sortable: SortKey[] = ["keyword", "intent", "position", "traffic", "share", "volume", "kd", "cpc", "updated"];
    if (!sortable.includes(key as SortKey)) return;
    if (sortBy !== key) {
      setSortBy(key as SortKey);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  /* ---------------------------- Column definition --------------------------- */
  const columns: ColumnDef[] = [
    { key: "select", label: "", width: 36, align: "center" },
    { key: "expander", label: "", width: 36, align: "center" },
    { key: "keyword", label: "Keyword", width: 320, sortable: true },
    { key: "intent", label: "Intent", width: 140, sortable: true },
    { key: "position", label: "Position", width: 140, sortable: true },
    { key: "serp", label: "SERP", width: 160 },
    { key: "traffic", label: "Traffic", width: 120, sortable: true, align: "right" },
    { key: "share", label: "Traffic %", width: 140, sortable: true },
    { key: "volume", label: "Volume", width: 120, sortable: true, align: "right" },
    { key: "kd", label: "KD", width: 90, sortable: true, align: "right" },
    { key: "cpc", label: "CPC", width: 100, sortable: true, align: "right" },
    { key: "url", label: "Target Page", width: 260 },
    { key: "updated", label: "Last Updated", width: 150, sortable: true },
    { key: "actions", label: "Actions", width: 220 },
  ];
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true,
    expander: true,
    keyword: true,
    intent: true,
    position: true,
    serp: true,
    traffic: true,
    share: true,
    volume: true,
    kd: true,
    cpc: true,
    url: true,
    updated: true,
    actions: true,
  });
  const visibleColumns = useMemo(() => columns.filter((c) => visibleCols[c.key] !== false), [columns, visibleCols]);

  const columnDescriptions: Record<ColumnKey, string> = {
    select: "Select rows for bulk actions.",
    expander: "Expand to view more keyword details and quick actions.",
    keyword: "Search query (click to analyze SERP and rank history).",
    intent: "Intent label determined by classifier (Informational / Navigational / Commercial / Transactional).",
    position: "Current Google rank with delta vs previous update.",
    serp: "SERP features triggered by this query.",
    traffic: "Estimated monthly organic visits (CTR model).",
    share: "Share of your site's estimated organic traffic.",
    volume: "Monthly search volume.",
    kd: "Keyword Difficulty 0–100.",
    cpc: "Avg. CPC in USD.",
    url: "Landing page where this keyword ranks.",
    updated: "Last ranking update time.",
    actions: "Quick actions (Open SERP, Add to Tracking, Assign Task, Remove).",
  };

  /* ---------------------------- Sticky left block --------------------------- */
  const stickyStyle = (key: ColumnKey) =>
    key === "select"
      ? { position: "sticky" as const, left: 0, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" }
      : key === "expander"
      ? { position: "sticky" as const, left: 36, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" }
      : key === "keyword"
      ? { position: "sticky" as const, left: 72, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" }
      : {};

  /* ------------------------------ Data pipeline ----------------------------- */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !r.keyword.toLowerCase().includes(query.toLowerCase())) return false;
      if (intentFilter !== "All" && r.intent !== intentFilter) return false;
      if (brandFilter === "branded" && !r.branded) return false;
      if (brandFilter === "nonbranded" && r.branded) return false;
      if (withFeaturesOnly && r.serp_features.length === 0) return false;
      if (featureFilter !== "All" && !r.serp_features.includes(featureFilter)) return false;
      const pos = r.current_position ?? 101;
      if (!(pos >= posMin && pos <= posMax)) return false;
      return true;
    });
  }, [rows, query, intentFilter, brandFilter, withFeaturesOnly, featureFilter, posMin, posMax]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const val = (k: SortKey, row: Row): any => {
        switch (k) {
          case "keyword":
            return row.keyword;
          case "intent":
            return row.intent;
          case "position": {
            const p = row.current_position ?? 101;
            return p;
          }
          case "traffic":
            return row.traffic;
          case "share":
            return row.traffic_share;
          case "volume":
            return row.volume;
          case "kd":
            return row.kd;
          case "cpc":
            return row.cpc;
          case "updated":
            return row.last_updated;
        }
      };
      const av = val(sortBy, a);
      const bv = val(sortBy, b);
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

  /* ----------------------------- Infinite loader ---------------------------- */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("kw-scroll-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((v) => Math.min(sorted.length, v + 60));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  const visibleIds = windowedRows.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;

  /* --------------------------------- Export -------------------------------- */
  const exportCSV = (onlySelected = false) => {
    const cols: (keyof Row)[] = [
      "keyword",
      "intent",
      "branded",
      "current_position",
      "previous_position",
      "traffic",
      "traffic_share",
      "volume",
      "kd",
      "cpc",
      "target_url",
      "last_updated",
    ];
    const data = (onlySelected ? sorted.filter((r) => selected[r.id]) : sorted)
      .map((r) => cols.map((k) => JSON.stringify((r as any)[k] ?? "")).join(","))
      .join("\n");
    const csv = cols.join(",") + "\n" + data;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "keyword-trends-selected.csv" : "keyword-trends.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ------------------------------- Clear filters --------------------------- */
  const clearAllFilters = () => {
    setQuery("");
    setIntentFilter("All");
    setBrandFilter("all");
    setFeatureFilter("All");
    setWithFeaturesOnly(false);
    setPosMin(1);
    setPosMax(100);
  };

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <section
      className="space-y-3 w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      <Card className="border" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: TOKENS.text }}>
            <TrendingUp className="h-5 w-5" style={{ color: TOKENS.brand }} />
            Keyword Trends
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Infinite / Multi-expand (toggle switches) */}
            <ToggleSwitch
              label="Infinite"
              active={infinite}
              onClick={() => {
                const next = !infinite;
                setInfinite(next);
                if (next) setVisibleCount(60);
              }}
              title="Toggle infinite scrolling"
            />
            <ToggleSwitch label="Expand multiple rows" active={multiExpand} onClick={() => setMultiExpand((v) => !v)} />

            {/* Brand filter (segmented chips) */}
            <Segmented
              ariaLabel="Brand filter"
              value={brandFilter}
              onChange={(v) => setBrandFilter(v as any)}
              items={[
                { value: "all", label: "All" },
                { value: "branded", label: "Branded" },
                { value: "nonbranded", label: "Non‑Branded" },
              ]}
            />

            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex h-8 items-center gap-2 rounded border bg-white px-3 text-sm hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                  title="Show/Hide Columns"
                >
                  <SlidersHorizontal className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="mb-2 text-sm font-medium">Show / Hide Columns</div>
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {columns.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          disabled={c.key === "select" || c.key === "expander" || c.key === "keyword"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
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
                        keyword: true,
                        intent: true,
                        position: true,
                        serp: true,
                        traffic: true,
                        share: true,
                        volume: true,
                        kd: true,
                        cpc: true,
                        url: true,
                        updated: true,
                        actions: true,
                      })
                    }
                  >
                    Reset
                  </Button>
                  <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => exportCSV(anySelected)} title="Export">
              <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
              Export
            </Button>

            {/* Refresh demo */}
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => setRows(makeRows())}>
              <RefreshCw className="h-4 w-4" style={{ color: TOKENS.brand }} />
              Refresh Data
            </Button>
          </div>
        </CardHeader>

        {/* Bulk Bar */}
        {anySelected && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2" style={{ borderColor: TOKENS.borderLight, background: TOKENS.pastelBrand }}>
            <div className="text-sm" style={{ color: TOKENS.text }}>
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                <Tag className="mr-1 h-4 w-4" /> Add Tags
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => exportCSV(true)}>
                <Download className="mr-1 h-4 w-4" /> Export Selection
              </Button>
              <Button size="sm" variant="destructive" className="cursor-pointer">
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
        )}

        {/* Filters Row */}
        <CardContent className="border-t pt-4" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" style={{ color: TOKENS.brand }} /> Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Segment your keyword portfolio by intent, position range, features, and more.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearAllFilters}>
              Clear all
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: TOKENS.brand }} />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search keyword…" className="w-[240px] pl-7" />
            </div>

            {/* Intent */}
            <Select value={intentFilter} onValueChange={(v) => setIntentFilter(v as any)}>
              <SelectTrigger className="h-8 w-[180px] rounded border px-3 text-sm cursor-pointer">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                {(["All", ...INTENTS] as const).map((i) => (
                  <SelectItem key={i} value={i as any}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SERP Feature */}
            <Select value={featureFilter} onValueChange={(v) => setFeatureFilter(v as any)}>
              <SelectTrigger className="h-8 w-[180px] rounded border px-3 text-sm cursor-pointer">
                <SelectValue placeholder="SERP feature" />
              </SelectTrigger>
              <SelectContent>
                {(["All", ...FEATURES] as const).map((f) => (
                  <SelectItem key={f} value={f as any}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Only with features */}
            <label className="ml-1 inline-flex cursor-pointer select-none items-center gap-2 text-sm">
              <Checkbox checked={withFeaturesOnly} onCheckedChange={(v) => setWithFeaturesOnly(Boolean(v))} />
              <span>Only with SERP features</span>
            </label>

            {/* Position range */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex h-8 items-center gap-2 rounded border bg-white px-3 text-sm hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                >
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  Position {posActive ? `${posMin}–${posMax}` : "(1–100)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Select rank range (1–100)</span>
                    <span className="text-muted-foreground">
                      {posMin} – {posMax}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[posMin, posMax]}
                    onValueChange={(v) => {
                      const [a, b] = v as [number, number];
                      setPosMin(a);
                      setPosMax(b);
                    }}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setPosMin(1);
                        setPosMax(100);
                      }}
                    >
                      Reset
                    </Button>
                    <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c.key) }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              visibleIds.forEach((id) => (patch[id] = on));
                              setSelected((s) => ({ ...s, ...patch }));
                            }}
                          />
                        </div>
                      ) : c.key === "expander" || !c.sortable ? (
                        <span className="relative group inline-block cursor-pointer">
                          {c.label}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block rounded bg-black px-2 py-1 text-xs text-white shadow">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      ) : (
                        <button className="relative inline-flex items-center gap-1 hover:text-foreground group cursor-pointer" onClick={() => toggleSort(c.key)} title="Sort">
                          <span>{c.label}</span>
                          {sortBy === (c.key as any) ? (
                            sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block rounded bg-black px-2 py-1 text-xs text-white shadow">
                            {columnDescriptions[c.key]}
                          </span>
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.map((row) => {
                  const delta = row.previous_position && row.current_position ? row.previous_position - row.current_position : null;

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className="hover:bg-[#F5F7FA]">
                        {visibleCols.select !== false && (
                          <TableCell style={stickyStyle("select") as any}>
                            <Checkbox checked={!!selected[row.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [row.id]: Boolean(v) }))} />
                          </TableCell>
                        )}
                        {visibleCols.expander !== false && (
                          <TableCell style={stickyStyle("expander") as any}>
                            <button onClick={() => toggleExpand(row.id)} aria-label={expanded[row.id] ? "Collapse" : "Expand"} className="rounded-md border p-1 hover:bg-muted cursor-pointer">
                              {expanded[row.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>
                        )}
                        {visibleCols.keyword !== false && (
                          <TableCell style={stickyStyle("keyword") as any}>
                            <button className="font-medium underline cursor-pointer" style={{ color: TOKENS.action }} title="Open Keyword Analyzer">
                              {row.keyword}
                            </button>
                          </TableCell>
                        )}
                        {visibleCols.intent !== false && (
                          <TableCell>
                            <IntentChip intent={row.intent} />
                          </TableCell>
                        )}
                        {visibleCols.position !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-2">
                              <span className="font-medium">{row.current_position ?? "—"}</span>
                              <DeltaBadge delta={delta} prev={row.previous_position ?? null} />
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.serp !== false && <TableCell>{<FeatureBadges list={row.serp_features} />}</TableCell>}
                        {visibleCols.traffic !== false && <TableCell className="text-right">{fmt(row.traffic)}</TableCell>}
                        {visibleCols.share !== false && (
                          <TableCell>
                            <MiniBar value={row.traffic_share} />
                          </TableCell>
                        )}
                        {visibleCols.volume !== false && <TableCell className="text-right">{fmt(row.volume)}</TableCell>}
                        {visibleCols.kd !== false && <TableCell className="text-right">{row.kd}</TableCell>}
                        {visibleCols.cpc !== false && <TableCell className="text-right">{money(row.cpc)}</TableCell>}
                        {visibleCols.url !== false && (
                          <TableCell>
                            <a href={row.target_url} className="max-w-[240px] truncate underline cursor-pointer" style={{ color: TOKENS.action }} title={row.target_url}>
                              {row.target_url}
                            </a>
                          </TableCell>
                        )}
                        {visibleCols.updated !== false && <TableCell>{new Date(row.last_updated).toLocaleDateString()}</TableCell>}

                        {visibleCols.actions !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" aria-label="Open SERP" className="cursor-pointer" style={{ color: TOKENS.brand }}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Open SERP</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" aria-label="Add to Tracking" className="cursor-pointer" style={{ color: TOKENS.brand }}>
                                      <BadgePlus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Add to Tracking</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" aria-label="Assign Task" className="cursor-pointer" style={{ color: TOKENS.brand }}>
                                      <ClipboardList className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Assign Task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {expanded[row.id] && (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length}>
                            <div className="grid grid-cols-2 gap-4 rounded-md border p-4" style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}>
                              <div>
                                <div className="text-sm text-muted-foreground">Keyword</div>
                                <div className="text-sm font-medium">{row.keyword}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Intent</div>
                                <IntentChip intent={row.intent} />
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Position</div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                  {row.previous_position ?? "—"} → {row.current_position ?? "—"}
                                  <DeltaBadge delta={delta} prev={row.previous_position ?? null} />
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">SERP Features</div>
                                <FeatureBadges list={row.serp_features} />
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Target Page</div>
                                <a href={row.target_url} className="text-sm font-medium underline cursor-pointer" style={{ color: TOKENS.action }}>
                                  {row.target_url}
                                </a>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Traffic</div>
                                <div className="text-sm font-medium">{fmt(row.traffic)}</div>
                              </div>
                              <div className="col-span-2">
                                <div className="mb-1 text-sm text-muted-foreground">Quick Actions</div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" className="gap-1 cursor-pointer" style={{ color: TOKENS.brand }}>
                                    <ExternalLink className="h-4 w-4" />
                                    Open SERP
                                  </Button>
                                  <Button size="sm" className="gap-1 cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                                    <BadgePlus className="h-4 w-4" />
                                    Add to Tracking
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 cursor-pointer" style={{ color: TOKENS.brand }}>
                                    <ClipboardList className="h-4 w-4" />
                                    Assign Task
                                  </Button>
                                </div>
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
            {infinite && <div id="kw-scroll-sentinel" className="h-8" />}
          </div>
        </CardContent>

        {/* Pagination (when Infinite OFF) */}
        {!infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} className="cursor-pointer" onClick={() => setPage(1)}>
                First
              </Button>
              <Button variant="outline" size="sm" disabled={page === 1} className="cursor-pointer" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <div className="w-16 text-center text-sm">{page}</div>
              <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} className="cursor-pointer" onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= sorted.length}
                className="cursor-pointer"
                onClick={() => setPage(Math.ceil(sorted.length / pageSize))}
              >
                Last
              </Button>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[120px] cursor-pointer">
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

/* NOTE:
 - Inter/Inter Fallback font applied at the section root.
 - All interactive elements use `cursor-pointer`.
 - Section title & action icons use brand color #008CCD.
 - ToggleSwitch & Segmented chips match recent modular components.
 - No emoji used; arrows replaced by chevron SVGs.
*/
