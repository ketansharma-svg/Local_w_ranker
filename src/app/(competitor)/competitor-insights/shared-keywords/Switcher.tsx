import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell,
  Rectangle,
} from "recharts";

/************************************
 * Quick note
 * - The previous build failed because the canvas expects a **default export** React component to render.
 * - I also removed the external `clsx` dependency by adding a tiny `cx` helper below (avoids missing‑pkg errors).
 * - Added a second demo dataset with edge cases (no bubbles, extra competitors, zeros) to serve as tests.
 ************************************/

/* ------------------------------------------------------------
 * Minimal className joiner (to avoid external deps)
 * ------------------------------------------------------------ */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------
 * Types
 * ------------------------------------------------------------ */
export type AvgRankDatum = {
  domain: string;
  avgRank: number; // lower = better
};

export type SerpFeatureCounts = {
  feature: string; // e.g., "Featured Snippets", "Videos", "Images", "Site Links"
  counts: Record<string, number>; // domain -> count
};

export type BubblePoint = {
  keyword: string;
  volume: number; // x-axis
  cpc: number | null; // used for bubble size (z)
  delta: number; // y-axis: competitor rank - your rank (positive => competitor ahead)
  domain: string; // the domain that outranks you for this keyword
};

export interface SharedKeywordsMiniChartsProps {
  projectDomain: string;
  avgRank: AvgRankDatum[]; // MUST contain project + competitors
  serpFeatures: SerpFeatureCounts[]; // features for project + competitors
  bubblePoints?: BubblePoint[]; // optional—if omitted, bubble chart hides on desktop and tab disabled on mobile
  onFilterByDomain?: (domain: string) => void; // click on avg-rank bar
  onFilterByFeature?: (feature: string, domain?: string) => void; // click on SERP-feature bar
  onBubbleClick?: (point: BubblePoint) => void; // click on bubble
  className?: string;
}

/* ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------ */
const BRAND_BLUE = "#1090D0"; // Wranker primary

// NOTE: These are the same colors already consumed by the other charts via colorMap.
// If you already swapped these for your design tokens, keep them as-is; the fix below
// simply guarantees Chart 1 uses the exact same mapping.
const GRAPHS_PAL: string[] = [
  "#F97066", // coral
  "#3CD856", // green
  "#FDB022", // amber
  "#A78BFA", // purple
  "#22D3EE", // cyan
  "#FF8A4C", // orange
  "#7DD3FC", // sky
];

const FEATURE_ICONS: Record<string, string> = {
  "Featured Snippets": "⭐",
  Videos: "🎥",
  Images: "🖼️",
  "Site Links": "🔗",
};

function formatNum(n: number) {
  return new Intl.NumberFormat().format(n);
}

function formatCurrency(n: number | null) {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

/** Ensures project is always colored brand blue; competitors get the palette above. */
function getDomainColorMap(
  projectDomain: string,
  domains: string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  const others = domains.filter((d) => d !== projectDomain);
  map[projectDomain] = BRAND_BLUE;
  others.forEach((d, i) => {
    map[d] = GRAPHS_PAL[i % GRAPHS_PAL.length];
  });
  return map;
}

/** Collect a unique, stable domain list from data (project first). */
function collectDomains(
  projectDomain: string,
  avgRank: AvgRankDatum[],
  serpFeatures: SerpFeatureCounts[]
) {
  const set = new Set<string>();
  avgRank.forEach((r) => set.add(r.domain));
  serpFeatures.forEach((row) => {
    Object.keys(row.counts).forEach((d) => set.add(d));
  });
  return [projectDomain, ...Array.from(set).filter((d) => d !== projectDomain)];
}

/* ------------------------------------------------------------
 * Custom Tooltips (smart)
 * ------------------------------------------------------------ */
const PanelTooltip = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md">
    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </div>
    <div className="text-[13px] leading-snug text-slate-800">{children}</div>
  </div>
);

/** Avg Rank tooltip */
function AvgRankTooltipContent(
  projectDomain: string,
  active?: boolean,
  payload?: any[]
) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload as AvgRankDatum;
  const your = payload.find((x) => x.payload.domain === projectDomain)
    ?.payload as AvgRankDatum | undefined;

  const youVal = your?.avgRank ?? NaN;
  const otherVal = p.avgRank;
  const diff = Math.abs(otherVal - youVal);
  const trailing = otherVal < youVal; // lower rank is better
  const msg =
    p.domain === projectDomain
      ? `Your avg rank: ${youVal.toFixed(1)}`
      : `Your avg rank: ${isFinite(youVal) ? youVal.toFixed(1) : "—"} — ${p.domain}: ${otherVal.toFixed(1)} (${trailing ? "you trail by" : "you lead by"} ${diff.toFixed(1)})`;

  return (
    <PanelTooltip title="Avg. Rank Position">
      <div className="flex items-center gap-2">
        <span className="font-medium">{p.domain}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">
          {otherVal.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 text-[12px] text-slate-600">{msg}</div>
      <div className="mt-1 text-[11px] text-slate-400">
        Lower is better (1 = best).
      </div>
    </PanelTooltip>
  );
}

