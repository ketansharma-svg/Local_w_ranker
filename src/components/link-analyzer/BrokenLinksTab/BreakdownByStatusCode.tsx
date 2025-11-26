"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Sector,
  Tooltip as RTooltip,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  Download,
  ChevronDown,
  FileX,
  CircleX,
  Timer,
  Globe,
  ServerCrash,
} from "lucide-react";
import { useBrokenLinksData } from "../broken-links-tab";

/**
 * Wranker • Broken Links — Section 3: Breakdown by Status Code (Donut/Bar)
 * Refinements applied (per request):
 * 1) Donut: vertical legend is aligned in the same row as the donut (side-by-side).
 * 2) Bar: chart fills the card area; no scrollbars. Legends are a single horizontal row and fully visible.
 * 3) Donut/Bar toggle is in the section header (left of Export). Refresh removed.
 */

const TOKENS = {
  brand: "#008CCD",
  coreBlue: "#4286F5",
  critical: "#E94134",
  orange: "#F97316",
  warning: "#F9BB04",
  muted: "#6B7280",
  text: "#111827",
  border: "#EFF0F6",
};

type StatusKey = "404" | "410" | "timeout" | "dns" | "5xx" | "error" | "other";
type BreakdownRow = { status: StatusKey; count: number; pct: number; label: string; desc?: string };
interface BreakdownPayload {
  total: number;
  breakdown: BreakdownRow[];
  updatedAt: string;
}

const STATUS_COLORS: Record<StatusKey, string> = {
  "404": TOKENS.critical,
  "410": TOKENS.orange,
  timeout: TOKENS.warning,
  dns: TOKENS.muted,
  "5xx": TOKENS.coreBlue,
  error: TOKENS.orange,
  other: "#94A3B8",
};

const STATUS_ICONS: Record<StatusKey, React.ComponentType<{ className?: string }>> = {
  "404": FileX,
  "410": CircleX,
  timeout: Timer,
  dns: Globe,
  "5xx": ServerCrash,
  error: CircleX,
  other: CircleX,
};


const normalizeStatusKey = (code: unknown): StatusKey => {
  if (code === 404 || code === "404") return "404";
  if (code === 410 || code === "410") return "410";
  const text = String(code ?? "").toLowerCase();
  if (text.includes("timeout")) return "timeout";
  if (text.includes("dns")) return "dns";
  if (text.startsWith("5")) return "5xx";
  if (text.includes("error")) return "error";
  return "other";
};

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const WR_FONT: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* ----------------------- Smart Popovers ----------------------- */

