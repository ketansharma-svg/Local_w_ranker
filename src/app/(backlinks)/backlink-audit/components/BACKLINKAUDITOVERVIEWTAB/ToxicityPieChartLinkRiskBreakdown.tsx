import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Info,
  PieChart as PieIcon,
  Shield,
  Search,
  Table,
  Download,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from "recharts";

/* ──────────────────────────────────────────────────────────────────────────
   Backlink Audit → Overview → Section 2
   Toxicity Donut + Link Risk Breakdown
   Tailwind + Recharts (no external UI deps)

   ✅ Updated to the latest design tokens & pattern
   ✅ Inter / Inter Fallback fonts
   ✅ Branded icons (#008CCD) for section title + action types
   ✅ Single interactive donut with hover-only animation on the hovered segment
   ✅ Smart popover: follows the cursor near the donut
   ✅ Legends without borders and without hover effects
   ✅ Section container uses half panel width (left-sided)
   ✅ Export button in header
   ✅ Info tooltip shows a popover
   ✅ Pointer cursor for all clickable elements
────────────────────────────────────────────────────────────────────────── */

const TOK = {
  brand: "#008CCD",
  ink: "#0B1220",
  inkMuted: "#667085",
  border: "#E6E8F0",
  cardBg: "#FFFFFF",
  chipBg: "#F5F8FA",
  legendHoverBg: "#F8FAFC",
};

const SLICE = {
  toxic: "#F04438", // red-500
  suspicious: "#F79009", // amber-500
  safe: "#12B76A", // green-600
  disavowed: "#1570EF", // blue-600
  unknown: "#D0D5DD",
};

type SliceKey = "toxic" | "suspicious" | "safe" | "disavowed" | "unknown";

type ToxicityInput = Partial<Record<SliceKey, number>> & {
  /** optional explicit total; otherwise sum of slices is used */
  total?: number;
};

type NavigateTarget = {
  key: SliceKey;
  route?: string;
  title: string;
};

type Props = {
  /** Counts per slice. Missing values default to 0. total is derived if omitted. */
  data?: ToxicityInput;
  /** Called when a slice (or legend item / CTA) is clicked. Use to route. */
  onNavigate?: (target: NavigateTarget) => void;
  /** Optional CTA handlers (fallback to onNavigate with default routes). */
  onAuditToxic?: () => void;
  onOpenDisavow?: () => void;
  onOpenAllLinks?: () => void;
  /** Optional export handler for header Export button. */
  onExport?: () => void;
  className?: string;
};

/* ── helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString(undefined) : "-";

const pct1 = (n: number, d: number) =>
  d > 0 ? Math.round((n / d) * 1000) / 10 : 0; // one decimal

const DEFAULT_ROUTES: Record<SliceKey, string | undefined> = {
  toxic: "audit/ref-domains?filter=toxic",
  suspicious: "audit/ref-domains?filter=suspicious",
  safe: "audit/backlinks?filter=safe",
  disavowed: "audit/disavow",
  unknown: undefined,
};

const SLICE_LABELS: Record<SliceKey, string> = {
  toxic: "Toxic",
  suspicious: "Suspicious",
  safe: "Safe",
  disavowed: "Disavowed",
  unknown: "Uncategorized",
};

const SLICE_DESC: Record<SliceKey, string> = {
  toxic:
    "Flagged for spam signals, link farms, risky anchors, or WR < 20.",
  suspicious:
    "Weak trust signals, over-optimized anchors, or IP/TLD risk.",
  safe:
    "Backlinks that passed all audit checks.",
  disavowed:
    "Already added to the disavow list (manual or auto).",
  unknown:
    "No risk data available yet.",
};

type ViewMode = "percent" | "count";
const VIEW_KEY = "wr_toxicity_view"; // persist last-used view in localStorage

/* ── Smart Popover (follows the cursor near the donut) ─────────────────── */

