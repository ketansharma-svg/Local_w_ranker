import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  Cell,
  LabelList,
} from "recharts";

/**
 * Section 4 → Trend Charts
 * Chart 3 → Domain Quality Breakdown (Horizontal Bars)
 *
 * Refinements applied:
 * - Inter/Inter Fallback font applied at the container level
 * - Branded (#008CCD) inline SVG icons in header, legend chips, tooltip
 * - Pointer cursors for all interactive controls (bars, chips, toggles, export)
 * - Modular chips (legend) + a toggle switch (percent-only labels)
 * - Primary metric text set to Blue (#0077ff); hover cursor highlight uses a blue pastel
 * - Smart popover shows colored dot + branded icon per Domain Quality type
 * - Export button added in section header (CSV, client-side)
 *
 * Props interface kept backward compatible. No breaking changes.
 */

type BucketId = "toxic" | "low" | "moderate" | "high" | "veryHigh";

type BucketRow = {
  id: BucketId;
  label: string;   // e.g., "Moderate (41–60)"
  range: string;   // e.g., "41–60"
  count: number;   // number of referring domains in this bucket
  color: string;   // bar color (hex) — status palette
};

export interface DomainQualityBreakdownProps {
  data?: BucketRow[];
  totalDomains?: number;                // if not provided, computed from (visible) data
  height?: number;                      // container height (default 260)
  className?: string;                   // container class
  onBarClick?: (bucket: BucketRow) => void; // deep link to Audit
  enableDemoFallback?: boolean;         // default true
}

/* -------- Brand / Design tokens -------- */
const BRAND_BLUE = "#0077ff";    // primary for metrics & general charts
const BRAND_ICON = "#008CCD";    // branded icon color
const HOVER_CURSOR_FILL = "rgba(0,119,255,0.08)";

/* -------- Demo data (safe fallback) -------- */
const DEMO_DATA: BucketRow[] = [
  { id: "toxic",    label: "Toxic (0–20)",        range: "0–20",   count: 34,  color: "#EF4444" },
  { id: "low",      label: "Low (21–40)",         range: "21–40",  count: 68,  color: "#F97316" },
  { id: "moderate", label: "Moderate (41–60)",    range: "41–60",  count: 124, color: "#EAB308" },
  { id: "high",     label: "High (61–80)",        range: "61–80",  count: 156, color: "#10B981" },
  { id: "veryHigh", label: "Very High (81–100)",  range: "81–100", count: 92,  color: "#3B82F6" },
];

/* -------- Utils -------- */
function calcTotal(rows: BucketRow[]) {
  return rows.reduce((s, r) => s + (r.count || 0), 0);
}
function toPercent(n: number, total: number) {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}
/** Lighten a hex color by mixing with white (amount: 0..1) */
function lighten(hex: string, amount = 0.12) {
  const m = hex.replace("#", "");
  const num = parseInt(m.length === 3 ? m.split("").map(c => c + c).join("") : m, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const out = (n: number) => n.toString(16).padStart(2, "0");
  return `#${out(mix(r))}${out(mix(g))}${out(mix(b))}`;
}

/* -------- Inline Icons (branded) -------- */
const IconSectionBadge: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
    <path fill={BRAND_ICON} d="M9.167 1.667a1.667 1.667 0 0 1 1.666 0l5 2.778A1.667 1.667 0 0 1 17 6.0v8a1.667 1.667 0 0 1-.833 1.444l-5 2.778a1.667 1.667 0 0 1-1.667 0l-5-2.778A1.667 1.667 0 0 1 3 14.0V6.0a1.667 1.667 0 0 1 .833-1.555l5-2.778z" />
    <path fill="white" d="M10 5.6a.8.8 0 0 1 .8.8v3.2h2.8a.8.8 0 1 1 0 1.6H10.8v3.2a.8.8 0 1 1-1.6 0V11.2H6.4a.8.8 0 0 1 0-1.6h2.8V6.4a.8.8 0 0 1 .8-.8z" />
  </svg>
);