/** SERP Features tooltip */
function SerpFeatureTooltipContent(
  projectDomain: string,
  domainOrder: string[],
  active?: boolean,
  label?: any,
  payload?: any[]
) {
  if (!active || !payload || !payload.length) return null;
  const feature = label as string; // label is feature
  const youBar = payload.find((p) => p.dataKey === projectDomain);
  const youCount = youBar?.value ?? 0;

  return (
    <PanelTooltip title={`${FEATURE_ICONS[feature] ?? ""} ${feature}`}>
      <div className="flex flex-col gap-1 text-[12px]">
        {domainOrder.map((d) => {
          const item = payload.find((p) => p.dataKey === d);
          const val = item?.value ?? 0;
          const isYou = d === projectDomain;
          return (
            <div key={d} className="flex items-center justify-between gap-3">
              <span
                className={cx("truncate", isYou ? "font-semibold" : "font-medium")}
              >
                {isYou ? "You" : d}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5">{val}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{`You: ${youCount} · Click any bar to filter the table by ${feature}.`}</div>
    </PanelTooltip>
  );
}

/** Bubble tooltip */
function BubbleTooltipContent(active?: boolean, payload?: any[]) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload as BubblePoint;
  const trailingMsg =
    p.delta > 0
      ? `You trail by ${Math.abs(p.delta)}`
      : p.delta < 0
      ? `You lead by ${Math.abs(p.delta)}`
      : "Same rank";
  return (
    <PanelTooltip title="Opportunity Bubble">
      <div className="text-[12px]">
        <div className="mb-1 font-medium">
          Keyword: <span className="text-slate-800">{p.keyword}</span>
        </div>
        <div>
          Volume: <span className="font-medium">{formatNum(p.volume)}</span>
        </div>
        <div>
          CPC: <span className="font-medium">{formatCurrency(p.cpc)}</span>
        </div>
        <div className="mt-1">
          Domain ahead: <span className="font-medium">{p.domain}</span>
        </div>
        <div className="text-slate-600">{trailingMsg} positions.</div>
      </div>
    </PanelTooltip>
  );
}

/* ------------------------------------------------------------
 * Custom shape for Chart 1 to enforce per-domain colors
 * (keeps visual identical, just guarantees colors apply)
 * ------------------------------------------------------------ */
type RoundedRightBarProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index?: number;
  payload: AvgRankDatum & { __color?: string };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  radius?: number; // end-cap radius (px)
};

const RoundedRightBar: React.FC<RoundedRightBarProps> = ({
  x,
  y,
  width,
  height,
  payload,
  fill,
  stroke = "transparent",
  strokeWidth = 0,
  opacity = 1,
  radius = 6,
}) => {
  // Use the mapped color from payload (set in parent) or fallback fill.
  const color = (payload as any).__color || fill || "#1090D0";
  const r = Math.max(0, Math.min(radius, Math.min(Math.abs(width) / 2, height / 2)));

  // Horizontal bar with right-side rounded caps only (base left is flat)
  const path = `
    M ${x},${y}
    H ${x + width - r}
    A ${r},${r} 0 0 1 ${x + width},${y + r}
    V ${y + height - r}
    A ${r},${r} 0 0 1 ${x + width - r},${y + height}
    H ${x}
    Z
  `;

  return (
    <path
      d={path}
      fill={color}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
    />
  );
};

/* ------------------------------------------------------------
 * Main Component
 * ------------------------------------------------------------ */
export const SharedKeywordsMiniCharts: React.FC<SharedKeywordsMiniChartsProps> = ({
  projectDomain,
  avgRank,
  serpFeatures,
  bubblePoints,
  onFilterByDomain,
  onFilterByFeature,
  onBubbleClick,
  className,
}) => {
  // domains (project first, then competitors found in data)
  const domains = React.useMemo(
    () => collectDomains(projectDomain, avgRank, serpFeatures),
    [projectDomain, avgRank, serpFeatures]
  );
  const colorMap = React.useMemo(
    () => getDomainColorMap(projectDomain, domains),
    [projectDomain, domains]
  );

  // --- Avg Rank chart prep
  const sortedAvg = React.useMemo(
    () => [...avgRank].sort((a, b) => a.avgRank - b.avgRank),
    [avgRank]
  );
  const lowest = React.useMemo(
    () =>
      sortedAvg.reduce(
        (min, r) => (r.avgRank < min ? r.avgRank : min),
        Number.POSITIVE_INFINITY
      ),
    [sortedAvg]
  );

  // For Chart 1: attach per-datum color so the custom shape can read it reliably
  const avgWithColor = React.useMemo(
    () =>
      sortedAvg.map((d) => ({
        ...d,
        __color: colorMap[d.domain],
      })),
    [sortedAvg, colorMap]
  );

  // --- SERP features grouped data
  const serpRows = React.useMemo(() => {
    return serpFeatures.map((row) => {
      const obj: Record<string, any> = { feature: row.feature };
      domains.forEach((d) => {
        obj[d] = row.counts[d] ?? 0;
      });
      return obj;
    });
  }, [serpFeatures, domains]);

  // --- Bubble plot data grouped by domain
  const bubbleByDomain = React.useMemo(() => {
    const map: Record<string, BubblePoint[]> = {};
    (bubblePoints ?? []).forEach((p) => {
      (map[p.domain] = map[p.domain] || []).push(p);
    });
    return map;
  }, [bubblePoints]);

  // --- Hover state for subtle bar "lift"
  const [hoverAvgIndex, setHoverAvgIndex] = React.useState<number | null>(null);
  const [hoverFeature, setHoverFeature] = React.useState<{
    feature: string;
    domain: string;
  } | null>(null);

  // --- Mobile tab
  const hasBubble = (bubblePoints?.length ?? 0) > 0;
  type TabKey = "rank" | "serp" | "bubble";
  const [mobileTab, setMobileTab] = React.useState<TabKey>("rank");
  React.useEffect(() => {
    if (!hasBubble && mobileTab === "bubble") setMobileTab("rank");
  }, [hasBubble, mobileTab]);

  return (
    <section
      className={cx("mt-6 space-y-4 sm:space-y-5", className)}
      aria-label="Keyword Performance Visualization"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          📊 Keyword Performance Visualization
        </h3>
      </div>

      {/* Mobile tab switcher */}
      <div className="md:hidden">
        <div className="mb-3 flex items-center gap-2">
          {(["rank", "serp", "bubble"] as TabKey[]).map((key) => {
            if (key === "bubble" && !hasBubble) return null;
            const label =
              key === "rank"
                ? "Avg. Rank"
                : key === "serp"
                ? "SERP Features"
                : "Value Bubbles";
            return (
              <button
                key={key}
                onClick={() => setMobileTab(key)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm",
                  mobileTab === key
                    ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Chart 1: Avg. Rank Position (Horizontal Bar) --- */}
      <div
        className={cx(
          "rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200",
          "md:block",
          mobileTab !== "rank" ? "hidden md:block" : ""
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">
            Avg. Rank Position (lower is better)
          </div>
          <div className="text-xs text-slate-500">Blue = your project</div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer>
            {/* IMPORTANT: pass avgWithColor so the shape can read __color */}
            <BarChart
              data={avgWithColor}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 80 }}
              barCategoryGap={18}
            >
              <CartesianGrid stroke="#EEF2F7" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, "dataMax + 2"]}
                tick={{ fontSize: 11, fill: "#64748B" }}
              />
              <YAxis
                type="category"
                dataKey="domain"
                tick={{ fontSize: 12, fill: "#334155" }}
                width={100}
              />
              <RTooltip
                cursor={{ fill: "rgba(16,144,208,0.06)" }}
                content={({ active, payload }) =>
                  AvgRankTooltipContent(projectDomain, active, payload as any[])
                }
              />
              <defs>
                {/* subtle glow on hover (same look, just defined once) */}
                <filter id="wr-hover-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <Bar
                dataKey="avgRank"
                isAnimationActive
                animationDuration={500}
                // Use custom shape to FORCE per-domain colors on each bar
                shape={(props: any) => {
                  const isBest = props?.payload?.avgRank === lowest;
                  const idx = props?.index as number;
                  return (
                    <RoundedRightBar
                      {...props}
                      radius={6}
                      stroke={isBest ? props?.payload?.__color : "transparent"}
                      strokeWidth={isBest ? 2 : 0}
                      opacity={
                        hoverAvgIndex === null ? 1 : hoverAvgIndex === idx ? 1 : 0.85
                      }
                    />
                  );
                }}
                onMouseEnter={(_, idx) => setHoverAvgIndex(idx)}
                onMouseLeave={() => setHoverAvgIndex(null)}
                onClick={(_, idx) => {
                  const domain = avgWithColor[idx]?.domain;
                  if (domain && onFilterByDomain) onFilterByDomain(domain);
                }}
              >
                <LabelList
                  dataKey="avgRank"
                  position="right"
                  formatter={(v: number) => v.toFixed(1)}
                  style={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Chart 2: SERP Feature Distribution (Grouped Bars) --- */}
      <div
        className={cx(
          "rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200",
          "md:block",
          mobileTab !== "serp" ? "hidden md:block" : ""
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">
            SERP Feature Presence (counts on shared keywords)
          </div>
          <div className="text-xs text-slate-500">
            Hover to compare · Click bar to filter the table
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <BarChart data={serpRows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} barGap={6}>
              <CartesianGrid stroke="#EEF2F7" vertical={false} />
              <XAxis
                dataKey="feature"
                tickFormatter={(f) => `${FEATURE_ICONS[f] ?? ""} ${f}`}
                tick={{ fontSize: 11, fill: "#64748B" }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <RTooltip
                cursor={{ fill: "rgba(16,144,208,0.06)" }}
                content={({ active, payload, label }) =>
                  SerpFeatureTooltipContent(projectDomain, domains, active, label, payload as any[])
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => (value === projectDomain ? "You" : value)} />
              {domains.map((d) => (
                <Bar
                  key={d}
                  dataKey={d}
                  name={d}
                  fill={colorMap[d]}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive
                  animationDuration={500}
                  onMouseEnter={() => setHoverFeature({ feature: "", domain: d })}
                  onMouseLeave={() => setHoverFeature(null)}
                  onClick={(data: any) => {
                    if (onFilterByFeature) onFilterByFeature((data?.feature as string) ?? "", d);
                  }}
                >
                  {serpRows.map((row) => (
                    <Cell
                      key={`${d}-${row.feature}`}
                      className="cursor-pointer"
                      opacity={!hoverFeature ? 1 : hoverFeature.domain === d ? 1 : 0.85}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Chart 3: Bubble Plot (Optional) --- */}
      {(bubblePoints?.length ?? 0) > 0 && (
        <div
          className={cx(
            "rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200",
            "md:block",
            mobileTab !== "bubble" ? "hidden md:block" : ""
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">
              Value Opportunity — Volume vs CPC vs Rank Gap
            </div>
            <div className="text-xs text-slate-500">
              Bubble size = CPC · Y = (competitor rank – your rank)
            </div>
          </div>
          <div className="h-[360px] w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#EEF2F7" />
                <XAxis
                  dataKey="volume"
                  name="Search Volume"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(n) => formatNum(n as number)}
                  label={{
                    value: "Search Volume",
                    position: "bottom",
                    offset: -2,
                    fontSize: 12,
                    fill: "#475569",
                  }}
                  type="number"
                />
                <YAxis
                  dataKey="delta"
                  name="Rank Delta"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  label={{
                    value: "Rank Δ (competitor – you)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fontSize: 12,
                    fill: "#475569",
                  }}
                  type="number"
                />
                <ZAxis dataKey="cpc" range={[80, 400]} />
                <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 4" />
                <RTooltip content={({ active, payload }) => BubbleTooltipContent(active, payload as any[])} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.keys(bubbleByDomain).map((d) => (
                  <Scatter
                    key={d}
                    name={d === projectDomain ? "You" : d}
                    data={bubbleByDomain[d]}
                    fill={colorMap[d]}
                    opacity={d === projectDomain ? 0.9 : 0.95}
                    shape="circle"
                    isAnimationActive
                    animationDuration={500}
                    onClick={(p: any) => {
                      const point = p?.payload as BubblePoint;
                      if (onBubbleClick) onBubbleClick(point);
                    }}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Tip: **Above 0** = competitor outranks you; **below 0** = you outrank them. Click a bubble to jump to Keyword Analyzer / create a task.
          </div>
        </div>
      )}
    </section>
  );
};

/* ------------------------------------------------------------
 * Demos (act as test cases)
 * ------------------------------------------------------------ */
export const DemoSharedKeywordsMiniCharts = () => {
  const project = "wranker.com";
  const avgRank: AvgRankDatum[] = [
    { domain: "comp1.com", avgRank: 8.9 },
    { domain: project, avgRank: 12.1 },
    { domain: "comp2.com", avgRank: 10.4 },
  ];
  const serp: SerpFeatureCounts[] = [
    {
      feature: "Featured Snippets",
      counts: { [project]: 8, "comp1.com": 15, "comp2.com": 10 },
    },
    { feature: "Videos", counts: { [project]: 1, "comp1.com": 5, "comp2.com": 4 } },
    { feature: "Images", counts: { [project]: 6, "comp1.com": 7, "comp2.com": 6 } },
    { feature: "Site Links", counts: { [project]: 12, "comp1.com": 11, "comp2.com": 9 } },
  ];
  const bubbles: BubblePoint[] = [
    { keyword: "seo checklist", volume: 3200, cpc: 2.9, delta: 5, domain: "comp1.com" },
    { keyword: "ai content tools", volume: 2100, cpc: 3.6, delta: -2, domain: "comp2.com" },
    { keyword: "local seo", volume: 5600, cpc: 4.1, delta: 1, domain: "comp1.com" },
    { keyword: "seo audit", volume: 1900, cpc: 5.0, delta: -3, domain: "comp2.com" },
  ];

  return (
    <div className="p-4 border rounded-2xl">
      <SharedKeywordsMiniCharts
        projectDomain={project}
        avgRank={avgRank}
        serpFeatures={serp}
        bubblePoints={bubbles}
        onFilterByDomain={(d) => console.log("Filter table by domain:", d)}
        onFilterByFeature={(f, d) =>
          console.log("Filter table by feature+domain:", f, d)
        }
        onBubbleClick={(p) => console.log("Open Analyzer / Task for:", p.keyword)}
      />
    </div>
  );
};

// Edge‑case demo — no bubble points, more competitors, zeros in SERP counts
export const DemoSharedKeywordsMiniCharts_Edge = () => {
  const project = "wranker.com";
  const avgRank: AvgRankDatum[] = [
    { domain: project, avgRank: 9.5 },
    { domain: "mega-competitor.example", avgRank: 7.2 },
    { domain: "comp1.com", avgRank: 12.3 },
    { domain: "comp2.com", avgRank: 13.8 },
  ];
  const serp: SerpFeatureCounts[] = [
    {
      feature: "Featured Snippets",
      counts: {
        [project]: 0,
        "mega-competitor.example": 2,
        "comp1.com": 0,
        "comp2.com": 1,
      },
    },
    {
      feature: "Videos",
      counts: {
        [project]: 0,
        "mega-competitor.example": 0,
        "comp1.com": 1,
        "comp2.com": 0,
      },
    },
    {
      feature: "Images",
      counts: {
        [project]: 4,
        "mega-competitor.example": 3,
        "comp1.com": 0,
        "comp2.com": 0,
      },
    },
    {
      feature: "Site Links",
      counts: {
        [project]: 8,
        "mega-competitor.example": 10,
        "comp1.com": 2,
        "comp2.com": 0,
      },
    },
  ];

  return (
    <div className="p-4">
      <SharedKeywordsMiniCharts
        projectDomain={project}
        avgRank={avgRank}
        serpFeatures={serp}
        onFilterByDomain={(d) => console.log("[Edge] Filter table by domain:", d)}
        onFilterByFeature={(f, d) =>
          console.log("[Edge] Filter table by feature+domain:", f, d)
        }
      />
    </div>
  );
};

/* ------------------------------------------------------------
 * Default export (so the canvas can render)
 * ------------------------------------------------------------ */
const DemoSwitcher: React.FC = () => {
  const [mode, setMode] = React.useState<"base" | "edge">("base");
  return (
    <div className="py-4 mt-4">
      <div className="mb-3 flex gap-2 ml-4">
        <button
          className={cx(
            "rounded px-3 py-1 text-sm ring-1 cursor-pointer",
            mode === "base"
              ? "bg-sky-50 text-sky-700 ring-sky-200"
              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
          )}
          onClick={() => setMode("base")}
        >
          Base Demo
        </button>
        <button
          className={cx(
            "rounded px-3 py-1 text-sm ring-1 cursor-pointer",
            mode === "edge"
              ? "bg-sky-50 text-sky-700 ring-sky-200"
              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
          )}
          onClick={() => setMode("edge")}
        >
          Edge Cases
        </button>
      </div>
      {mode === "base" ? <DemoSharedKeywordsMiniCharts /> : <DemoSharedKeywordsMiniCharts_Edge />}
    </div>
  );
};

export default DemoSwitcher;