function SmartPopover({
  visible,
  k,
  value,
  total,
  x,
  y,
}: {
  visible: boolean;
  k: SliceKey | null;
  value: number;
  total: number;
  x: number;
  y: number;
}) {
  if (!visible || !k) return null;
  const color = (SLICE as any)[k] as string;
  const label = SLICE_LABELS[k];
  const percent = pct1(value, total);

  return (
    <div
      className="pointer-events-none absolute rounded-md border bg-white p-3 text-[13px] shadow-md"
      style={{
        borderColor: TOK.border,
        minWidth: 240,
        zIndex: 60,
        left: x + 12,
        top: y + 12,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
        <div className="font-medium" style={{ color: TOK.ink }}>
          {label}
        </div>
      </div>

      <div className="mt-1 text-[13px]" style={{ color: TOK.inkMuted }}>
        <div className="leading-[1.2]">
          <strong style={{ color: TOK.ink }}>{fmt(value)}</strong> backlinks ({percent}
          %)
        </div>
        <div className="mt-1">{SLICE_DESC[k]}</div>
      </div>
    </div>
  );
}

/* ── Active slice renderer (hover animation only on the hovered piece) ── */

function ActiveSlice(props: any) {
  const { outerRadius, ...rest } = props;
  return (
    <g style={{ filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.15))" }}>
      <Sector {...rest} outerRadius={outerRadius + 6} />
    </g>
  );
}

/* ── Main Component ───────────────────────────────────────────────────── */

export default function AuditToxicityBreakdown({
  data,
  onNavigate,
  onAuditToxic,
  onOpenDisavow,
  onOpenAllLinks,
  onExport,
  className,
}: Props) {
  // Persisted view mode
  const [view, setView] = useState<ViewMode>(() => {
    const v =
      (typeof window !== "undefined" &&
        window.localStorage.getItem(VIEW_KEY)) as ViewMode | null;
    return v === "count" ? "count" : "percent";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);

  // Hover / active state for outer slices
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Info tooltip state
  const [showInfo, setShowInfo] = useState(false);

  // Cursor position within the chart wrapper (for smart popover)
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const onChartMouseMove = (e: React.MouseEvent) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Normalize dataset
  const slices = useMemo(() => {
    const d = {
      toxic: data?.toxic ?? 432,
      suspicious: data?.suspicious ?? 980,
      safe: data?.safe ?? 1100,
      disavowed: data?.disavowed ?? 66,
      unknown: data?.unknown ?? 0,
    };
    const total =
      (data?.total && data.total > 0
        ? data.total
        : Object.values(d).reduce((a, b) => a + (b || 0), 0)) || 0;

    const base = (Object.keys(d) as SliceKey[]).map((key) => ({
      key,
      label: SLICE_LABELS[key],
      value: d[key] || 0,
      color: (SLICE as any)[key] as string,
      route: DEFAULT_ROUTES[key],
    }));

    // OUTER donut → the four primary categories
    const outer = base
      .filter((x) => x.value > 0 && x.key !== "unknown")
      .map((x) => ({
        name: x.label,
        value: x.value,
        fill: x.color,
        key: x.key,
      }));

    return {
      total,
      list: base,
      outer,
    };
  }, [data]);

  const activeKey: SliceKey | null =
    activeIndex != null && slices.outer[activeIndex]
      ? (slices.outer[activeIndex] as any).key
      : null;

  const center = useMemo(() => {
    if (!slices.total) return { title: "Total Links", line2: "–" };
    if (activeKey == null) return { title: "Total Links", line2: fmt(slices.total) };
    const s = slices.list.find((x) => x.key === activeKey);
    if (!s) return { title: "Total Links", line2: fmt(slices.total) };
    const p = pct1(s.value, slices.total);
    return { title: s.label, line2: `${fmt(s.value)} (${p}%)` };
  }, [activeKey, slices]);

  const handleSliceClick = (k: SliceKey) => {
    const route = DEFAULT_ROUTES[k];
    if (!route) return;
    onNavigate?.({ key: k, route, title: SLICE_LABELS[k] });
  };

  const LegendItem = ({
    k,
    label,
    value,
    color,
    index,
  }: {
    k: SliceKey;
    label: string;
    value: number;
    color: string;
    index?: number;
  }) => {
    const p = pct1(value, slices.total);
    const primary = view === "percent" ? `${p}%` : fmt(value);
    const secondary = view === "percent" ? fmt(value) : `${p}%`;
    const disabled = value === 0;
    const isActive = index != null && activeIndex === index;

    return (
      <button
        type="button"
        // No hover interactions on legends (per requirement)
        onClick={() => !disabled && handleSliceClick(k)}
        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
        title={label}
        style={
          {
            // No borders on legends
            background: isActive ? TOK.legendHoverBg : "transparent",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
            aria-hidden="true"
          />
          <div>
            <div className="text-[13.5px] font-medium" style={{ color: TOK.ink }}>
              {label}
            </div>
            <div className="text-[12px]" style={{ color: TOK.inkMuted }}>
              {secondary}
            </div>
          </div>
        </div>
        <div className="text-[13.5px] font-semibold" style={{ color }}>
          {primary}
        </div>
      </button>
    );
  };

  return (
    <section
      className={`w-full ${className ?? ""}`}
      style={{
        fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui",
      }}
    >
      <div
        className="relative rounded-2xl border p-4 sm:p-5 shadow-sm"
        style={{
          borderColor: TOK.border,
          background: TOK.cardBg,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}
        aria-label="Backlink Toxicity Breakdown"
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="relative flex items-center gap-2">
            <PieIcon size={18} color={TOK.brand} aria-hidden="true" />
            <h3 className="text-[16px] font-semibold" style={{ color: TOK.ink }}>
              Toxicity Breakdown
            </h3>

            {/* Info tooltip with popover */}
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              className="ml-1 inline-flex items-center justify-center rounded p-0.5 transition hover:opacity-80 focus:outline-none"
              aria-haspopup="dialog"
              aria-expanded={showInfo}
              title="About this section"
              style={{ color: TOK.inkMuted, cursor: "pointer" }}
            >
              <Info size={16} />
            </button>
            {showInfo && (
              <div
                className="absolute left-6 top-7 z-[70] w-[280px] rounded-md border bg-white p-3 text-[13px] shadow-lg"
                style={{ borderColor: TOK.border }}
                role="dialog"
                aria-label="Toxicity Breakdown Info"
              >
                <div className="mb-1 font-medium" style={{ color: TOK.ink }}>
                  What am I seeing?
                </div>
                <p style={{ color: TOK.inkMuted }}>
                  Distribution of Toxic, Suspicious, Safe, and Disavowed backlinks.
                  Hover segments for details. Click a segment or legend to drill down.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* % ↔ Count toggle */}
            <div
              className="inline-flex overflow-hidden rounded-full border"
              style={{ borderColor: TOK.border }}
              role="tablist"
              aria-label="Toggle percent or count view"
            >
              <button
                role="tab"
                aria-selected={view === "percent"}
                onClick={() => setView("percent")}
                className={`px-3 py-1.5 text-[12.5px] ${
                  view === "percent" ? "font-semibold" : "text-gray-600"
                }`}
                style={{ cursor: "pointer" }}
              >
                % View
              </button>
              <button
                role="tab"
                aria-selected={view === "count"}
                onClick={() => setView("count")}
                className={`px-3 py-1.5 text-[12.5px] ${
                  view === "count" ? "font-semibold" : "text-gray-600"
                }`}
                style={{ cursor: "pointer" }}
              >
                Count View
              </button>
            </div>

            {/* Export button */}
            <button
              type="button"
              onClick={() => {
                if (onExport) onExport();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition hover:shadow"
              title="Export breakdown"
              style={{
                borderColor: TOK.border,
                background: TOK.chipBg,
                color: TOK.brand,
                cursor: "pointer",
              }}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Layout: chart (left) + legend (right) */}
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Chart */}
          <div
            ref={chartRef}
            className="relative md:col-span-7"
            onMouseMove={onChartMouseMove}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="h-[260px] sm:h-[300px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Single outer ring (interactive) */}
                  <Pie
                    data={slices.outer}
                    dataKey="value"
                    innerRadius="62%"
                    outerRadius="86%"
                    paddingAngle={0}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                    isAnimationActive
                    activeIndex={activeIndex ?? -1}
                    activeShape={ActiveSlice}
                    onMouseEnter={(_, idx) => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(_, idx) => {
                      const k = (slices.outer[idx] as any)?.key as
                        | SliceKey
                        | undefined;
                      if (k) handleSliceClick(k);
                    }}
                  >
                    {slices.outer.map((entry, i) => (
                      <Cell
                        key={`outer-${i}`}
                        fill={entry.fill}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center leading-tight">
                <div
                  className="text-[12.5px] uppercase tracking-wide"
                  style={{ color: TOK.inkMuted }}
                >
                  {center.title}
                </div>
                <div className="text-[18px] font-bold" style={{ color: TOK.ink }}>
                  {center.line2}
                </div>
              </div>
            </div>

            {/* Smart Popover (near cursor & donut) */}
            <SmartPopover
              visible={activeKey != null}
              k={activeKey}
              value={
                activeKey
                  ? slices.list.find((x) => x.key === activeKey)?.value ?? 0
                  : 0
              }
              total={slices.total}
              x={cursor.x}
              y={cursor.y}
            />
          </div>

          {/* Legend */}
          <div className="relative md:col-span-5">
            <div className="grid w-full grid-cols-1 gap-1.5">
              {slices.outer.map((s, idx) => (
                <LegendItem
                  key={s.key as string}
                  k={(s as any).key as SliceKey}
                  label={s.name as string}
                  value={s.value as number}
                  color={s.fill as string}
                  index={idx}
                />
              ))}
              {/* Unknown (if present), display but disabled */}
              {slices.list.find((x) => x.key === "unknown" && x.value > 0) && (
                <LegendItem
                  k="unknown"
                  label={SLICE_LABELS.unknown}
                  value={slices.list.find((x) => x.key === "unknown")!.value}
                  color={SLICE.unknown}
                />
              )}
            </div>
          </div>
        </div>

        {/* CTA block (icons use brand color) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onAuditToxic
                ? onAuditToxic()
                : onNavigate?.({
                    key: "toxic",
                    route: DEFAULT_ROUTES.toxic,
                    title: "Toxic",
                  })
            }
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:shadow"
            style={{
              borderColor: TOK.border,
              background: TOK.chipBg,
              color: TOK.brand,
              cursor: "pointer",
            }}
            title="Open Toxic links filtered table"
          >
            <Search size={16} color={TOK.brand} />
            <span>Audit Toxic Links</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenDisavow
                ? onOpenDisavow()
                : onNavigate?.({
                    key: "disavowed",
                    route: DEFAULT_ROUTES.disavowed,
                    title: "Disavowed",
                  })
            }
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:shadow"
            style={{
              borderColor: TOK.border,
              background: TOK.chipBg,
              color: TOK.brand,
              cursor: "pointer",
            }}
            title="Open Disavow Manager"
          >
            <Shield size={16} color={TOK.brand} />
            <span>Open Disavow Manager</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenAllLinks
                ? onOpenAllLinks()
                : onNavigate?.({
                    key: "safe",
                    route: "audit/backlinks",
                    title: "All Backlinks",
                  })
            }
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:shadow"
            style={{
              borderColor: TOK.border,
              background: TOK.chipBg,
              color: TOK.brand,
              cursor: "pointer",
            }}
            title="Open full backlink table"
          >
            <Table size={16} color={TOK.brand} />
            <span>View Full Backlink Table</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* Named export for convenience */
export { AuditToxicityBreakdown as ToxicityBreakdown };
