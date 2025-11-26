"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Monitor,
  Smartphone,
  Tablet as TabletIcon,
  Globe2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
} from "lucide-react";

/** ----------------------------------------------------------------
 *  Tokens (brand-aligned)
 *  ---------------------------------------------------------------- */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
} as const;

/** --------------------- Types --------------------- */

type DeviceKey = "mobile" | "desktop" | "tablet" | string;

type DeviceRowInput = {
  device: DeviceKey;
  sessions?: number;
  conversions?: number;
  avgEngagementTimeSec?: number; // seconds
  exitRate?: number; // 0..100
};

type DeviceRow = Required<DeviceRowInput> & {
  convRate: number; // %
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type CountryRowInput = {
  countryCode?: string; // ISO-2
  country?: string; // Name
  sessions?: number;
  conversions?: number;
  avgEngagementTimeSec?: number; // seconds
  exitRate?: number; // 0..100
};

type CountryRow = Required<CountryRowInput> & {
  convRate: number; // %
};

type SortDir = "asc" | "desc";

type Props = {
  /** Optional external data. If omitted, example rows from the spec are used. */
  devices?: DeviceRowInput[];
  countries?: CountryRowInput[];
  /** Optional initial toggle for visuals (progress bars). Default: true */
  initialShowVisuals?: boolean;
  className?: string;
};

/** --------------------- Utilities --------------------- */

const DEVICE_META: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  mobile: { label: "Mobile", Icon: Smartphone },
  desktop: { label: "Desktop", Icon: Monitor },
  tablet: { label: "Tablet", Icon: TabletIcon },
};

const clampNum = (n: unknown, fallback = 0) => {
  const x = typeof n === "number" && isFinite(n) ? n : Number(n);
  return isFinite(x) ? x : fallback;
};

const safePercent = (num: number, den: number) =>
  den > 0 && isFinite(num) ? (num / den) * 100 : 0;

const formatPercent = (val: number, digits = 2) =>
  `${(isFinite(val) ? val : 0).toFixed(digits)}%`;

const mmss = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const numberFmt = (n: number) => clampNum(n).toLocaleString();

/** CVR tone (no emoji) */
const cvrTone = (cvr: number) => {
  if (cvr > 3.5) return { dot: "#10B981", text: "text-emerald-600" }; // green
  if (cvr >= 1.5) return { dot: "#F59E0B", text: "text-amber-600" }; // amber
  return { dot: "#EF4444", text: "text-red-600" }; // red
};

/** Safe max from array of numbers */
const safeMax = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

/** --------------------- Default Example Data (from the spec) --------------------- */
const DEFAULT_DEVICE_ROWS: DeviceRowInput[] = [
  { device: "mobile", sessions: 8230, conversions: 183, avgEngagementTimeSec: 62, exitRate: 68 },
  { device: "desktop", sessions: 4810, conversions: 172, avgEngagementTimeSec: 141, exitRate: 44 },
  { device: "tablet", sessions: 720, conversions: 18, avgEngagementTimeSec: 101, exitRate: 59 },
];

const DEFAULT_COUNTRY_ROWS: CountryRowInput[] = [
  { countryCode: "IN", country: "India", sessions: 5930, conversions: 143, avgEngagementTimeSec: 92, exitRate: 51 },
  { countryCode: "US", country: "USA", sessions: 4210, conversions: 171, avgEngagementTimeSec: 123, exitRate: 39 },
  { countryCode: "AU", country: "Australia", sessions: 820, conversions: 10, avgEngagementTimeSec: 56, exitRate: 63 },
];

/* --------------------- Modular chips & toggle --------------------- */

