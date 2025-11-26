import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";

/**
 * Redesigned to follow the reference pattern:
 * "Referring Domains / Backlinks — Total Trend" only (ignore other chart types).
 * - Inter / Inter Fallback fonts
 * - Branded (#008CCD) icons / accents
 * - Single chart showing TOTAL trend for either Referring Domains or Backlinks
 * - Bar (default) or Area with crisp styling and subtle hover/animation
 * - Left Y-axis for both metrics; rescaled per selection
 * - Header controls: Metric (RD/BL), Chart type (Bar/Area), Interval (Daily/Weekly/Monthly),
 *   Time range chips (30d / 90d / 6m / 1y / All), Favicon chip, Export button
 * - Smart tooltip with colored dot annotation
 *
 * INPUT SHAPE (normalized internally):
 * [
 *   {
 *     date: string | Date,
 *     total?: number,            // alias of totalDomains
 *     totalDomains?: number,
 *     domains?: number,          // alias of totalDomains
 *     backlinks?: number,        // alias of totalBacklinks
 *     totalBacklinks?: number,
 *   }
 * ]
 */

type RawPoint = {
  date: string | Date;
  total?: number | null;
  totalDomains?: number | null;
  domains?: number | null;
  backlinks?: number | null;
  totalBacklinks?: number | null;
};

type NormPoint = {
  date: Date;
  totalRD: number; // total referring domains
  totalBL: number; // total backlinks
};

type Props = {
  data?: RawPoint[];
  height?: number;
  className?: string;
  onPointClick?: (point: {
    date: Date;
    totalDomains: number;
    totalBacklinks: number;
    label: string;
  }) => void;
  /** Optional project/domain label + favicon for header */
  domainLabel?: string; // e.g., "wranker.com"
  faviconUrl?: string;  // if not provided, auto-derived from domainLabel
  /** Optional hook to intercept CSV before download */
  onExportCsv?: (csv: string) => void;
};

/* -------------------------------- TOKENS -------------------------------- */

const TK = {
  brand: "#008CCD",
  blue: "#0077FF",
  gray: "#6B7280",
  text: "#0B1220",
  border: "#E5E7EB",
  grid: "#EEF2F6",
  chipBg: "#F1F5F9",
  chipSelBg: "rgba(0,140,205,0.08)",
} as const;

const FONT_STACK =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/* -------------------------------- UTILS --------------------------------- */

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const alpha = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const isoDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfMonth = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const fmtTick = (d: Date, interval: IntervalKey) => {
  if (interval === "daily") return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  if (interval === "weekly") return `Wk of ${d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}`;
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};
const fmtInt = (n: number) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

type TimeRangeKey = "30d" | "90d" | "6m" | "1y" | "all";
type IntervalKey = "daily" | "weekly" | "monthly";
type ChartKind = "bar" | "area";
type MetricKey = "RD" | "BL"; // Referring Domains | Backlinks

function rangeStartFor(range: TimeRangeKey, end: Date, min?: Date) {
  const e = new Date(end);
  switch (range) {
    case "30d":
      return addDays(e, -29);
    case "90d":
      return addDays(e, -89);
    case "6m":
      return addDays(e, -179);
    case "1y":
      return addDays(e, -364);
    case "all":
      return min ?? addDays(e, -179);
  }
}

function suggestInterval(range: TimeRangeKey, start: Date, end: Date): IntervalKey {
  const days = Math.max(1, Math.round((+end - +start) / (24 * 3600 * 1000)) + 1);
  if (days <= 31) return "daily";
  if (days <= 185) return "weekly";
  return "monthly";
}

function parseDate(d: string | Date) {
  return d instanceof Date ? new Date(isoDay(d)) : new Date(isoDay(new Date(d)));
}

