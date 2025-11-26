// KeywordsMovementFeed.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Download, Filter, Search as SearchIcon, Star, StarOff, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, Plus, XCircle, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ───────────────── tokens ───────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "#0077FF",
  ok: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  radius: "var(--wr-radius, 6px)",
};

/* ───────────────── API types ───────────────── */
type MovementType = "gain" | "loss" | "new" | "dropped" | "stable";
type ApiMovement = {
  keyword: string;
  movement_type: MovementType;
  date: string;
  previous_date?: string | null;
  current_position: number | null;
  previous_position: number | null;
  rank_delta: number | null;
  traffic_delta_monthly?: number | null;
  traffic_delta_display?: string | null;
  current_page?: string | null;
  previous_page?: string | null;
  volume?: number | null;
  intent?: string | null;
  intent_confidence?: number | null;
  bucket_crossings?: string[];
  rank_bucket_current?: string | null;
  rank_bucket_previous?: string | null;
  rank_trend_7d?: Array<number | null>;
};
type ApiSummary = {
  total_movements: number;
  gains: number;
  losses: number;
  new: number;
  dropped: number;
  stable: number;
  total_traffic_impact?: number;
};
type MovementFeedApiResponse = {
  status: boolean;
  message: string;
  date_range: string;
  data: {
    movement_feed: {
      movements: ApiMovement[];
      summary: ApiSummary;
      filters_applied: Record<string, any>;
    };
  };
  metadata?: {
    total_keyword_relationships?: number;
    site_url?: string;
    filters_applied?: Record<string, any>;
    pagination_disabled?: boolean;
    total_movements_returned?: number;
  };
};

/* ───────────────── internal DTO ───────────────── */
type Intent = "info" | "commercial" | "navigational" | "transactional";
const INTENTS: Intent[] = ["info", "commercial", "navigational", "transactional"];
type MovementFeedItem = {
  id: string;
  date: string;
  previousDate?: string | null;
  keyword: string;
  previousRank: number | null;
  currentRank: number | null;
  delta: number;
  movement: MovementType;
  landingUrl?: string | null;
  previousUrl?: string | null;
  intent?: Intent | null;
  intentConfidence?: number | null;
  volume?: number | null;
  deltaTP?: number | null;
  deltaTPDisplay?: string | null;
  sparkline7d?: number[];
  bucketCurrent?: string | null;
  bucketPrevious?: string | null;
  bucketCrossings?: string[];
  inTracker: boolean;
  watchlisted?: boolean;
};

/* ───────────────── helpers ───────────────── */
const rankBucket = (r: number | null) => {
  if (r == null || r > 100) return "Top 100+";
  if (r <= 3) return "Top 3";
  if (r <= 10) return "Top 10";
  if (r <= 20) return "Top 20";
  if (r <= 50) return "Top 50";
  return "Top 100";
};
const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString();
const normalizeIntent = (s?: string | null): Intent | null => {
  if (!s) return null;
  const k = s.toLowerCase();
  if (k.startsWith("inform")) return "info";
  if (k.startsWith("transact")) return "transactional";
  if (k.startsWith("comm")) return "commercial";
  if (k.startsWith("navig")) return "navigational";
  return null;
};
const toRank = (v: number | null | undefined) => (v == null ? null : v);

function mapApiToItems(api?: MovementFeedApiResponse): MovementFeedItem[] {
  const arr = api?.data?.movement_feed?.movements ?? [];
  return arr.map((m, i) => {
    const prev = toRank(m.previous_position);
    const curr = toRank(m.current_position);
    const delta = typeof m.rank_delta === "number" ? m.rank_delta : ((prev ?? 120) - (curr ?? 120));
    const spark = (m.rank_trend_7d ?? []).map(v => (v == null ? 120 : v));
    return {
      id: `mv-${i}-${m.keyword}-${m.date}`,
      date: m.date,
      previousDate: m.previous_date ?? null,
      keyword: m.keyword,
      previousRank: prev,
      currentRank: curr,
      delta,
      movement: m.movement_type,
      landingUrl: m.current_page ?? null,
      previousUrl: m.previous_page ?? null,
      volume: m.volume ?? null,
      intent: normalizeIntent(m.intent),
      intentConfidence: m.intent_confidence ?? null,
      deltaTP: m.traffic_delta_monthly ?? null,
      deltaTPDisplay: m.traffic_delta_display ?? null,
      sparkline7d: spark.length ? spark : undefined,
      bucketCurrent: m.rank_bucket_current ?? null,
      bucketPrevious: m.rank_bucket_previous ?? null,
      bucketCrossings: m.bucket_crossings ?? [],
      inTracker: true,
      watchlisted: false,
    };
  });
}