function DonutSmartPopover({ hoverKey, all }: { hoverKey: StatusKey | null; all: BreakdownRow[] }) {
  return (
    <div
      className="pointer-events-none z-50 rounded-md border bg-white px-3 py-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      <div className="mb-1 text-[11px] font-semibold text-gray-500">Breakdown</div>
      <div className="flex flex-col gap-1">
        {all.map((d) => {
          const Icon = STATUS_ICONS[d.status];
          const isHover = d.status === hoverKey;
          return (
            <div
              key={d.status}
              className={`flex items-center justify-between gap-4 rounded ${isHover ? "bg-gray-50" : ""}`}
              style={{ padding: "2px 4px" }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
                <Icon className="h-3.5 w-3.5" />
                <span className="text-gray-600">{d.label}</span>
              </div>
              <div className="font-semibold">
                {d.count} · {Math.round(d.pct)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarSmartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as BreakdownRow;
  const Icon = STATUS_ICONS[p.status];
  return (
    <div className="rounded-md border px-3 py-2 text-xs shadow" style={{ background: "#fff", borderColor: TOKENS.border, color: TOKENS.text }}>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-gray-600">
        <Icon className="h-3.5 w-3.5" />
        <span>{p.label}</span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[p.status] }} />
          <span className="text-gray-600">Value</span>
        </div>
        <div className="font-semibold">
          {p.count} · {Math.round(p.pct)}%
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Donut Active Slice ----------------------- */
function ActiveSlice(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g filter="url(#donutHoverShadow)">
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

/* ----------------------- Legends ----------------------- */

function LegendList({
  data,
  onClick,
  onHover,
  active,
  hovered,
}: {
  data: BreakdownRow[];
  onClick: (s: StatusKey) => void;
  onHover: (s: StatusKey | null) => void;
  active: StatusKey | null;
  hovered: StatusKey | null;
}) {
  return (
    <ul className="space-y-1">
      {data.map((d) => {
        const Icon = STATUS_ICONS[d.status];
        const isActive = active === d.status;
        const isHover = hovered === d.status;
        return (
          <li key={d.status}>
            <button
              onMouseEnter={() => onHover(d.status)}
              onMouseLeave={() => onHover(null)}
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50
                ${isActive ? "bg-[#D9EEF8] outline outline-1 outline-[#008CCD]" : ""}
                ${isHover && !isActive ? "ring-1 ring-[#D9EEF8]" : ""}`}
              onClick={() => onClick(d.status)}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
                <Icon className="h-4 w-4 text-[#008CCD]" />
                {d.label}
              </span>
              <span>
                {d.count} · {Math.round(d.pct)}%
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Bar legend row — single horizontal line; compact to fit the card */
const SHORT_LABEL: Record<StatusKey, string> = {
  "404": "404",
  "410": "410",
  timeout: "Timeout",
  dns: "DNS",
  "5xx": "5xx",
  error: "Error",
  other: "Other",
};
function BarLegendRow({ data }: { data: BreakdownRow[] }) {
  return (
    <div className="pointer-events-none absolute left-2 right-2 top-2 z-20 flex items-center justify-center gap-2 whitespace-nowrap">
      {data.map((d) => {
        const Icon = STATUS_ICONS[d.status];
        return (
          <div
            key={d.status}
            className="flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 shadow"
            style={{ border: `1px solid ${TOKENS.border}` }}
            title={d.label}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
            <Icon className="h-3 w-3 text-#008CCD" />
            <span className="text-[10px] leading-none text-gray-700">{SHORT_LABEL[d.status]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** X-axis icon tick — compact so it won't collide with bars */
function StatusIconTick(props: any) {
  const { x, y, payload } = props;
  const key = payload?.value as StatusKey;
  const Icon = STATUS_ICONS[key] ?? FileX;
  return (
    <g transform={`translate(${x - 8}, ${y + 6})`} aria-label={key}>
      <Icon className="h-4 w-4 text-#008CCD" />
      <title>{key}</title>
    </g>
  );
}

/* ----------------------- Donut helpers ----------------------- */
const DONUT = { inner: 70, outer: 110, gap: 14, startAngle: 90 };

function computeDonutSide(index: number, rows: BreakdownRow[]): "left" | "right" {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  let start = DONUT.startAngle;
  for (let i = 0; i < rows.length; i++) {
    const sliceAngle = (rows[i].count / total) * 360;
    if (i === index) {
      const mid = start - sliceAngle / 2;
      const norm = ((mid % 360) + 360) % 360;
      return norm > 90 && norm < 270 ? "left" : "right";
    }
    start -= sliceAngle;
  }
  return "right";
}

/* ----------------------- Main ----------------------- */
export default function BrokenLinksStatusBreakdownDemo() {
  const { data, loading, error, refetch } = useBrokenLinksData();
  const [view, setView] = useState<"donut" | "bar">("donut");
  const [activeStatus, setActiveStatus] = useState<StatusKey | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<StatusKey | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [donutSide, setDonutSide] = useState<"left" | "right">("right");

  const payload = useMemo<BreakdownPayload>(() => {
    const bucketList = Array.isArray(data?.status_breakdown?.buckets)
      ? data?.status_breakdown?.buckets
      : [];
    const mapped = bucketList.map((bucket) => {
      const status = normalizeStatusKey(bucket?.code);
      const count = toNumber(bucket?.count);
      const total = toNumber(data?.status_breakdown?.total ?? data?.summary?.total);
      const pct =
        bucket?.percent !== null && bucket?.percent !== undefined
          ? toNumber(bucket?.percent)
          : total > 0
          ? (count / total) * 100
          : 0;
      const label =
        typeof bucket?.label === "string" && bucket.label.trim().length
          ? bucket.label
          : status === "404"
          ? "404 Not Found"
          : status === "410"
          ? "410 Gone"
          : status === "timeout"
          ? "Timeout / Unreachable"
          : status === "dns"
          ? "DNS Error / Malformed"
          : status === "5xx"
          ? "5xx Server Errors"
          : status === "error"
          ? "Error"
          : "Other";
      return {
        status,
        count,
        pct,
        label,
        desc: label,
      } satisfies BreakdownRow;
    });

    const anyCounts = mapped.some((row) => row.count > 0);
    const breakdown = anyCounts ? mapped.filter((row) => row.count > 0) : mapped;

    const updatedAt =
      (Array.isArray(data?.trend) && data.trend.length > 0 ? data.trend[data.trend.length - 1]?.date : undefined) ??
      (data?.summary as any)?.updated_at ??
      new Date().toISOString();

    return {
      total: toNumber(data?.status_breakdown?.total ?? data?.summary?.total),
      breakdown,
      updatedAt,
    };
  }, [data]);

  const rows = payload.breakdown;
  const total = payload.total;
  const hasCountData = rows.some((row) => row.count > 0);

  const activeIndex = useMemo(
    () => rows.findIndex((x) => x.status === hoveredStatus),
    [rows, hoveredStatus],
  );

  return (
 
      <div className="bg-white rounded-md border border-[#EFF0F6] shadow-sm">
        {/* Section Header — Toggle moved here (left of Export) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFF0F6]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#008CCD]" />
            <h2 className="text-lg font-semibold text-[#111827]">Breakdown by Status Code</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle (Donut / Bar) */}
            <div className="flex overflow-hidden rounded-md border border-[#EFF0F6]" role="tablist" aria-label="View switcher">
              <button
                role="tab"
                aria-selected={view === "donut"}
                onClick={() => setView("donut")}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "donut" ? "bg-[#D9EEF8] text-[#008CCD]" : "hover:bg-gray-50"}`}
              >
                <PieIcon className="h-4 w-4" /> Donut
              </button>
              <button
                role="tab"
                aria-selected={view === "bar"}
                onClick={() => setView("bar")}
                className={`flex items-center gap-1 border-l border-[#EFF0F6] px-3 py-1.5 text-sm ${view === "bar" ? "bg-[#D9EEF8] text-[#008CCD]" : "hover:bg-gray-50"}`}
              >
                <BarChart3 className="h-4 w-4" /> Bar
              </button>
            </div>

            {/* Export */}
            <div className="relative">
              <button
                className="flex items-center gap-1 rounded-md border border-[#EFF0F6] px-3 py-1.5 text-sm bg-white hover:bg-gray-50"
                onClick={() => setExportOpen((o) => !o)}
              >
                <Download className="h-4 w-4" /> Export <ChevronDown className="h-3 w-3" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-[#EFF0F6] bg-white shadow-sm">
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      alert("Export PNG");
                      setExportOpen(false);
                    }}
                  >
                    PNG
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      alert("Export SVG");
                      setExportOpen(false);
                    }}
                  >
                    SVG
                  </button>
                  <label className="flex items-center gap-2 border-t border-[#EFF0F6] px-3 py-2 text-sm text-gray-700">
                    <input type="checkbox" className="accent-[#008CCD]" defaultChecked /> Include in Report
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart + Legend row (ALWAYS side-by-side for donut) */}
        <div className="grid grid-cols-12 gap-4 p-4">
          {/* Chart area */}
          <div className={`relative ${view === "donut" ? "col-span-7 h-[320px]" : "col-span-12 h-[360px]"}`}>
            {loading && <div className="flex h-full items-center justify-center">Loading…</div>}
            {!loading && payload && (
              <ResponsiveContainer width="100%" height="100%">
                {view === "donut" ? (
                  <PieChart>
                    <defs>
                      <filter id="donutHoverShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.18" />
                      </filter>
                    </defs>
                    <Pie
                      data={payload.breakdown}
                      dataKey="count"
                      cx="50%"
                      cy="50%"
                      innerRadius={DONUT.inner}
                      outerRadius={DONUT.outer}
                      startAngle={DONUT.startAngle}
                      endAngle={-270}
                      isAnimationActive
                      activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                      activeShape={ActiveSlice}
                      onMouseEnter={(_, i) => {
                        setHoveredStatus(payload.breakdown[i].status);
                        setDonutSide(computeDonutSide(i, payload.breakdown));
                      }}
                      onMouseLeave={() => setHoveredStatus(null)}
                      onClick={(d) => setActiveStatus((d.payload as BreakdownRow).status)}
                    >
                      {payload.breakdown.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status]}
                          fillOpacity={hoveredStatus && hoveredStatus !== entry.status ? 0.6 : 1}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    data={payload.breakdown}
                    barCategoryGap={24}
                    margin={{ top: 52, right: 16, left: 8, bottom: 18 }}
                    onMouseLeave={() => {
                      setHoveredBarIndex(null);
                      setHoveredStatus(null);
                    }}
                  >
                    <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="status"
                      tick={(props) => <StatusIconTick {...props} />}
                      tickMargin={8}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      interval={0}
                      height={26}
                    />
                    <YAxis />
                    <RTooltip content={<BarSmartTooltip />} wrapperStyle={{ zIndex: 50 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(d: any) => setActiveStatus((d.payload as BreakdownRow).status)}>
                      {payload.breakdown.map((entry, idx) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status]}
                          onMouseEnter={() => {
                            setHoveredBarIndex(idx);
                            setHoveredStatus(entry.status);
                          }}
                          onMouseLeave={() => {
                            setHoveredBarIndex(null);
                            setHoveredStatus(null);
                          }}
                          opacity={hoveredBarIndex !== null && hoveredBarIndex !== idx ? 0.8 : 1}
                        />
                      ))}
                      <LabelList dataKey="pct" formatter={(v: number) => `${Math.round(v)}%`} position="top" className="fill-gray-700 text-[10px]" />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}

            {/* Donut center total */}
            {view === "donut" && payload && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-semibold">{total}</div>
                  <div className="text-xs text-gray-500">Total broken links</div>
                </div>
              </div>
            )}

            {/* Donut smart popover (left/right of donut; never covers) */}
            {view === "donut" && payload && hoveredStatus && (
              <div className="pointer-events-none absolute inset-0 z-50">
                <div
                  className="absolute -translate-y-1/2"
                  style={{
                    top: "50%",
                    left: donutSide === "left" ? `calc(50% - ${DONUT.outer + DONUT.gap}px)` : `calc(50% + ${DONUT.outer + DONUT.gap}px)`,
                    transform: donutSide === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)",
                  }}
                >
                  <DonutSmartPopover hoverKey={hoveredStatus} all={payload.breakdown} />
                </div>
              </div>
            )}

            {/* Bar chart: single-row legend inside the card (always visible, compact) */}
            {view === "bar" && payload && <BarLegendRow data={payload.breakdown} />}
          </div>

          {/* Donut legend — aligned in the same row; hidden in Bar view */}
          {view === "donut" && (
            <div className="col-span-5">
              {payload && (
                <LegendList
                  data={payload.breakdown}
                  active={activeStatus}
                  hovered={hoveredStatus}
                  onClick={setActiveStatus}
                  onHover={setHoveredStatus}
                />
              )}
            </div>
          )}
        </div>
      </div>

  );
}






