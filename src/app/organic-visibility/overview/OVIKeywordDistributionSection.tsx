"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  /* CHANGED: use ComposedChart for mixed series */
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  Rectangle,
} from "recharts";
import {
  Calendar,
  Download,
  BarChart3,
  AreaChart as AreaChartIcon,
  ChevronDown,
} from "lucide-react";

/**
 * Tab 1: Overview
 * Section 2 — Organic Keyword Distribution Over Time
 *
 * Fix: render SERP Features line in a ComposedChart (bars/areas + line).
 * The line is dotted and uses the same color as the legend.
 */

/* ------------------------------ TOKENS ------------------------------ */
const TOKENS = {
  brand: "var(--wr-brand, #008CCD)",
  border: "var(--wr-border, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  surface: "var(--wr-surface, #FFFFFF)",
  grid: "#EFF0F6",
  cursor: "rgba(0,140,205,0.08)",
};

/* Segment palette (rank buckets + SERP% overlay) */
const SEGMENT_COLORS: Record<string, string> = {
  top3: "#10B981", // green
  top4_10: "#60A5FA", // blue-300
  top11_20: "#7E72FF", // indigo
  top21_50: "#F59E0B", // amber
  top51_100: "#EF4444", // red
  // SERP Features uses a distinct color (brand) and dotted line
  serp_pct: "#008CCD",
};

const LABELS: Record<string, string> = {
  top3: "Top 1–3",
  top4_10: "Top 4–10",
  top11_20: "Top 11–20",
  top21_50: "Top 21–50",
  top51_100: "Top 51–100",
  serp_pct: "SERP Features %",
};

const STACK_ORDER = ["top51_100", "top21_50", "top11_20", "top4_10", "top3"]; // bottom -> top

/* ------------------------------ DEMO DATA ------------------------------ */
function makeDemoData(days = 90) {
  const out: Array<any> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayLabel = d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    const base = 600 + Math.round(80 * Math.sin(i / 6));
    const top3 = Math.max(0, Math.round(0.08 * base + Math.sin(i / 7) * 6));
    const top4_10 = Math.max(0, Math.round(0.16 * base + Math.cos(i / 9) * 10));
    const top11_20 = Math.max(0, Math.round(0.22 * base + Math.sin(i / 10) * 12));
    const top21_50 = Math.max(0, Math.round(0.32 * base + Math.cos(i / 11) * 14));
    const top51_100 = Math.max(0, Math.round(0.22 * base + Math.sin(i / 8) * 8));
    const serp_pct = Math.max(0, Math.min(100, Math.round(20 + (Math.sin(i / 12) + 1) * 20)));
    out.push({ date: dayLabel, top3, top4_10, top11_20, top21_50, top51_100, serp_pct });
  }
  return out;
}

/* ------------------------------ EXPORTS ------------------------------ */
function downloadFile(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportCSV(data: any[], visibleKeys: Record<string, boolean>) {
  const cols = ["date", ...STACK_ORDER.filter((k) => visibleKeys[k])];
  const header = cols.join(",");
  const lines = (data ?? []).map((row) => cols.map((c) => row?.[c] ?? 0).join(","));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  downloadFile("ovi_keyword_distribution.csv", url);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportPNGFromSvg(container: HTMLDivElement | null, filename = "ovi_keyword_distribution.png") {
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const rect = svg.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
    downloadFile(filename, canvas.toDataURL("image/png"));
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
}

/* ------------------------------ CUSTOM SHAPE ------------------------------ */
function RoundedTopRect(props: any) {
  const { x, y, width, height, fill, radius = [6, 6, 0, 0] } = props;
  if (height <= 0 || width <= 0) return null;
  return <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={radius} />;
}

/* ------------------------------ SEGMENTED ------------------------------ */
function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: React.ReactNode; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TOKENS.border, cursor: "pointer" }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`h-8 rounded-full px-3 text-sm transition ${
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          }`}
          style={{ cursor: "pointer" }}
          type="button"
          title={typeof it.label === "string" ? it.label : undefined}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ LEGEND CHIPS ------------------------------ */
