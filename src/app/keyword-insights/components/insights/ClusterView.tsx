import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download, SlidersHorizontal, HelpCircle, ChevronDown, ChevronUp, ChevronsUpDown, MoveHorizontal, Filter, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ───────────────────────────────────────── TOKENS ───────────────────────────────────────── */

const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  blue: "var(--wr-action, #4286F5)",
  blueSoft: "var(--wr-blue-soft, #BDD6FF)",
  ok: "var(--wr-good, #34A853)",
  warn: "var(--wr-warning, #F9BB04)",
  danger: "var(--wr-critical, #E94134)",
  radius: "var(--wr-radius, 6px)",
  chipBg: "var(--wr-chip, #F5F7FA)",
  appBg: "var(--wr-appbg, #FAFBFD)",
};

/* ───────────────────────────────────────── TYPES ───────────────────────────────────────── */

type ApiIntent = "informational" | "commercial" | "navigational" | "transactional";

type Row = {
  id: string;
  keywordId: string;
  keyword: string;
  landingUrl: string | null;
  rank: number | null;
  delta7d: number | null;
  volume: number;
  intent: ApiIntent;
  intentConfidence: number;
  tags?: string[];
  tp: number;   // traffic potential (from API item.tp)
  lift: number; // projected lift (from API item.lift)
  // extras to show “as-is”
  rankBucket?: string;
  isTracked?: boolean;
  pagesCount?: number;
  ctr?: number;
  clicks?: number;
};

type ColumnKey =
  | "select" | "expander" | "keyword" | "landing" | "rank" | "delta7d"
  | "tp" | "lift" | "volume" | "intentConf" | "tags" | "actions";

/* ───────────────────────────────────────── UTILS ───────────────────────────────────────── */

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
      : String(n);

function intentLabel(i: ApiIntent) {
  switch (i) {
    case "informational": return "Informational";
    case "commercial": return "Commercial";
    case "navigational": return "Navigational";
    case "transactional": return "Transactional";
  }
}
function confColor(pct: number) {
  if (pct >= 75) return TOKENS.ok as string;
  if (pct >= 60) return TOKENS.warn as string;
  return TOKENS.danger as string;
}