const IconExport: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
    <path fill={BRAND_ICON} d="M3 13.5A2.5 2.5 0 0 0 5.5 16h9A2.5 2.5 0 0 0 17 13.5v-1a1 1 0 1 0-2 0v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1a1 1 0 1 0-2 0v1z" />
    <path fill={BRAND_ICON} d="M10 2a1 1 0 0 1 1 1v6.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3.0 3.0a1 1 0 0 1-1.414 0l-3.0-3.0A1 1 0 1 1 7.707 8.293L9 9.586V3a1 1 0 0 1 1-1z" />
  </svg>
);

/** Quality bars icon: 1..5 filled vertical bars (branded) */
const QualityBarsIcon: React.FC<{ level: 1 | 2 | 3 | 4 | 5; className?: string }> = ({ level, className }) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
    {[1,2,3,4,5].map((i) => {
      const h = 3 + i * 2.4; // growing height
      const x = 2 + (i - 1) * 3.2;
      const y = 18 - h;
      return (
        <rect key={i} x={x} y={y} width="2.2" height={h} rx="0.6" fill={i <= level ? BRAND_ICON : "#E2E8F0"} />
      );
    })}
  </svg>
);

const levelForBucket: Record<BucketId, 1|2|3|4|5> = {
  toxic: 1,
  low: 2,
  moderate: 3,
  high: 4,
  veryHigh: 5,
};

/* -------- Tooltip -------- */
const TooltipCard: React.FC<{
  active?: boolean;
  payload?: any[];
  total: number;
}> = ({ active, payload, total }) => {
  if (!active || !payload?.length) return null;
  const row: BucketRow = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        {/* colored dot + branded quality icon */}
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
        <QualityBarsIcon level={levelForBucket[row.id]} className="h-4 w-4" />
        <div className="font-semibold" style={{ color: BRAND_BLUE }}>{row.label}</div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <div className="text-gray-500">WR Band</div><div className="text-gray-700">{row.range}</div>
        <div className="text-gray-500">Domains</div><div className="text-gray-700">{row.count.toLocaleString()}</div>
        <div className="text-gray-500">Share</div><div className="text-gray-700">{toPercent(row.count, total)}</div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-[#008CCD]">
        {/* action hint (drilldown) */}
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" aria-hidden="true">
          <path fill={BRAND_ICON} d="M6.5 4a1 1 0 0 0 0 2h5.586L6.293 11.793a1 1 0 1 0 1.414 1.414L13.5 7.414V13a1 1 0 1 0 2 0V5a1 1 0 0 0-1-1H6.5z"/>
        </svg>
        Click to audit these domains
      </div>
    </div>
  );
};

/* -------- Small UI bits: Chip + Toggle -------- */
const Chip: React.FC<{
  active?: boolean;
  onClick?: () => void;
  color: string;
  children: React.ReactNode;
}> = ({ active = true, onClick, color, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
      active ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
             : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100",
      "cursor-pointer"
    ].join(" ")}
    aria-pressed={active}
  >
    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    {children}
  </button>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}> = ({ checked, onChange, label, id }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer select-none" htmlFor={id}>
    <span className="text-xs text-slate-600">{label}</span>
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onChange(!checked)}
      id={id}
      className={[
        "relative inline-flex h-5 w-9 items-center rounded-full border transition",
        checked ? "bg-[#0077ff]/20 border-[#0077ff]/30" : "bg-slate-100 border-slate-300"
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-white shadow ring-1 transition",
          checked ? "translate-x-5 ring-[#0077ff]/50" : "translate-x-0.5 ring-slate-300"
        ].join(" ")}
      />
    </span>
  </label>
);

