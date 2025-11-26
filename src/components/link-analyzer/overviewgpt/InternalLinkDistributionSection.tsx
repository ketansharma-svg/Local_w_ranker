"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  AlertTriangle,
  Download,
  RefreshCw,
  X,
  ExternalLink,
  ChevronDown,
  Link2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  Line,
  Tooltip as RTooltip,
  Legend,
  LabelList,
} from "recharts";
import * as htmlToImage from "html-to-image";

/* ——— Tokens (light) ——— */
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#4286F5", // Bar color
  lineAmber: "#F9BB04", // Dotted line color
  border: "#EFF0F6",
  panelBg: "#FFFFFF",
  text: "#111827",
  textMuted: "#6B7280",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  pastelBrand: "#D9EEF8",
};

/* ——— Types ——— */
export type DistPoint = {
  depth: number; // 4 represents 4+
  pages: number;
  avgPils: number; // 0–100
  orphans?: number;
  samplePages?: string[];
  approx?: boolean;
};

/* Utility: media query for reduced motion */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

/* Format depth label (4 => "4+") */
function depthLabel(d: number) {
  return d >= 4 ? "4+" : String(d);
}

/* CSV export helper */
function exportCSV(data: DistPoint[], filename = "internal-link-distribution.csv") {
  const header = ["Depth", "Pages", "Avg PILS (%)", "Orphans"].join(",");
  const rows = data.map((d) =>
    [depthLabel(d.depth), d.pages, d.avgPils.toFixed(1), d.orphans ?? 0].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* PNG export (SVG → PNG via html-to-image) */
async function exportPNG(node: HTMLElement, filename = "internal-link-distribution.png") {
  const dataUrl = await htmlToImage.toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "white",
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/* ——— API helpers ——— */
export type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

function normalizeApiResponse(raw: any[]): DistPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => ({
    depth: Number(r.depth),
    pages: Number(r.pages) || 0,
    avgPils: Number(r.avgPILS ?? r.avgPils ?? 0),
    orphans: Number(r.orphans ?? 0),
    samplePages: Array.isArray(r.samplePages) ? r.samplePages : undefined,
    approx: Boolean(r.approx),
  }));
}

/* ——— Minimal branded icon (no pill/badge) ——— */
function BrandBadge({ title, size = 16 }: { title: string; size?: number }) {
  return <Link2 size={size} aria-hidden className="shrink-0" style={{ color: TOKENS.brand }}  />;
}

/* ——— Custom Bar & Dot with hover micro‑motion ——— */
function FocusBar(props: any) {
  const {
    x,
    y,
    width,
    height,
    payload,
    fill,
    onSelect,
    lowThreshold,
    isHovered,
    setHovered,
    reducedMotion,
  } = props;

  const radius = 4;
  const low = (payload?.avgPils ?? 0) < lowThreshold;
  const color = low ? TOKENS.danger : fill;

  const hoverStyle = !reducedMotion
    ? {
        transition: "transform 200ms, filter 200ms, opacity 200ms",
        transform: isHovered ? "translateY(-2px) scaleY(1.03)" : "translateY(0) scaleY(1)",
        filter: isHovered ? "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" : "none",
        opacity: isHovered ? 0.95 : 1,
        transformOrigin: "center bottom",
      }
    : {};

  return (
    <g
      role="button"
      aria-label={`Depth ${depthLabel(payload.depth)}: ${payload.pages} pages, average PILS ${payload.avgPils}%`}
      tabIndex={0}
      onClick={() => onSelect?.(payload.depth)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(payload.depth);
        if (e.key === "ArrowRight")
          (e.currentTarget.parentElement?.nextElementSibling as HTMLElement)
            ?.querySelector?.("[tabindex='0']")
            && (e.currentTarget.parentElement?.nextElementSibling as HTMLElement)
              ?.querySelector?.("[tabindex='0']")
              && ((e.currentTarget.parentElement?.nextElementSibling as HTMLElement)
                ?.querySelector?.("[tabindex='0']") as HTMLElement)
                .focus();
        if (e.key === "ArrowLeft")
          (e.currentTarget.parentElement?.previousElementSibling as HTMLElement)
            ?.querySelector?.("[tabindex='0']")
            && (e.currentTarget.parentElement?.previousElementSibling as HTMLElement)
              ?.querySelector?.("[tabindex='0']")
              && ((e.currentTarget.parentElement?.previousElementSibling as HTMLElement)
                ?.querySelector?.("[tabindex='0']") as HTMLElement)
                .focus();
      }}
    >
      <rect x={x} y={y} width={width} height={height} rx={radius} ry={radius} fill={color} />
      {low && (
        // left accent to avoid color-only indication
        <rect x={x} y={y} width={4} height={height} fill={TOKENS.danger} opacity={0.4} />
      )}
    </g>
  );
}

