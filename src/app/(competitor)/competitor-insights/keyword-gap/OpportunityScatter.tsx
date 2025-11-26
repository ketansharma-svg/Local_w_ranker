import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Card, CardHeader, CardTitle, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Info, RefreshCw, Filter, ChevronDown, TrendingUp, MousePointerClick
} from "lucide-react";

import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RTooltip,
  Legend,
  Scatter
} from "recharts";

/* ───────────────────────────────────────────────────────────
   Design tokens (kept consistent with prior sections)
   ─────────────────────────────────────────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",         // primary brand
  youBlue: "var(--wr-you-blue, #0077ff)",    // for "you" accents (not used here)
  ok: "var(--wr-success, #16A34A)",
  critical: "var(--wr-critical, #EF4444)",
  cardBg: "#FFFFFF",
  radius: "var(--wr-radius, 12px)",
};

type Intent = "informational" | "commercial" | "transactional" | "navigational";

type GapRow = {
  id: string;
  keyword: string;
  intent: Intent;
  volume: number;           // monthly search volume (>= 0)
  kd: number | null;        // 0-100 difficulty; null = unknown
  cpc: number | null;       // $USD; null/0 => minimal bubble
};

type Filters = {
  intents: Set<Intent>;
  kdRange: [number, number];
  volumeMin: number;
  xScale: "linear" | "log";
};

type Props = {
  /** Pass your Keyword Gap dataset (keyword, volume, kd, cpc, intent). */
  data?: GapRow[];
  /** Optional controlled filters (component stays sync'd to these). */
  filters?: Partial<Filters>;
  /** Fires when user changes filters from this chart. */
  onFiltersChange?: (f: Filters) => void;
  /** Bubble click handler (open drawer / task / table deep-link). */
  onBubbleClick?: (row: GapRow) => void;
  /** Label for country/device/date context (small hint, optional). */
  contextHint?: string;
};

/* ───────────────────────────────────────────────────────────
   Intent color map & helpers
   ─────────────────────────────────────────────────────────── */
const INTENT_META: Record<Intent, { label: string; color: string }> = {
  informational: { label: "Informational",  color: "#1090D0" }, // blue
  commercial:    { label: "Commercial",     color: "#10B981" }, // green
  transactional: { label: "Transactional",  color: "#F59E0B" }, // orange
  navigational:  { label: "Navigational",   color: "#6B7280" }, // gray
};

const fmtNum = (n: number) =>
  new Intl.NumberFormat().format(n);
const fmtShort = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtMoney = (n: number | null) =>
  n == null ? "$—" : `$${n.toFixed(2)}`;

/* ───────────────────────────────────────────────────────────
   Mock data (safe to delete when wiring to live state)
   ─────────────────────────────────────────────────────────── */
const MOCK: GapRow[] = [
  { id: "k1", keyword: "ai content generator",       intent: "commercial",    volume: 3400, kd: 28, cpc: 3.9 },
  { id: "k2", keyword: "seo audit tool",             intent: "commercial",    volume: 2900, kd: 32, cpc: 4.2 },
  { id: "k3", keyword: "seo trends 2025",            intent: "informational", volume: 5400, kd: 44, cpc: 2.1 },
  { id: "k4", keyword: "local seo checklist",        intent: "informational", volume: 1800, kd: 22, cpc: 1.8 },
  { id: "k5", keyword: "best backlink app",          intent: "transactional", volume: 1600, kd: 62, cpc: 1.1 },
  { id: "k6", keyword: "technical seo steps",        intent: "informational", volume: 2600, kd: 35, cpc: 0.0 },
  { id: "k7", keyword: "keyword clustering tool",    intent: "commercial",    volume: 2200, kd: 41, cpc: 6.3 },
  { id: "k8", keyword: "on-page seo template",       intent: "informational", volume: 1300, kd: 27, cpc: 2.2 },
  { id: "k9", keyword: "seo content brief generator",intent: "commercial",    volume: 1100, kd: 31, cpc: 5.0 },
  { id: "k10",keyword: "backlink audit app",         intent: "transactional", volume: 1500, kd: 58, cpc: 1.0 },
  { id: "k11",keyword: "site links meaning",         intent: "navigational",  volume: 900,  kd: 19, cpc: 0.7 },
  { id: "k12",keyword: "free serp checker",          intent: "informational", volume: 4800, kd: 38, cpc: 0.0 },
  { id: "k13",keyword: "rank tracker alternative",   intent: "commercial",    volume: 1750, kd: 36, cpc: 2.9 },
  { id: "k14",keyword: "schema markup tutorial",     intent: "informational", volume: 2000, kd: 29, cpc: 1.6 },
  { id: "k15",keyword: "seo migration checklist",    intent: "transactional", volume: 1250, kd: 46, cpc: 3.4 },
  { id: "k16",keyword: "keyword gap analysis",       intent: "informational", volume: 4400, kd: 26, cpc: 3.1 },
  { id: "k17",keyword: "optimize core web vitals",   intent: "informational", volume: 3900, kd: 57, cpc: 4.8 },
  { id: "k18",keyword: "best ai seo tools",          intent: "commercial",    volume: 5200, kd: 43, cpc: 7.2 },
  { id: "k19",keyword: "ecommerce seo audit",        intent: "transactional", volume: 1400, kd: 52, cpc: 3.9 },
  { id: "k20",keyword: "google paa optimization",    intent: "informational", volume: 1050, kd: 24, cpc: 0.0 },
];

