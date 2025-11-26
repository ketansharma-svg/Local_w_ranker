"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  SquareStack, // section icon (brand)
  Sparkles,
  SquareStack as PAAIcon,
  Video,
  Image as ImageIcon,
  Brain,
  MapPin,
  Newspaper,
  MessageSquare,
  BookOpen,
  Tag,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronDown as ArrowDown,
  ArrowUpRight,
  Link as LinkIcon,
  Lock,
  RefreshCcw,
} from "lucide-react";

/* =============================================================================
   SERP Features (Tab 3) — Drop‑in React/Tailwind TSX
   - Inter / Inter Fallback fonts; no emoji
   - Branded (#008CCD) icons for section title & actions
   - Hyperlink color preserved for deep links
   - Tooltip uses colored dot annotations (Triggered/Owned/Missed)
   - Shows a line for "missed" alongside "owned"
   - Bar hover: *only the hovered bar* slightly dims + subtle lift animation
   - Time toggle moved to the right side of the filters bar
   - Modern chips/buttons; pointer cursors on interactive controls
   - Tokens mapped to Wranker design tokens. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}
   ============================================================================ */

/* ───────────────────────────────── TOKENS (Wranker) ───────────────────────────────── */
const TK = {
  brand: "var(--wr-brand,#008CCD)",
  brandHover: "var(--wr-brand-600,#007BB8)",
  panel: "var(--wr-bg-panel,#FFFFFF)",
  app: "var(--wr-bg-app,#F5F7FA)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-text-muted,#6B7280)",
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-border-subtle,#EFF0F6)",
  focus: "var(--wr-focus,#4286F5)",
  success: "var(--wr-success,#34A853)",
  danger: "var(--wr-critical,#E94134)",
  valueBlue: "var(--wr-value-blue,#4286F5)",
  pastelBrand: "var(--wr-brand-50,#D9EEF8)",
  shadowSm: "0 1px 3px rgba(0,0,0,0.1)",
};

/* ───────────────────────────────── TYPES & FEATURE META ───────────────────────────────── */
type FeatureKey =
  | "FS" // Featured Snippet
  | "PAA"
  | "IMG"
  | "VID"
  | "KP"
  | "LOCAL"
  | "STORIES"
  | "DISCUSS"
  | "TTK"
  | "BRANDS";

type SeriesPoint = { date: string; triggered: number; owned: number };
type FeatureRow = {
  key: FeatureKey;
  label: string;
  color: string;
  Icon: React.ComponentType<any>;
  series: SeriesPoint[];
  competitorOwner?: string;
};

const FEATURE_META: Record<
  FeatureKey,
  { label: string; color: string; Icon: React.ComponentType<any> }
> = {
  FS: { label: "Featured Snippet", color: "#16A34A", Icon: Sparkles },
  PAA: { label: "People Also Ask", color: "#3B82F6", Icon: PAAIcon },
  IMG: { label: "Image Pack", color: "#F59E0B", Icon: ImageIcon },
  VID: { label: "Video", color: "#8B5CF6", Icon: Video },
  KP: { label: "Knowledge Panel", color: "#14B8A6", Icon: Brain },
  LOCAL: { label: "Local Pack", color: "#FB7185", Icon: MapPin },
  STORIES: { label: "Top Stories", color: "#EF4444", Icon: Newspaper },
  DISCUSS: { label: "Discussions", color: "#0EA5E9", Icon: MessageSquare },
  TTK: { label: "Things to Know", color: "#6366F1", Icon: BookOpen },
  BRANDS: { label: "Explore Brands", color: "#A855F7", Icon: Tag },
};

/* ───────────────────────────────── DEMO DATA (deterministic) ───────────────────────────────── */
function addDays(base: Date, delta: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}
function fmtShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function makeSeries(points = 30, seed = 1): SeriesPoint[] {
  const base = addDays(new Date(), -points);
  const out: SeriesPoint[] = [];
  for (let i = 1; i <= points; i++) {
    const t = i + seed;
    const wave = Math.max(0, Math.round(8 + 6 * Math.sin(t / 3)));
    const noise = Math.max(0, Math.round((seed % 3) + Math.random() * 4));
    const triggered = wave + noise + (seed % 5);
    const owned = Math.max(
      0,
      Math.min(triggered, Math.round(triggered * (0.25 + (seed % 4) * 0.12)))
    );
    out.push({ date: fmtShort(addDays(base, i)), triggered, owned });
  }
  return out;
}
function makeDemoRows(): FeatureRow[] {
  return (Object.keys(FEATURE_META) as FeatureKey[]).map((k, i) => ({
    key: k,
    label: FEATURE_META[k].label,
    color: FEATURE_META[k].color,
    Icon: FEATURE_META[k].Icon,
    series: makeSeries(30, i + 1),
    competitorOwner: Math.random() > 0.6 ? "semrush.com" : undefined,
  }));
}