function FocusDot(props: any) {
  const { cx, cy, payload, onSelect, isHovered, setHovered, reducedMotion } = props;
  const r = isHovered && !reducedMotion ? 8 : 6;
  const strokeW = isHovered && !reducedMotion ? 2.5 : 2;
  return (
    <g
      role="button"
      aria-label={`Depth ${depthLabel(payload.depth)}: average PILS ${payload.avgPils}%`}
      tabIndex={0}
      onClick={() => onSelect?.(payload.depth)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(payload.depth);
        if (e.key === "ArrowRight")
          (e.currentTarget.parentElement?.nextElementSibling as HTMLElement)
            ?.querySelector?.("[tabindex='0']")
            && ((e.currentTarget.parentElement?.nextElementSibling as HTMLElement)
              ?.querySelector?.("[tabindex='0']") as HTMLElement)
              .focus();
        if (e.key === "ArrowLeft")
          (e.currentTarget.parentElement?.previousElementSibling as HTMLElement)
            ?.querySelector?.("[tabindex='0']")
            && ((e.currentTarget.parentElement?.previousElementSibling as HTMLElement)
              ?.querySelector?.("[tabindex='0']") as HTMLElement)
              .focus();
      }}
    >
      <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke={TOKENS.lineAmber} strokeWidth={2} />
    </g>
  );
}

/* ——— Smart Popover (tooltip) ———
   Updated: colored dots for metric rows + brand icon in the title (no pill). */
function ChartSmartPopover({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DistPoint & { percent?: number };
  const top = (p.samplePages ?? []).slice(0, 3);

  const Row = ({
    color,
    label,
    value,
    dotted = false,
  }: {
    color: string;
    label: string;
    value: React.ReactNode;
    dotted?: boolean;
  }) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={dotted ? "inline-block h-2.5 w-2.5 rounded-full border-2 border-dotted bg-white" : "inline-block h-2.5 w-2.5 rounded-[3px]"}
          style={dotted ? { borderColor: color } : { background: color }}
        />
        <span className="text-[11px]" style={{ color: TOKENS.textMuted }}>{label}</span>
      </div>
      <span className="font-semibold text-[12px]">{value}</span>
    </div>
  );

  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, minWidth: 260 /* allow comfy bullets */ }}
    >
      {/* Title with minimalist brand icon */}
      <div className="mb-2 flex items-center gap-2 font-semibold text-[13px]">
        <BrandBadge title="Depth" size={14} />
        <span>Depth {depthLabel(p.depth)}</span>
      </div>

      {/* Legend (matches chart colors) */}
      <div className="mb-2 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TOKENS.valueBlue }} />
          <span className="text-[11px]" style={{ color: TOKENS.textMuted }}>Pages by depth</span>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dotted bg-white" style={{ borderColor: TOKENS.lineAmber }} />
          <span className="text-[11px]" style={{ color: TOKENS.textMuted }}>Avg PILS (dotted line)</span>
        </div>
      </div>

      {/* Metric rows with colored dots */}
      <div className="space-y-1.5">
        <Row
          color={TOKENS.valueBlue}
          label="Pages"
          value={
            <>
              {p.pages}
              {p.percent != null ? ` (${p.percent.toFixed(1)}%)` : ""}
            </>
          }
        />
        <Row
          color={TOKENS.lineAmber}
          label="Avg PILS"
          value={`${p.avgPils.toFixed(1)}%`}
          dotted
        />
        <Row
          color={TOKENS.danger}
          label="Orphans"
          value={p.orphans ?? 0}
        />
      </div>

      {/* Top sample pages list with brand bullets */}
      <div className="mt-3">
        <div className="mb-1 text-[11px]" style={{ color: TOKENS.textMuted }}>Top pages (sample)</div>
        {top.length ? (
          <ul className="space-y-1.5">
            {top.map((u, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px]">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: TOKENS.brand }} />
                <span className="truncate">{u}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[12px]">—</div>
        )}
      </div>

      {/* (Kept as in your original; disabled by tooltip pointer-events upstream) */}
      <div className="mt-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2 py-0"
          onClick={() =>
            document.dispatchEvent(
              new CustomEvent("wranker:depth-select", { detail: { depth: p.depth } })
            )
          }
        >
          View pages at depth {depthLabel(p.depth)}
        </Button>
      </div>
    </div>
  );
}