/* ───────────────── Filters popover ───────────────── */
type Filters = {
  minDelta: number;
  crossTop3Enter: boolean;
  crossTop10Enter: boolean;
  crossTop10Exit: boolean;
  crossTop50Exit: boolean;
  intents: Record<Intent, boolean>;
  volMin: number | "";
  volMax: number | "";
  onlyTracked: boolean;
};
const defaultFilters: Filters = {
  minDelta: 0,
  crossTop3Enter: false,
  crossTop10Enter: false,
  crossTop10Exit: false,
  crossTop50Exit: false,
  intents: { info: false, commercial: false, navigational: false, transactional: false },
  volMin: "",
  volMax: "",
  onlyTracked: false,
};

function FiltersPopover({
  value, onChange, onApply, onReset, scopeLabel,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
  onApply: () => void;
  onReset: () => void;
  scopeLabel: string;
}) {
  const v = value;
  const update = (patch: Partial<Filters>) => onChange({ ...v, ...patch });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="h-8 px-3 gap-2 rounded border bg-white flex items-center"
          style={{ borderColor: TK.borderLight }}
        >
          <Filter className="h-3.5 w-3.5" /> Filters
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px]" align="end">
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium mb-1">Magnitude (Min Δrank)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Slider min={0} max={50} step={1} value={[v.minDelta]} onValueChange={(arr)=>update({ minDelta: (arr as number[])[0] })}/>
              </div>
              <div className="w-10 text-right">{v.minDelta}</div>
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Bucket crossing</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2"><Checkbox checked={v.crossTop3Enter} onCheckedChange={(b)=>update({ crossTop3Enter: Boolean(b) })}/> Entered Top 3</label>
              <label className="flex items-center gap-2"><Checkbox checked={v.crossTop10Enter} onCheckedChange={(b)=>update({ crossTop10Enter: Boolean(b) })}/> Entered Top 10</label>
              <label className="flex items-center gap-2"><Checkbox checked={v.crossTop10Exit} onCheckedChange={(b)=>update({ crossTop10Exit: Boolean(b) })}/> Exited Top 10</label>
              <label className="flex items-center gap-2"><Checkbox checked={v.crossTop50Exit} onCheckedChange={(b)=>update({ crossTop50Exit: Boolean(b) })}/> Exited Top 50</label>
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Intent</div>
            <div className="grid grid-cols-2 gap-2">
              {INTENTS.map(it => (
                <label key={it} className="flex items-center gap-2">
                  <Checkbox checked={v.intents[it]} onCheckedChange={(b)=>update({ intents: { ...v.intents, [it]: Boolean(b) } })}/>
                  {it}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Volume</div>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="min" value={String(v.volMin)} onChange={(e)=>update({ volMin: (e.target.value === "" ? "" : Number(e.target.value)) as any })} className="w-28"/>
              <span className="text-muted-foreground">to</span>
              <Input type="number" placeholder="max" value={String(v.volMax)} onChange={(e)=>update({ volMax: (e.target.value === "" ? "" : Number(e.target.value)) as any })} className="w-28"/>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Scope: {scopeLabel}</div>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={v.onlyTracked} onCheckedChange={(b)=>update({ onlyTracked: Boolean(b) })}/>
              Only tracked
            </label>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={onReset}>Reset</Button>
            <Button size="sm" style={{ background: TK.brand, color: "#fff" }} onClick={onApply}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────── Sparkline (with soft reveal) ───────────────── */
function SparklineHover({
  values, w = 1500, h = 140, index = 0,
}: { values: number[]; w?: number; h?: number; index?: number }) {
  const pad = 10;
  const len = values.length;
  const max = Math.max(...values.map(v => Math.min(120, v)));
  const min = Math.min(...values.map(v => Math.min(120, v)));
  const stepX = (w - 2 * pad) / Math.max(1, len - 1);
  const x = (i: number) => pad + i * stepX;
  const y = (v: number) => {
    const clamped = Math.min(120, v);
    const t = (clamped - 1) / (120 - 1);
    return pad + t * (h - 2 * pad);
  };

  let d = `M ${x(0)} ${y(values[0])}`;
  for (let i = 1; i < len; i++) d += ` L ${x(i)} ${y(values[i])}`;
  d += ` L ${x(len - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.45, delay: 0.02 * index, ease: "easeOut" }}
      className="relative"
    >
      <svg
        role="img" aria-label="7-day rank trend"
        width="100%" height={h} viewBox={`0 0 ${w} ${h}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const rx = e.clientX - rect.left;
          const i = Math.max(0, Math.min(len - 1, Math.round((rx - pad) / stepX)));
          setHover({ i, px: x(i), py: y(values[i]) });
        }}>
        <defs>
          <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TK.valueBlue} stopOpacity="0.35" />
            <stop offset="100%" stopColor={TK.valueBlue} stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={h} fill="#fff" />
        <path d={d} fill="url(#glow)" stroke={TK.valueBlue} strokeWidth="2" />
        {hover && (
          <>
            <line x1={hover.px} x2={hover.px} y1={pad} y2={h - pad} stroke={TK.border} />
            <circle cx={hover.px} cy={hover.py} r="4" fill={TK.valueBlue} stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover && (
        <div className="absolute rounded px-2 py-1 text-xs text-white"
          style={{
            left: Math.max(6, Math.min(w - 160, hover.px - 60)),
            top: Math.max(4, hover.py - 34),
            background: "rgba(17,24,39,0.96)",
          }}>
          <div><b>Day {hover.i + 1}</b></div>
          <div>Rank: <b>#{values[hover.i] > 100 ? (<>{"\u003e"}100</>) : values[hover.i]}</b></div>
        </div>
      )}
      <div className="mt-1 text-xs text-muted-foreground">Lower is better; {'>'}100 means not ranked.</div>
    </motion.div>
  );
}