function LegendChips({
  visible,
  onToggle,
}: {
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const items = ["top3", "top4_10", "top11_20", "top21_50", "top51_100", "serp_pct"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((key) => {
        const active = !!visible[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition"
            style={{
              borderColor: TOKENS.border,
              background: active ? "rgba(0,140,205,0.12)" : "#FFFFFF",
              color: active ? TOKENS.text : TOKENS.muted,
              cursor: "pointer",
            }}
            title={LABELS[key]}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[key] }} />
            <span className={active ? "font-medium" : "font-normal"}>{LABELS[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ SMART TOOLTIP ------------------------------ */
function TooltipContent({
  active,
  payload,
  label,
  hoveredKey,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  hoveredKey?: string | null;
}) {
  if (!active || !payload || !payload.length) return null;
  const rows: Array<{ key: string; label: string; value: number; color: string }> = [];
  let total = 0;
  payload.forEach((p) => {
    if (!p || !p.dataKey) return;
    const k = String(p.dataKey);
    if (STACK_ORDER.includes(k)) {
      rows.push({ key: k, label: LABELS[k], value: p.value, color: p.color || SEGMENT_COLORS[k] });
      total += Number(p.value || 0);
    }
  });
  const serp = payload.find((p) => p && p.dataKey === "serp_pct");
  const serpValue = serp ? serp.value : null;

  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm"
      style={{ borderColor: TOKENS.border, cursor: "default" }}
    >
      <div className="mb-1 text-[12px] font-medium" style={{ color: TOKENS.muted }}>
        {label}
      </div>
      <div className="space-y-0.5">
        {rows
          .sort((a, b) => STACK_ORDER.indexOf(b.key) - STACK_ORDER.indexOf(a.key))
          .map((r) => {
            const isActive = hoveredKey === r.key;
            return (
              <div
                key={r.key}
                className={`flex items-center justify-between gap-3 rounded px-1 py-0.5 text-[13px] ${
                  isActive ? "bg-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-[3px]" style={{ background: r.color }} />
                  <span className={isActive ? "font-medium text-slate-800" : ""}>{r.label}</span>
                </div>
                <div className={isActive ? "font-semibold text-slate-900" : "font-medium"}>{r.value ?? 0}</div>
              </div>
            );
          })}
      </div>
      <div className="mt-2 border-t pt-2 text-[13px]" style={{ borderColor: TOKENS.border }}>
        <div className="flex items-center justify-between">
          <span className="font-medium">Total Keywords</span>
          <span className="font-semibold">{total}</span>
        </div>
        {typeof serpValue === "number" && (
          <div className="mt-1 flex items-center justify-between text-[12px]" style={{ color: TOKENS.muted }}>
            <span>SERP Features</span>
            <span className="font-medium" style={{ color: SEGMENT_COLORS.serp_pct }}>
              {serpValue}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ EXPORT MENU ------------------------------ */
function ExportMenu({
  onPNG,
  onCSV,
  onPDF,
}: {
  onPNG?: () => void;
  onCSV?: () => void;
  onPDF?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition"
        style={{ borderColor: TOKENS.border, background: "#FFFFFF", color: TOKENS.text, cursor: "pointer" }}
        title="Export"
        aria-label="Export"
      >
        <Download className="h-4 w-4" color={TOKENS.brand} />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-lg"
          style={{ borderColor: TOKENS.border }}
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setOpen(false);
              onPNG?.();
            }}
          >
            PNG
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setOpen(false);
              onCSV?.();
            }}
          >
            CSV
          </button>
          <button
            className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
            title="PDF export can be wired to your Report Builder"
            onClick={() => {
              setOpen(false);
              onPDF?.();
            }}
          >
            PDF (via Reports)
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ MAIN COMPONENT ------------------------------ */
export default function OVIKeywordDistributionSection({
  data,
  defaultRange = "90d", // '30d' | '90d' | '180d'
}: {
  data?: any[];
  defaultRange?: "30d" | "90d" | "180d";
}) {
  const [view, setView] = useState<"bar" | "area">("bar");
  const [range, setRange] = useState<"30d" | "90d" | "180d">(defaultRange);
  const [visible, setVisible] = useState<Record<string, boolean>>({
    top3: true,
    top4_10: true,
    top11_20: true,
    top21_50: true,
    top51_100: true,
    serp_pct: true,
  });
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const raw = Array.isArray(data) && data.length ? data : makeDemoData(90);

  // Range
  const sliced = useMemo(() => {
    const n = range === "30d" ? 30 : range === "180d" ? 180 : 90;
    return raw.slice(-n);
  }, [raw, range]);

  // Compute top-most visible key per x-index for bar rounding
  const topKeyByIndex = useMemo(() => {
    return sliced.map((row) => {
      for (let i = STACK_ORDER.length - 1; i >= 0; i--) {
        const key = STACK_ORDER[i];
        if (visible[key] && Number(row?.[key] ?? 0) > 0) return key;
      }
      return null as string | null;
    });
  }, [sliced, visible]);

  const toggleKey = (key: string) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  // Segmented chips
  const rangeItems = [
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "180d", value: "180d" },
  ];
  const viewItems = [
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4" color={TOKENS.brand} />
          Bar
        </span>
      ),
      value: "bar",
    },
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <AreaChartIcon className="h-4 w-4" color={TOKENS.brand} />
          Area
        </span>
      ),
      value: "area",
    },
  ];

  return (
    <section
      className="w-full rounded-2xl border bg-white shadow-sm mt-4"
      style={{
        borderColor: TOKENS.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" color={TOKENS.brand} />
          <div>
            <h3 className="text-[16px] font-semibold sm:text-[18px]" style={{ color: TOKENS.text }}>
              Organic Keyword Distribution Over Time
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: TOKENS.muted }}>
              Split by rank buckets; optional SERP Features overlay.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="mr-1 hidden items-center gap-1 rounded-md border px-2 py-1 text-[12px] sm:inline-flex"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
            title="Date Range"
          >
            <Calendar className="h-3.5 w-3.5" color={TOKENS.brand} />
            Range
          </span>

          <Segmented value={range} items={rangeItems} onChange={(v) => setRange(v as any)} aria="Date range" />
          <Segmented value={view} items={viewItems} onChange={(v) => setView(v as any)} aria="Chart type" />

          <ExportMenu
            onPNG={() => exportPNGFromSvg(containerRef.current)}
            onCSV={() => exportCSV(sliced, visible)}
            onPDF={() => void 0}
          />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t" style={{ borderColor: TOKENS.border }} />

      {/* Chart */}
      <div ref={containerRef} className="p-4">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {view === "bar" ? (
              /* CHANGED: ComposedChart for bars + line */
              <ComposedChart data={sliced}>
                <CartesianGrid vertical={false} stroke={TOKENS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} tickMargin={8} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
                <Tooltip cursor={{ fill: TOKENS.cursor }} content={<TooltipContent hoveredKey={hoveredKey} />} />

                {/* Stacked bars; only the true top gets rounded top */}
                {STACK_ORDER.map((key) =>
                  visible[key] ? (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={LABELS[key]}
                      stackId="a"
                      fill={SEGMENT_COLORS[key]}
                      isAnimationActive={false}
                      onMouseOver={() => setHoveredKey(key)}
                      onMouseOut={() => setHoveredKey(null)}
                      shape={(props: any) => {
                        const isTop = topKeyByIndex[props.index] === key;
                        const r = isTop ? [6, 6, 0, 0] : [0, 0, 0, 0];
                        return <RoundedTopRect {...props} radius={r} fill={SEGMENT_COLORS[key]} />;
                      }}
                    />
                  ) : null
                )}

                {/* Dotted SERP Features overlay (distinct color, legend-matched) */}
                {visible.serp_pct ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="serp_pct"
                    stroke={SEGMENT_COLORS.serp_pct}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                    onMouseOver={() => setHoveredKey("serp_pct")}
                    onMouseOut={() => setHoveredKey(null)}
                  />
                ) : null}
              </ComposedChart>
            ) : (
              /* CHANGED: ComposedChart for areas + line */
              <ComposedChart data={sliced}>
                <CartesianGrid vertical={false} stroke={TOKENS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} tickMargin={8} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
                <Tooltip cursor={{ strokeOpacity: 0.15 }} content={<TooltipContent hoveredKey={hoveredKey} />} />

                {STACK_ORDER.map((key) =>
                  visible[key] ? (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="a"
                      stroke={SEGMENT_COLORS[key]}
                      fill={SEGMENT_COLORS[key]}
                      fillOpacity={0.65}
                      isAnimationActive={false}
                      onMouseOver={() => setHoveredKey(key)}
                      onMouseOut={() => setHoveredKey(null)}
                    />
                  ) : null
                )}

                {/* Dotted SERP Features overlay (distinct color, legend-matched) */}
                {visible.serp_pct ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="serp_pct"
                    stroke={SEGMENT_COLORS.serp_pct}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                    onMouseOver={() => setHoveredKey("serp_pct")}
                    onMouseOut={() => setHoveredKey(null)}
                  />
                ) : null}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <LegendChips visible={visible} onToggle={toggleKey} />
      </div>
    </section>
  );
}

/* ------------------------------ DEMO WRAPPER (optional) ------------------------------ */
export function Demo_OVI_KeywordDistribution() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <OVIKeywordDistributionSection />
    </div>
  );
}