/* -------- Component -------- */
export default function DomainQualityBreakdown({
  data,
  totalDomains,
  height = 260,
  className = "",
  onBarClick,
  enableDemoFallback = true,
}: DomainQualityBreakdownProps) {
  const hasRealData = React.useMemo(
    () => (data && calcTotal(data) > 0) || false,
    [data]
  );

  const rows = React.useMemo<BucketRow[]>(
    () => (hasRealData ? (data as BucketRow[]) : enableDemoFallback ? DEMO_DATA : []),
    [data, hasRealData, enableDemoFallback]
  );

  const grandTotal = React.useMemo(
    () => (typeof totalDomains === "number" ? totalDomains : calcTotal(rows)),
    [rows, totalDomains]
  );

  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [activeIds, setActiveIds] = React.useState<Set<BucketId>>(
    () => new Set(rows.map(r => r.id))
  );
  const [percentOnly, setPercentOnly] = React.useState(false);

  // Keep activeIds in sync if rows change (e.g., initial mount or new data)
  React.useEffect(() => {
    setActiveIds(new Set(rows.map(r => r.id)));
  }, [rows]);

  const visibleRows = React.useMemo(
    () => rows.filter(r => activeIds.has(r.id)),
    [rows, activeIds]
  );

  // For nicer x-axis upper bound (based on visible rows)
  const maxVal = React.useMemo(() => Math.max(0, ...visibleRows.map((r) => r.count)), [visibleRows]);
  const xMax = React.useMemo(
    () => Math.ceil((maxVal + Math.max(8, maxVal * 0.06)) / 10) * 10,
    [maxVal]
  );

  const toggleBucket = (id: BucketId) => {
    setActiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // never allow empty state (re-enable all)
      if (next.size === 0) return new Set(rows.map(r => r.id));
      return next;
    });
  };

  const exportCSV = React.useCallback(() => {
    // Always export the full dataset (not only visible), including % of grand total
    const header = ["Bucket ID", "Label", "WR Range", "Count", "Percent of Total"];
    const lines = [
      header.join(","),
      ...rows.map(r =>
        [r.id, `"${r.label}"`, r.range, r.count, toPercent(r.count, grandTotal)].join(",")
      ),
      ["Total", "", "", grandTotal, "100%"].join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "domain-quality-breakdown.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows, grandTotal]);

  return (
    <div
      className={[
        "w-full rounded-2xl border border-gray-200 bg-white shadow-sm",
        className,
      ].join(" ")}
      style={{ fontFamily: 'Inter, "Inter Fallback", ui-sans-serif, system-ui' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <IconSectionBadge className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Domain Quality Breakdown</h3>
            <p className="text-xs text-gray-500">
              Across {grandTotal.toLocaleString()} referring domains
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
          aria-label="Export domain quality breakdown as CSV"
        >
          <IconExport className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Legend chips + toggle */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <div className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <QualityBarsIcon level={5} className="h-4 w-4" />
          <span>Quality buckets</span>
        </div>
        {rows.map((r) => (
          <Chip
            key={r.id}
            active={activeIds.has(r.id)}
            onClick={() => toggleBucket(r.id)}
            color={r.color}
          >
            <QualityBarsIcon level={levelForBucket[r.id]} className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">{r.label.split(" ")[0]}</span>
          </Chip>
        ))}
        <div className="ml-auto">
          <Toggle
            checked={percentOnly}
            onChange={setPercentOnly}
            label="Show % only"
            id="toggle-percent-only"
          />
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }} className="px-2 pb-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleRows}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: 8, left: 140 }}
            barCategoryGap={16}
            barGap={8}
            onMouseLeave={() => setHoveredIndex(null)} // reset when leaving chart area
          >
            <CartesianGrid horizontal vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, xMax]}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={130}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />

            {/* Smart tooltip + blue pastel hover cursor */}
            <Tooltip
              cursor={{ fill: HOVER_CURSOR_FILL }}
              content={<TooltipCard total={grandTotal} />}
            />

            <Bar
              dataKey="count"
              isAnimationActive={false}
              barSize={28}                 // thicker bars
              radius={[0, 6, 6, 0]}        // round only the right side
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {visibleRows.map((row, idx) => {
                const isHovered = hoveredIndex === idx;
                const fill = isHovered ? lighten(row.color, 0.14) : row.color;
                const stroke = isHovered ? lighten(row.color, 0.22) : "transparent";
                return (
                  <Cell
                    key={`cell-${row.id}`}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isHovered ? 1 : 0.5}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onClick={() => onBarClick?.(row)}
                    style={{ transition: "fill 160ms ease, stroke 160ms ease" }}
                  />
                );
              })}

              <LabelList
                dataKey="count"
                position="right"
                formatter={(val: number) =>
                  percentOnly ? `${toPercent(val, grandTotal)}`
                              : `${val.toLocaleString()} (${toPercent(val, grandTotal)})`
                }
                className="text-[11px] fill-[#0077ff]"
                offset={8}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer note */}
      <div className="px-4 pb-3">
        <p className="text-[11px] text-gray-500">
          Click a bar to open the Referring Domains table filtered by WR range.
        </p>
      </div>
    </div>
  );
}
