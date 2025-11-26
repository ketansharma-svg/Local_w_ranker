import React, { useMemo, useRef, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from "recharts";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import DemoLinkInterlinkingDrawer from "./drawers/DemoLinkInterlinking";
/**
 * Wranker – Section 3: Radar Chart – SEO Signal Spread
 * Demo-ready TSX + Tailwind component
 *
 * Dependencies:
 *   npm i recharts html-to-image jspdf
 *
 * Notes:
 * - Expects normalized metric values in [0..100] (Page Speed already normalized).
 * - Shows up to 3 entities (project + 2 competitors).
 * - On mobile: chart height reduces, legend stacks.
 * - Export: PNG/JPG (chart-only or full card) and PDF (full section with title + legend).
 */

/* ---------- Types ---------- */

type MetricKey =
  | "technical"
  | "onPage"
  | "backlinkAuthority"
  | "contentDepth"
  | "internalLinking"
  | "pageSpeed";

type MetricDef = {
  key: MetricKey;
  label: string;
  unit?: string; // used in tooltip (ex: "words", "s")
  description?: string;
  invert?: boolean; // not used here but reserved if you want to invert a score
};

type Series = {
  /** unique key used in the chart dataset */
  key: string;
  /** label as shown in legend (domain name) */
  label: string;
  /** hex color used for line/fill/dot */
  color: string;
  /** mark the project (used for deltas and ordering) */
  isProject?: boolean;
  /** values per metricKey (0..100) - null denotes missing */
  values: Partial<Record<MetricKey, number | null>>;
};

type Benchmark = Partial<Record<MetricKey, number>>;

type MetricSet = "all" | "technicalFocus" | "contentFocus" | "custom";

type Props = {
  title?: string;
  projectLabel?: string; // e.g., "wranker.com"
  /** first series MUST be the project for delta logic to compute against */
  series: Series[]; // up to 3 series
  benchmark?: Benchmark; // optional dashed benchmark polygon
  /** initial metric set */
  defaultMetricSet?: MetricSet;
  /** only used for `custom` view (Pro): which metrics to show */
  customMetrics?: MetricKey[];
  /** Pro flag to unlock embed + custom metrics */
  pro?: boolean;
};

/* ---------- Constants ---------- */

const METRICS: MetricDef[] = [
  { key: "technical", label: "Technical Health" },
  { key: "onPage", label: "On-page Optimization" },
  { key: "backlinkAuthority", label: "Backlink Authority" },
  { key: "contentDepth", label: "Content Depth", unit: "words" },
  { key: "internalLinking", label: "Internal Linking" },
  { key: "pageSpeed", label: "Page Speed" },
];

const METRIC_SETS: Record<Exclude<MetricSet, "custom">, MetricKey[]> = {
  all: [
    "technical",
    "onPage",
    "backlinkAuthority",
    "contentDepth",
    "internalLinking",
    "pageSpeed",
  ],
  technicalFocus: ["technical", "pageSpeed", "internalLinking"],
  contentFocus: ["contentDepth", "onPage", "internalLinking"],
};

const COLORS = {
  project: "#1090D0", // 🔵
  compGreen: "#22C55E", // 🟢
  compPurple: "#8B5CF6", // 🟣
  grid: "#E5E7EB",
  text: "#1F2937",
  faint: "#9CA3AF",
};

/* ---------- Utilities ---------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toLabel(key: MetricKey) {
  return METRICS.find((m) => m.key === key)?.label ?? key;
}

function unitFor(key: MetricKey) {
  return METRICS.find((m) => m.key === key)?.unit;
}

function hasMissingForSeries(s: Series, keys: MetricKey[]) {
  return keys.some((k) => s.values[k] == null);
}

/* ---------- Custom Tooltip ---------- */

const RadarTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string; // metric label
  metricKey?: MetricKey;
  series: Series[];
  projectKey?: string;
}> = ({ active, payload, label, metricKey, series, projectKey }) => {
  if (!active || !payload || payload.length === 0 || !metricKey) return null;
  const unit = unitFor(metricKey);
  const project = series.find((s) => s.key === projectKey);
  const pVal = project?.values?.[metricKey] ?? null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="mb-1 text-xs font-semibold text-gray-700">{label}</div>
      <div className="space-y-1">
        {series.map((s) => {
          const val = s.values[metricKey];
          const displayVal = val == null ? "—" : `${val}`;
          const delta =
            pVal == null || val == null ? null : Math.round((val - pVal) * 10) / 10;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="font-medium text-gray-800">{s.label}</span>
              <span className="text-gray-600">
                {displayVal}
                {unit ? ` ${unit}` : ""}
              </span>
              {delta != null && s.key !== projectKey && (
                <span className={delta >= 0 ? "text-green-600" : "text-red-600"}>
                  {delta >= 0 ? `(+${delta})` : `(${delta})`} vs {project?.label}
                </span>
              )}
              {val == null && <span className="text-gray-400">(no data)</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- Component ---------- */

export const RadarSeoSignalCard: React.FC<Props> = ({
  title = "🕸️ SEO Signal Distribution",
  projectLabel = "wranker.com",
  series,
  benchmark,
  defaultMetricSet = "all",
  customMetrics,
  pro = false,
}) => {
  // Ensure we only render up to 3 series for clarity
  const visibleSeries = useMemo(
    () => series.slice(0, 3),
    [series]
  );

  // The first is assumed to be the project (baseline)
  const project = visibleSeries.find((s) => s.isProject) ?? visibleSeries[0];
  const projectKey = project?.key;

  const [metricSet, setMetricSet] = useState<MetricSet>(defaultMetricSet);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(!!benchmark);
  const [deltaMode, setDeltaMode] = useState<boolean>(false);
  const [hoveredLegendKey, setHoveredLegendKey] = useState<string | null>(null);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [includeLegendForExport, setIncludeLegendForExport] = useState<boolean>(true);
  const [showEmbed, setShowEmbed] = useState<boolean>(false);

  // derived metric keys to show
  const metricKeys = useMemo<MetricKey[]>(() => {
    if (metricSet === "custom") {
      return pro && customMetrics?.length ? customMetrics : METRIC_SETS["all"];
    }
    return METRIC_SETS[metricSet];
  }, [metricSet, pro, customMetrics]);

  // Build chart rows: { metricLabel, metricKey, <seriesKey>: value }
  const chartData = useMemo(() => {
    // If deltaMode: we show domain = [0..200], project baseline @100
    if (deltaMode && projectKey) {
      return metricKeys.map((mk) => {
        const baseline = project?.values[mk] ?? null;
        const row: Record<string, any> = {
          metricLabel: toLabel(mk),
          metricKey: mk,
        };
        visibleSeries.forEach((s) => {
          const val = s.values[mk];
          if (baseline == null || val == null) {
            row[s.key] = null;
          } else if (s.key === projectKey) {
            row[s.key] = 100; // baseline
          } else {
            const pct = baseline === 0 ? 0 : ((val - baseline) / baseline) * 100;
            // map to [0..200] where 100 = baseline, >100 = better than baseline
            row[s.key] = clamp(100 + pct, 0, 200);
          }
        });
        if (showBenchmark && benchmark) {
          const b = benchmark[mk];
          row["_benchmark"] =
            baseline == null || b == null
              ? null
              : clamp(100 + ((b - baseline) / baseline) * 100, 0, 200);
        }
        return row;
      });
    }

    // Normal mode: values are already [0..100]
    return metricKeys.map((mk) => {
      const row: Record<string, any> = {
        metricLabel: toLabel(mk),
        metricKey: mk,
      };
      visibleSeries.forEach((s) => {
        const v = s.values[mk];
        row[s.key] = v == null ? null : clamp(v, 0, 100);
      });
      if (showBenchmark && benchmark) {
        const b = benchmark[mk];
        row["_benchmark"] = b == null ? null : clamp(b, 0, 100);
      }
      return row;
    });
  }, [metricKeys, visibleSeries, projectKey, project, showBenchmark, benchmark, deltaMode]);

  // Determine Radar domain
  const radiusDomain = deltaMode ? [0, 200] : [0, 100];

  // chart refs for export
  const cardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  /* ---------- Export helpers ---------- */

  async function exportPNG(chartOnly = true) {
    const node = chartOnly ? chartRef.current : cardRef.current;
    if (!node) return;
    const dataUrl = await htmlToImage.toPng(node, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = chartOnly ? "seo-signal-radar.png" : "seo-signal-radar-section.png";
    link.href = dataUrl;
    link.click();
  }

  async function exportJPG(chartOnly = true) {
    const node = chartOnly ? chartRef.current : cardRef.current;
    if (!node) return;
    const dataUrl = await htmlToImage.toJpeg(node, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      quality: 0.95,
    });
    const link = document.createElement("a");
    link.download = chartOnly ? "seo-signal-radar.jpg" : "seo-signal-radar-section.jpg";
    link.href = dataUrl;
    link.click();
  }

  async function exportPDF() {
    if (!cardRef.current) return;
    const dataUrl = await htmlToImage.toPng(cardRef.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    // scale image to fit A4 width with margin
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 24;
    const imgW = pageW - margin * 2;
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res) => (img.onload = res));
    const ratio = img.height / img.width;
    const imgH = imgW * ratio;
    pdf.addImage(dataUrl, "PNG", margin, margin, imgW, imgH);
    pdf.save("seo-signal-radar.pdf");
  }

  /* ---------- Legend / isolate logic ---------- */

  const visibleKeys = visibleSeries
    .filter((s) => !muted[s.key])
    .map((s) => s.key);

  /* ---------- Embed (Pro) ---------- */

  const embedCode = `<iframe src="https://app.wranker.com/embed/radar?project=${encodeURIComponent(
    projectLabel
  )}&set=${"${metricSet}"}" width="560" height="420" frameborder="0"></iframe>`;

  /* ---------- AI Insight summary ---------- */

  const insight = useMemo(() => {
    // strongest/weakest for project vs average of competitors on visible metrics
    const mk = metricKeys;
    if (!project) return null;
    const avgDiffByMetric = mk.map((k) => {
      const p = project.values[k] ?? null;
      if (p == null) return { k, d: -Infinity } as { k: MetricKey; d: number };
      const comps = visibleSeries.filter((s) => s.key !== project.key);
      const valid = comps.map((c) => c.values[k]).filter((v) => v != null) as number[];
      if (!valid.length) return { k, d: 0 } as { k: MetricKey; d: number };
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      return { k, d: p - avg } as { k: MetricKey; d: number }; // positive means project leads
    });
    const strongest = avgDiffByMetric.reduce(
      (a, b) => (b.d > a.d ? b : a),
      { k: mk[0], d: -Infinity } as { k: MetricKey; d: number }
    );
    const weakest = avgDiffByMetric.reduce(
      (a, b) => (b.d < a.d ? b : a),
      { k: mk[0], d: Infinity } as { k: MetricKey; d: number }
    );
    return {
      strongest: toLabel(strongest.k as MetricKey),
      weakest: toLabel(weakest.k as MetricKey),
    };
  }, [metricKeys, visibleSeries, project]);

  /* ---------- Render ---------- */

    const [drawerRow, setDrawerRow] = useState(false);
  
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
            <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
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
// const [openInternalDrawer, setOpenInternalDrawer] = useState(false);

const openDrawer = (metricKey: string) => {
  if (metricKey === "internalLinking") {
    setDrawerRow(true);
  }
};

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-gray-200 bg-[#F5F7FA] md:p-4 mt-4">
                  {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <DemoLinkInterlinkingDrawer />
                    </Drawer>
                  )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">
            Hover legend to isolate a curve • Tooltip shows value & delta vs {projectLabel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Set Switcher */}
          <div className="relative">
            <select
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800"
              value={metricSet}
              onChange={(e) => setMetricSet(e.target.value as MetricSet)}
              aria-label="Metric Set"
              title="Metric Set"
            >
              <option value="all">🔁 Default (All Signals)</option>
              <option value="technicalFocus">🛠️ Technical Focus</option>
              <option value="contentFocus">📝 Content Focus</option>
              <option value="custom" disabled={!pro}>
                ✨ Custom Set {pro ? "" : " (Pro)"}
              </option>
            </select>
          </div>

          {/* Delta mode */}
          <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3 w-3 rounded"
              checked={deltaMode}
              onChange={(e) => setDeltaMode(e.target.checked)}
            />
            Delta overlay
          </label>

          {/* Benchmark */}
          <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3 w-3 rounded"
              checked={showBenchmark}
              onChange={(e) => setShowBenchmark(e.target.checked)}
            />
            Benchmark
          </label>

          {/* Export menu */}
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
              title="Export PNG (chart only)"
              onClick={() => exportPNG(true)}
            >
              📥 PNG
            </button>
            <button
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
              title="Export JPG (chart only)"
              onClick={() => exportJPG(true)}
            >
              JPG
            </button>
            <button
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
              title="Export PDF (section)"
              onClick={exportPDF}
            >
              PDF
            </button>
          </div>

          {/* Export toggle legend */}
          <label className="ml-1 hidden items-center gap-1 text-xs text-gray-700 sm:flex">
            <input
              type="checkbox"
              className="h-3 w-3 rounded"
              checked={includeLegendForExport}
              onChange={(e) => setIncludeLegendForExport(e.target.checked)}
            />
            Include legend in chart export
          </label>

          {/* Embed (Pro) */}
          <button
            className={`rounded-lg border border-gray-300 px-2 py-1 text-xs ${
              pro ? "bg-white text-gray-800 hover:bg-gray-50" : "bg-gray-100 text-gray-400"
            }`}
            title={pro ? "Get embed code" : "Pro only"}
            onClick={() => pro && setShowEmbed(true)}
          >
            ⛓️ Embed
          </button>
        </div>
      </div>

      {/* Chart + Legend */}
      <div
        ref={chartRef}
        className={`mt-4 rounded-xl bg-white p-3 md:p-4 ${
          includeLegendForExport ? "" : "[&_.legend]:hidden"
        }`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)]">
          {/* Chart */}
          <div className="mx-auto h-[320px] w-full md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
              >
                <PolarGrid stroke={COLORS.grid} />
                {/* <PolarAngleAxis
                  dataKey="metricLabel"
                  tick={{
                    fontSize: 12,
                    fill: COLORS.text,
                  }}
                /> */}
<PolarAngleAxis
  dataKey="metricLabel"
  tick={(props) => {
    const { payload, x, y, textAnchor, index } = props;
    const metricKey = chartData[index]?.metricKey;

    const isInternalLinking = metricKey === "internalLinking";

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          textAnchor={textAnchor}
          fontSize={12}
          fill={isInternalLinking ? "#2563EB" : COLORS.text} // blue for Internal Linking
          textDecoration={isInternalLinking ? "underline" : "none"} // underline only for Internal Linking
          cursor={isInternalLinking ? "pointer" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            if (isInternalLinking) {
              openDrawer(metricKey);
            }
          }}
        >
          {payload.value}
        </text>
      </g>
    );
  }}
/>



                <PolarRadiusAxis
                  tick={{ fontSize: 10, fill: COLORS.faint }}
                  domain={radiusDomain as [number, number]}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    deltaMode ? `${"${v - 100}%"}` : `${"${v}"}`
                  }
                />

                {/* Series */}
                {visibleSeries.map((s) => {
                  const isHovered = hoveredLegendKey && hoveredLegendKey === s.key;
                  const isMuted = hoveredLegendKey && hoveredLegendKey !== s.key;
                  const shapeMissing = hasMissingForSeries(s, metricKeys);
                  return (
                    <Radar
                      key={s.key}
                      name={s.label}
                      dataKey={s.key}
                      stroke={s.color}
                      fill={s.color}
                      fillOpacity={isHovered ? 0.35 : 0.2}
                      strokeOpacity={isMuted || muted[s.key] ? 0.25 : 0.9}
                      opacity={isMuted || muted[s.key] ? 0.45 : 1}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      dot={{ r: 2 }}
                      // Dotted when some points missing
                      strokeDasharray={shapeMissing ? "4 3" : undefined}
                      isAnimationActive={false}
                    />
                  );
                })}

                {/* Benchmark polygon */}
                {showBenchmark && benchmark && (
                  <Radar
                    name="Benchmark"
                    dataKey="_benchmark"
                    stroke="#9CA3AF"
                    fill="#9CA3AF"
                    fillOpacity={0.12}
                    strokeOpacity={0.9}
                    strokeDasharray="3 3"
                    dot={{ r: 1 }}
                    isAnimationActive={false}
                  />
                )}

                {/* Tooltip */}
                <ReTooltip
                  content={(props) => (
                    <RadarTooltip
                      {...props}
                      metricKey={(props && (props as any)?.payload?.[0]?.payload?.metricKey) as
                        | MetricKey
                        | undefined}
                      series={visibleSeries}
                      projectKey={projectKey}
                    />
                  )}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="legend mt-2 flex flex-wrap items-center gap-2">
            {visibleSeries.map((s) => {
              const off = !!muted[s.key];
              return (
                <button
                  key={s.key}
                  onMouseEnter={() => setHoveredLegendKey(s.key)}
                  onMouseLeave={() => setHoveredLegendKey(null)}
                  onClick={() =>
                    setMuted((m) => ({ ...m, [s.key]: !m[s.key] }))
                  }
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    off
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-200 bg-white text-gray-800"
                  }`}
                  title={`${off ? "Show" : "Hide"} ${s.label}`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className="font-medium">{s.label}</span>
                  {s.isProject && <span className="text-[10px] text-gray-500">(project)</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Row: helper text & export legend toggle (mobile) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          Legend: hover to highlight • Missing data shows dotted line or “—” in tooltip
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-700 sm:hidden">
          <input
            type="checkbox"
            className="h-3 w-3 rounded"
            checked={includeLegendForExport}
            onChange={(e) => setIncludeLegendForExport(e.target.checked)}
          />
          Include legend in chart export
        </label>
      </div>

      {/* AI Insight Bubble */}
      {insight && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          🤖 AI Insight: You’re strongest in <b>{insight.strongest}</b>, weakest in{" "}
          <b>{insight.weakest}</b>.
        </div>
      )}

      {/* Embed modal (Pro) */}
      {showEmbed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Embed this chart</h4>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowEmbed(false)}
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-600">
              Shareable embed (Pro): paste this <code>&lt;iframe&gt;</code> into your page.
            </p>
            <textarea
              className="h-28 w-full rounded border border-gray-300 bg-gray-50 p-2 text-xs"
              readOnly
              value={embedCode}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs text-gray-800 hover:bg-gray-50"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                }}
              >
                Copy code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Quick Demo ---------- */
/** Drop this anywhere to render a working demo */

export const RadarSeoSignalCardDemo: React.FC = () => {
  const data: Series[] = [
    {
      key: "wranker",
      label: "wranker.com",
      color: COLORS.project,
      isProject: true,
      values: {
        technical: 82,
        onPage: 78,
        backlinkAuthority: 66,
        contentDepth: 68, // normalized; raw "words" can be shown in another UI
        internalLinking: 71,
        pageSpeed: 74,
      },
    },
    {
      key: "comp1",
      label: "competitor1.com",
      color: COLORS.compGreen,
      values: {
        technical: 88,
        onPage: 83,
        backlinkAuthority: 74,
        contentDepth: 72,
        internalLinking: 79,
        pageSpeed: 67,
      },
    },
    {
      key: "comp2",
      label: "competitor2.com",
      color: COLORS.compPurple,
      values: {
        technical: 73,
        onPage: 65,
        backlinkAuthority: 60,
        contentDepth: null, // missing data demo
        internalLinking: 59,
        pageSpeed: 81,
      },
    },
  ];

  const benchmark: Benchmark = {
    technical: 80,
    onPage: 76,
    backlinkAuthority: 70,
    contentDepth: 70,
    internalLinking: 68,
    pageSpeed: 72,
  };

  return (
      <RadarSeoSignalCard
        title="🕸️ SEO Signal Distribution"
        projectLabel="wranker.com"
        series={data}
        benchmark={benchmark}
        defaultMetricSet="all"
        customMetrics={["technical", "pageSpeed", "internalLinking"]}
        pro
      />
  );
};

export default RadarSeoSignalCardDemo;
