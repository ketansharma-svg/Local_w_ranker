"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";

type TldDatum = { tld: string; count: number; color?: string };

type Props = {
  /** Raw TLD data; if empty, demo data is used */
  data?: TldDatum[];
  /** Max bars to show (Top N) — ignored now; all TLDs are shown */
  maxItems?: number;
  /** Optional title override */
  title?: string;
  /** Called when a bar is clicked (route to Audit -> Referring Domains filtered by TLD) */
  onDrilldown?: (tld: string) => void;
  /** Called when “View All” is clicked (UI removed since all are shown) */
  onViewAll?: () => void;
  /** Optional className for outer card */
  className?: string;
  /** Card height in px; defaults to 547 to match 787×547 section size */
  height?: number;
};

const SECTION_WIDTH = 787;
const SECTION_HEIGHT = 547;

const BRAND = "#008CCD";

const COLOR_MAP: Record<string, string> = {
  ".com": "#1090D0",
  ".org": "#60A5FA",
  ".net": "#7C3AED",
  ".in": "#10B981",
  ".co.uk": "#F59E0B",
  ".xyz": "#EF4444",
  ".info": "#F43F5E",
};

const DEMO: TldDatum[] = [
  { tld: ".com", count: 1284 },
  { tld: ".org", count: 280 },
  { tld: ".net", count: 194 },
  { tld: ".in", count: 120 },
  { tld: ".co.uk", count: 102 },
  { tld: ".xyz", count: 64 },
  { tld: ".info", count: 32 },
];

function formatPct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}
function formatNum(n: number) {
  return n.toLocaleString();
}

/** Lighten a hex color by a factor (0–1) */
function lighten(hex: string, amt = 0.15) {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const f = (c: number) => Math.min(255, Math.max(0, Math.round(c + (255 - c) * amt)));
    const toHex = (c: number) => c.toString(16).padStart(2, "0");
    return `#${toHex(f(r))}${toHex(f(g))}${toHex(f(b))}`;
  } catch {
    return hex;
  }
}

/* ====== Small, modular UI primitives (chips, toggles, icons) ====== */

function BrandIcon(props: React.SVGProps<SVGSVGElement>) {
  // Compact "bars" glyph
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props} className={["fill-current", props.className].join(" ")}>
      <rect x="2" y="12" width="4" height="6" rx="1" />
      <rect x="8" y="8" width="4" height="10" rx="1" />
      <rect x="14" y="4" width="4" height="14" rx="1" />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props} className={["fill-current", props.className].join(" ")}>
      <path d="M11.293 4.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5a1 1 0 1 1-1.414-1.414L14.586 11H3a1 1 0 1 1 0-2h11.586l-3.293-3.293a1 1 0 0 1 0-1.414z" />
    </svg>
  );
}

function ExportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props} className={["fill-current", props.className].join(" ")}>
      <path d="M12 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 0 1 8.707 10.293L11 12.586V4a1 1 0 0 1 1-1z" />
      <path d="M5 15a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 2 0v2h12v-2a1 1 0 0 1 1-1H5z" />
    </svg>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props} className={["fill-current", props.className].join(" ")}>
      <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm1-11a1 1 0 1 0-2 0 1 1 0 0 0 2 0zM9 9a1 1 0 0 1 2 0v5a1 1 0 1 1-2 0V9z" />
    </svg>
  );
}

function WarningTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props} className={["fill-current", props.className].join(" ")}>
      <path d="M12.87 3.52a1.5 1.5 0 0 0-2.74 0L1.63 18.3A1.5 1.5 0 0 0 2.96 20.5h18.08a1.5 1.5 0 0 0 1.33-2.2L12.87 3.52zM12 8a1 1 0 0 1 1 1v4.25a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1zm0 8.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

type ChipProps = {
  label: string;
  onClick?: () => void;
  active?: boolean;
  leadingIcon?: React.ReactNode;
  title?: string;
};
function Chip({ label, onClick, active, leadingIcon, title }: ChipProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-[#008CCD]/20 bg-[#008CCD]/10 text-[#0A4F6A]"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        onClick ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      {leadingIcon}
      <span>{label}</span>
    </button>
  );
}

type ToggleProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
};
function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="inline-flex select-none items-center gap-2 text-xs text-slate-700 cursor-pointer"
      title={label}
    >
      <span>{label}</span>
      <span
        className={[
          "relative inline-flex h-5 w-9 items-center rounded-full border transition",
          checked ? "bg-[#008CCD] border-[#008CCD]" : "bg-white border-slate-300",
        ].join(" ")}
      >
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={[
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </label>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

/* ====================== Main Component ====================== */

export default function TldDistributionChart({
  data,
  maxItems = 7, // ignored (show all)
  title = "TLD Distribution",
  onDrilldown,
  onViewAll,
  className = "",
  height = SECTION_HEIGHT,
}: Props) {
  const raw = React.useMemo<TldDatum[]>(
    () =>
      (data && data.length ? data : DEMO)
        .map((d) => ({
          ...d,
          color: d.color ?? COLOR_MAP[d.tld] ?? "#94A3B8", // slate-400 fallback
        }))
        .sort((a, b) => b.count - a.count),
    [data]
  );

  const total = React.useMemo(() => raw.reduce((s, r) => s + r.count, 0), [raw]);

  /** UI prefs (chips/toggles) */
  const [showPercent, setShowPercent] = React.useState<boolean>(true);

  /** Low-trust concentration note */
  const LOW_TRUST_SET = new Set([".xyz", ".top", ".club", ".info"]);
  const lowTrustPct = React.useMemo(() => {
    const lt = raw.filter((r) => LOW_TRUST_SET.has(r.tld)).reduce((s, r) => s + r.count, 0);
    return total ? lt / total : 0;
  }, [raw, total]);

  /** Show ALL TLDs on the Y-axis (no Top-N slice) */
  const visible = React.useMemo(() => raw, [raw]);

  /** add % and label for labels/tooltip */
  const chartData = React.useMemo(
    () =>
      visible.map((d) => {
        const percent = total ? d.count / total : 0;
        const countText = formatNum(d.count);
        const label = showPercent ? `${countText} (${formatPct(percent)})` : `${countText}`;
        return { ...d, percent, label };
      }),
    [visible, total, showPercent]
  );

  /** Hover index used ONLY to highlight the hovered bar (no dimming of others) */
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  /** Export CSV of visible data */
  const handleExport = React.useCallback(() => {
    const rows = [
      ["tld", "count", "percent_of_total"],
      ...visible.map((d) => [d.tld, String(d.count), total ? (d.count / total).toFixed(4) : "0"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tld_distribution.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [visible, total]);

  /** Smart popover matching spec: colored dot + branded icon + action */
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload as (typeof chartData)[number];
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md font-sans">
        <div className="mb-1 flex items-center gap-1.5">
          <BrandIcon width={14} height={14} className="text-[#008CCD]" />
          <span className="text-[11px] font-medium text-slate-600">TLD Distribution</span>
        </div>

        <div className="flex items-center gap-2">
          <Dot color={p.color!} />
          <div className="text-sm font-semibold text-slate-800">{p.tld}</div>
        </div>

        <div className="mt-0.5 text-xs text-slate-600">
          {formatNum(p.count)} Referring Domains {showPercent ? `(${formatPct(p.percent)})` : null}
        </div>

        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#008CCD] hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDrilldown?.(p.tld);
          }}
        >
          <BrandIcon width={12} height={12} className="text-[#008CCD]" />
          <span>Audit these domains</span>
          <ArrowRightIcon width={12} height={12} className="text-[#008CCD]" />
        </button>
      </div>
    );
  };

  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        "p-4 md:p-5",
        "flex flex-col",
        className,
      ].join(" ")}
      role="region"
      aria-label="TLD Distribution Chart"
      style={{
        width: "100%",
        height,
        fontFamily: 'Inter, "Inter Fallback", ui-sans-serif, system-ui',
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <BrandIcon width={18} height={18} className="mt-[1px] text-[#008CCD]" />
          <div>
            <h5 className="text-[16px] font-semibold text-slate-900">{title}</h5>
            <p className="text-xs text-slate-500">Across {formatNum(total)} referring domains</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export button in header */}
          <Chip
            label="Export"
            title="Export visible data (CSV)"
            leadingIcon={<ExportIcon width={14} height={14} className="text-[#008CCD]" />}
            onClick={handleExport}
          />
        </div>
      </div>

      {/* Legend + Toggles */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <BrandIcon width={14} height={14} className="text-[#008CCD]" />
            <span>Chart: TLD Distribution</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
            <span>Metric: Referring Domains</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Toggle id="toggle-show-percent" checked={showPercent} onChange={setShowPercent} label="Show %" />
        </div>
      </div>

      {/* Chart (sized for 787×547 section; Y-axis shows ALL TLDs) */}
      <div className="mt-1 grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
            barCategoryGap={8}
            onMouseLeave={() => setHoverIndex(null)}
            onMouseMove={(state: any) => {
              if (state?.isTooltipActive && typeof state.activeTooltipIndex === "number") {
                setHoverIndex(state.activeTooltipIndex);
              } else {
                setHoverIndex(null);
              }
            }}
          >
            <CartesianGrid horizontal vertical={false} stroke="#EEF2F6" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              tickFormatter={(v: number) => formatNum(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="tld"
              width={96}
              interval={0} // show ALL TLD tick labels
              axisLine={false}
              tickLine={false}
              tickMargin={6}
              tick={{ fill: "#334155", fontSize: 13 }}
            />
            <Tooltip cursor={{ fill: "rgba(16,144,208,0.08)" }} content={<CustomTooltip />} />

            {/* Bars; subtle round on the right edge */}
            <Bar dataKey="count" barSize={18} radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => {
                const base = entry.color!;
                const isHover = hoverIndex === index;
                const hoverFill = lighten(base, 0.18);
                return (
                  <Cell
                    key={`cell-${entry.tld}`}
                    fill={isHover ? hoverFill : base}
                    stroke={isHover ? hoverFill : "transparent"}
                    strokeWidth={isHover ? 1.5 : 0}
                    cursor="pointer"
                    style={{
                      transition: "fill 180ms ease, stroke 180ms ease, opacity 180ms ease",
                    }}
                    onMouseEnter={() => setHoverIndex(index)}
                    onClick={() => onDrilldown?.(entry.tld)}
                  />
                );
              })}
              <LabelList
                dataKey="label"
                position="right"
                className="fill-slate-600"
                offset={8}
                formatter={(value: string) => value}
                style={{ fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer note + risk hint (no emoji) */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Click a bar to open filtered Referring Domains view.</span>
        {lowTrustPct > 0.15 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700"
            title="Based on share of .xyz/.top/.club/.info"
          >
            <WarningTriangleIcon width={14} height={14} className="text-[#008CCD]" />
            <span>Unusual concentration of low‑trust TLDs detected ({formatPct(lowTrustPct)}).</span>
          </span>
        )}
      </div>
    </div>
  );
}