function ChipToggle({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 cursor-pointer rounded-full border px-3 text-sm ${active ? "font-semibold" : ""}`}
      style={{
        borderColor: TK.borderLight,
        background: active ? "#D9EEF8" : "#fff",
        color: active ? TK.valueBlue : "inherit",
      }}
      type="button"
    >
      {label}
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
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        }`}
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

/** --------------------- Component --------------------- */

export default function ConversionByDeviceCountry(props: Props) {
  const {
    devices: devicesIn,
    countries: countriesIn,
    initialShowVisuals = true,
    className = "",
  } = props ?? {};

  /** -------- sanitize + enrich data with safe defaults -------- */
  const deviceRows: DeviceRow[] = useMemo(() => {
    const src = Array.isArray(devicesIn) && devicesIn.length ? devicesIn : DEFAULT_DEVICE_ROWS;
    return src.map((d) => {
      const key = String(d.device || "").toLowerCase();
      const meta = DEVICE_META[key] ?? { label: (d.device || "Device") as string, Icon: Monitor };
      const sessions = clampNum(d.sessions);
      const conversions = clampNum(d.conversions);
      const avgEngagementTimeSec = clampNum(d.avgEngagementTimeSec);
      const exitRate = clampNum(d.exitRate);
      return {
        device: key,
        sessions,
        conversions,
        avgEngagementTimeSec,
        exitRate,
        convRate: safePercent(conversions, sessions),
        label: meta.label,
        Icon: meta.Icon,
      };
    });
  }, [devicesIn]);

  const countryRows: CountryRow[] = useMemo(() => {
    const src = Array.isArray(countriesIn) && countriesIn.length ? countriesIn : DEFAULT_COUNTRY_ROWS;
    return src.map((c) => {
      const sessions = clampNum(c.sessions);
      const conversions = clampNum(c.conversions);
      const avgEngagementTimeSec = clampNum(c.avgEngagementTimeSec);
      const exitRate = clampNum(c.exitRate);
      const code = (c.countryCode || "").toUpperCase();
      const name = c.country || code || "—";
      return {
        countryCode: code || "UN",
        country: name,
        sessions,
        conversions,
        avgEngagementTimeSec,
        exitRate,
        convRate: safePercent(conversions, sessions),
      };
    });
  }, [countriesIn]);

  /** ------------ Derived helpers (guarded; no spreads on undefined) ------------ */
  const deviceMaxSessions = useMemo(
    () => safeMax(deviceRows.map((r) => r.sessions || 0)),
    [deviceRows]
  );
  const countryMaxSessions = useMemo(
    () => safeMax(countryRows.map((r) => r.sessions || 0)),
    [countryRows]
  );

  /** ------------ Sorting / Filtering State ------------ */
  const [showVisuals, setShowVisuals] = useState<boolean>(initialShowVisuals);

  type DeviceSortKey = keyof Pick<DeviceRow, "sessions" | "conversions" | "convRate" | "avgEngagementTimeSec" | "exitRate">;
  type CountrySortKey = keyof Pick<CountryRow, "sessions" | "conversions" | "convRate" | "avgEngagementTimeSec" | "exitRate">;

  const [deviceSort, setDeviceSort] = useState<{ key: DeviceSortKey; dir: SortDir }>({
    key: "sessions",
    dir: "desc",
  });
  const [countrySort, setCountrySort] = useState<{ key: CountrySortKey; dir: SortDir }>({
    key: "sessions",
    dir: "desc",
  });
  const [countryQuery, setCountryQuery] = useState("");

  const sortedDevices = useMemo(() => {
    const list = [...deviceRows];
    const { key, dir } = deviceSort;
    list.sort((a, b) => {
      const av = clampNum(a[key]);
      const bv = clampNum(b[key]);
      return dir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [deviceRows, deviceSort]);

  const filteredSortedCountries = useMemo(() => {
    const q = (countryQuery || "").trim().toLowerCase();
    const base = q
      ? countryRows.filter(
          (r) =>
            r.country.toLowerCase().includes(q) ||
            r.countryCode.toLowerCase().includes(q)
        )
      : countryRows.slice();
    const { key, dir } = countrySort;
    base.sort((a, b) => {
      const av = clampNum(a[key]);
      const bv = clampNum(b[key]);
      return dir === "asc" ? av - bv : bv - av;
    });
    return base;
  }, [countryRows, countrySort, countryQuery]);

  /** ------------ Click handlers ------------ */
  const toggleDeviceSort = (key: DeviceSortKey) =>
    setDeviceSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  const toggleCountrySort = (key: CountrySortKey) =>
    setCountrySort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  /** ------------ Render helpers ------------ */
  const SortHeader: React.FC<{
    label: string;
    isActive: boolean;
    dir?: SortDir;
    onClick: () => void;
    className?: string;
  }> = ({ label, isActive, dir, onClick, className }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 select-none cursor-pointer ${className || ""}`}
      title="Sort"
    >
      <span>{label}</span>
      <span className="inline-flex">
        {isActive ? (dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} />}
      </span>
    </button>
  );

  const VisualBar: React.FC<{ value: number; max: number; title?: string }> = ({ value, max, title }) => {
    const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
    return (
      <div className="w-full mt-4">
        <div className="h-2 w-full rounded bg-gray-200/70">
          <div
            className="h-2 rounded"
            style={{ width: `${pct}%`, background: TK.valueBlue }}
            title={title}
          />
        </div>
      </div>
    );
  };

  /** --------------------- Export helpers --------------------- */
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [expOpen, setExpOpen] = useState(false);
  const expRef = useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!expRef.current) return;
      if (!expRef.current.contains(e.target as Node)) setExpOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function exportCSV() {
    const lines: string[] = [];
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;

    lines.push(["section", "Device View"].map(esc).join(","));
    lines.push(["device", "sessions", "conversions", "conv_rate_pct", "avg_time_sec", "exit_rate_pct"].map(esc).join(","));
    sortedDevices.forEach((r) => {
      lines.push([r.label, r.sessions, r.conversions, r.convRate.toFixed(2), Math.round(r.avgEngagementTimeSec), r.exitRate.toFixed(0)].map(esc).join(","));
    });

    lines.push(["", "", "", "", "", ""].map(esc).join(","));
    lines.push(["section", "Country View"].map(esc).join(","));
    lines.push(["country", "code", "sessions", "conversions", "conv_rate_pct", "avg_time_sec", "exit_rate_pct"].map(esc).join(","));
    filteredSortedCountries.forEach((r) => {
      lines.push([r.country, r.countryCode, r.sessions, r.conversions, r.convRate.toFixed(2), Math.round(r.avgEngagementTimeSec), r.exitRate.toFixed(0)].map(esc).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conversion-device-country-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  /** --------------------- Component UI --------------------- */
  return (
    <section
      ref={sectionRef}
      className={`w-full ${className}`}
      style={{
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue'",
      }}
    >
      {/* Section Title & Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b">
          <BarChart3 className="mt-0.5 h-5 w-5" style={{ color: TK.brand }} />
          <div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: TK.text }}>
              Conversion by Device & Country
            </h2>
            <p className="text-sm" style={{ color: TK.muted }}>
              Identify which devices and regions drive the most conversions and where to optimize UX or localization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle switch (modular) */}
          <ToggleSwitch checked={showVisuals} onChange={setShowVisuals} label="Show visuals" />

          {/* Export button (single) */}
          <div className="relative" ref={expRef}>
            <button
              onClick={() => setExpOpen((s) => !s)}
              className="inline-flex cursor-pointer items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border }}
              aria-haspopup="menu"
              aria-expanded={expOpen}
              title="Export"
            >
              <Download className="h-4 w-4" style={{ color: TK.brand }} />
              Export
            </button>
            {expOpen && (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 shadow-lg"
                style={{ borderColor: TK.borderLight }}
              >
                <button
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setExpOpen(false);
                    exportCSV();
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device View */}
      <div className="rounded-lg border bg-white shadow-sm" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" style={{ color: TK.brand }} />
            <h3 className="font-medium" style={{ color: TK.text }}>
              Device View
            </h3>
          </div>
          <span className="text-xs" style={{ color: TK.muted }}>
            GA4
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-sm" style={{ borderColor: TK.border }}>
            <thead className="bg-gray-50 text-xs uppercase" style={{ color: TK.muted }}>
              <tr>
                <th className="px-4 py-2 text-left">Device</th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Sessions"
                    isActive={deviceSort.key === "sessions"}
                    dir={deviceSort.dir}
                    onClick={() => toggleDeviceSort("sessions")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Conversions"
                    isActive={deviceSort.key === "conversions"}
                    dir={deviceSort.dir}
                    onClick={() => toggleDeviceSort("conversions")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Conv. Rate"
                    isActive={deviceSort.key === "convRate"}
                    dir={deviceSort.dir}
                    onClick={() => toggleDeviceSort("convRate")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Avg. Time"
                    isActive={deviceSort.key === "avgEngagementTimeSec"}
                    dir={deviceSort.dir}
                    onClick={() => toggleDeviceSort("avgEngagementTimeSec")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Exit Rate"
                    isActive={deviceSort.key === "exitRate"}
                    dir={deviceSort.dir}
                    onClick={() => toggleDeviceSort("exitRate")}
                  />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: TK.borderLight }}>
              {sortedDevices.map((r, idx) => {
                const tone = cvrTone(r.convRate);
                return (
                  <tr
                    key={`${r.device}-${idx}`}
                    className="hover:bg-gray-50"
                    title="Click to filter other tabs (future)"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* <r.Icon className="h-4 w-4" style={{ color: TK.brand }} /> */}
                        <span className="font-medium" style={{ color: TK.text }}>
                          {r.label}
                        </span>
                      </div>

                      {showVisuals && (
                        <div className="mt-2 w-56 max-w-full">
                          <VisualBar
                            value={r.sessions}
                            max={deviceMaxSessions}
                            title="Relative sessions by device"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{numberFmt(r.sessions)}</td>
                    <td className="px-4 py-3">{numberFmt(r.conversions)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${tone.text}`}
                      title={`Conversions ÷ Sessions = ${r.conversions} ÷ ${r.sessions}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: tone.dot }}
                        />
                        {formatPercent(r.convRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{mmss(r.avgEngagementTimeSec)}</td>
                    <td
                      className="px-4 py-3"
                      title="% of sessions ending on this device"
                    >
                      {formatPercent(r.exitRate, 0)}
                    </td>
                  </tr>
                );
              })}

              {sortedDevices.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center" style={{ color: TK.muted }} colSpan={6}>
                    No device data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CTA (kept; non-breaking) */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3" style={{ borderColor: TK.borderLight }}>
          <button
            type="button"
            className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border }}
            title="Future: runs a guided checklist"
          >
            Run Mobile Optimization Checklist
          </button>
        </div>
      </div>

      {/* Country View */}
      <div className="mt-6 rounded-lg border bg-white shadow-sm" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
            <h3 className="font-medium" style={{ color: TK.text }}>
              Country View
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Filter countries…"
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              className="w-44 rounded-md border px-3 py-1.5 text-sm outline-none focus:border-[#008CCD] focus:ring-2 focus:ring-[#008CCD22]"
              style={{ borderColor: TK.border }}
              title="Filter countries"
            />
            <span className="text-xs" style={{ color: TK.muted }}>
              GA4
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-sm" style={{ borderColor: TK.border }}>
            <thead className="bg-gray-50 text-xs uppercase" style={{ color: TK.muted }}>
              <tr>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Sessions"
                    isActive={countrySort.key === "sessions"}
                    dir={countrySort.dir}
                    onClick={() => toggleCountrySort("sessions")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Conversions"
                    isActive={countrySort.key === "conversions"}
                    dir={countrySort.dir}
                    onClick={() => toggleCountrySort("conversions")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Conv. Rate"
                    isActive={countrySort.key === "convRate"}
                    dir={countrySort.dir}
                    onClick={() => toggleCountrySort("convRate")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Avg. Time"
                    isActive={countrySort.key === "avgEngagementTimeSec"}
                    dir={countrySort.dir}
                    onClick={() => toggleCountrySort("avgEngagementTimeSec")}
                  />
                </th>
                <th className="px-4 py-2 text-left">
                  <SortHeader
                    label="Exit Rate"
                    isActive={countrySort.key === "exitRate"}
                    dir={countrySort.dir}
                    onClick={() => toggleCountrySort("exitRate")}
                  />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: TK.borderLight }}>
              {filteredSortedCountries.map((r, idx) => {
                const tone = cvrTone(r.convRate);
                return (
                  <tr
                    key={`${r.countryCode}-${idx}`}
                    className="hover:bg-gray-50"
                    title="Click to filter other tabs (future)"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
                        <span className="font-medium" style={{ color: TK.text }}>
                          {r.country}
                        </span>
                        <span
                          className="ml-2 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ borderColor: TK.border, color: TK.valueBlue, background: "#F5F7FA" }}
                          title="Country code"
                        >
                          {r.countryCode}
                        </span>
                      </div>

                      {showVisuals && (
                        <div className="mt-2 w-56 max-w-full">
                          <VisualBar
                            value={r.sessions}
                            max={countryMaxSessions}
                            title="Relative sessions by country"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{numberFmt(r.sessions)}</td>
                    <td className="px-4 py-3">{numberFmt(r.conversions)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${tone.text}`}
                      title={`Conversions ÷ Sessions = ${r.conversions} ÷ ${r.sessions}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: tone.dot }}
                        />
                        {formatPercent(r.convRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{mmss(r.avgEngagementTimeSec)}</td>
                    <td
                      className="px-4 py-3"
                      title="% of sessions ending in this region"
                    >
                      {formatPercent(r.exitRate, 0)}
                    </td>
                  </tr>
                );
              })}

              {filteredSortedCountries.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center" style={{ color: TK.muted }} colSpan={6}>
                    No matching countries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CTA (kept; non-breaking) */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3" style={{ borderColor: TK.borderLight }}>
          <button
            type="button"
            className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border }}
            title="Future: triggers localization workflow"
          >
            Localize for Top Markets
          </button>
        </div>
      </div>

      {/* Legend (no emoji) */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: TK.muted }}>
        <span className="font-medium" style={{ color: TK.text }}>Legend:</span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#10B981" }} /> High CVR (&gt; 3.5%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#F59E0B" }} /> Moderate (1.5%–3.5%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#EF4444" }} /> Low (&lt; 1.5%)
        </span>
      </div>
    </section>
  );
}