/** Build fallback demo data with both totals present */
function buildDemoDataDual(days = 240): RawPoint[] {
  const today = new Date();
  const out: RawPoint[] = [];
  let rd = 300 + Math.floor(Math.random() * 60);
  let bl = 1800 + Math.floor(Math.random() * 300);
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const addRD = Math.max(0, Math.round(8 + 5 * Math.sin(i / 5) + (Math.random() * 4 - 2)));
    const subRD = Math.max(0, Math.round(5 + 4 * Math.cos(i / 8) + (Math.random() * 3 - 1.5)));
    const addBL = Math.max(0, Math.round(35 + 14 * Math.sin(i / 4) + (Math.random() * 12 - 6)));
    const subBL = Math.max(0, Math.round(22 + 10 * Math.cos(i / 6) + (Math.random() * 8 - 4)));
    rd = Math.max(10, rd + addRD - subRD);
    bl = Math.max(100, bl + addBL - subBL);
    out.push({
      date,
      totalDomains: rd,
      totalBacklinks: bl,
    });
  }
  return out;
}

/** Normalize raw input -> sorted daily points with totals */
function normalizeDaily(raw?: RawPoint[]): NormPoint[] {
  const src = (raw && raw.length ? raw : buildDemoDataDual()).map((r) => {
    const d = parseDate(r.date);
    const totalRD = Number(
      (r.totalDomains ?? r.total ?? r.domains ?? 0) as number
    );
    const totalBL = Number(
      (r.totalBacklinks ?? r.backlinks ?? 0) as number
    );
    return { date: d, totalRD: Math.max(0, Math.round(totalRD)), totalBL: Math.max(0, Math.round(totalBL)) };
  });
  src.sort((a, b) => +a.date - +b.date);
  // carry forwards if any total missing
  let lastRD = 0, lastBL = 0;
  return src.map((p) => {
    const rd = p.totalRD || lastRD;
    const bl = p.totalBL || lastBL;
    lastRD = rd;
    lastBL = bl;
    return { date: p.date, totalRD: rd, totalBL: bl };
  });
}

/** Aggregate totals by interval bucket (carry LAST total in bucket) */
function aggregateTotals(
  data: NormPoint[],
  start: Date,
  end: Date,
  interval: IntervalKey
): Array<{ date: Date; totalRD: number; totalBL: number }> {
  const keyOf = (d: Date) => {
    if (interval === "daily") return isoDay(d);
    if (interval === "weekly") return isoDay(startOfWeekMon(d));
    const m = startOfMonth(d);
    return `${m.getFullYear()}-${pad2(m.getMonth() + 1)}-01`;
  };

  const buckets = new Map<
    string,
    { date: Date; totalRD: number; totalBL: number; _last: number }
  >();

  for (const row of data) {
    if (row.date < start || row.date > end) continue;
    const k = keyOf(row.date);
    const stamp = +row.date;
    const prev = buckets.get(k);
    if (!prev) {
      buckets.set(k, { date: new Date(k), totalRD: row.totalRD, totalBL: row.totalBL, _last: stamp });
    } else {
      if (prev._last <= stamp) {
        prev.date = row.date;
        prev.totalRD = row.totalRD;
        prev.totalBL = row.totalBL;
        prev._last = stamp;
      }
    }
  }

  return [...buckets.values()].sort((a, b) => +a.date - +b.date);
}

/* ------------------------------ UI PRIMITIVES ------------------------------ */

