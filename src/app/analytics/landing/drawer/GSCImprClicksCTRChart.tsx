"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Brush,
} from "recharts";
import {
  CalendarDays,
  MonitorSmartphone,
  Globe2,
  ChevronDown,
  AlertTriangle,
  LineChart as LineChartIcon,
  Eye,
  MousePointer,
  Percent,
  Target,
} from "lucide-react";

/** ─────────────────────────────────────────────────────────────
 *  Wranker tokens (colors, borders, radius)
 *  ──────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  card: "#FFFFFF",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  radius: 10,
  // Metric palette:
  series: {
    impressions: { stroke: "#10B981", fill: "rgba(16,185,129,.18)" }, // green
    clicks: { stroke: "#2563EB", fill: "rgba(37,99,235,.10)" }, // blue
    ctr: { stroke: "#F59E0B" }, // orange
    position: { stroke: "#6B7280" }, // gray
  },
} as const;

/** ─────────────────────────────────────────────────────────────
 *  Types
 *  ──────────────────────────────────────────────────────────── */
type Device = "all" | "desktop" | "mobile" | "tablet";
type SearchType = "web" | "image" | "video";
type MetricKey = "impressions" | "clicks" | "ctr" | "position";

export type GSCPoint = {
  date: string;
  _d?: Date;
  impressions: number;
  clicks: number;
  ctr?: number; // % (0..100)
  position?: number; // lower = better
};

export type GSCChartProps = {
  data?: GSCPoint[];
  pageUrl?: string;
  initialDays?: 7 | 14 | 30 | 60 | 90;
  initialSearchType?: SearchType;
  initialDevice?: Device;
  enablePosition?: boolean;
  enableZoom?: boolean;
  ctrThresholdPct?: number;
  className?: string;
};

/** ─────────────────────────────────────────────────────────────
 *  Helpers: formatters
 *  ──────────────────────────────────────────────────────────── */
const nfCompact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const nf1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const fmt = {
  num: (n: number) => nfCompact.format(Math.round(n)),
  pct: (v: number) => `${nf1.format(v)}%`,
};

function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

/** ─────────────────────────────────────────────────────────────
 *  Deterministic mock data (for demo / empty state)
 *  ──────────────────────────────────────────────────────────── */
const DEVICE_ADJ: Record<Device, number> = {
  all: 1,
  desktop: 1.08,
  mobile: 0.95,
  tablet: 0.85,
};
const SEARCH_ADJ: Record<SearchType, number> = {
  web: 1,
  image: 0.7,
  video: 0.8,
};

function buildMockGSC(days: number, device: Device, st: SearchType): GSCPoint[] {
  const out: GSCPoint[] = [];
  const dev = DEVICE_ADJ[device];
  const mul = SEARCH_ADJ[st];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const s = Math.sin((days - i) / 3);
    const c = Math.cos((days - i) / 5);

    const impressionsBase = 2200 + s * 550 + c * 380;
    const impressions = Math.max(120, Math.round(impressionsBase * dev * mul));

    const ctrBase = st === "web" ? 3.6 : st === "image" ? 2.4 : 4.2; // %
    const ctr = Math.max(0.2, ctrBase + s * 0.6 - c * 0.4);
    const clicks = Math.max(0, Math.round((impressions * ctr) / 100));
    const pos = Math.max(1.2, 8 + s * 2 - c * 1.5);

    out.push({
      date: dayLabel(d),
      _d: d,
      impressions,
      clicks,
      ctr,
      position: Number(pos.toFixed(1)),
    });
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────
   Small UI atoms (chips + toggle)
   ───────────────────────────────────────────────────────────── */
function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color }}
      aria-hidden
    />
  );
}

