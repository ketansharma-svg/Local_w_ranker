import React, { useMemo, useState, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import {
  Info,
  AlertTriangle,
  Eye,
  ShieldOff,
  ExternalLink,
  Download,
  SlidersHorizontal,
  ShieldAlert,
} from "lucide-react";

/* ----------------------------- Design Tokens ----------------------------- */
/** Latest tokens (align with recent designs) */
const TOKENS = {
  brand: "#008CCD", // branded icon + accents
  // Neutrals
  text: "#0B1220",
  textMuted: "#667085",
  border: "#E6E8F0",
  cardBg: "#FFFFFF",
  chipBg: "#F5F8FA",
  chipHover: "#ECF5FA",
  // Anchor type palette
  exact: "#EF4444",
  partial: "#F59E0B",
  branded: "#3B82F6",
  generic: "#9CA3AF",
  naked: "#8B5CF6",
  // Risk tones
  riskHigh: "#E11D48",
  riskMed: "#F59E0B",
  riskLow: "#16A34A",
};

const FONT_FAMILY =
  'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

/* --------------------------------- Types --------------------------------- */
type AnchorType =
  | "Exact Match"
  | "Partial Match"
  | "Branded"
  | "Generic"
  | "Naked URL";

type RiskLevel = "High" | "Medium" | "Low";

type AnchorRow = {
  text: string;
  type: AnchorType;
  count: number;
  risk: RiskLevel;
  samplePage?: string;
};

type AnchorDistribution = Partial<Record<AnchorType, number>>;

type Props = {
  distribution?: AnchorDistribution;
  anchors?: AnchorRow[];
  onNavigate?: (target: {
    kind: "anchorType" | "anchorText" | "alert";
    value: string;
    route: string;
  }) => void;
  onDisavow?: (payload: { anchorText: string; type: AnchorType }) => void;
  /** Kept for drop-in compatibility, ignored (bar view removed by spec). */
  initialChart?: "donut" | "bar";
  className?: string;
};

/* --------------------------------- Utils --------------------------------- */
const fmt = (n: number) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "-";

const pct = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

const typeColor = (t: AnchorType) =>
  ({
    "Exact Match": TOKENS.exact,
    "Partial Match": TOKENS.partial,
    Branded: TOKENS.branded,
    Generic: TOKENS.generic,
    "Naked URL": TOKENS.naked,
  }[t]);

const riskHue = (r: RiskLevel) =>
  r === "High" ? TOKENS.riskHigh : r === "Medium" ? TOKENS.riskMed : TOKENS.riskLow;

function plural(n: number, unit: string) {
  return n === 1 ? `${n} ${unit}` : `${fmt(n)} ${unit}s`;
}

// simple mix to lighten a hex color
function lighten(hex: string, ratio = 0.25) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const mix = (chan: number) => Math.round(chan + (255 - chan) * ratio);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/* ---------------------------- Demo / Fallbacks ---------------------------- */
const DEMO_DISTRIBUTION: AnchorDistribution = {
  "Exact Match": 189,
  "Partial Match": 210,
  Branded: 165,
  Generic: 110,
  "Naked URL": 105,
};

const DEMO_ANCHORS: AnchorRow[] = [
  { text: "buy backlinks", type: "Exact Match", count: 24, risk: "High", samplePage: "/services/seo" },
  { text: "cheap SEO tools", type: "Partial Match", count: 19, risk: "Medium", samplePage: "/blog/tools" },
  { text: "click here", type: "Generic", count: 43, risk: "Low", samplePage: "/blog/guide" },
  { text: "best seo agency", type: "Exact Match", count: 17, risk: "High", samplePage: "/locations/jaipur" },
  { text: "wranker", type: "Branded", count: 28, risk: "Low", samplePage: "/home" },
  { text: "https://yourdomain.com", type: "Naked URL", count: 12, risk: "Low", samplePage: "/about" },
];

/* ------------------------------ Smart Popover ----------------------------- */
function SmartPopover({
  visible,
  x,
  y,
  label,
  count,
  percent,
  color,
  example,
}: {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  count: number;
  percent: number;
  color: string;
  example?: string;
}) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute rounded-md border bg-white p-3 text-[12.5px] shadow-md"
      style={{
        borderColor: TOKENS.border,
        minWidth: 220,
        zIndex: 70,
        left: x + 12,
        top: y + 12,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <div className="font-medium" style={{ color: TOKENS.text }}>
          {label}
        </div>
      </div>
      <div className="mt-1 text-[12.5px]" style={{ color: TOKENS.textMuted }}>
        <div>
          <strong style={{ color: TOKENS.text }}>{fmt(count)}</strong> anchors ({percent.toFixed(1)}%)
        </div>
        {example && <div className="mt-1">e.g., “{example}”</div>}
      </div>
    </div>
  );
}

/* -------------------------- Active Shape (Hover FX) ----------------------- */
const ActiveSlice = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  // subtle ring expansion on hover
  return (
    <g style={{ filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.15))" }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* thin highlight stroke */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={lighten(fill, 0.6)}
      />
      {/* accessible label */}
      <title>{`${payload?.label ?? payload?.name}: ${fmt(payload?.count ?? payload?.value)} (${(payload?.percent ?? 0).toFixed?.(1) ?? ""}%)`}</title>
    </g>
  );
};