function SectionHeader({
  icon,
  title,
  host,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  host?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h3>
        </div>
        {host && (
          <div
            className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs"
            style={{ color: TK.gray, background: "#F5F7FA", border: `1px solid ${TK.border}` }}
          >
            <Favicon domain={host} />
            <span>{host}</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border p-0.5"
      style={{ borderColor: TK.border, background: "#F3F4F6" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              active ? "bg-white shadow-sm" : "hover:bg-white/70"
            )}
            style={{
              color: active ? TK.text : TK.gray,
              ["--tw-ring-color" as any]: TK.brand,
            }}
            title={o.label}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  title,
}: React.PropsWithChildren<{ active?: boolean; onClick?: () => void; title?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition"
      style={{
        borderColor: TK.border,
        color: active ? TK.brand : TK.text,
        background: active ? TK.chipSelBg : TK.chipBg,
      }}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: React.PropsWithChildren<{ label: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border bg-white transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{ borderColor: TK.border, color: TK.brand }}
      {...{ ["aria-label"]: label }}
    >
      {children}
    </button>
  );
}

function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { color: string; label: string; value: number }[];
}) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md" style={{ borderColor: TK.border }}>
      <div className="text-xs font-medium" style={{ color: TK.gray }}>
        {title}
      </div>
      <div className="mt-1 space-y-0.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="font-semibold" style={{ color: TK.text }}>
              {fmtInt(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ FAVICON ------------------------------ */
function Favicon({ domain, size = 14 }: { domain: string; size?: number }) {
  const [err, setErr] = useState(false);
  const host = (() => {
    try {
      return new URL(`https://${domain}`).hostname;
    } catch {
      return domain.replace(/^https?:\/\//, "").split("/")[0] || "domain.tld";
    }
  })();
  return err ? (
    <span
      aria-hidden
      className="inline-block rounded"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, #BBD8FF 0 45%, transparent 55%), linear-gradient(180deg, #008CCD, #4AA4E6)",
        border: `1px solid ${TK.border}`,
      }}
    />
  ) : (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`}
      width={size}
      height={size}
      alt={`${host} favicon`}
      loading="lazy"
      onError={() => setErr(true)}
      style={{ borderRadius: 3, background: "#fff" }}
    />
  );
}

/* ------------------------------ ICONS (brand) ------------------------------ */

const TitleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12a4 4 0 1 1 7.465-2h1.07A4 4 0 1 1 20 12a4 4 0 0 1-7.465 2h-1.07A4 4 0 0 1 4 12Z" stroke={TK.brand} strokeWidth="1.6" />
    <circle cx="8" cy="12" r="1.6" fill={TK.brand} />
    <circle cx="16" cy="12" r="1.6" fill={TK.brand} />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v10m0 0 4-4m-4 4-4-4" stroke={TK.brand} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="4" y="14.5" width="16" height="6" rx="2" fill="white" stroke={TK.brand} strokeWidth="1.2" />
  </svg>
);

/* ------------------------------ EMPTY STATE ------------------------------ */

function EmptyState({ note }: { note: string }) {
  return (
    <div
      className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm"
      style={{ borderColor: TK.border, color: TK.gray }}
    >
      {note}
    </div>
  );
}

/* --------------------------------- EXPORT CSV --------------------------------- */

function buildCsv(rows: Array<{ date: Date; total: number }>, metric: MetricKey): string {
  const header = ["date", metric === "RD" ? "totalRefDomains" : "totalBacklinks"];
  const lines = rows.map((r) => [isoDay(r.date), r.total].join(","));
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* --------------------------------- COMPONENT --------------------------------- */

export default function ReferringDomainBacklinksTrendChart({
  data,
  height = 320,
  className = "",
  onPointClick,
  domainLabel,
  faviconUrl, // (optional) not used directly; we auto-derive favicon from domainLabel for simplicity
  onExportCsv,
}: Props) {
  const daily = useMemo(() => normalizeDaily(data), [data]);
  const minDate = daily[0]?.date || new Date();
  const maxDate = daily[daily.length - 1]?.date || new Date();

  // Controls (reference pattern)
  const [metric, setMetric] = useState<MetricKey>("RD");
  const [kind, setKind] = useState<ChartKind>("bar"); // default Bar
  const [range, setRange] = useState<TimeRangeKey>("90d");
  const start = useMemo(() => rangeStartFor(range, maxDate, minDate)!, [range, maxDate, minDate]);
  const [interval, setInterval] = useState<IntervalKey>(() => suggestInterval(range, start, maxDate));
  useEffect(() => {
    setInterval(suggestInterval(range, start, maxDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const bucketed = useMemo(() => aggregateTotals(daily, start, maxDate, interval), [daily, start, maxDate, interval]);

  // Series used by the chart (and tooltip)
  const series = useMemo(
    () =>
      bucketed.map((b) => ({
        date: b.date,
        total: metric === "RD" ? b.totalRD : b.totalBL,
        totalRD: b.totalRD,
        totalBL: b.totalBL,
      })),
    [bucketed, metric]
  );

  const handleExport = () => {
    const csv = buildCsv(series.map((r) => ({ date: r.date, total: r.total })), metric);
    onExportCsv?.(csv);
    downloadCsv(metric === "RD" ? "total-referring-domains.csv" : "total-backlinks.csv", csv);
  };

  const handleChartClick = (e: any) => {
    if (!onPointClick || !e || !e.activePayload || !e.activePayload.length) return;
    const row = e.activePayload[0].payload as { date: Date; totalRD: number; totalBL: number };
    onPointClick({
      date: row.date,
      totalDomains: row.totalRD,
      totalBacklinks: row.totalBL,
      label: new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
    });
  };

  const metricLabel = metric === "RD" ? "Total Referring Domains" : "Total Backlinks";

  return (
    <div
      className={cn("rounded-xl border bg-white p-4 shadow-sm md:p-5", className)}
      style={{ borderColor: TK.border, fontFamily: FONT_STACK }}
    >
      <SectionHeader icon={<TitleIcon />} title="Referring Domains / Backlinks — Total Trend" host={domainLabel}>
        <Segmented<MetricKey>
          aria-label="Metric"
          options={[
            { label: "Ref. Domains", value: "RD" },
            { label: "Backlinks", value: "BL" },
          ]}
          value={metric}
          onChange={setMetric}
        />
        <Segmented<ChartKind>
          aria-label="Chart type"
          options={[
            { label: "Bar", value: "bar" },
            { label: "Area", value: "area" },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Segmented<IntervalKey>
          aria-label="Interval"
          options={[
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
          ]}
          value={interval}
          onChange={setInterval}
        />
        <div className="ml-0.5 flex items-center gap-1.5">
          {(["30d", "90d", "6m", "1y", "all"] as TimeRangeKey[]).map((k) => (
            <Chip key={k} active={range === k} onClick={() => setRange(k)} title={`Set range ${k.toUpperCase()}`}>
              {k === "all" ? "All Time" : k.toUpperCase()}
            </Chip>
          ))}
        </div>
        <IconButton label="Export CSV" onClick={handleExport}>
          <DownloadIcon />
        </IconButton>
      </SectionHeader>

      <div className="w-full" style={{ height }}>
        {series.length === 0 ? (
          <EmptyState note="No data in selection." />
        ) : kind === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
              onClick={handleChartClick}
            >
              <CartesianGrid stroke={TK.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: TK.grid }}
                tickFormatter={(v) => fmtTick(new Date(v), interval)}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={{ stroke: TK.grid }} fontSize={12} allowDecimals={false} />
              <RTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  const d = p?.payload?.date ? new Date(p.payload.date) : null;
                  return (
                    <TooltipBox
                      title={d ? d.toLocaleDateString() : ""}
                      rows={[
                        {
                          color: TK.blue,
                          label: metricLabel,
                          value: (p.value as number) ?? 0,
                        },
                      ]}
                    />
                  );
                }}
                cursor={{ fill: "rgba(17,24,39,0.06)" }}
              />
              {/* Bar with rounded top & subtle hover/animation (reference style) */}
              <Bar
                dataKey="total"
                fill={TK.blue}
                radius={[6, 6, 0, 0]} // curved top, flat bottom
                isAnimationActive
                animationDuration={500}
                className="transition-[filter,transform] hover:brightness-95 hover:-translate-y-[1px]"
              />
              {/* Crisp overlay line to enhance reading at a glance */}
              {/* <Line type="monotone" dataKey="total" stroke={alpha(TK.blue, 0.45)} dot={false} strokeWidth={1} /> */}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
              onClick={handleChartClick}
            >
              <CartesianGrid stroke={TK.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: TK.grid }}
                tickFormatter={(v) => fmtTick(new Date(v), interval)}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={{ stroke: TK.grid }} fontSize={12} allowDecimals={false} />
              <RTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  const d = p?.payload?.date ? new Date(p.payload.date) : null;
                  return (
                    <TooltipBox
                      title={d ? d.toLocaleDateString() : ""}
                      rows={[
                        {
                          color: TK.blue,
                          label: metricLabel,
                          value: (p.value as number) ?? 0,
                        },
                      ]}
                    />
                  );
                }}
                cursor={{ stroke: "rgba(17,24,39,0.30)" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={TK.blue}
                strokeWidth={2}
                fill={alpha(TK.blue, 0.18)}
                isAnimationActive
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer hint (optional, matches reference pattern lightly) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: TK.gray }}>
        <div className="inline-flex items-center gap-2">
          <span>Interval:</span>
          <span className="font-medium" style={{ color: TK.text }}>
            {interval}
          </span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span>Range:</span>
          <span className="font-medium" style={{ color: TK.text }}>
            {range === "all" ? "ALL TIME" : range.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