function ChipToggle({
  active,
  children,
  tone,
  onClick,
  title,
}: {
  active: boolean;
  children: React.ReactNode;
  tone?: { stroke: string; fill?: string };
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 cursor-pointer rounded-full border px-3 text-sm inline-flex items-center gap-2 ${
        active ? "font-semibold" : ""
      }`}
      style={{
        borderColor: active ? tone?.stroke ?? TK.border : TK.border,
        background: active ? tone?.fill ?? "#fff" : "#fff",
        color: active ? (tone?.stroke ?? TK.text) : TK.text,
      }}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex cursor-pointer select-none items-center gap-2"
      title={label}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--wr-brand)]" : "bg-gray-300"
        }`}
        style={{ ["--wr-brand" as any]: TK.brand }}
      >
        <span
          className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </span>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tooltip (Smart popover with colored dots + icons)
   ───────────────────────────────────────────────────────────── */
const METRIC_META: Record<
  MetricKey,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: { stroke: string; fill?: string };
    format: (v: number) => string;
  }
> = {
  impressions: {
    label: "Impressions",
    icon: Eye,
    tone: TK.series.impressions,
    format: (v) => fmt.num(v),
  },
  clicks: {
    label: "Clicks",
    icon: MousePointer,
    tone: TK.series.clicks,
    format: (v) => fmt.num(v),
  },
  ctr: {
    label: "CTR",
    icon: Percent,
    tone: { stroke: TK.series.ctr.stroke },
    format: (v) => fmt.pct(v),
  },
  position: {
    label: "Position",
    icon: Target,
    tone: TK.series.position,
    format: (v) => nf1.format(v),
  },
};

function ChartSmartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Recharts payload contains only rendered series; derive rows from dataKey
  const rows = payload
    .filter((p) => typeof p.value === "number" && p.dataKey)
    .map((p, idx) => {
      const key = p.dataKey as MetricKey;
      const meta = METRIC_META[key];
      return {
        key,
        color: meta?.tone?.stroke ?? p.color ?? "#999",
        label: meta?.label ?? p.name ?? String(p.dataKey),
        valueStr: meta ? meta.format(Number(p.value)) : String(p.value),
        Icon: meta?.icon ?? Eye,
      };
    });

  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border, color: TK.text, fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial" }}
    >
      <div className="mb-1 text-[12px] font-medium">{String(label)}</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dot color={r.color} />
              <r.Icon className="h-3.5 w-3.5 text-#008CCD"/>
              <span className="text-[12px]">{r.label}</span>
            </div>
            <div className="text-[12px] font-semibold">{r.valueStr}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────
 *  Main Component
 *  ──────────────────────────────────────────────────────────── */