/* ───────────────── Movement badge ───────────────── */
function MovementBadge({
  type, delta, prev, curr, index = 0,
}: { type: MovementType; delta: number; prev: number | null; curr: number | null; index?: number }) {
  const base = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[13px]";
  const chip = (color: string, icon: React.ReactNode, label: React.ReactNode) => (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.015 * index }}
      className={base}
      style={{ borderColor: TK.borderLight, color }}
    >
      {icon}{label}
    </motion.span>
  );

  if (type === "new") return chip(TK.valueBlue, <Plus className="h-3.5 w-3.5" />, <>Ranked ({'>'}100 → #{curr ?? '—'})</>);
  if (type === "dropped") return chip(TK.danger, <XCircle className="h-3.5 w-3.5" />, <>Dropped (#{prev ?? '—'} → {'>'}100)</>);
  if (type === "gain") return chip(TK.ok, <TrendingUp className="h-3.5 w-3.5" />, <>Improved +{Math.abs(delta)} (#{prev ?? '—'} → #{curr ?? '—'})</>);
  if (type === "loss") return chip(TK.danger, <TrendingDown className="h-3.5 w-3.5" />, <>Declined −{Math.abs(delta)} (#{prev ?? '—'} → #{curr ?? '—'})</>);
  return chip(TK.muted, <Minus className="h-3.5 w-3.5" />, <>No change (#{prev ?? '—'} → #{curr ?? '—'})</>);
}

/* ───────────────── Main component ───────────────── */
export default function KeywordMovementFeed({ data }: { data: MovementFeedApiResponse }) {
  const items = useMemo(() => mapApiToItems(data), [data]);
  const summary = data?.data?.movement_feed?.summary;
  const site = data?.metadata?.site_url || "";
  const scopeLabel = `Range: ${data?.date_range || "—"}${site ? ` · Site: ${site}` : ""}`;

  // header state
  const [tab, setTab] = useState<"all" | "gain" | "loss" | "new" | "dropped" | "stable" | "watch">("all");
  const [sort, setSort] = useState<"newest" | "gain" | "loss" | "deltatp">("newest");
  const [searchQ, setSearchQ] = useState("");

  // filters
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersApplied, setFiltersApplied] = useState<Filters>(defaultFilters);
  const applyFilters = () => { setFiltersApplied(filters); setPage(1); };
  const resetFilters = () => { setFilters(defaultFilters); setFiltersApplied(defaultFilters); setPage(1); };

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = {
    all: summary?.total_movements ?? items.length,
    gain: summary?.gains ?? items.filter(i => i.movement === "gain").length,
    loss: summary?.losses ?? items.filter(i => i.movement === "loss").length,
    new: summary?.new ?? items.filter(i => i.movement === "new").length,
    dropped: summary?.dropped ?? items.filter(i => i.movement === "dropped").length,
    stable: summary?.stable ?? items.filter(i => i.movement === "stable").length,
  };

  const filtered = useMemo(() => {
    const f = filtersApplied;
    const intentActive = (Object.values(f.intents).some(Boolean));
    return items.filter(it => {
      if (tab !== "all" && tab !== "watch") {
        if (it.movement !== tab) return false;
      }
      if (tab === "watch" && !it.watchlisted) return false;

      if (searchQ) {
        const q = searchQ.toLowerCase();
        if (!it.keyword.toLowerCase().includes(q) &&
            !(it.landingUrl || "").toLowerCase().includes(q) &&
            !(it.previousUrl || "").toLowerCase().includes(q)) return false;
      }

      if (f.onlyTracked && !it.inTracker) return false;

      const absDelta = Math.abs(it.delta ?? 0);
      if (["gain","loss"].includes(it.movement) && absDelta < f.minDelta) return false;

      const prev = it.previousRank ?? 120;
      const curr = it.currentRank ?? 120;
      const enteredTop3 = prev > 3 && curr <= 3;
      const enteredTop10 = prev > 10 && curr <= 10;
      const exitedTop10 = prev <= 10 && curr > 10 && curr <= 100;
      const exitedTop50 = prev <= 50 && curr > 50 && curr <= 100;
      if (f.crossTop3Enter && !enteredTop3) return false;
      if (f.crossTop10Enter && !enteredTop10) return false;
      if (f.crossTop10Exit && !exitedTop10) return false;
      if (f.crossTop50Exit && !exitedTop50) return false;

      if (intentActive) {
        const intent = it.intent ?? "info";
        if (!f.intents[intent]) return false;
      }

      if (f.volMin !== "" && (it.volume ?? 0) < (f.volMin as number)) return false;
      if (f.volMax !== "" && (it.volume ?? 0) > (f.volMax as number)) return false;

      return true;
    });
  }, [items, tab, filtersApplied, searchQ]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "gain") arr.sort((a,b)=> ( (b.delta ?? 0) - (a.delta ?? 0) ));
    else if (sort === "loss") arr.sort((a,b)=> ( (a.delta ?? 0) - (b.delta ?? 0) ));
    else if (sort === "deltatp") arr.sort((a,b)=> ((b.deltaTP ?? 0) - (a.deltaTP ?? 0)));
    else arr.sort((a,b)=> b.date.localeCompare(a.date));
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  if (page > totalPages) setPage(totalPages);
  const start = (page - 1) * pageSize;
  const view = sorted.slice(start, start + pageSize);

  const exportCSV = () => {
    const cols = ["date","previousDate","keyword","movement","delta","previousRank","currentRank","volume","deltaTP","deltaTPDisplay","landingUrl","previousUrl","bucketCurrent","bucketPrevious","bucketCrossings","intent","intentConfidence"];
    const header = cols.join(",");
    const body = sorted.map(it => [
      it.date, it.previousDate ?? "", it.keyword, it.movement, it.delta,
      it.previousRank ?? ">100", it.currentRank ?? ">100",
      it.volume ?? "", it.deltaTP ?? "", it.deltaTPDisplay ?? "",
      it.landingUrl ?? "", it.previousUrl ?? "",
      it.bucketCurrent ?? "", it.bucketPrevious ?? "", (it.bucketCrossings ?? []).join("|"),
      it.intent ?? "", it.intentConfidence ?? "",
    ].map(v => JSON.stringify(v)).join(",")).join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keyword-movements.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ─────────────── variants ─────────────── */
  const rowVariant = {
    hidden: (i: number) => ({ opacity: 0, y: 10 }),
    show:   (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.03, ease: "easeOut" } }),
    exit:   { opacity: 0, y: -6, transition: { duration: 0.2 } },
  };
  const chipVariant = {
    hidden: { opacity: 0, y: 6 },
    show:   (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.02 * i } }),
  };

  return (
    <section className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <Card className="border mx-4" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
          {/* Header bar */}
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex items-center gap-2"
            >
              <CardTitle className="text-lg">Keyword Movement Feed</CardTitle>

              {data?.metadata?.site_url && (
                <span className="text-sm text-muted-foreground">· {data.metadata.site_url}</span>
              )}
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex items-center gap-2 flex-wrap"
            >
              {/* Tabs with counts from summary */}
              {([
                ["all", `All (${counts.all})`],
                ["gain", `Gains (${counts.gain})`],
                ["loss", `Losses (${counts.loss})`],
                ["new", `New (${counts.new})`],
                ["dropped", `Dropped (${counts.dropped})`],
                ["stable", `Stable (${counts.stable})`],
                ["watch", "Watchlist"],
              ] as const).map(([k,label], idx) => (
                <motion.button
                  key={k}
                  custom={idx}
                  variants={chipVariant}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={()=>{ setTab(k as any); setPage(1); }}
                  className={`h-8 px-3 rounded-full border text-sm ${tab===k ? "font-semibold" : ""}`}
                  style={{ borderColor: TK.borderLight, background: tab===k ? "#EDF5FF" : "#fff", cursor: "pointer" }}
                >
                  {label}
                </motion.button>
              ))}

              {/* Sort */}
              <motion.div custom={7} variants={chipVariant}>
                <Select value={sort} onValueChange={(v:any)=>{ setSort(v); setPage(1); }}>
                  <SelectTrigger className="h-8 px-3 w-[160px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="gain">Biggest Gain</SelectItem>
                    <SelectItem value="loss">Biggest Loss</SelectItem>
                    <SelectItem value="deltatp">ΔTraffic (mo)</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Filters */}
              <motion.div custom={8} variants={chipVariant}>
                <FiltersPopover
                  value={filters}
                  onChange={setFilters}
                  onApply={applyFilters}
                  onReset={resetFilters}
                  scopeLabel={scopeLabel}
                />
              </motion.div>

              {/* Export */}
              <motion.div custom={9} variants={chipVariant}>
                <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
              </motion.div>
            </motion.div>
          </CardHeader>

          {/* Filter/search row */}
          <CardContent className="border-t pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-2"
            >
              <div className="relative">
                <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQ} onChange={(e)=>{ setSearchQ(e.target.value); setPage(1); }} placeholder="Search keyword or URL…" className="w-[300px] pl-7" />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                  <SelectContent>
                    {[10,20,30,40].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(1)}>First</Button>
                <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
                <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
                <Button variant="outline" className="h-8 px-3" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
                <Button variant="outline" className="h-8 px-3" disabled={page>=totalPages} onClick={()=>setPage(totalPages)}>Last</Button>
              </div>
            </motion.div>
          </CardContent>

          {/* Feed list */}
          <CardContent className="pt-2">
            <AnimatePresence mode="popLayout">
              {view.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 text-sm text-muted-foreground"
                >
                  No movements for this range. Try widening the date range or lowering the magnitude filter.
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {view.map((it, idx) => (
                    <motion.div
                      key={it.id}
                      layout
                      custom={idx}
                      variants={rowVariant as any}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                    >
                      <FeedItem item={it} index={idx} />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>

          {/* bottom info */}
          <div className="flex items-center justify-between p-3 border-t text-sm text-muted-foreground" style={{ borderColor: TK.borderLight }}>
            <div>Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + view.length)} of {sorted.length}</div>
            <div>{scopeLabel}</div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}

/* ───────────────── One feed item ───────────────── */
function FeedItem({ item, index = 0 }: { item: MovementFeedItem; index?: number }) {
  const [open, setOpen] = useState(false);
  const [watch, setWatch] = useState(Boolean(item.watchlisted));

  const bucket = item.bucketCurrent || rankBucket(item.currentRank);
  const dt = new Date(item.date).toLocaleDateString();
  const pdt = item.previousDate ? new Date(item.previousDate).toLocaleDateString() : null;

  const trafficChip = (item.deltaTPDisplay && item.deltaTPDisplay.trim().length > 0)
    ? item.deltaTPDisplay
    : (item.deltaTP ?? 0) > 0 ? `+${fmt(item.deltaTP)}` : fmt(item.deltaTP);

  return (
    <motion.div
      layout
      className="border rounded-md"
      style={{ borderColor: TK.borderLight }}
      whileHover={{ y: -1 }}
      transition={{ layout: { duration: 0.25 } }}
    >
      {/* top row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.35, delay: 0.02 * index, ease: "easeOut" }}
        className="p-3 flex flex-col gap-2"
      >
        {/* A: keyword + watch + timestamp */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={()=>setOpen(o=>!o)}
            className="rounded border p-1 hover:bg-muted"
            aria-label={open? "Hide" : "Show"}
            style={{ borderColor: TK.borderLight, cursor: "pointer" }}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </motion.button>

          <div className="font-semibold">{item.keyword}</div>

          <motion.button
            className="ml-2"
            whileTap={{ scale: 0.9 }}
            onClick={()=>setWatch(v=>!v)}
            aria-label="Toggle watch"
            style={{ cursor: "pointer" }}
          >
            {watch ? <Star className="h-4 w-4" color={TK.warn} fill={TK.warn} /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
          </motion.button>

          <div className="ml-auto text-sm text-muted-foreground" title={item.date}>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {dt}</span>
            {pdt && <span className="ml-2">· Prev: {pdt}</span>}
          </div>
        </div>

        {/* B: movement summary (animated chips) */}
        <div className="flex flex-wrap items-center gap-3">
          <MovementBadge type={item.movement} delta={item.delta} prev={item.previousRank} curr={item.currentRank} index={index} />

          <motion.span
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.02 * index }}
            className="text-xs px-2 py-0.5 rounded bg-[#F8FAFF] border"
            style={{ borderColor: TK.borderLight }}
          >
            {bucket}
          </motion.span>

          <AnimatePresence>
            {item.bucketCrossings && item.bucketCrossings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.03 * index }}
                className="flex items-center flex-wrap gap-2"
              >
                {item.bucketCrossings.map((bc, i) => (
                  <motion.span
                    key={`${bc}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: 0.01 * (index + i) }}
                    className="text-xs px-2 py-0.5 rounded border"
                    style={{ borderColor: TK.borderLight, color: TK.brand }}
                  >
                    {bc}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.025 * index }}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    (item.deltaTP ?? 0) > 0 ? "text-green-600" : (item.deltaTP ?? 0) < 0 ? "text-red-600" : "text-gray-500"
                  }`}
                  style={{ borderColor: TK.borderLight }}
                >
                  {trafficChip} ΔTraffic/mo
                </motion.span>
              </TooltipTrigger>
              <TooltipContent>Estimated monthly traffic change from API model</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* C: context */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.025 * index }}
          className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
        >
          {item.landingUrl && <div className="truncate max-w-[40ch]"><span className="text-[#111827]">Current Page:</span> {item.landingUrl}</div>}
          {item.previousUrl && <div className="truncate max-w-[40ch]"><span className="text-[#111827]">Prev Page:</span> {item.previousUrl}</div>}
          <div><span className="text-[#111827]">Intent:</span> {item.intent ?? "—"}{item.intentConfidence != null ? ` (${item.intentConfidence}%)` : ""}</div>
          <div><span className="text-[#111827]">Volume:</span> {fmt(item.volume)}</div>
          <div className="ml-auto flex items-center gap-1">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button size="sm" variant="outline">Assign task</Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button size="sm" variant="outline">SERP</Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button size="sm" variant="outline">View details</Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* E: expand */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t p-3"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="text-sm font-medium mb-1">7-day rank trend</div>
            {item.sparkline7d&& <SparklineHover values={item.sparkline7d} index={index} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
