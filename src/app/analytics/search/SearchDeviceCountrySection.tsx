import React, { useMemo, useState } from "react";
import {
  Download,
  Globe2,
  Monitor,
  Smartphone,
  Tablet,
  AlertTriangle,
  ClipboardList,
  ArrowUpDown,
} from "lucide-react";

/**
 * Section 5: Search Performance by Device & Country
 * Refinements applied:
 * - Inter/Inter Fallback font stack on the section.
 * - Removed all emojis (flags, etc.).
 * - Branded (#008CCD) icons for section title, device type, country, and actions.
 * - Pointer cursor on clickable elements.
 * - Uses modular chips / segmented toggles for view type.
 * - Single Export button in header.
 */

type TimeRange = "7d" | "30d" | "90d" | "custom";
type SortKey = "clicks" | "ctr" | "position";
type SortDir = "desc" | "asc";

type DeviceKind = "desktop" | "mobile" | "tablet";

type DeviceRow = {
  device: DeviceKind;
  clicks: number;
  impressions: number;
  ctr: number; // fraction 0..1
  position: number; // avg rank
  clicksDelta: number;
  impressionsDelta: number;
  ctrDelta: number;
  positionDelta: number; // relative change; negative is a lower (better) rank
};

type CountryRow = {
  code: string;
  name: string;
  clicks: number;
  impressions: number;
  ctr: number; // fraction 0..1
  position: number;
  topQuery?: string;
  clicksDelta: number;
  impressionsDelta: number;
  ctrDelta: number;
  positionDelta: number;
};

// ---------- Mock Data (with deltas) ----------
const MOCK_DEVICE: DeviceRow[] = [
  {
    device: "desktop",
    clicks: 3820,
    impressions: 98100,
    ctr: 0.0389,
    position: 6.3,
    clicksDelta: 0.061,
    impressionsDelta: 0.023,
    ctrDelta: 0.012,
    positionDelta: -0.021,
  },
  {
    device: "mobile",
    clicks: 4950,
    impressions: 124000,
    ctr: 0.0399,
    position: 7.2,
    clicksDelta: 0.034,
    impressionsDelta: 0.017,
    ctrDelta: 0.006,
    positionDelta: -0.008,
  },
  {
    device: "tablet",
    clicks: 610,
    impressions: 18400,
    ctr: 0.026,
    position: 8.8,
    clicksDelta: -0.041,
    impressionsDelta: -0.012,
    ctrDelta: -0.058,
    positionDelta: 0.035,
  },
];

const MOCK_COUNTRY: CountryRow[] = [
  {
    code: "US",
    name: "USA",
    clicks: 3930,
    impressions: 97300,
    ctr: 0.0404,
    position: 6.1,
    topQuery: "seo services",
    clicksDelta: 0.028,
    impressionsDelta: 0.014,
    ctrDelta: 0.007,
    positionDelta: -0.016,
  },
  {
    code: "IN",
    name: "India",
    clicks: 5210,
    impressions: 121000,
    ctr: 0.043,
    position: 7.0,
    topQuery: "best seo tools",
    clicksDelta: 0.049,
    impressionsDelta: 0.021,
    ctrDelta: 0.011,
    positionDelta: -0.012,
  },
  {
    code: "GB",
    name: "UK",
    clicks: 1140,
    impressions: 26300,
    ctr: 0.0433,
    position: 5.8,
    topQuery: "google ranking",
    clicksDelta: 0.018,
    impressionsDelta: 0.006,
    ctrDelta: 0.003,
    positionDelta: -0.009,
  },
  {
    code: "DE",
    name: "Germany",
    clicks: 740,
    impressions: 24500,
    ctr: 0.0185,
    position: 6.4,
    topQuery: "seo audit",
    clicksDelta: -0.033,
    impressionsDelta: 0.012,
    ctrDelta: -0.021,
    positionDelta: 0.024,
  },
  {
    code: "CA",
    name: "Canada",
    clicks: 780,
    impressions: 19800,
    ctr: 0.0352,
    position: 8.9,
    topQuery: "technical seo",
    clicksDelta: 0.012,
    impressionsDelta: 0.008,
    ctrDelta: -0.006,
    positionDelta: 0.011,
  },
  {
    code: "AU",
    name: "Australia",
    clicks: 320,
    impressions: 9400,
    ctr: 0.0287,
    position: 6.9,
    topQuery: "seo checklist",
    clicksDelta: -0.027,
    impressionsDelta: -0.016,
    ctrDelta: -0.019,
    positionDelta: 0.018,
  },
];