/* ------------------------------ Legend Row -------------------------------- */
function LegendItem({
  color,
  label,
  count,
  percent,
  onClick,
}: {
  color: string;
  label: string;
  count: number;
  percent: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left"
      style={{ cursor: "pointer" }}
      title={label}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[13.5px] font-medium" style={{ color: TOKENS.text }}>
          {label}
        </span>
      </div>
      <div className="text-[12.5px]" style={{ color: TOKENS.textMuted }}>
        {fmt(count)} · {percent.toFixed(1)}%
      </div>
    </button>
  );
}

/* ------------------------------ Chips / Filters --------------------------- */
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${active ? "shadow-sm" : ""}`}
      style={{
        borderColor: TOKENS.border,
        background: active ? TOKENS.chipBg : "#FFFFFF",
        color: active ? TOKENS.brand : TOKENS.textMuted,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Main UI -------------------------------- */
export default function Section4AnchorRiskSnapshot({
  distribution = DEMO_DISTRIBUTION,
  anchors = DEMO_ANCHORS,
  onNavigate,
  onDisavow,
  initialChart, // ignored as per spec (donut only)
  className,
}: Props) {
  const [hoveredOuterIndex, setHoveredOuterIndex] = useState<number | null>(null);

  const [riskFilter, setRiskFilter] = useState<"All" | RiskLevel>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | AnchorType>("All");

  // Cursor for smart popover
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const onChartMouseMove = (e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Derived series (outer: anchor types)
  const series = useMemo(() => {
    const total =
      (distribution["Exact Match"] || 0) +
      (distribution["Partial Match"] || 0) +
      (distribution.Branded || 0) +
      (distribution.Generic || 0) +
      (distribution["Naked URL"] || 0);

    const ordered: { key: any; label: string; count: number; color: string; percent: number; example?: string }[] =
      [
        { key: "Exact Match", label: "Exact Match", example: "best seo agency" },
        { key: "Partial Match", label: "Partial Match", example: "cheap SEO tools" },
        { key: "Branded", label: "Branded", example: "wranker" },
        { key: "Generic", label: "Generic", example: "click here" },
        { key: "Naked URL", label: "Naked URL", example: "https://yourdomain.com" },
      ].map((d:any) => {
        const count = distribution[d.key] || 0;
        const color = typeColor(d.key);
        return { ...d, count, color, percent: pct(count, total) };
      });

    return { ordered, total };
  }, [distribution]);

  const exactPct = useMemo(
    () => (series.total > 0 ? pct(distribution["Exact Match"] || 0, series.total) : 0),
    [distribution, series.total]
  );
  const brandedPct = useMemo(
    () => (series.total > 0 ? pct(distribution.Branded || 0, series.total) : 0),
    [distribution, series.total]
  );
  const genericPct = useMemo(
    () => (series.total > 0 ? pct(distribution.Generic || 0, series.total) : 0),
    [distribution, series.total]
  );

  const showOveruseAlert = exactPct > 25;
  const showDiversityAlert = brandedPct + genericPct < 30;

  const filteredAnchors = useMemo(() => {
    return anchors.filter((a) => {
      const riskOk = riskFilter === "All" ? true : a.risk === riskFilter;
      const typeOk = typeFilter === "All" ? true : a.type === typeFilter;
      return riskOk && typeOk;
    });
  }, [anchors, riskFilter, typeFilter]);

  function handleExport() {
    const rows: string[] = [];
    rows.push(`Section,Metric,Value`);
    rows.push(`Distribution,Total Anchors,${fmt(series.total)}`);
    series.ordered.forEach((d) =>
      rows.push(`Distribution,${d.label},${d.count} (${d.percent.toFixed(1)}%)`)
    );
    rows.push(`\nTop Risky Anchors,Anchor Text,Type,Links,Risk`);
    anchors.forEach((r) =>
      rows.push(
        `Top Risky Anchors,"${r.text.replace(/"/g, '""')}",${r.type},${r.count},${r.risk}`
      )
    );
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "anchor-risk-snapshot.csv");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // active (hovered) context for center label + popover (outer only)
  const activeOuter = hoveredOuterIndex != null ? series.ordered[hoveredOuterIndex] : null;
  const active = activeOuter || null;

  return (
    <section className={className} style={{ fontFamily: FONT_FAMILY }}>
      {/* Section Header (unchanged) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} style={{ color: TOKENS.brand }} />
          <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
            Anchor Spam / Risk Snapshot
          </h3>
          <Info size={16} style={{ color: TOKENS.textMuted }} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:shadow-sm"
            style={{ borderColor: TOKENS.border, color: TOKENS.brand, background: TOKENS.chipBg, cursor: "pointer" }}
            title="Export"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Layout: Chart (left) + Table (right) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------------------- Card 1: Anchor Type Distribution -------------------- */}
        <div
          className="relative flex h-[420px] flex-col rounded-xl border p-4"
          style={{
            borderColor: TOKENS.border,
            background: TOKENS.cardBg,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-medium" style={{ color: TOKENS.text }}>
                Anchor Type Distribution
              </div>
            </div>
            {/* (No donut/bar toggle per spec) */}
            <div className="hidden md:block"></div>
          </div>

          {/* Content area */}
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[58%_auto]">
            {/* Chart */}
            <div
              ref={chartRef}
              className="relative"
              onMouseMove={onChartMouseMove}
              onMouseLeave={() => {
                setHoveredOuterIndex(null);
              }}
            >
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    {/* outer ring (anchor types) */}
                    <Pie
                      data={series.ordered.map((d) => ({ ...d, name: d.label, value: d.count }))}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={72}
                      outerRadius={98}
                      paddingAngle={0}
                      stroke="#FFFFFF"
                      strokeWidth={1}
                      isAnimationActive
                      animationDuration={300}
                      activeIndex={hoveredOuterIndex ?? -1}
                      activeShape={ActiveSlice}
                      onMouseEnter={(_, idx) => {
                        setHoveredOuterIndex(idx);
                      }}
                      onMouseLeave={() => setHoveredOuterIndex(null)}
                      onClick={(p) => {
                        const label = (p?.payload as any)?.label as string;
                        if (!label) return;
                        onNavigate?.({
                          kind: "anchorType",
                          value: label,
                          route: "audit/anchors?type=" + encodeURIComponent(label),
                        });
                      }}
                    >
                      {series.ordered.map((entry, i) => (
                        <Cell key={`outer-${i}`} fill={entry.color} style={{ cursor: "pointer" }} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center leading-tight">
                  <div className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                    {active ? active.label : "Total Anchors"}
                  </div>
                  <div className="text-[20px] font-semibold" style={{ color: TOKENS.text }}>
                    {active
                      ? `${fmt(active.count)} (${active.percent.toFixed(1)}%)`
                      : fmt(series.total)}
                  </div>
                </div>
              </div>

              {/* Smart Popover (above all chart elements) */}
              <SmartPopover
                visible={!!active}
                x={cursor.x}
                y={cursor.y}
                label={active?.label ?? ""}
                count={active?.count ?? 0}
                percent={active?.percent ?? 0}
                color={active?.color ?? TOKENS.brand}
                example={activeOuter?.example}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-col overflow-hidden">
              <div className="space-y-1.5 overflow-auto">
                {series.ordered.map((s) => (
                  <LegendItem
                    key={s.label}
                    color={s.color}
                    label={s.label}
                    count={s.count}
                    percent={s.percent}
                    onClick={() =>
                      onNavigate?.({
                        kind: "anchorType",
                        value: s.label,
                        route: "audit/anchors?type=" + encodeURIComponent(s.label),
                      })
                    }
                  />
                ))}
              </div>

              {/* Helper */}
              <div
                className="mt-3 flex items-center gap-2 text-[12px]"
                style={{ color: TOKENS.textMuted }}
              >
                <ExternalLink size={14} style={{ color: TOKENS.brand }} />
                Click a slice to open the Anchor Audit filtered by type.
              </div>
            </div>
          </div>
        </div>

        {/* --------------------- Card 2: Top Risky Anchors (table) --------------------- */}
        <div
          className="relative flex h-[420px] flex-col rounded-xl border p-4"
          style={{
            borderColor: TOKENS.border,
            background: TOKENS.cardBg,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-[15px] font-medium" style={{ color: TOKENS.text }}>
                Top Risky Anchors
              </div>
              <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                {plural(filteredAnchors.length, "row")}
              </span>
            </div>

            {/* Filters (modern chips + button) */}
            <div className="flex items-center gap-2">
              <Chip title="Filters">
                <SlidersHorizontal size={14} style={{ color: TOKENS.brand }} />
                Filters
              </Chip>
              <Chip active={riskFilter === "All"} onClick={() => setRiskFilter("All")} title="All risks">
                All
              </Chip>
              <Chip active={riskFilter === "High"} onClick={() => setRiskFilter("High")} title="High risk">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.riskHigh }} />
                High
              </Chip>
              <Chip active={riskFilter === "Medium"} onClick={() => setRiskFilter("Medium")} title="Medium risk">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.riskMed }} />
                Medium
              </Chip>
              <Chip active={riskFilter === "Low"} onClick={() => setRiskFilter("Low")} title="Low risk">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.riskLow }} />
                Low
              </Chip>
            </div>
          </div>

          {/* Secondary filters: type */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Chip active={typeFilter === "All"} onClick={() => setTypeFilter("All")} title="All types">
              All Types
            </Chip>
            {(["Exact Match", "Partial Match", "Branded", "Generic", "Naked URL"] as AnchorType[]).map((t) => (
              <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} title={t}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: typeColor(t) }} />
                {t}
              </Chip>
            ))}
          </div>

          {/* Data table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[44%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b text-left" style={{ borderColor: TOKENS.border }}>
                  <th className="py-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
                    Anchor Text
                  </th>
                  <th className="py-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
                    Type
                  </th>
                  <th className="py-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
                    Links
                  </th>
                  <th className="py-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
                    Risk
                  </th>
                  <th className="py-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAnchors.slice(0, 80).map((row, idx) => (
                  <tr
                    key={row.text + idx}
                    className="border-b last:border-0 hover:bg-gray-50"
                    style={{ borderColor: TOKENS.border }}
                    title={row.samplePage ? `Linked page: ${row.samplePage}` : undefined}
                  >
                    <td className="truncate py-2 pr-3 align-top">
                      <button
                        className="line-clamp-2 text-left text-[13.5px] font-medium leading-snug hover:underline"
                        style={{ color: TOKENS.text, cursor: "pointer" }}
                        onClick={() =>
                          onNavigate?.({
                            kind: "anchorText",
                            value: row.text,
                            route: "audit/backlinks?anchor=" + encodeURIComponent(row.text),
                          })
                        }
                      >
                        “{row.text}”
                      </button>
                      {row.samplePage && (
                        <div className="mt-0.5 text-[12px]" style={{ color: TOKENS.textMuted }}>
                          e.g., {row.samplePage}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[12px]"
                        style={{
                          background: TOKENS.chipBg,
                          color: typeColor(row.type),
                          border: `1px solid ${TOKENS.border}`,
                        }}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 align-top text-[13.5px]" style={{ color: TOKENS.text }}>
                      {fmt(row.count)}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <span
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-medium"
                        style={{
                          borderColor: riskHue(row.risk),
                          color: riskHue(row.risk),
                          background: "#FFFFFF",
                        }}
                        aria-label={`${row.risk} risk`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: riskHue(row.risk) }} />
                        {row.risk}
                      </span>
                    </td>
                    <td className="py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-50"
                          style={{ borderColor: TOKENS.border, color: TOKENS.brand, background: TOKENS.chipBg, cursor: "pointer" }}
                          onClick={() =>
                            onNavigate?.({
                              kind: "anchorText",
                              value: row.text,
                              route: "audit/backlinks?anchor=" + encodeURIComponent(row.text),
                            })
                          }
                          title="View links with this anchor"
                        >
                          <Eye size={14} style={{ color: TOKENS.brand }} />
                          View
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-50"
                          style={{ borderColor: TOKENS.riskHigh, color: TOKENS.riskHigh, background: "#FFFFFF", cursor: "pointer" }}
                          onClick={() => onDisavow?.({ anchorText: row.text, type: row.type })}
                          title="Add this anchor’s links to Disavow"
                        >
                          <ShieldOff size={14} style={{ color: TOKENS.brand }} />
                          Disavow
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAnchors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[13.5px]" style={{ color: TOKENS.textMuted }}>
                      No results for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Helper */}
          <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: TOKENS.textMuted }}>
            <ExternalLink size={14} style={{ color: TOKENS.brand }} />
            Click an anchor to open the Backlinks table filtered by that phrase.
          </div>
        </div>
      </div>

      {/* ----------------- Alerts (unchanged logic; visual refresh) ----------------- */}
      {(showOveruseAlert || showDiversityAlert) && (
        <div
          className="mt-4 flex items-start gap-3 rounded-md border-l-4 p-3"
          style={{ background: "#FFF5F6", borderColor: TOKENS.riskHigh }}
          role="alert"
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={18} style={{ color: TOKENS.riskHigh }} />
          <div className="text-[13.5px]" style={{ color: TOKENS.text }}>
            {showOveruseAlert && (
              <div className="font-semibold">Anchor Overuse Detected</div>
            )}
            <div className="mt-0.5">
              {showOveruseAlert && (
                <div>
                  {exactPct.toFixed(1)}% of all backlinks use <b>exact match</b> anchors. This may trigger spam filters
                  or penalties.
                </div>
              )}
              {showDiversityAlert && (
                <div className="mt-1">
                  Anchor diversity is low: only {(brandedPct + genericPct).toFixed(1)}% branded/generic. Diversify with
                  branded or generic anchors.
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors hover:shadow-sm"
                style={{ borderColor: TOKENS.border, color: TOKENS.brand, background: TOKENS.chipBg, cursor: "pointer" }}
                onClick={() =>
                  onNavigate?.({
                    kind: "alert",
                    value: "audit-anchors",
                    route: "audit/anchors?focus=overuse",
                  })
                }
              >
                <Eye size={14} style={{ color: TOKENS.brand }} />
                Audit Anchor Usage
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors hover:shadow-sm"
                style={{ borderColor: TOKENS.border, color: TOKENS.brand, background: TOKENS.chipBg, cursor: "pointer" }}
                onClick={() =>
                  onNavigate?.({
                    kind: "alert",
                    value: "diversify",
                    route: "audit/anchors?focus=diversity",
                  })
                }
              >
                <ExternalLink size={14} style={{ color: TOKENS.brand }} />
                Diversify Anchors
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* Named export for convenience */
export { Section4AnchorRiskSnapshot as AnchorRiskSnapshot };