/* ───────────────────────────────── UTILS ───────────────────────────────── */
const compact = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact" }).format(n);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const today = (r: FeatureRow) => r.series[r.series.length - 1];
const prev = (r: FeatureRow) =>
  r.series[r.series.length - 2] ?? r.series[r.series.length - 1];

function exportCSVFile(name: string, lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportChartPNG(el: HTMLElement | null, filename = "serp_features.png") {
  if (!el) return;
  const svg = el.querySelector("svg");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const str = serializer.serializeToString(svg);
  const img = new Image();
  const rect = svg.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const ctx = canvas.getContext("2d");
  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(str);
}

/* ───────────────────────────────── Tooltip (smart popover w/ colored dots) ───────────────────────────────── */
const Dot = ({ c }: { c: string }) => (
  <span
    className="inline-block h-2.5 w-2.5 rounded-[3px]"
    style={{ background: c }}
    aria-hidden
  />
);

const ChartTooltip: React.FC<any> = ({ active, label, payload }) => {
  if (!active || !payload?.length) return null;
  const trig = payload.find((p: any) => p.dataKey === "triggered")?.value ?? 0;
  const own = payload.find((p: any) => p.dataKey === "owned")?.value ?? 0;
  const miss = Math.max(0, trig - own);
  return (
    <div
      className="rounded-md border bg-white p-2 text-sm shadow-sm"
      style={{ borderColor: TK.border, minWidth: 220 }}
    >
      <div className="mb-1 text-[11px]" style={{ color: TK.muted }}>
        {label}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dot c={TK.valueBlue} />
          <span>Triggered</span>
        </div>
        <span className="font-semibold">{trig}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dot c={TK.success} />
          <span>Owned</span>
        </div>
        <span className="font-semibold" style={{ color: TK.success }}>
          {own}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dot c={TK.danger} />
          <span>Missed</span>
        </div>
        <span className="font-semibold" style={{ color: TK.danger }}>
          {miss}
        </span>
      </div>
    </div>
  );
};

/* ───────────────────────────────── PROPS ───────────────────────────────── */
type Props = {
  isPro?: boolean;
  device?: "desktop" | "mobile";
  country?: string;
  initialRange?: "7d" | "30d" | "90d";
  rows?: FeatureRow[];
  onDeepLink?: (params: { feature: FeatureKey }) => void;
};

/* ───────────────────────────────── COMPONENT ───────────────────────────────── */
export default function SerpFeaturesTab({
  isPro = true,
  device = "desktop",
  country = "US",
  initialRange = "30d",
  rows: incoming,
  onDeepLink,
}: Props) {
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">(initialRange);
  const [rows] = React.useState<FeatureRow[]>(
    () => (incoming?.length ? incoming : makeDemoRows())
  );
  const [selected, setSelected] = React.useState<FeatureKey | null>(null);
  const chartRef = React.useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Chart hover emphasis (only hovered bar changes)
  const [hoverBar, setHoverBar] = React.useState<number | null>(null);

  const sliceN = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const sliced = React.useMemo(() => {
    const clamp = (s: SeriesPoint[]) => s.slice(-sliceN);
    return rows.map((r) => ({ ...r, series: clamp(r.series) }));
  }, [rows, sliceN]);

  const sorted = React.useMemo(() => {
    const score = (r: FeatureRow) => {
      const t = today(r);
      return [t.owned, t.triggered, r.label];
    };
    return [...sliced].sort((a, b) => {
      const A = score(a) as any;
      const B = score(b) as any;
      if (A[0] !== B[0]) return B[0] - A[0];
      if (A[1] !== B[1]) return B[1] - A[1];
      return A[2].localeCompare(B[2]);
    });
  }, [sliced]);

  // Aggregated series
  const chartSeries = React.useMemo(() => {
    const base = selected ? sliced.filter((r) => r.key === selected) : sliced;
    const dates = base[0]?.series.map((p) => p.date) ?? [];
    return dates.map((d, idx) => {
      const triggered = sum(base.map((r) => r.series[idx]?.triggered ?? 0));
      const owned = sum(base.map((r) => r.series[idx]?.owned ?? 0));
      const missed = Math.max(0, triggered - owned);
      return { date: d, triggered, owned, missed };
    });
  }, [sliced, selected]);

  const todayTotals = React.useMemo(() => {
    const t = {
      triggered: sum(sliced.map((r) => today(r).triggered)),
      owned: sum(sliced.map((r) => today(r).owned)),
    };
    return t;
  }, [sliced]);
  const coveragePct =
    todayTotals.triggered > 0
      ? Math.round((todayTotals.owned / todayTotals.triggered) * 100)
      : 0;

  function exportTableCSV() {
    const lines = [
      "Feature,Present?,Owned?,Triggered,Owned,Missed,Coverage%,Change (Triggered),Competitor Owner",
      ...sorted.map((r) => {
        const t = today(r),
          p = prev(r);
        const present = t.triggered > 0 ? "Yes" : "No";
        const owned = t.owned > 0 ? "Yes" : "No";
        const missed = Math.max(0, t.triggered - t.owned);
        const cov = t.triggered
          ? Math.round((t.owned / t.triggered) * 100)
          : 0;
        const delta = t.triggered - (p?.triggered ?? 0);
        return [
          r.label,
          present,
          owned,
          t.triggered,
          t.owned,
          missed,
          cov,
          delta > 0 ? `+${delta}` : `${delta}`,
          r.competitorOwner ?? "",
        ].join(",");
      }),
    ];
    exportCSVFile("serp_features_table.csv", lines);
  }
  function exportChartCSV() {
    const lines = [
      "date,triggered,owned,missed",
      ...chartSeries.map(
        (p) => `${p.date},${p.triggered},${p.owned},${p.missed}`
      ),
    ];
    exportCSVFile(
      selected ? `serp_feature_${selected}_trend.csv` : "serp_features_trend.csv",
      lines
    );
  }
  function reload() {
    setLoading(true);
    setTimeout(() => setLoading(false), 700);
  }

  /* ───────────────────────────────── RENDER ───────────────────────────────── */
  return (
    <section
      className="w-full rounded-xl border bg-white"
      style={{
        borderColor: TK.border,
        boxShadow: TK.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-labelledby="sf-title"
    >
      {/* Section header — title + export in header (brand icon) */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <SquareStack size={18} color={TK.brand as string} className="shrink-0" />
          <h3
            id="sf-title"
            className="truncate text-[16px] font-semibold"
            style={{ color: TK.text }}
          >
            SERP Features
          </h3>
          <span className="text-xs" style={{ color: TK.muted }}>
            {selected
              ? `Viewing ${FEATURE_META[selected].label} · ${device} · ${country}`
              : `All features · ${device} · ${country}`}
          </span>
        </div>

        {/* Export (in header) */}
        <div className="relative ml-auto">
          <details className="group relative">
            <summary
              className="flex h-9 list-none items-center gap-2 rounded-md border px-3"
              style={{
                borderColor: TK.border,
                background: "#FFF",
                color: TK.text,
                cursor: "pointer",
              }}
              title="Export"
            >
              <Download className="h-4 w-4" color={TK.brand as string} />
              Export
              <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
            </summary>
            <div
              className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-lg"
              style={{ borderColor: TK.border }}
            >
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  exportChartPNG(
                    chartRef.current,
                    selected ? `serp_feature_${selected}.png` : "serp_features.png"
                  )
                }
              >
                PNG (chart)
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                style={{ cursor: "pointer" }}
                onClick={exportChartCSV}
              >
                CSV (chart)
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                style={{ cursor: "pointer" }}
                onClick={exportTableCSV}
              >
                CSV (table)
              </button>
              <button
                className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
                title="PDF export is Pro via Reports"
              >
                PDF (Pro)
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Filters bar — Reset (left) • Time toggle (right) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {selected && (
            <button
              type="button"
              className="h-9 rounded-md border px-3 text-sm font-medium"
              style={{
                borderColor: TK.border,
                color: TK.text,
                background: "#FFF",
                cursor: "pointer",
              }}
              onClick={() => setSelected(null)}
              title="Reset to all features"
            >
              <RefreshCcw className="mr-1 inline h-4 w-4" />
              Reset
            </button>
          )}
        </div>

        {/* Time toggle moved to the RIGHT side */}
        <div
          className="inline-flex items-center rounded-md border"
          style={{ borderColor: TK.border }}
        >
          {(["7d", "30d", "90d"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`h-9 px-3 text-sm transition-colors ${
                range === v ? "font-semibold" : "font-medium"
              }`}
              style={{
                background: range === v ? TK.pastelBrand : "#FFF",
                color: TK.text,
                cursor: "pointer",
              }}
              onClick={() => setRange(v)}
              aria-pressed={range === v}
              title={`Show ${v}`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI / Highlight */}
      <div className="px-4 pb-2">
        <div
          className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm"
          style={{ borderColor: TK.borderLight, background: "#F8FAFC" }}
          aria-live="polite"
        >
          <Info className="h-4 w-4 text-[#64748B]" />
          <span>
            <strong>{todayTotals.owned}</strong> owned of{" "}
            <strong>{todayTotals.triggered}</strong> triggered features today ·
            Coverage{" "}
            <span
              className="font-semibold"
              style={{
                color:
                  coveragePct >= 60
                    ? TK.success
                    : coveragePct >= 30
                    ? "#F59E0B"
                    : TK.danger,
              }}
            >
              {coveragePct}%
            </span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="px-4 pb-2">
        <div
          className="h-[240px] w-full rounded-md border"
          style={{ borderColor: TK.borderLight, background: "#FFF" }}
        >
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-md bg-gray-100" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartSeries}
                margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                onMouseLeave={() => setHoverBar(null)}
              >
                <CartesianGrid vertical={false} stroke={TK.borderLight} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickMargin={8}
                  allowDecimals={false}
                />
                <RTooltip
                  cursor={{ fill: "rgba(16,144,208,.06)" }}
                  content={<ChartTooltip />}
                />

                {/* Bars — Triggered (only hovered bar changes; others unchanged) */}
                <Bar
                  dataKey="triggered"
                  name="Triggered"
                  fill={TK.valueBlue}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                >
                  {chartSeries.map((_, i) => (
                    <Cell
                      key={i}
                      cursor="pointer"
                      fill={TK.valueBlue as string}
                      /* Only the hovered bar slightly dims; others stay the same */
                      fillOpacity={hoverBar === i ? 0.75 : 0.9}
                      style={{
                        transition: "fill-opacity .18s ease, transform .18s ease",
                        transform:
                          hoverBar === i ? "translateY(-2px)" : "translateY(0)",
                      }}
                      onMouseEnter={() => setHoverBar(i)}
                    />
                  ))}
                </Bar>

                {/* Lines — Owned (green) & Missed (red) */}
                <Line
                  dataKey="owned"
                  name="Owned"
                  stroke={TK.success}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
                <Line
                  dataKey="missed"
                  name="Missed"
                  stroke={TK.danger}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Feature Table */}
      <div className="px-4 pb-4">
        <div
          className="overflow-x-auto rounded-md border"
          style={{ borderColor: TK.borderLight }}
        >
          <table className="w-full text-sm">
            <thead
              className="sticky top-0 z-10 bg-white"
              style={{ boxShadow: "inset 0 -1px 0 var(--wr-border-subtle,#EFF0F6)" }}
            >
              <tr>
                <th className="px-3 py-2 text-left w-[320px]">Feature</th>
                <th className="px-3 py-2 text-center w-[110px]">Present?</th>
                <th className="px-3 py-2 text-center w-[110px]">Owned?</th>
                <th className="px-3 py-2 text-right w-[120px]">Triggered</th>
                <th className="px-3 py-2 text-right w-[120px]">
                  Owned{" "}
                  {!isPro && (
                    <Lock
                      className="inline ml-1 h-3.5 w-3.5 align-text-top text-gray-400"
                      aria-label="Pro"
                    />
                  )}
                </th>
                <th className="px-3 py-2 text-right w-[120px]">
                  Missed{" "}
                  {!isPro && (
                    <Lock
                      className="inline ml-1 h-3.5 w-3.5 align-text-top text-gray-400"
                      aria-label="Pro"
                    />
                  )}
                </th>
                <th className="px-3 py-2 text-right w-[120px]">Coverage</th>
                <th className="px-3 py-2 text-center w-[110px]">Change</th>
                <th className="px-3 py-2 text-left w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const t = today(r);
                const p = prev(r);
                const present = t.triggered > 0;
                const owned = t.owned > 0;
                const missed = Math.max(0, t.triggered - t.owned);
                const cov = t.triggered
                  ? Math.round((t.owned / t.triggered) * 100)
                  : 0;
                const delta = t.triggered - (p?.triggered ?? 0);
                const CovColor =
                  cov >= 60 ? TK.success : cov >= 30 ? "#F59E0B" : TK.danger;
                const focused = selected === r.key;

                return (
                  <tr
                    key={r.key}
                    className={`border-t hover:bg-[#F8FAFC] ${
                      focused ? "bg-[#F0F9FF]" : ""
                    }`}
                    style={{ borderColor: TK.borderLight, cursor: "pointer" }}
                    onClick={() =>
                      setSelected((k) => (k === r.key ? null : r.key))
                    }
                    tabIndex={0}
                    aria-label={`${r.label}: ${t.owned} owned of ${t.triggered} triggered`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                          style={{
                            background: TK.pastelBrand,
                            color: r.color,
                          }}
                          aria-hidden
                        >
                          <r.Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium" style={{ color: TK.text }}>
                            {r.label}
                          </div>
                          {r.competitorOwner && (
                            <div className="text-xs" style={{ color: TK.muted }}>
                              Owned by{" "}
                              <span className="font-medium">
                                {r.competitorOwner}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-center">
                      {present ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium"
                          style={{
                            color: TK.success,
                            border: `1px solid ${TK.borderLight}`,
                          }}
                          title="Shown on SERP"
                        >
                          Present
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs"
                          style={{
                            color: "#6B7280",
                            border: `1px solid ${TK.borderLight}`,
                          }}
                          title="Not shown"
                        >
                          Not shown
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {owned ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium"
                          style={{
                            color: TK.valueBlue,
                            border: `1px solid ${TK.borderLight}`,
                          }}
                          title="Linked to your page"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          Owned
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs"
                          style={{
                            color: "#6B7280",
                            border: `1px solid ${TK.borderLight}`,
                          }}
                          title="Not linked"
                        >
                          Not linked
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-right font-medium">
                      {compact(t.triggered)}
                    </td>

                    <td className="px-3 py-2 text-right font-medium">
                      {isPro ? (
                        compact(t.owned)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <span className="blur-[2px] select-none">
                            {compact(t.owned)}
                          </span>
                          <Lock className="h-3.5 w-3.5" aria-label="Pro" />
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-right font-medium">
                      {isPro ? (
                        compact(missed)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <span className="blur-[2px] select-none">
                            {compact(missed)}
                          </span>
                          <Lock className="h-3.5 w-3.5" aria-label="Pro" />
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: CovColor,
                          background: "rgba(16,144,208,.04)",
                          border: `1px solid ${TK.borderLight}`,
                        }}
                        title="Owned ÷ Triggered"
                      >
                        {cov}%
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center">
                      {delta === 0 ? (
                        <span className="text-xs" style={{ color: TK.muted }}>
                          Same
                        </span>
                      ) : delta > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium"
                          style={{ color: TK.success }}
                          title="Increase"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                          {delta}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium"
                          style={{ color: TK.danger }}
                          title="Decrease"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                          {Math.abs(delta)}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          className="h-8 rounded-md border px-2.5 text-xs font-medium"
                          style={{
                            borderColor: TK.border,
                            background: "#FFF",
                            color: TK.text,
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(r.key);
                          }}
                          title="Focus trend"
                        >
                          Focus trend
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-md border px-2.5 text-xs font-medium underline-offset-2"
                          style={{
                            borderColor: TK.border,
                            background: "#FFF",
                            color: TK.valueBlue, // keep hyperlink color
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeepLink?.({ feature: r.key });
                          }}
                          title="View keywords for this feature"
                        >
                          View keywords{" "}
                          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-sm"
                    style={{ color: TK.muted }}
                  >
                    No SERP features detected for this page in the selected
                    scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer helper */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs" style={{ color: TK.muted }}>
            Tip: Click a row to focus its trend. Hover the chart for daily
            breakdown.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 rounded-md border px-3 text-sm"
              style={{
                borderColor: TK.border,
                background: "#FFF",
                color: TK.text,
                cursor: "pointer",
              }}
              onClick={reload}
              title="Refresh"
            >
              Refresh <RefreshCcw className="ml-1 inline h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────── OPTIONAL DEMO ───────────────────────────────── */
export function Demo_SerpFeaturesTab() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6" style={{ background: TK.app }}>
      <SerpFeaturesTab isPro />
      <SerpFeaturesTab isPro={false} />
    </div>
  );
}