// ---------- Tokens & Utils ----------
const BLUE = "#0077ff";
const BRAND = "#008CCD";
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

const formatNumber = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatPercent = (f: number, digits = 2) =>
  `${(Math.max(0, Math.min(1, f)) * 100).toFixed(digits)}%`;

const formatDeltaPct = (f: number) => {
  if (!isFinite(f) || f === 0) return "0%";
  const sign = f > 0 ? "+" : "";
  return `${sign}${(f * 100).toFixed(1)}%`;
};

const classNames = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const isLowCtrGoodRank = (ctr: number, pos: number) => ctr < 0.03 && pos < 10;

const barWidth = (value: number, max: number) =>
  `${max === 0 ? 0 : Math.round((value / max) * 100)}%`;

// ---------- UI Subcomponents ----------
function AlertChip({
  label,
  tone = "danger",
  title,
}: {
  label: string;
  tone?: "danger" | "warn" | "good";
  title?: string;
}) {
  const tones = {
    danger: "bg-red-50 text-red-700 border-red-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  } as const;
  return (
    <span
      title={title}
      className={classNames(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {label}
    </span>
  );
}

function TrendIndicator({
  delta,
  invert = false,
  className,
  title,
}: {
  delta: number;
  /** invert=true means lower is better (e.g., Avg. Position) */
  invert?: boolean;
  className?: string;
  title?: string;
}) {
  if (!isFinite(delta) || delta === 0) {
    return (
      <span title={title} className={classNames("text-xs text-gray-400", className)}>
        — 0%
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? "▲" : "▼";
  const color = good ? "text-emerald-600" : "text-red-600";
  return (
    <span title={title} className={classNames("ml-1 text-xs font-medium", color, className)}>
      {arrow} {formatDeltaPct(delta)}
    </span>
  );
}

function MiniBar({
  value,
  max,
  label,
  title,
  barColor = BLUE,
}: {
  value: number;
  max: number;
  label: React.ReactNode;
  title?: string;
  barColor?: string;
}) {
  return (
    <div className="space-y-1" title={title}>
      <div className="text-sm tabular-nums flex items-center gap-1">{label}</div>
      <div className="h-1.5 w-full rounded bg-gray-100">
        <div
          className="h-1.5 rounded"
          style={{ width: barWidth(value, max), backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={classNames(
            "px-2.5 py-1 text-xs rounded-md transition",
            value === opt.key ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
          )}
          style={{ cursor: "pointer" }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DeviceIconLabel({ device }: { device: DeviceKind }) {
  const ICON_CLS = "h-4 w-4";
  const icon =
    device === "desktop" ? (
      <Monitor className={ICON_CLS} style={{ color: BRAND }} />
    ) : device === "mobile" ? (
      <Smartphone className={ICON_CLS} style={{ color: BRAND }} />
    ) : (
      <Tablet className={ICON_CLS} style={{ color: BRAND }} />
    );
  const label = device.charAt(0).toUpperCase() + device.slice(1);
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span className="font-medium text-gray-900">{label}</span>
    </span>
  );
}

function CountryIconName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Globe2 className="h-4 w-4" style={{ color: BRAND }} />
      <span className="font-medium text-gray-900">{name}</span>
    </span>
  );
}

// ---------- CSV Export ----------
function rowsToCSV(rows: Array<Record<string, any>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const data = [headers.join(",")].concat(
    rows.map((r) => headers.map((h) => escape(r[h])).join(","))
  );
  return data.join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- Main Component ----------
export default function SearchDeviceCountrySection() {
  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [sortBy, setSortBy] = useState<SortKey>("clicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewType, setViewType] = useState<"table" | "bar">("table");
  const [minImpressions, setMinImpressions] = useState<number>(500);

  // Derived datasets
  const filteredDevices = useMemo(
    () => MOCK_DEVICE.filter((d) => d.impressions >= minImpressions),
    [minImpressions]
  );
  const filteredCountries = useMemo(
    () => MOCK_COUNTRY.filter((c) => c.impressions >= minImpressions),
    [minImpressions]
  );

  const maxDeviceClicks = useMemo(
    () => Math.max(0, ...filteredDevices.map((d) => d.clicks)),
    [filteredDevices]
  );
  const maxCountryClicks = useMemo(
    () => Math.max(0, ...filteredCountries.map((c) => c.clicks)),
    [filteredCountries]
  );

  const sortFn = (a: any, b: any) => {
    if (sortBy === "position") {
      const diff = a.position - b.position;
      return sortDir === "asc" ? diff : -diff;
    }
    if (sortBy === "ctr") {
      const diff = a.ctr - b.ctr;
      return sortDir === "asc" ? diff : -diff;
    }
    const diff = a.clicks - b.clicks;
    return sortDir === "asc" ? diff : -diff;
  };

  const devicesSorted = useMemo(
    () => [...filteredDevices].sort(sortFn),
    [filteredDevices, sortBy, sortDir]
  );
  const countriesSorted = useMemo(
    () => [...filteredCountries].sort(sortFn),
    [filteredCountries, sortBy, sortDir]
  );

  const onExport = () => {
    const deviceRows = devicesSorted.map((r) => ({
      type: "device",
      label: r.device,
      clicks: r.clicks,
      clicks_delta: formatDeltaPct(r.clicksDelta),
      impressions: r.impressions,
      impressions_delta: formatDeltaPct(r.impressionsDelta),
      ctr_pct: formatPercent(r.ctr, 2),
      ctr_delta: formatDeltaPct(r.ctrDelta),
      avg_position: r.position.toFixed(1),
      position_delta: formatDeltaPct(r.positionDelta),
      time_range: timeRange,
      min_impressions: minImpressions,
    }));
    const countryRows = countriesSorted.map((r) => ({
      type: "country",
      label: r.name,
      clicks: r.clicks,
      clicks_delta: formatDeltaPct(r.clicksDelta),
      impressions: r.impressions,
      impressions_delta: formatDeltaPct(r.impressionsDelta),
      ctr_pct: formatPercent(r.ctr, 2),
      ctr_delta: formatDeltaPct(r.ctrDelta),
      avg_position: r.position.toFixed(1),
      position_delta: formatDeltaPct(r.positionDelta),
      time_range: timeRange,
      min_impressions: minImpressions,
    }));
    const csv = rowsToCSV([...deviceRows, ...countryRows]);
    downloadCSV("search-device-country.csv", csv);
  };

  return (
    <section className="w-full mt-4" style={{ fontFamily: FONT_STACK }}>
      {/* Section header + filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
            <Globe2 className="h-5 w-5" style={{ color: BRAND }} />
            Search Performance by Device &amp; Country
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            GSC segmented view. Use filters to focus and sort. Alerts highlight low CTR at strong ranks.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* Time Range */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span className="whitespace-nowrap">Time Range</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:outline-none"
              style={{ cursor: "pointer" }}
            >
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {/* Sort */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span className="whitespace-nowrap">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:outline-none"
              style={{ cursor: "pointer" }}
            >
              <option value="clicks">Clicks</option>
              <option value="ctr">CTR</option>
              <option value="position">Position</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
              title={`Toggle sort direction (${sortDir})`}
              aria-label="Toggle sort direction"
              style={{ cursor: "pointer" }}
            >
              <ArrowUpDown
                className={classNames("h-4 w-4", sortDir === "asc" && "rotate-180")}
                style={{ color: BRAND, transition: "transform .2s ease" }}
              />
              {sortDir.toUpperCase()}
            </button>
          </label>

          {/* View Type segmented (modular chip) */}
          <Segmented
            options={[
              { key: "table", label: "Table" },
              { key: "bar", label: "Bar (Phase 1.1)" },
            ]}
            value={viewType}
            onChange={(k) => setViewType(k as "table" | "bar")}
          />

          {/* Min Impressions */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span className="whitespace-nowrap">Min Impr</span>
            <input
              type="number"
              min={0}
              step={100}
              value={minImpressions}
              onChange={(e) => setMinImpressions(Number(e.target.value) || 0)}
              className="w-28 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:outline-none"
              placeholder="500"
            />
          </label>

          {/* Export */}
          <button
            type="button"
            onClick={onExport}
            className="ml-auto inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Export current tables to CSV"
            aria-label="Export CSV"
            style={{ cursor: "pointer" }}
          >
            <Download className="h-4 w-4 mr-2" style={{ color: BRAND }} />
            Export
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px w-full bg-gray-200" />

      {/* Device Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Device Performance</h3>
          <div className="text-xs text-gray-600 inline-flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#EF4444" }} />
            Low CTR @ Good Rank (Pos ≤ 10, CTR &lt; 3%)
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-gray-50 text-left">
              <tr>
                {["Device", "Clicks", "Impressions", "CTR (%)", "Avg. Position", "Alerts"].map(
                  (h, idx) => (
                    <th
                      key={h}
                      className={classNames(
                        "sticky top-0 z-10 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600",
                        idx === 0 ? "rounded-tl-lg" : "",
                        idx === 5 ? "rounded-tr-lg" : ""
                      )}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {devicesSorted.map((row, i) => {
                const poor =
                  (row.device === "mobile" || row.device === "tablet") &&
                  isLowCtrGoodRank(row.ctr, row.position);
                return (
                  <tr
                    key={row.device}
                    className={classNames(
                      "border-t border-gray-100 hover:bg-gray-50/60",
                      i % 2 === 1 && "bg-white"
                    )}
                  >
                    <td className="px-4 py-3 text-sm">
                      <DeviceIconLabel device={row.device} />
                    </td>

                    {/* Clicks with BLUE bar + trend */}
                    <td className="px-4 py-3">
                      <MiniBar
                        value={row.clicks}
                        max={maxDeviceClicks}
                        label={
                          <>
                            {formatNumber(row.clicks)}
                            <TrendIndicator
                              delta={row.clicksDelta}
                              title="Clicks change vs previous period"
                            />
                          </>
                        }
                        title="Relative clicks within device set"
                        barColor={BLUE}
                      />
                    </td>

                    {/* Impressions + trend */}
                    <td className="px-4 py-3">
                      <div className="text-sm tabular-nums text-gray-900">
                        {formatNumber(row.impressions)}
                        <TrendIndicator
                          delta={row.impressionsDelta}
                          title="Impressions change vs previous period"
                        />
                      </div>
                    </td>

                    {/* CTR + trend (highlight if poor) */}
                    <td
                      className={classNames(
                        "px-4 py-3 text-sm tabular-nums",
                        isLowCtrGoodRank(row.ctr, row.position)
                          ? "text-red-700 font-semibold"
                          : "text-gray-900"
                      )}
                    >
                      {formatPercent(row.ctr)}
                      <TrendIndicator
                        delta={row.ctrDelta}
                        title="CTR change vs previous period"
                      />
                    </td>

                    {/* Avg. Position + trend (invert good/bad) */}
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-900">
                      {row.position.toFixed(1)}
                      <TrendIndicator
                        delta={row.positionDelta}
                        invert
                        title="Avg. Position change vs previous period (lower is better)"
                      />
                    </td>

                    {/* Alerts */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {poor && (
                          <AlertChip
                            label="Low CTR @ Good Rank"
                            tone="danger"
                            title="CTR < 3% while position ≤ 10. Consider snippet/UX optimization."
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {devicesSorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No devices meet the current impression threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spacer */}
      <div className="my-6" />

      {/* Country Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Country Performance</h3>
          <div className="text-xs text-gray-500">
            Hover a country for its top query. Sort/filters apply here too.
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-gray-50 text-left">
              <tr>
                {["Country", "Clicks", "Impressions", "CTR (%)", "Avg. Position", "Alerts"].map(
                  (h, idx) => (
                    <th
                      key={h}
                      className={classNames(
                        "sticky top-0 z-10 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600",
                        idx === 0 ? "rounded-tl-lg" : "",
                        idx === 5 ? "rounded-tr-lg" : ""
                      )}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {countriesSorted.map((row, i) => {
                const poor = isLowCtrGoodRank(row.ctr, row.position);
                return (
                  <tr
                    key={row.code}
                    className={classNames(
                      "border-t border-gray-100 hover:bg-gray-50/60",
                      i % 2 === 1 && "bg-white"
                    )}
                    title={row.topQuery ? `Top query: ${row.topQuery}` : undefined}
                  >
                    <td className="px-4 py-3 text-sm">
                      <CountryIconName name={row.name} />
                    </td>

                    {/* Clicks with BLUE bar + trend */}
                    <td className="px-4 py-3">
                      <MiniBar
                        value={row.clicks}
                        max={maxCountryClicks}
                        label={
                          <>
                            {formatNumber(row.clicks)}
                            <TrendIndicator
                              delta={row.clicksDelta}
                              title="Clicks change vs previous period"
                            />
                          </>
                        }
                        title="Relative clicks within country set"
                        barColor={BLUE}
                      />
                    </td>

                    {/* Impressions + trend */}
                    <td className="px-4 py-3">
                      <div className="text-sm tabular-nums text-gray-900">
                        {formatNumber(row.impressions)}
                        <TrendIndicator
                          delta={row.impressionsDelta}
                          title="Impressions change vs previous period"
                        />
                      </div>
                    </td>

                    {/* CTR + trend */}
                    <td
                      className={classNames(
                        "px-4 py-3 text-sm tabular-nums",
                        poor ? "text-red-700 font-semibold" : "text-gray-900"
                      )}
                    >
                      {formatPercent(row.ctr)}
                      <TrendIndicator delta={row.ctrDelta} title="CTR change vs previous period" />
                    </td>

                    {/* Avg. Position + trend (invert) */}
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-900">
                      {row.position.toFixed(1)}
                      <TrendIndicator
                        delta={row.positionDelta}
                        invert
                        title="Avg. Position change vs previous period (lower is better)"
                      />
                    </td>

                    {/* Alerts */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {poor && (
                          <AlertChip
                            label="Low CTR @ Good Rank"
                            tone="danger"
                            title="High rank but low CTR—consider localized content/snippet improvements."
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {countriesSorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No countries meet the current impression threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Inline helper / CTA row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Tip: Sort by <strong>Position</strong> and scan for red chips to prioritize quick wins.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
            onClick={() => alert("Open Task Drawer (stub) with current filters")}
            style={{ cursor: "pointer" }}
            aria-label="Optimize Low-CTR Listings"
            title="Create optimization tasks for low-CTR listings"
          >
            <ClipboardList className="h-4 w-4" style={{ color: BRAND }} />
            Optimize Low‑CTR Listings
          </button>
        </div>
      </div>
    </section>
  );
}