export default function GSCImprClicksCTRChart({
  data,
  pageUrl,
  initialDays = 30,
  initialSearchType = "web",
  initialDevice = "all",
  enablePosition = true,
  enableZoom = false,
  ctrThresholdPct = 1,
  className,
}: GSCChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Controls
  const [range, setRange] = React.useState<typeof initialDays>(initialDays);
  const [searchType, setSearchType] = React.useState<SearchType>(initialSearchType);
  const [device, setDevice] = React.useState<Device>(initialDevice);
  const [show, setShow] = React.useState({
    impressions: true,
    clicks: true,
    ctr: true,
    position: false,
  });
  const [highlightLowCTR, setHighlightLowCTR] = React.useState(true);

  // Data (mock if none)
  const series = React.useMemo<GSCPoint[]>(
    () => {
      const base = data && data.length ? data : buildMockGSC(range, device, searchType);
      return base.map((p) => ({
        ...p,
        ctr: typeof p.ctr === "number" ? p.ctr : p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
      }));
    },
    [data, range, device, searchType]
  );

  // Smart tag on click
  const [smartTag, setSmartTag] = React.useState<{ date: string; text: string } | null>(null);
  function handlePointClick(state: any) {
    if (!state || !state.activePayload || !state.activeLabel) return;
    const p: GSCPoint = state.activePayload[0].payload;
    const idx = series.findIndex((x) => x.date === p.date);
    const prev = idx > 0 ? series[idx - 1] : null;
    const spike = prev && prev.clicks > 0 && p.clicks > prev.clicks * 1.4;
    const msg = spike ? "Spike in clicks" : (p.ctr ?? 0) < ctrThresholdPct ? "CTR below threshold" : "Highlighted day";
    setSmartTag({ date: p.date, text: msg });
    window.clearTimeout((handlePointClick as any)._t);
    (handlePointClick as any)._t = window.setTimeout(() => setSmartTag(null), 3500);
  }

  const lowCtrDays = React.useMemo(
    () => series.filter((p) => (p.ctr ?? 0) < ctrThresholdPct).map((p) => p.date),
    [series, ctrThresholdPct]
  );

  if (!mounted) {
    return (
      <section
        className={`rounded-md bg-white p-4 ${className ?? ""}`}
        style={{ border: `1px solid ${TK.border}` }}
      >
        <div className="h-6 w-64 rounded bg-gray-100" />
        <div className="mt-3 h-[360px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      className={`rounded-md bg-white p-4 mt-4 ${className ?? ""}`}
      style={{
        border: `1px solid ${TK.border}`,
        fontFamily:
          "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue'",
      }}
      aria-label="GSC Performance: Impressions, Clicks & CTR"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-4 w-4" color={TK.brand} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Impressions, Clicks & CTR – Page Detail
          </div>
          {pageUrl && (
            <span className="max-w-[360px] truncate text-xs text-gray-500">{pageUrl}</span>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date (button + native select overlay) */}
          <div className="relative">
            <button
              className="h-8 cursor-pointer rounded border px-2.5 text-sm inline-flex items-center gap-1"
              style={{ borderColor: TK.border }}
              title="Date range"
            >
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <span>{range}d</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            <select
              aria-label="Date Range"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as any)}
              title="Choose date range"
            >
              {[7, 14, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n}d
                </option>
              ))}
            </select>
          </div>

          {/* Search type */}
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
              <Globe2 className="h-4 w-4" />
            </span>
            <select
              aria-label="Search Type"
              className="h-8 cursor-pointer rounded border pl-7 pr-2.5 text-sm"
              style={{ borderColor: TK.border }}
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
              title="Search type"
            >
              <option value="web">Web</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          {/* Device */}
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <select
              aria-label="Device"
              className="h-8 cursor-pointer rounded border pl-7 pr-2.5 text-sm"
              style={{ borderColor: TK.border }}
              value={device}
              onChange={(e) => setDevice(e.target.value as Device)}
              title="Device"
            >
              {(["all", "desktop", "mobile", "tablet"] as const).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Metric legend toggles (with icon + colored dot) */}
          
          {([
            ["impressions", "Impressions", Eye] as const,
            ["clicks", "Clicks", MousePointer] as const,
            ["ctr", "CTR", Percent] as const,
            ...(enablePosition ? ([["position", "Position", Target] as const] as const) : ([] as const)),
          ] as const).map(([key, label, Icon]:any) => {
            const active = (show as any)[key] as boolean;
            const tone =
              key === "impressions"
                ? TK.series.impressions
                : key === "clicks"
                ? TK.series.clicks
                : key === "ctr"
                ? TK.series.ctr
                : TK.series.position;
            return (
              <ChipToggle
                key={key}
                active={active}
                tone={tone as any}
                onClick={() => setShow((s) => ({ ...s, [key]: !active }))}
                title={`Toggle ${label}`}
              >
                <Dot color={(tone as any).stroke} />
                <Icon className="h-3.5 w-3.5" color={TK.brand} />
                <span>{label}</span>
              </ChipToggle>
            );
          })}

          {/* Low CTR highlight (modular switch) */}
          <ToggleSwitch
            checked={highlightLowCTR}
            onChange={setHighlightLowCTR}
            label={`Highlight CTR < ${fmt.pct(ctrThresholdPct)}`}
          />
        </div>
      </div>

      {/* Smart tag badge */}
      {smartTag && (
        <div
          className="mt-2 inline-flex items-center gap-2 rounded px-2.5 py-1 text-xs"
          style={{ border: `1px solid ${TK.border}`, background: "#FAFAFA" }}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium">{smartTag.text}</span>
          <span className="text-gray-500">· {smartTag.date}</span>
        </div>
      )}

      {/* Chart */}
      <div
        className="mt-3 h-[380px] w-full rounded-md bg-white"
        style={{ border: `1px solid ${TK.borderLight}` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 12, right: 16, left: 8, bottom: enableZoom ? 0 : 8 }}
            onClick={handlePointClick}
          >
            <CartesianGrid stroke={TK.borderLight} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickMargin={6}
              axisLine={{ stroke: TK.border }}
              tickLine={{ stroke: TK.border }}
            />
            {/* Left axis: counts */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: TK.border }}
              tickLine={{ stroke: TK.border }}
              domain={[0, (dataMax: number) => Math.round(dataMax * 1.2)]}
              tickFormatter={fmt.num}
            />
            {/* Right axis: CTR % */}
            <YAxis
              yAxisId="rightPct"
              orientation="right"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: TK.border }}
              tickLine={{ stroke: TK.border }}
              domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax + 5))]}
              tickFormatter={(v) => fmt.pct(v)}
            />
            {/* Hidden axis for Position (reversed) */}
            <YAxis yAxisId="pos" hide reversed domain={[1, (dataMax: number) => Math.max(12, Math.ceil(dataMax + 2))]} />

            {/* Smart tooltip with icons + color dots */}
            <RTooltip
              cursor={{ stroke: "#CBD5E1", strokeOpacity: 0.6 }}
              content={<ChartSmartTooltip />}
              wrapperStyle={{
                outline: "none",
              }}
            />

            {/* Impressions (area) */}
            {show.impressions && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                name="Impressions"
                stroke={TK.series.impressions.stroke}
                fill={TK.series.impressions.fill}
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            )}

            {/* Clicks (bold line) */}
            {show.clicks && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                name="Clicks"
                stroke={TK.series.clicks.stroke}
                strokeWidth={2.2}
                dot={{
                  r: 2,
                  strokeWidth: 1,
                  stroke: TK.series.clicks.stroke,
                  fill: "#fff",
                }}
                isAnimationActive
              />
            )}

            {/* CTR (dotted line) */}
            {show.ctr && (
              <Line
                yAxisId="rightPct"
                type="monotone"
                dataKey="ctr"
                name="CTR"
                stroke={TK.series.ctr.stroke}
                strokeWidth={1.8}
                strokeDasharray="4 4"
                dot={(props: any) => {
                  const isLow = highlightLowCTR && (props.payload?.ctr ?? 0) < ctrThresholdPct;
                  const r = isLow ? 3.2 : 2;
                  const fill = isLow ? "#F59E0B" : "#fff";
                  const stroke = TK.series.ctr.stroke;
                  return <circle cx={props.cx} cy={props.cy} r={r} strokeWidth={1} stroke={stroke} fill={fill} />;
                }}
                isAnimationActive
              />
            )}

            {/* Position (optional) */}
            {enablePosition && show.position && (
              <Line
                yAxisId="pos"
                type="monotone"
                dataKey="position"
                name="Avg. Position"
                stroke={TK.series.position.stroke}
                strokeDasharray="6 4"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive
              />
            )}

            {/* Zoom/Brush (optional) */}
            {enableZoom && (
              <Brush dataKey="date" height={24} travellerWidth={10} stroke={TK.brand} fill="#F9FAFB" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Inline alert when any low-CTR day exists */}
      {highlightLowCTR && lowCtrDays.length > 0 && (
        <div
          className="mt-3 inline-flex items-center gap-2 rounded px-2.5 py-1 text-xs"
          style={{ border: `1px solid ${TK.border}`, background: "#FFFBEB" }}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-medium text-amber-700">
            CTR dipped below {fmt.pct(ctrThresholdPct)} on{" "}
            {lowCtrDays.length === 1 ? lowCtrDays[0] : `${lowCtrDays.length} days`}.
          </span>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Usage (example)
   ----------------------------------------------------------------
   <GSCImprClicksCTRChart
     pageUrl="https://example.com/landing"
     initialDays={30}
     initialSearchType="web"
     initialDevice="all"
     enablePosition
     enableZoom
     ctrThresholdPct={1}
   />
   // To supply real GSC series, pass `data` as GSCPoint[] with
   // { date: "Jun 12", impressions, clicks, ctr?, position? }
   // (CTR is auto-derived if omitted)
   ──────────────────────────────────────────────────────────── */
  