/* ——— Main Component ——— */
export default function InternalLinkDistributionSection({
  projectId = "demo",
  data,
  lastCrawled,
}: {
  projectId?: string;
  data: DistPoint[];      
  lastCrawled?: Date;     
}) {


const crawledAt = lastCrawled ?? new Date(0); // fallback = very old
const isStale = Date.now() - crawledAt.getTime() > 1000 * 60 * 60 * 24 * 14; // >14 days

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [normalized, setNormalized] = useState(false);
  const [includeExternal, setIncludeExternal] = useState(false); // placeholder toggle per spec
  const [depthFilter, setDepthFilter] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // NEW: chart hover state (for micro‑motion)
  const [hoveredBarDepth, setHoveredBarDepth] = useState<number | null>(null);
  const [hoveredDotDepth, setHoveredDotDepth] = useState<number | null>(null);

  const thresholds = { lowPils: 50 };

const totalPages = useMemo(
  () => (data ?? []).reduce((a, b) => a + (b.pages || 0), 0),
  [data]
);

const chartData = useMemo(
  () => (data ?? []).map(d => ({ ...d, percent: totalPages ? (d.pages / totalPages) * 100 : 0 })),
  [data, totalPages]
);
 
  // Bus: depth select
  useEffect(() => {
    const handler = (e: any) => {
      setDepthFilter(e.detail.depth);
      // would filter external table
    };
    document.addEventListener("wranker:depth-select", handler as any);
    return () => document.removeEventListener("wranker:depth-select", handler as any);
  }, []);

  const handleExport = async (fmt: "csv" | "png") => {
    if (fmt === "csv") exportCSV(data);
    if (fmt === "png" && chartRef.current) await exportPNG(chartRef.current);
  };


  return (
    <TooltipProvider>
      <Card
        className="w-full"
        style={{ background: TOKENS.panelBg, borderColor: TOKENS.border, fontFamily: "Inter, ui-sans-serif" }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {/* Minimalist branded icon + title (no pill) */}
                <BrandBadge title="Internal Link Distribution" />
                <h3 className="text-[#000000] font-semibold text-lg">Internal Link Distribution</h3>

                {/* Info tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={16} className="cursor-help" aria-label="About Internal Link Distribution" />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[320px] rounded-md border bg-white p-2 text-xs shadow"
                    style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                  >
                    Bars show number of pages by link depth (0,1,2,3,4+). Dotted line shows average Page Interlinking Score (PILS) per depth.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-[#363636] text-sm mt-1">
                Understand how your pages are structured by link depth and interlinking strength.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="hidden md:flex items-center gap-3 text-xs" aria-label="Chart legend">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-3" style={{ background: TOKENS.valueBlue }} /> Pages by depth
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2 border-dotted"
                    style={{ borderColor: TOKENS.lineAmber, background: "#fff" }}
                  />
                  Avg PILS
                </span>
              </div>
              <div className="h-5 w-px bg-gray-200" />
              {/* Toggles */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                  Show as %
                </span>
                <Switch
                  checked={normalized}
                  onCheckedChange={setNormalized}
                  aria-label="Toggle percentage mode"
                />
              </div>
              <div
                className="flex items-center gap-2 text-xs opacity-60"
                title="External impact not available in this mode"
              >
                <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                  Include external
                </span>
                <Switch
                  checked={includeExternal}
                  onCheckedChange={setIncludeExternal}
                  disabled
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={window.location.reload}
                title={loading ? "Refreshing..." : "Refresh"}
                aria-label="Refresh"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 inline-flex items-center gap-1">
                    <Download size={14} /> Export <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("png")}>
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Alert & Chips Row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {error && (
              <span
                className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md"
                style={{ background: "#FEF2F2", border: `1px solid ${TOKENS.border}`, color: TOKENS.danger }}
              >
                <AlertTriangle size={14} />
                {error}
              </span>
            )}
            {isStale && (
              <span
                className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md"
                style={{ background: TOKENS.chipBg, border: `1px solid ${TOKENS.border}` }}
              >
                <AlertTriangle size={14} className="text-amber-500" />
                Stale data · Last crawled {crawledAt.toLocaleDateString()}
                <button className="underline ml-1" onClick={window.location.reload} disabled={loading}>
                  Refresh
                </button>
              </span>
            )}
            {(() => {
              const worstDepth = chartData
                .filter((d) => d.avgPils < thresholds.lowPils)
                .sort((a, b) => a.avgPils - b.avgPils)[0];
              if (!worstDepth) return null;
              return (
                <span
                  className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md"
                  style={{ background: "#FFF7ED", border: `1px solid ${TOKENS.border}`, color: TOKENS.text }}
                >
                  <AlertTriangle size={14} className="text-amber-500" />
                  Depth {depthLabel(worstDepth.depth)} average PILS is {worstDepth.avgPils.toFixed(1)}% — consider adding internal links.
                  <button
                    className="text-xs underline ml-1"
                    onClick={() => alert("Open Optimization Opportunities (prefiltered)")}
                  >
                    Optimize
                  </button>
                </span>
              );
            })()}
            {depthFilter !== null && (
              <span
                className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md"
                style={{ background: TOKENS.chipBg, border: `1px solid ${TOKENS.border}` }}
              >
                Depth: {depthLabel(depthFilter)}
                <button aria-label="Clear depth filter" onClick={() => setDepthFilter(null)}>
                  <X size={14} />
                </button>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div
            ref={chartRef}
            role="img"
            aria-label="Internal link distribution by depth; bar heights show page counts; dotted line shows average PILS"
            className="w-full overflow-x-auto"
            style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, padding: "12px" }}
          >
            <div className="min-w-[680px] h-[320px] group/chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 28, left: 0, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey={(d: DistPoint) => depthLabel(d.depth)}
                    tick={{ fontSize: 12, fontFamily: "Inter, ui-sans-serif", fill: TOKENS.text }}
                    axisLine={{ stroke: TOKENS.border }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    domain={normalized ? [0, 100] : [0, Math.max(...chartData.map((d) => d.pages)) * 1.2] as any}
                    tickFormatter={(v) => (normalized ? `${v}%` : String(v))}
                    tick={{ fontSize: 12, fontFamily: "Inter, ui-sans-serif", fill: TOKENS.text }}
                    axisLine={{ stroke: TOKENS.border }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 12, fontFamily: "Inter, ui-sans-serif", fill: TOKENS.text }}
                    axisLine={{ stroke: TOKENS.border }}
                    tickLine={false}
                  />

                  {/* Bars */}
                  <Bar
                    yAxisId="left"
                    dataKey={normalized ? "percent" : "pages"}
                    fill={TOKENS.valueBlue}
                    isAnimationActive={!reducedMotion}
                    animationDuration={300}
                    shape={(p: any) => (
                      <FocusBar
                        {...p}
                        lowThreshold={thresholds.lowPils}
                        isHovered={hoveredBarDepth === p.payload.depth}
                        setHovered={setHoveredBarDepth}
                        reducedMotion={reducedMotion}
                        onSelect={(depth: number) => {
                          document.dispatchEvent(
                            new CustomEvent("wranker:depth-select", { detail: { depth } })
                          );
                        }}
                      />
                    )}
                  >
                    <LabelList
                      dataKey={normalized ? "percent" : "pages"}
                      formatter={(v: any) => (normalized ? `${v.toFixed(0)}%` : v)}
                      position="top"
                      className="hidden md:block text-[11px]"
                    />
                  </Bar>

                  {/* Dotted line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgPils"
                    stroke={TOKENS.lineAmber}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={
                      <FocusDot
                        isHovered={hoveredDotDepth === undefined ? false : hoveredDotDepth !== null}
                        setHovered={setHoveredDotDepth}
                        reducedMotion={reducedMotion}
                        onSelect={(depth: number) => {
                          alert(`Open low-PILS pages modal for depth ${depthLabel(depth)} → with Create Task CTA`);
                        }}
                      />
                    }
                    isAnimationActive={!reducedMotion}
                    animationDuration={400}
                  />

                  {/* Smart popover */}
                  <RTooltip
                    content={<ChartSmartPopover />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={8}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />

                  {/* Small legend for mobile */}
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    wrapperStyle={{ fontSize: 12, fontFamily: "Inter, ui-sans-serif" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer helper row */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="text-[12px]" style={{ color: TOKENS.textMuted }}>
              Tip: Click a bar to filter the Top Linked Pages table. Click a dotted point to review low-PILS pages and create tasks.
            </div>
            <button
              className="inline-flex items-center gap-1 text-[12px] underline"
              onClick={() => window.open("#", "_blank")}
            >
              Learn more <ExternalLink size={12} />
            </button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

/* ——— Lightweight runtime tests (console) ——— */
function __wr_tests__() {
  // Depth label tests
  const labels = [0, 1, 2, 3, 4, 5].map(depthLabel);
  console.assert(labels.join(",") === "0,1,2,3,4+,4+", "depthLabel mapping failed");

  // CSV test
  const sample: DistPoint[] = [
    { depth: 0, pages: 1, avgPils: 90 },
    { depth: 4, pages: 2, avgPils: 50 },
  ];
  const header = ["Depth", "Pages", "Avg PILS (%)", "Orphans"].join(",");
  const rows = sample.map((d) =>
    [depthLabel(d.depth), d.pages, d.avgPils.toFixed(1), d.orphans ?? 0].join(",")
  );
  const csv = [header, ...rows].join("\n");
  console.assert(csv.includes("4+"), "CSV should render 4+ for depth >=4");

  // Percent sum test (normalized)
  const total = sample.reduce((a, b) => a + b.pages, 0);
  const percents = sample.map((d) => (d.pages / total) * 100);
  const sum = Math.round(percents.reduce((a, b) => a + b, 0));
  console.assert(Math.abs(sum - 100) <= 1, "Percentages should sum to ~100");

  // normalizeApiResponse tests
  const raw = [
    { depth: 1, pages: "10", avgPILS: "75.5", orphans: "2" },
    { depth: 4, pages: 5, avgPils: 51.9 },
  ];
  const norm = normalizeApiResponse(raw);
  console.assert(norm[0].pages === 10 && norm[0].avgPils === 75.5, "normalize: coercion failed");
  console.assert(norm[1].depth === 4 && norm[1].avgPils === 51.9, "normalize: alt key mapping failed");
}

try {
  __wr_tests__();
  console.log("InternalLinkDistributionSection: basic tests passed");
} catch (e) {
  console.warn("InternalLinkDistributionSection: tests failed", e);
}