/* ───────────────────────────────────────────────────────────
   Utility – normalize CPC into bubble radius (ZAxis)
   ─────────────────────────────────────────────────────────── */
function buildZRange(filtered: GapRow[]) {
  // Recharts ZAxis uses pixel *area* scaling; range values are "bubble area"
  // We'll keep sizes readable across devices.
  const minArea = 40;
  const maxArea = 460;
  // If all CPC are null/0, default range still works; we treat null as 0.
  return [minArea, maxArea] as const;
}

function toPoints(rows: GapRow[]) {
  // Attach visual props (color, opacity, z fallback)
  return rows.map((r) => ({
    ...r,
    x: Math.max(1, r.volume),               // avoid 0 volume on log scale
    y: r.kd ?? -1,                          // treat missing KD as -1 (filtered later)
    z: Math.max(0, r.cpc ?? 0),             // CPC as bubble area driver
    color: INTENT_META[r.intent].color,
    missingCpc: r.cpc == null || r.cpc === 0,
    missingKd: r.kd == null,
  }));
}

/* ───────────────────────────────────────────────────────────
   Custom bubble shape (hover glow + stroke)
   ─────────────────────────────────────────────────────────── */
function BubbleShape(props: any) {
  const {
    cx, cy, size, fill, payload, hoveredId,
  } = props;
  // Recharts sets "size" ~ bubble area. Convert to radius:
  const radius = Math.sqrt(size / Math.PI);
  const isHovered = hoveredId && hoveredId === payload.id;
  const strokeW = isHovered ? 2.5 : 1.2;
  const glowRadius = isHovered ? radius + 5 : 0;

  return (
    <g>
      {isHovered && glowRadius > 0 && (
        <circle cx={cx} cy={cy} r={glowRadius} fill={fill} opacity={0.15} />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        opacity={payload.missingKd ? 0.35 : payload.missingCpc ? 0.6 : 0.9}
        stroke="#111827"
        strokeOpacity={0.2}
        strokeWidth={strokeW}
      />
    </g>
  );
}

/* ───────────────────────────────────────────────────────────
   Tooltip content
   ─────────────────────────────────────────────────────────── */
function BubbleTooltip({
  active, payload, label, onTrack, onTask,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  onTrack: (row: GapRow) => void;
  onTask:  (row: GapRow) => void;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload as GapRow & { missingCpc: boolean };

  return (
    <div className="rounded-lg border bg-white p-3 shadow-md text-sm"
         style={{ borderColor: TK.border }}>
      <div className="font-medium mb-1 truncate max-w-[260px]">{p.keyword}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="text-muted-foreground">Volume</div>
        <div className="text-right">{fmtNum(p.volume)}</div>

        <div className="text-muted-foreground">Difficulty</div>
        <div className="text-right">{p.kd == null ? "—" : p.kd}</div>

        <div className="text-muted-foreground">CPC</div>
        <div className="text-right">
          {p.cpc == null || p.cpc === 0 ? (
            <span className="text-muted-foreground">$0.00 (N/A)</span>
          ) : fmtMoney(p.cpc)}
        </div>

        <div className="text-muted-foreground">Intent</div>
        <div className="text-right">{INTENT_META[p.intent].label}</div>
      </div>

      <div className="mt-2 flex gap-2">
        <Button size="sm" className="h-7 px-2" style={{ background: TK.brand, color: "#fff" }}
                onClick={() => onTrack(p)}>Track</Button>
        <Button size="sm" variant="outline" className="h-7 px-2"
                onClick={() => onTask(p)}>Task</Button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Main component
   ─────────────────────────────────────────────────────────── */
export default function KG_OpportunityScatter({
  data = MOCK,
  filters,
  onFiltersChange,
  onBubbleClick,
  contextHint,
}: Props) {
  // external-controlled filters (if provided) or internal state
  const [intents, setIntents] = useState<Set<Intent>>(
    filters?.intents ? new Set(filters.intents) : new Set<Intent>(["informational","commercial","transactional","navigational"])
  );
  const [kdRange, setKdRange] = useState<[number, number]>(filters?.kdRange ?? [0, 100]);
  const [volumeMin, setVolumeMin] = useState<number>(filters?.volumeMin ?? 500);
  const [xScale, setXScale] = useState<"linear"|"log">(filters?.xScale ?? "log");

  useEffect(() => {
    if (!filters) return;
    if (filters.intents) setIntents(new Set(filters.intents));
    if (filters.kdRange) setKdRange(filters.kdRange);
    if (typeof filters.volumeMin === "number") setVolumeMin(filters.volumeMin);
    if (filters.xScale) setXScale(filters.xScale);
  }, [filters?.intents, filters?.kdRange, filters?.volumeMin, filters?.xScale]);

  function emitFilters() {
    onFiltersChange?.({
      intents, kdRange, volumeMin, xScale
    });
  }

  // series visibility toggles (legend)
  const [showIntent, setShowIntent] = useState<Record<Intent, boolean>>({
    informational: true, commercial: true, transactional: true, navigational: true
  });

  // hovered bubble state for highlight
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const rows = useMemo(() => toPoints(data), [data]);

  const filtered = useMemo(() => {
    const [kdMin, kdMax] = kdRange;
    return rows.filter((r) => {
      if (!intents.has(r.intent)) return false;
      if (r.volume < volumeMin) return false;
      if (r.kd == null) {
        // spec: KD missing → bubble faded or not shown. We'll show faint bubbles only if kdMin==0
        if (kdMin > 0) return false;
      } else {
        if (r.kd < kdMin || r.kd > kdMax) return false;
      }
      return true;
    });
  }, [rows, intents, kdRange, volumeMin]);

  // group by intent to produce separate series (color legend toggles)
  const grouped = useMemo(() => {
    const map: Record<Intent, typeof filtered> = {
      informational: [], commercial: [], transactional: [], navigational: []
    };
    filtered.forEach((r) => map[r.intent].push(r));
    return map;
  }, [filtered]);

  // X domain (default 100 → max) and ZArea range derived
  const xMin = Math.min(...filtered.map((r) => Math.max(1, r.volume)), 500);
  const xMax = Math.max(500, ...filtered.map((r) => r.volume));
  const zRange = buildZRange(filtered);

  function resetView() {
    setIntents(new Set<Intent>(["informational","commercial","transactional","navigational"]));
    setKdRange([0, 100]);
    setVolumeMin(500);
    setXScale("log");
    setShowIntent({ informational: true, commercial: true, transactional: true, navigational: true });
    setHoveredId(null);
    onFiltersChange?.({
      intents: new Set(["informational","commercial","transactional","navigational"]),
      kdRange: [0,100],
      volumeMin: 500,
      xScale: "log"
    });
  }

  const empty = filtered.length === 0;

  return (
    <section className="w-full py-2 mt-4">
      <Card className="border" style={{ borderColor: TK.border, borderRadius: TK.radius, background: TK.cardBg }}>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Keyword Opportunity Map</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  Bubble plot of <strong>Volume</strong> (X), <strong>Difficulty</strong> (Y), with bubble size as <strong>CPC</strong> and color as <strong>Intent</strong>. Hover for details; click a bubble to open actions.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {contextHint && (
              <span className="ml-1 text-xs text-muted-foreground">{contextHint}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" className="h-8 px-3" onClick={resetView}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Reset View
            </Button>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="pt-3 pb-3 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Intent multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  <Filter className="h-4 w-4" /> Intent <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="text-sm font-medium mb-2">Filter by intent</div>
                <div className="space-y-2">
                  {(Object.keys(INTENT_META) as Intent[]).map((i) => (
                    <label key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ background: INTENT_META[i].color }} />
                        <span className="capitalize">{INTENT_META[i].label}</span>
                      </div>
                      <Checkbox
                        checked={intents.has(i)}
                        onCheckedChange={(v) => {
                          const next = new Set(intents);
                          next.has(i) ? next.delete(i) : next.add(i);
                          setIntents(next);
                          // keep legend toggle in sync
                          setShowIntent(s => ({ ...s, [i]: Boolean(v) }));
                          emitFilters();
                        }}
                      />
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* KD range slider */}
            <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded border bg-white">
              <span className="text-sm text-muted-foreground">Difficulty</span>
              <div className="w-[180px] mx-2">
                <Slider
                  defaultValue={[kdRange[0], kdRange[1]]}
                  value={[kdRange[0], kdRange[1]]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setKdRange([v[0], v[1]] as [number, number]);
                  }}
                  onValueCommit={() => emitFilters()}
                />
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">{kdRange[0]}–{kdRange[1]}</div>
            </div>

            {/* Volume minimum */}
            <div className="inline-flex items-center gap-2 pl-2 pr-2 py-1.5 rounded border bg-white">
              <span className="text-sm text-muted-foreground">Min Volume</span>
              <Input
                className="h-8 w-[110px]"
                type="number"
                min={0}
                value={volumeMin}
                onChange={(e) => setVolumeMin(Math.max(0, Number(e.target.value)))}
                onBlur={emitFilters}
              />
            </div>

            {/* X-axis scale */}
            <div className="inline-flex items-center gap-2 pl-2 pr-2 py-1.5 rounded border bg-white">
              <span className="text-sm text-muted-foreground">X Scale</span>
              <Select value={xScale} onValueChange={(v: any) => { setXScale(v); emitFilters(); }}>
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue placeholder="Scale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="log">Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Click hint */}
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" />
            Click a bubble to open keyword actions (or wire to your drawer).
          </div>
        </CardContent>

        {/* Chart */}
        <CardContent className="p-0">
          <div className="w-full h-[420px] md:h-[360px] sm:h-[300px]">
            {empty ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No keywords match the current filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 18, bottom: 8, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Monthly Volume"
                    tickFormatter={(v) => fmtShort(Number(v))}
                    domain={[xScale === "log" ? Math.max(1, Math.min(100, xMin)) : 0, xMax * 1.1]}
                    scale={xScale}
                    allowDataOverflow
                    label={{ value: "Search Volume", position: "insideBottom", dy: 6 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Difficulty"
                    domain={[0, 100]}
                    label={{ value: "Keyword Difficulty", angle: -90, position: "insideLeft" }}
                  />
                  <ZAxis
                    type="number"
                    dataKey="z"
                    name="CPC"
                    unit="$"
                    range={zRange as any}
                  />
                  <RTooltip
                    cursor={{ stroke: "#94A3B8", strokeDasharray: "4 4" }}
                    content={
                      <BubbleTooltip
                        onTrack={(row) => console.log("Track KW:", row.keyword)}
                        onTask={(row)  => console.log("Create Task for:", row.keyword)}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 12 }}
                    payload={(Object.keys(INTENT_META) as Intent[]).map((k) => ({
                      id: k,
                      value: INTENT_META[k].label,
                      type: "circle",
                      color: INTENT_META[k].color,
                    }))}
                    onClick={(e: any) => {
                      const id = e?.id as Intent;
                      setShowIntent((prev) => ({ ...prev, [id]: !prev[id] }));
                    }}
                  />

                  {/* One Scatter per intent for legend toggling */}
                  {(Object.keys(grouped) as Intent[]).map((i) => (
                    <Scatter
                      key={i}
                      name={INTENT_META[i].label}
                      data={grouped[i]}
                      fill={INTENT_META[i].color}
                      shape={(props) => <BubbleShape {...props} hoveredId={hoveredId} />}
                      onMouseEnter={(_, idx) => {
                        const pt = grouped[i][idx];
                        setHoveredId(pt?.id ?? null);
                      }}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(_, idx) => {
                        const pt = grouped[i][idx];
                        if (!pt) return;
                        onBubbleClick?.(pt);
                        // default demo fallback:
                        if (!onBubbleClick) {
                          console.log("Clicked bubble:", pt.keyword);
                        }
                      }}
                      hide={!showIntent[i]}
                      isAnimationActive={false}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