/* ================================ KPI micro charts (fallback sparklines) ================================ */
function Sparkline({
  values, height = 44, stroke = TOKENS.blue as string, fill = TOKENS.blueSoft as string,
}: { values: number[]; height?: number; stroke?: string; fill?: string }) {
  const [hover, setHover] = useState<{ i: number, x: number, y: number } | null>(null);
  const w = 200; const padX = 6; const padY = 6;
  if (!values || values.length < 2) return <svg width={w} height={height} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const toX = (i: number) => padX + (i * (w - 2 * padX)) / (values.length - 1);
  const toY = (v: number) => {
    const norm = (v - min) / (max - min || 1);
    return height - padY - norm * (height - 2 * padY);
  };
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");
  const area = `M ${toX(0)} ${height - padY} ` + values.map((v, i) => `L ${toX(i)} ${toY(v)}`).join(" ") + ` L ${toX(values.length - 1)} ${height - padY} Z`;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const rx = e.clientX - rect.left;
          const idx = Math.max(0, Math.min(values.length - 1,
            Math.round((rx - padX) / ((w - 2 * padX) / (values.length - 1)))
          ));
          setHover({ i: idx, x: toX(idx), y: toY(values[idx]) });
        }}>
        <path d={area} fill={fill} opacity={0.6} />
        <path d={path} stroke={stroke} strokeWidth={2} fill="none" />
        {hover && (<g><line x1={hover.x} x2={hover.x} y1={padY} y2={height - padY} stroke="#E5E7EB" />
          <circle cx={hover.x} cy={hover.y} r={3.8} fill={stroke} stroke="#fff" strokeWidth={2} />
        </g>)}
      </svg>
      {hover && (
        <div className="absolute text-xs px-2 py-1 rounded shadow"
          style={{
            background: "#111827", color: "#fff", top: Math.max(0, hover.y - 34),
            left: Math.max(0, Math.min(w - 82, hover.x - 40))
          }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Day {hover.i + 1}</div>
          <div>Value: <b>{values[hover.i]}</b></div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────── Component ───────────────────────────────────────── */

export default function ClusterView({ dtoCluster }: { dtoCluster?: any }) {
  /* derive intents & rows from API (no mocks if dto present) */
  const intentsData = dtoCluster?.data?.cluster_data?.intents ?? {};
  const kpisData = dtoCluster?.data?.cluster_kpis ?? {};
  const daySpan = dtoCluster?.metadata?.date_range?.days ?? 30;

  const availableIntents = useMemo<ApiIntent[]>(() => {
    const keys = Object.keys(intentsData) as ApiIntent[];
    // preserve server order if any; otherwise fallback consistent
    const order: ApiIntent[] = ["informational", "commercial", "navigational", "transactional"];
    return order.filter(o => keys.includes(o));
  }, [intentsData]);

  const [tab, setTab] = useState<ApiIntent>(availableIntents[0] ?? "informational");
  useEffect(() => {
    if (!availableIntents.includes(tab) && availableIntents.length) {
      setTab(availableIntents[0]);
    }
  }, [availableIntents, tab]);

  const rowsByIntent = useMemo<Record<ApiIntent, Row[]>>(() => {
    const out: Record<string, Row[]> = {};
    for (const key of Object.keys(intentsData)) {
      const intentKey = key as ApiIntent;
      const items = intentsData[intentKey]?.items ?? [];
      out[intentKey] = items.map((it: any) => ({
        id: String(it.keyword_id ?? it.keyword ?? Math.random()),
        keywordId: String(it.keyword_id ?? ""),
        keyword: String(it.keyword ?? ""),
        landingUrl: it.landing_url ?? null,
        rank: it.rank === null || typeof it.rank === "undefined" ? null : Number(it.rank),
        delta7d: it.delta_7d === null || typeof it.delta_7d === "undefined" ? null : Number(it.delta_7d),
        volume: Number(it.volume ?? 0),
        intent: intentKey,
        intentConfidence: Number(it.intent_confidence ?? 0),
        tags: Array.isArray(it.tags) ? it.tags : [],
        tp: Number(it.tp ?? 0),
        lift: Number(it.lift ?? 0),
        rankBucket: it.rank_bucket,
        isTracked: Boolean(it.is_tracked),
        pagesCount: Number(it.pages_count ?? 0),
        ctr: Number(it.ctr ?? 0),
        clicks: Number(it.clicks ?? 0),
      })) as Row[];
    }
    return out as Record<ApiIntent, Row[]>;
  }, [intentsData]);

  /* KPI values per current tab (all “as-is”) */
  const kpiForTab = useMemo(() => {
    const k = (kpisData?.[tab] ?? {}) as any;
    const counts = (intentsData?.[tab]?.counts ?? {}) as any;

    const top10 = typeof k.top_10 === "number" ? k.top_10 : (typeof counts.top_10 === "number" ? counts.top_10 : 0);
    const avgPos = typeof k.avg_position === "number" ? k.avg_position : (typeof counts.avg_position === "number" ? counts.avg_position : "—");
    const tpDisplay = typeof k.traffic_potential === "string" && k.traffic_potential.length ? k.traffic_potential : (
      typeof counts.tp_sum === "number" ? `${counts.tp_sum}` : "0"
    ); // keep format string if server sends "3.1k/mo"
    const lift = typeof counts.lift_sum === "number" ? counts.lift_sum : 0;

    // Sparkline: server sends [] today; keep graceful fallback
    const mkSeries = (arr?: any[]) => Array.isArray(arr) && arr.length ? arr.map((d: any) => Number(d?.value ?? d) || 0) : Array.from({ length: 14 }, (_, i) => i + 1);
    const series = mkSeries(k?.sparkline_data);

    return { top10, avgPos, tpDisplay, lift, series };
  }, [kpisData, intentsData, tab]);

  /* ========== Filters, sort, pagination (unchanged behavior, now on real rows) ========== */
  const [bucket, setBucket] = useState<"all" | "top3" | "top10" | "top20" | "21-50" | "51-100" | "nr">("all");
  const [volRange, setVolRange] = useState<[number, number]>([0, 50000]);
  const [confMin, setConfMin] = useState(0);
  const [onlyTracked, setOnlyTracked] = useState(false);
  const [groupTopic, setGroupTopic] = useState(false); // reserved
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // table columns
  const columns: { key: ColumnKey; label: string; width?: number; sortable?: boolean; align?: "left" | "right" | "center" }[] = [
    { key: "select", label: "", width: 36, align: "center" },
    { key: "expander", label: "", width: 36, align: "center" },
    { key: "keyword", label: "Keyword", width: 320, sortable: true },
    { key: "landing", label: "Landing Page", width: 260, sortable: false },
    { key: "rank", label: "Today’s Rank", width: 140, sortable: true, align: "center" },
    { key: "delta7d", label: "Δ 7d", width: 90, sortable: true, align: "right" },
    { key: "tp", label: "TP (mo)", width: 120, sortable: true, align: "right" },
    { key: "lift", label: "Lift → Top 3", width: 140, sortable: true, align: "right" },
    { key: "volume", label: "Volume", width: 110, sortable: true, align: "right" },
    { key: "intentConf", label: "Intent Confidence", width: 160, sortable: true, align: "center" },
    { key: "tags", label: "Tags", width: 160, sortable: false },
    { key: "actions", label: "Actions", width: 220, sortable: false, align: "center" },
  ];
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true, expander: true, keyword: true, landing: true, rank: true,
    delta7d: true, tp: true, lift: true, volume: true, intentConf: true, tags: true, actions: true,
  });
  const visibleColumns = useMemo(() => columns.filter(c => visibleCols[c.key] !== false), [visibleCols]);

  const [sortBy, setSortBy] = useState<keyof Row | "keyword">("lift");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);

  const [kwWidth, setKwWidth] = useState(320);
  const gripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = gripRef.current;
    if (!el) return;
    let startX = 0; let startW = 0;
    const onDown = (e: MouseEvent) => { startX = e.clientX; startW = kwWidth; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); e.preventDefault(); };
    const onMove = (e: MouseEvent) => { const dx = e.clientX - startX; setKwWidth(Math.max(240, Math.min(520, startW + dx))); };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    el.addEventListener("mousedown", onDown);
    return () => el.removeEventListener("mousedown", onDown);
  }, [kwWidth]);

  // Base rows come from API for current tab
  const base = useMemo(() => (rowsByIntent[tab] ?? []) as Row[], [rowsByIntent, tab]);

  // Apply filters
  const filtered = useMemo(() => base.filter(r => {
    if (q) {
      const qq = q.toLowerCase();
      if (!(r.keyword.toLowerCase().includes(qq) || (r.landingUrl || "").toLowerCase().includes(qq))) return false;
    }
    if (r.volume < volRange[0] || r.volume > volRange[1]) return false;
    if (r.intentConfidence < confMin) return false;
    if (onlyTracked && !r.isTracked) return false;

    switch (bucket) {
      case "top3": if (!(r.rank && r.rank <= 3)) return false; break;
      case "top10": if (!(r.rank && r.rank <= 10)) return false; break;
      case "top20": if (!(r.rank && r.rank <= 20)) return false; break;
      case "21-50": if (!(r.rank && r.rank >= 21 && r.rank <= 50)) return false; break;
      case "51-100": if (!(r.rank && r.rank >= 51 && r.rank <= 100)) return false; break;
      case "nr": if (!(r.rank === null)) return false; break;
    }
    return true;
  }), [base, q, volRange, confMin, onlyTracked, bucket]);

  // Sort + page
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const A = (a as any)[sortBy];
      const B = (b as any)[sortBy];
      if (A === B) return 0;
      if (sortDir === "asc") return A > B ? 1 : -1;
      return A < B ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const total = sorted.length;
  const [pageInternal, setPageInternal] = useState(1);
  useEffect(() => { setPageInternal(1); }, [tab, q, bucket, volRange, confMin, onlyTracked, pageSize]);
  const pageNow = pageInternal;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = useMemo(() => {
    const start = (pageNow - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageNow, pageSize]);

  // Export
  const exportCSV = () => {
    const cols: (keyof Row)[] = ["keyword", "landingUrl", "rank", "delta7d", "tp", "lift", "volume", "intent", "intentConfidence", "tags"];
    const head = cols.join(",");
    const lines = sorted.map(r => cols.map(k => JSON.stringify((r as any)[k] ?? "")).join(",")).join("\n");
    const csv = head + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cluster-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const anySelected = selectedIds.length > 0;
  const visibleIds = paged.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected[id]);
  const someVisibleSelected = visibleIds.some(id => selected[id]) && !allVisibleSelected;

  const colInfo: Record<ColumnKey, string> = {
    select: "Select rows for bulk actions.",
    expander: "Expand for SERP flags & quick suggestions.",
    keyword: "Keyword — click opens Keyword Drilldown (intent lens).",
    landing: "Landing page; hover for full URL; click → Page Drawer.",
    rank: "Best rank today (same scope); Not Ranked if >100.",
    delta7d: "Rank movement vs 7 days ago (↑/↓).",
    tp: "Traffic Potential (from API, item.tp).",
    lift: "Projected lift to Top 3 (from API, item.lift).",
    volume: "Monthly search volume.",
    intentConf: "Model confidence % for this intent.",
    tags: "Keyword tags.",
    actions: "Track · Task · SERP · Open in Opportunities",
  };

  return (
    <section className="space-y-3 mt-4">
      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        {/* ───────────────────────── Header ───────────────────────── */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Cluster View</CardTitle>
            <div className="text-sm text-muted-foreground">TW: {daySpan}d · Scope mirror</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Groups keywords by search intent; values shown exactly as provided by the API.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2">
                  {columns.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "expander" || c.key === "keyword"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCols({
                    select: true, expander: true, keyword: true, landing: true, rank: true,
                    delta7d: true, tp: true, lift: true, volume: true, intentConf: true, tags: true, actions: true
                  })}>Reset</Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand as string, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* ───────────────────────── KPI STRIP ───────────────────────── */}
        <CardContent className="border-t" style={{ borderColor: TOKENS.borderLight }}>
          {/* Intent Tabs (dynamic from API) */}
          <div className="flex flex-wrap gap-2 mb-3">
            {availableIntents.map(i => {
              const active = tab === i;
              const totalForIntent = intentsData?.[i]?.counts?.total ?? 0;
              return (
                <button key={i}
                  onClick={() => { setTab(i); setPage(1); setPageInternal(1); }}
                  className={`px-3 h-8 rounded border text-sm ${active ? "bg-[#BDD6FF] text-[#111827] border-[#BDD6FF] underline decoration-[#4286F5]" : "bg-white text-[#6B7280]"}`}>
                  {intentLabel(i)}
                  <span className="ml-2 text-xs rounded-full bg-[#F5F7FA] px-1.5 py-0.5 border border-[#EFF0F6]">
                    {totalForIntent}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard title="Keywords in Top 10"
              value={String(kpiForTab.top10)}
              chart={<Sparkline values={kpiForTab.series} />} />

            <KpiCard title="Avg Position"
              value={String(kpiForTab.avgPos)}
              chart={<Sparkline values={kpiForTab.series} />} />

            <KpiCard title="Traffic Potential"
              value={String(kpiForTab.tpDisplay)}
              chart={<Sparkline values={kpiForTab.series} />} />

            <KpiCard title="Projected Lift → Top 3"
              value={String(kpiForTab.lift)}
              chart={<Sparkline values={kpiForTab.series} />} />
          </div>

          {/* ───────────────────────── FILTER BAR ───────────────────────── */}
          <div className="space-y-3">
            {/* chips row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" /> Filters
              </div>

              {(
                [
                  { id: "all", label: "All" },
                  { id: "top3", label: "Top 3" },
                  { id: "top10", label: "Top 10" },
                  { id: "top20", label: "Top 20" },
                  { id: "21-50", label: "21–50" },
                  { id: "51-100", label: "51–100" },
                  { id: "nr", label: "Not Ranked" },
                ] as const
              ).map(b => (
                <button key={b.id}
                  onClick={() => { setBucket(b.id); setPage(1); setPageInternal(1); }}
                  className={`px-3 h-8 rounded-full border text-sm ${bucket === b.id ? "bg-white border-[#4286F5] text-[#111827]" : "bg-white text-[#111827] hover:bg-[#F5F7FA]"}`}>
                  {b.label}
                </button>
              ))}

              {/* volume */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-3 h-8 rounded-full border text-sm bg-white hover:bg-[#F7FAFC]">
                    Volume
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[360px]">
                  <div className="text-sm font-medium mb-2">Volume range</div>
                  <Slider value={[volRange[0], volRange[1]]} min={0} max={50000} step={100}
                    onValueChange={(v) => setVolRange(v as [number, number])} />
                  <div className="flex justify-between mt-2">
                    <Input className="w-28" type="number" value={volRange[0]}
                      onChange={(e) => setVolRange([Math.max(0, Number(e.target.value) || 0), volRange[1]])} />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input className="w-28" type="number" value={volRange[1]}
                      onChange={(e) => setVolRange([volRange[0], Math.max(0, Number(e.target.value) || 0)])} />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setVolRange([0, 50000])}>Reset</Button>
                      <Button size="sm" style={{ backgroundColor: TOKENS.brand as string, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Intent confidence */}
              <div className="flex items-center gap-2 ml-1">
                <span className="text-sm text-muted-foreground">Intent confidence</span>
                <div className="w-[160px]">
                  <Slider value={[confMin]} min={0} max={100} step={1} onValueChange={(v) => setConfMin((v as number[])[0])} />
                </div>
                <span className="text-sm">{confMin}%</span>
              </div>

              {/* tracked / grouped */}
              <label className="inline-flex items-center gap-2 ml-2 text-sm cursor-pointer">
                <Switch checked={onlyTracked} onCheckedChange={setOnlyTracked} />
                <span>Only tracked</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={groupTopic} onCheckedChange={setGroupTopic} />
                <span>Group by Topic (beta)</span>
              </label>

              {/* search */}
              <div className="relative ml-auto">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); setPageInternal(1); }} placeholder="Search keyword or URL…" className="w-[280px] pl-7" />
              </div>

              {/* page size */}
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); setPageInternal(1); }}>
                <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Page size" /></SelectTrigger>
                <SelectContent>{[10, 25, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>

            {/* bulk bar */}
            {anySelected && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border rounded" style={{ borderColor: TOKENS.borderLight, background: TOKENS.chipBg }}>
                <div className="text-sm" style={{ color: TOKENS.text }}>
                  <strong>{selectedIds.length}</strong> selected
                </div>
                <div className="flex gap-2">
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand as string, color: "#fff" }} onClick={() => console.info("Track", selectedIds)}>Track</Button>
                  <Button size="sm" variant="outline" onClick={() => console.info("Task", selectedIds)}>Create Task</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* ───────────────────────── TABLE ───────────────────────── */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead key={c.key}
                      style={{
                        minWidth: c.key === "keyword" ? kwWidth : c.width,
                        position: c.key === "select" ? "sticky" as const : c.key === "expander" ? "sticky" as const : "static" as const,
                        left: c.key === "select" ? 0 : c.key === "expander" ? 36 : undefined,
                        zIndex: c.key === "select" || c.key === "expander" ? 40 : undefined,
                        background: "#fff", boxShadow: (c.key === "select" || c.key === "expander") ? "inset -1px 0 0 rgba(0,0,0,0.06)" : undefined,
                      }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              visibleIds.forEach(id => patch[id] = on);
                              setSelected(s => ({ ...s, ...patch }));
                            }}
                          />
                        </div>
                      ) : c.key === "keyword" ? (
                        <div className="flex items-center">
                          <span className="mr-2">Keyword</span>
                          <div ref={gripRef} title="Drag to resize" className="ml-auto h-5 w-4 cursor-col-resize text-muted-foreground flex items-center justify-center">
                            <MoveHorizontal className="h-4 w-4" />
                          </div>
                        </div>
                      ) : c.sortable ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground relative group"
                          onClick={() => {
                            const keyMap: Record<string, keyof Row> = {
                              keyword: "keyword", landing: "landingUrl", rank: "rank",
                              delta7d: "delta7d", tp: "tp", lift: "lift", volume: "volume", intentConf: "intentConfidence"
                            };
                            const key = keyMap[c.key] || "lift";
                            if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
                            else setSortDir(d => d === "asc" ? "desc" : "asc");
                          }}>
                          <span>{c.label}</span>
                          {(() => {
                            const keyMap: Record<string, keyof Row> = {
                              keyword: "keyword", landing: "landingUrl", rank: "rank",
                              delta7d: "delta7d", tp: "tp", lift: "lift", volume: "volume", intentConf: "intentConfidence"
                            };
                            const key = keyMap[c.key];
                            if (key && sortBy === key) return sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
                            return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
                          })()}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {colInfo[c.key]}
                          </span>
                        </button>
                      ) : (
                        <span className="relative group cursor-help">
                          {c.label}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {colInfo[c.key]}
                          </span>
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {paged.map(r => (
                  <React.Fragment key={r.id}>
                    <TableRow className="hover:bg-[#F5F7FA]">
                      {/* select */}
                      {visibleCols.select !== false && (
                        <TableCell style={{ position: "sticky", left: 0, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}>
                          <Checkbox checked={!!selected[r.id]}
                            onCheckedChange={(v) => setSelected(s => ({ ...s, [r.id]: Boolean(v) }))} />
                        </TableCell>
                      )}

                      {/* expander placeholder */}
                      {visibleCols.expander !== false && (
                        <TableCell style={{ position: "sticky", left: 36, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded border text-muted-foreground">›</span>
                        </TableCell>
                      )}

                      {/* keyword */}
                      {visibleCols.keyword !== false && (
                        <TableCell style={{ minWidth: kwWidth }}>
                          <a className="underline" style={{ color: TOKENS.blue as string }} href="#">
                            {r.keyword}
                          </a>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Vol {compact(r.volume)} · Conf {r.intentConfidence}% · CTR {r.ctr ?? 0}% · Clicks {r.clicks ?? 0} · Pages {r.pagesCount ?? 0}
                          </div>
                        </TableCell>
                      )}

                      {/* landing */}
                      {visibleCols.landing !== false && (
                        <TableCell title={r.landingUrl || ""}>
                          {r.landingUrl ? <span className="truncate block max-w-[260px]">{r.landingUrl}</span> : "—"}
                        </TableCell>
                      )}

                      {/* rank (with API-provided bucket) */}
                      {visibleCols.rank !== false && (
                        <TableCell className="text-center">
                          {r.rank !== null ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F5F7FA] border" style={{ borderColor: TOKENS.borderLight }}>
                              #{Number(r.rank).toFixed(2)} <span className="ml-1 text-xs text-muted-foreground">{r.rankBucket ?? ""}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FCE8E7] text-[#B42318]">Not Ranked</span>
                          )}
                        </TableCell>
                      )}

                      {/* delta 7d */}
                      {visibleCols.delta7d !== false && (
                        <TableCell className="text-right">
                          {r.delta7d === null ? "—" : (
                            <span style={{ color: (r.delta7d ?? 0) > 0 ? TOKENS.ok as string : TOKENS.danger as string }}>
                              {(r.delta7d ?? 0) > 0 ? "↑" : "↓"} {Math.abs(r.delta7d ?? 0)}
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* TP */}
                      {visibleCols.tp !== false && (<TableCell className="text-right">{compact(Math.round(r.tp || 0))}</TableCell>)}

                      {/* Lift */}
                      {visibleCols.lift !== false && (<TableCell className="text-right">{compact(Math.round(r.lift || 0))}</TableCell>)}

                      {/* Volume */}
                      {visibleCols.volume !== false && (<TableCell className="text-right">{compact(r.volume)}</TableCell>)}

                      {/* Intent Confidence */}
                      {visibleCols.intentConf !== false && (
                        <TableCell className="text-center">
                          <div className="mx-auto w-[120px]">
                            <div className="h-2 rounded bg-[#E5E7EB]">
                              <div className="h-2 rounded" style={{ width: `${r.intentConfidence}%`, background: confColor(r.intentConfidence) }} />
                            </div>
                            <div className="text-xs mt-1">{r.intentConfidence}%</div>
                          </div>
                        </TableCell>
                      )}

                      {/* tags */}
                      {visibleCols.tags !== false && (
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(r.tags || []).map(t => (
                              <span key={t} className="text-xs px-2 py-0.5 rounded-full border bg-white" style={{ borderColor: TOKENS.borderLight }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      )}

                      {/* actions */}
                      {visibleCols.actions !== false && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline">Track</Button>
                            <Button size="sm" variant="outline">Task</Button>
                            <Button size="sm" variant="outline">SERP</Button>
                            <Button size="sm" variant="outline">Opportunities</Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* pagination footer */}
          <div className="flex items-center justify-end gap-2 p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm text-muted-foreground">
              {total === 0 ? "0–0 of 0" : `${((pageNow - 1) * pageSize) + 1}–${Math.min(pageNow * pageSize, total)} of ${total}`}
            </div>
            <Button variant="outline" size="sm" disabled={pageNow === 1} onClick={() => setPageInternal(1)}>First</Button>
            <Button variant="outline" size="sm" disabled={pageNow === 1} onClick={() => setPageInternal(p => Math.max(1, p - 1))}>Prev</Button>
            <div className="text-sm w-16 text-center">{pageNow}</div>
            <Button variant="outline" size="sm" disabled={pageNow === totalPages} onClick={() => setPageInternal(p => Math.min(totalPages, p + 1))}>Next</Button>
            <Button variant="outline" size="sm" disabled={pageNow === totalPages} onClick={() => setPageInternal(totalPages)}>Last</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/* ───────────────────────────────────────── small helpers ───────────────────────────────────────── */

function KpiCard({ title, value, chart }: { title: string; value: string; chart: React.ReactNode }) {
  return (
    <div className="border rounded p-3 bg-white" style={{ borderColor: TOKENS.borderLight }}>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold mt-1 mb-2" style={{ color: TOKENS.blue as string }}>{value}</div>
      <div className="pt-1">{chart}</div>
    </div>
  );
}
