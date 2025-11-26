import React, { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Rectangle,
} from "recharts";

/* ============================================================
   Tokens (fallbacks if CSS vars not present)
   ============================================================ */
const BRAND_HEX = "#008CCD";
const TOKENS = {
  brand: "var(--wr-brand, #008CCD)",
  border: "var(--wr-border, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  surface: "var(--wr-surface, #FFFFFF)",
  grid: "#EFF0F6",
};

/* ============================================================
   Helpers
   ============================================================ */
const numberFmt = new Intl.NumberFormat();

function lighten(hex: string, amt = 0.16) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const [_, r, g, b] = m;
  const to = (v: string) => {
    const x = parseInt(v, 16);
    const y = Math.round(x + (255 - x) * amt);
    return Math.max(0, Math.min(255, y)).toString(16).padStart(2, "0");
  };
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToRgba(hex: string, alpha = 1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ============================================================
   Demo / fallback data (Top 10)
   ============================================================ */
const DEMO = [
  { code: "IN", country: "India", rd: 1020, color: "#F59E0B" },
  { code: "US", country: "United States", rd: 640, color: "#3B82F6" },
  { code: "RU", country: "Russia", rd: 512, color: "#10B981" },
  { code: "CA", country: "Canada", rd: 240, color: "#22C55E" },
  { code: "FR", country: "France", rd: 190, color: "#60A5FA" },
  { code: "DE", country: "Germany", rd: 176, color: "#F59E0B" },
  { code: "ES", country: "Spain", rd: 160, color: "#34D399" },
  { code: "GB", country: "United Kingdom", rd: 148, color: "#93C5FD" },
  { code: "IT", country: "Italy", rd: 141, color: "#A78BFA" },
  { code: "BR", country: "Brazil", rd: 120, color: "#EF4444" },
];

export type Row = {
  code: string;
  country: string;
  rd: number;
  color?: string;
  _pct?: number;
  _yLabel?: string;
};

type Props = {
  data?: Row[];                      // [{ code: 'US', country: 'United States', rd: 1020, color?: '#...' }, ...]
  maxItems?: number;                 // default 10
  title?: string;                    // card header
  onBarClick?: (row: Row) => void;   // e.g., route to Audit → Referring Domains (country filter)
  onViewAll?: () => void;            // optional "View all" handler
  onExport?: (rows: Row[]) => void;  // optional override export handler
};

/* ============================================================
   Small UI primitives (chips & improved toggle)
   ============================================================ */

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer
        ${active ? "shadow-sm" : ""}`}
      style={{
        borderColor: active ? BRAND_HEX : TOKENS.border,
        color: active ? BRAND_HEX : TOKENS.text,
        background: active ? hexToRgba(BRAND_HEX, 0.08) : TOKENS.surface,
      }}
    >
      {children}
    </button>
  );
}

/** Modern, accessible toggle with clear states */
function ToggleSwitch({
  checked,
  onChange,
  label = "Show labels",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 cursor-pointer select-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span
        className="relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 ease-out"
        style={{
          borderColor: checked ? BRAND_HEX : TOKENS.border,
          background: checked ? hexToRgba(BRAND_HEX, 0.18) : "#F3F4F6",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.03)",
        }}
      >
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: checked
              ? `0 0 0 2px ${hexToRgba(BRAND_HEX, 0.15)}`
              : "none",
            transition: "box-shadow 200ms ease",
          }}
        />
        <span
          className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out"
          style={{
            transform: checked ? "translateX(20px)" : "translateX(2px)",
            boxShadow:
              "0 1px 1px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)",
          }}
        />
      </span>
      <span
        className="text-[12px] font-medium leading-none"
        style={{ color: TOKENS.muted }}
      >
        {label}
      </span>
    </button>
  );
}

/* ============================================================
   Icons (brand-colored)
   ============================================================ */
const IconGlobe = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="shrink-0"
    fill="none"
  >
    <path
      d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9S3 7.03 3 12s4.03 9 9 9Z"
      stroke={BRAND_HEX}
      strokeWidth="1.6"
    />
    <path d="M3 12h18M12 3c3.5 4 3.5 14 0 18M12 3c-3.5 4-3.5 14 0 18" stroke={BRAND_HEX} strokeWidth="1.3"/>
  </svg>
);

const IconArrowNE = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6 6h8v8" stroke={BRAND_HEX} strokeWidth="1.6" />
    <path d="M6 14 14 6" stroke={BRAND_HEX} strokeWidth="1.6" />
  </svg>
);

const IconDownload = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" stroke={BRAND_HEX} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={BRAND_HEX} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

/* ============================================================
   Tooltip (smart popover) — no emoji; colored dot annotations
   ============================================================ */
function LegendDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{
        background: color,
        boxShadow: "0 0 0 2px #ffffff inset",
      }}
    />
  );
}

function CountryTooltip({
  active,
  payload,
  onCTA,
}: {
  active?: boolean;
  payload?: any[];
  onCTA?: (row: Row) => void;
}) {
  if (!active || !payload || !payload.length) return null;
  const row: Row | undefined = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm"
      style={{
        borderColor: TOKENS.border,
        minWidth: 240,
        fontFamily:
          'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <LegendDot color={row.color || BRAND_HEX} />
        <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
          {row.country}{" "}
          <span className="ml-1 text-xs" style={{ color: TOKENS.muted }}>
            {row.code}
          </span>
        </div>
      </div>
      <div className="text-[13px]" style={{ color: TOKENS.text }}>
        <span className="font-semibold">{numberFmt.format(row.rd)}</span> Referring
        Domains{" "}
        <span className="text-gray-500">
          ({((row._pct || 0) * 100).toFixed(1)}%)
        </span>
      </div>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => onCTA?.(row)}
      >
        <IconArrowNE />
        <span>View in Referring Domains</span>
      </button>
    </div>
  );
}

/* ============================================================
   Bar shape — flat left, 6px curved right
   ============================================================ */
function BarShape({
  x,
  y,
  width,
  height,
  fill,
  radius = 6,
  isActive = false,
}: any) {
  if (height <= 0 || width <= 0) return null;
  const color = isActive ? lighten(fill, 0.22) : fill;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[0, radius, radius, 0]} // ⟵ flat left, curved right
      fill={color}
      style={{ transition: "fill 120ms ease", cursor: "pointer" }}
    />
  );
}

/* ============================================================
   Main
   ============================================================ */
export default function RefDomainsByCountry({
  data,
  maxItems = 10,
  title = "Referring Domains by Country",
  onBarClick,
  onViewAll,
  onExport,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Controls (chips & toggle)
  const [visibleCount, setVisibleCount] = useState<number>(maxItems);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Prepare + enrich rows
  const rows = useMemo<Row[]>(() => {
    const src = Array.isArray(data) && data.length ? data : DEMO;
    const sorted = [...src].sort((a, b) => (b.rd || 0) - (a.rd || 0)).slice(0, visibleCount);
    const total = sorted.reduce((s, r) => s + (r.rd || 0), 0) || 1;
    return sorted.map((r) => ({
      ...r,
      color: r.color || BRAND_HEX,
      _pct: (r.rd || 0) / total,
      _yLabel: `${r.code?.toUpperCase() || ""} — ${r.country}`.trim(),
    }));
  }, [data, visibleCount]);

  const handleChartMouseMove = (state: any) => {
    if (state && state.isTooltipActive && typeof state.activeTooltipIndex === "number") {
      setHoverIndex(state.activeTooltipIndex);
    } else {
      setHoverIndex(null);
    }
  };
  const handleChartLeave = () => setHoverIndex(null);

  // Inline label to the right of each bar
  const LabelRight = (props: any) => {
    if (!showLabels) return null;
    const { x, y, width, height, value, index } = props;
    const row = rows[index];
    const pct = ((row?._pct || 0) * 100).toFixed(1);
    const tx = (x || 0) + (width || 0) + 8;
    const ty = (y || 0) + (height || 0) / 2 + 4;
    return (
      <text
        x={tx}
        y={ty}
        fontSize={11}
        className="fill-gray-600"
        style={{ userSelect: "none" }}
      >
        {numberFmt.format(value)} ({pct}%)
      </text>
    );
  };

  // Export CSV (default behavior if onExport not provided)
  const handleExport = () => {
    if (onExport) {
      onExport(rows);
      return;
    }
    const header = ["Code", "Country", "Referring Domains", "Share (%)"];
    const body = rows.map((r) => [
      r.code,
      `"${(r.country || "").replace(/"/g, '""')}"`,
      r.rd,
      ((r._pct || 0) * 100).toFixed(2),
    ]);
    const csv = [header, ...body].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "referring-domains-by-country.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <section
      className="rounded-2xl border bg-white shadow-sm flex flex-col overflow-hidden"
      style={{
        width: "100%",  // ⟵ container width
        height: 547, // ⟵ container height
        borderColor: TOKENS.border,
        fontFamily:
          'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <div className="mt-[1px]">
            <IconGlobe />
          </div>
          <div>
            <h3
              className="text-[16px] font-semibold sm:text-[18px]"
              style={{ color: TOKENS.text }}
            >
              {title}
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: TOKENS.muted }}>
              Top countries by referring domains (click a bar to drill down).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Modular chips (visibility count) */}
          <div className="flex items-center gap-1">
            <Chip active={visibleCount === 10} onClick={() => setVisibleCount(10)} title="Top 10">
              Top 10
            </Chip>
            <Chip active={visibleCount === 20} onClick={() => setVisibleCount(20)} title="Top 20">
              Top 20
            </Chip>
          </div>

          {/* Modern toggle (labels on/off) */}
          <ToggleSwitch checked={showLabels} onChange={setShowLabels} label="Show labels" />

          {/* Export */}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
            onClick={handleExport}
          >
            <IconDownload />
            Export
          </button>

          {/* View all */}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
            onClick={onViewAll}
          >
            <span>View All</span>
            <IconArrowNE />
          </button>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: TOKENS.border }} />

      {/* Chart area (fills remaining height of 547px container) */}
      <div ref={containerRef} className="flex-1 min-h-0 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            barCategoryGap={14}
            margin={{ top: 8, right: showLabels ? 64 : 16, left: 8, bottom: 8 }}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartLeave}
          >
            <CartesianGrid horizontal stroke={TOKENS.grid} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickMargin={8}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="_yLabel"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              width={200}
            />

            {/* Disable default cursor overlay; custom popover with colored dot */}
            <Tooltip cursor={false} content={<CountryTooltip onCTA={(row) => onBarClick?.(row)} />} />

            <Bar
              dataKey="rd"
              isAnimationActive={false}
              barSize={24}
              onClick={(_, index) => {
                const row = rows[index];
                if (row) onBarClick?.(row);
              }}
              shape={(props: any) => {
                const row = rows[props.index];
                const fill = row?.color || BRAND_HEX;
                const active = hoverIndex === props.index;
                return <BarShape {...props} fill={fill} isActive={active} />;
              }}
            >
              {showLabels ? <LabelList content={LabelRight} position="right" /> : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ------------------ Minimal usage example ------------------ */
// <RefDomainsByCountry
//   data={[{ code:'US', country:'United States', rd:1020, color:'#10B981' }, ...]}
//   onBarClick={(row) => router.push(`/audit/ref-domains?country=${row.code}`)}
//   onViewAll={() => setCountryModalOpen(true)}
//   onExport={(rows) => console.log('export rows', rows)}
// />
