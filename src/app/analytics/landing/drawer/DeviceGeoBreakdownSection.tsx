"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Smartphone,
  Monitor,
  Tablet as TabletIcon,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3 as SectionIcon,
  Download,
  Globe2,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Theme tokens (aligned with Wranker)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 12,
  // Metric tones
  good: "#10B981",
  warn: "#F59E0B",
  bad: "#EF4444",
  spark: {
    stroke: "#008CCD",
    fill: "rgba(0,140,205,.10)",
  },
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const fmt = {
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number, d = 1) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(n),
  pct: (n: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)}%`,
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};

/** Cell tone helpers (green good / red weak) */
const tone = {
  bounce: (v: number) => (v < 35 ? TK.good : v < 50 ? TK.warn : TK.bad),
  cvr: (v: number) => (v >= 3.5 ? TK.good : v >= 2 ? TK.warn : TK.bad),
  ctr: (v: number) => (v >= 8 ? TK.good : v >= 5 ? TK.warn : TK.bad),
  pos: (v: number) => (v <= 5 ? TK.good : v <= 10 ? TK.warn : TK.bad),
};

/* ──────────────────────────────────────────────────────────────
   Modular chips & toggle switch (shared pattern)
   ────────────────────────────────────────────────────────────── */
function Chip({
  children,
  onClear,
  title,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
      title={title}
    >
      {children}
      {onClear && (
        <button
          className="ml-0.5 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer"
          style={{ borderColor: TK.borderLight, color: TK.muted }}
          onClick={onClear}
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </span>
  );
}
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer"
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
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}
const Dot = ({ color }: { color: string }) => (
  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
);

/* ──────────────────────────────────────────────────────────────
   Types & Mock Data
   ────────────────────────────────────────────────────────────── */
type DeviceKey = "mobile" | "desktop" | "tablet";

type DeviceRow = {
  key: DeviceKey;
  label: string;
  sessions: number;
  bounceRate: number; // %
  avgSec: number; // seconds
  convRate: number; // %
  // area trend data: last 7 days sessions
  spark: { d: string; v: number }[];
};

type CountryRow = {
  code: string;
  name: string;
  clicks: number;
  impressions: number;
  ctr: number; // %
  position: number; // avg pos
  spark: { d: string; v: number }[]; // clicks trend
};

// deterministic spark generator
function spark(n = 7, seed = 1, base = 100, spread = 0.25) {
  const data: { d: string; v: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const wobble =
      Math.sin((i + seed) / 2.2) * spread +
      Math.cos((i + seed) / 3.1) * (spread / 2);
    data.push({
      d: date.toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
      v: Math.max(1, Math.round(base * (1 + wobble))),
    });
  }
  return data;
}

/** Mock device table (GA4-like) */
const MOCK_DEVICES: DeviceRow[] = [
  {
    key: "mobile",
    label: "Mobile",
    sessions: 1210,
    bounceRate: 48.5,
    avgSec: 69, // 01:09
    convRate: 3.1,
    spark: spark(7, 2, 170, 0.18),
  },
  {
    key: "desktop",
    label: "Desktop",
    sessions: 800,
    bounceRate: 32.2,
    avgSec: 123, // 02:03
    convRate: 4.4,
    spark: spark(7, 3, 110, 0.16),
  },
  {
    key: "tablet",
    label: "Tablet",
    sessions: 132,
    bounceRate: 54.9,
    avgSec: 58, // 00:58
    convRate: 2.3,
    spark: spark(7, 4, 28, 0.22),
  },
];

/** Mock country table (GSC-like) — no emojis */
const RAW_COUNTRIES: CountryRow[] = [
  { code: "US", name: "United States", clicks: 410, impressions: 4300, ctr: 9.53, position: 6.2, spark: spark(7, 1, 68, 0.22) },
  { code: "IN", name: "India", clicks: 390, impressions: 5100, ctr: 7.64, position: 7.1, spark: spark(7, 2, 62, 0.20) },
  { code: "GB", name: "United Kingdom", clicks: 175, impressions: 2300, ctr: 7.6, position: 8.3, spark: spark(7, 3, 30, 0.24) },
  { code: "AU", name: "Australia", clicks: 102, impressions: 1450, ctr: 7.03, position: 9.2, spark: spark(7, 4, 20, 0.26) },
  { code: "DE", name: "Germany", clicks: 55, impressions: 410, ctr: 13.41, position: 7.9, spark: spark(7, 5, 11, 0.28) },
];

/* ──────────────────────────────────────────────────────────────
   Small UI pieces
   ────────────────────────────────────────────────────────────── */
function TrendArea({
  data,
  ariaLabel,
}: {
  data: { d: string; v: number }[];
  ariaLabel: string;
}) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="d" hide />
          <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
          <RTooltip
            isAnimationActive={false}
            cursor={{ stroke: TK.spark.stroke, strokeOpacity: 0.25 }}
            contentStyle={{
              background: "#fff",
              border: `1px solid ${TK.border}`,
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 2px 10px rgba(0,0,0,.06)",
            }}
            labelFormatter={(label) => String(label)}
            formatter={(val) => [fmt.num(Number(val)), ""]}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={TK.spark.stroke}
            fill={TK.spark.fill}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

function MetricChip({
  value,
  toneColor,
  title,
}: {
  value: string;
  toneColor: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color: toneColor,
        background: "rgba(0,0,0,.02)",
        border: `1px solid ${toneColor}22`,
      }}
    >
      {value}
    </span>
  );
}

/* Sort header */
type Dir = "asc" | "desc";
function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: Dir;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-1 font-semibold text-[13px] cursor-pointer"
      onClick={onClick}
      title="Sort"
    >
      <span>{label}</span>
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )
      ) : (
        <span className="inline-block h-4 w-4" />
      )}
    </button>
  );
}

/* Device icons (branded) */
function DeviceIcon({ k }: { k: DeviceKey }) {
  const cls = "h-4 w-4";
  const style = { color: TK.brand };
  if (k === "mobile") return <Smartphone className={cls} style={style} />;
  if (k === "desktop") return <Monitor className={cls} style={style} />;
  return <TabletIcon className={cls} style={style} />;
}

/* ──────────────────────────────────────────────────────────────
   CSV & PNG export (single button w/ dropdown)
   ────────────────────────────────────────────────────────────── */
function exportCSVDevices(rows: DeviceRow[]) {
  const header = [
    "device",
    "sessions",
    "bounceRate(%)",
    "avgDuration(sec)",
    "convRate(%)",
  ];
  const body = rows
    .map((r) =>
      [
        r.label,
        r.sessions,
        r.bounceRate.toFixed(2),
        r.avgSec,
        r.convRate.toFixed(2),
      ].join(",")
    )
    .join("\n");
  const blob = new Blob([header.join(",") + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "device-breakdown.csv";
  a.click();
}
function exportCSVCountries(rows: CountryRow[]) {
  const header = ["country", "clicks", "impressions", "ctr(%)", "avgPosition"];
  const body = rows
    .map((r) =>
      [r.name, r.clicks, r.impressions, r.ctr.toFixed(2), r.position.toFixed(1)].join(",")
    )
    .join("\n");
  const blob = new Blob([header.join(",") + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "geo-breakdown.csv";
  a.click();
}
function exportPNG(el: HTMLElement | null, filename = "device-geo-breakdown.png") {
  if (!el) return;
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK};background:#fff;">
          ${el.outerHTML}
        </div>
      </foreignObject>
    </svg>`;
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ──────────────────────────────────────────────────────────────
   Main Section Component
   ────────────────────────────────────────────────────────────── */
type DevSortKey = "sessions" | "bounceRate" | "avgSec" | "convRate";
type GeoSortKey = "clicks" | "impressions" | "ctr" | "position";

export default function DeviceGeoBreakdownSection() {
  const [devSortBy, setDevSortBy] = React.useState<DevSortKey>("sessions");
  const [devDir, setDevDir] = React.useState<Dir>("desc");

  const [geoSortBy, setGeoSortBy] = React.useState<GeoSortKey>("clicks");
  const [geoDir, setGeoDir] = React.useState<Dir>("desc");

  const [minImpr, setMinImpr] = React.useState<number>(400); // filter for countries
  const [showInsights, setShowInsights] = React.useState(true);

  const sectionRef = React.useRef<HTMLDivElement | null>(null);

  const devices = React.useMemo(() => {
    const rows = [...MOCK_DEVICES];
    rows.sort((a, b) => {
      const va = a[devSortBy];
      const vb = b[devSortBy];
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : 0;
      return devDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [devSortBy, devDir]);

  const countries = React.useMemo(() => {
    const rows = RAW_COUNTRIES.filter((c) => c.impressions >= minImpr);
    rows.sort((a, b) => {
      const va = a[geoSortBy];
      const vb = b[geoSortBy];
      const cmp =
        typeof va === "number" && typeof vb === "number" ? (va as number) - (vb as number) : 0;
      return geoDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [geoSortBy, geoDir, minImpr]);

  // Insights
  const mobile = MOCK_DEVICES.find((d) => d.key === "mobile")!;
  const desktop = MOCK_DEVICES.find((d) => d.key === "desktop")!;
  const mobileCROpportunity = mobile.convRate < desktop.convRate * 0.5;
  const highCtrRegions = RAW_COUNTRIES.filter((c) => c.ctr >= 10);

  // Export dropdown
  const [exportOpen, setExportOpen] = React.useState(false);
  const exportBoxRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!exportBoxRef.current) return;
      if (!exportBoxRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Device &amp; Geo Breakdown
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={showInsights}
            onChange={setShowInsights}
            label="Show insights"
          />
          <div ref={exportBoxRef} className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
              style={{ borderColor: TK.border }}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              title="Export"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 z-20 mt-2 w-56 rounded-md border bg-white p-1 shadow"
                style={{ borderColor: TK.border }}
                role="menu"
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportCSVDevices(devices);
                    setExportOpen(false);
                  }}
                >
                  CSV — Devices
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportCSVCountries(countries);
                    setExportOpen(false);
                  }}
                >
                  CSV — Countries
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportPNG(sectionRef.current);
                    setExportOpen(false);
                  }}
                >
                  PNG — Section
                </button>
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-1 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            <span>Hover rows to see quick tips</span>
          </div>
        </div>
      </div>

      {/* Chips row */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Chip onClear={() => setMinImpr(0)} title="Minimum impressions filter">
          <Globe2 size={12} style={{ color: TK.brand }} />
          Min Impr: <strong>{fmt.num(minImpr)}</strong>
        </Chip>
        <Chip
          onClear={() => {
            setDevSortBy("sessions");
            setDevDir("desc");
          }}
          title="Device table sort"
        >
          <Smartphone size={12} style={{ color: TK.brand }} />
          Dev sort: <strong>{devSortBy}</strong> / {devDir}
        </Chip>
        <Chip
          onClear={() => {
            setGeoSortBy("clicks");
            setGeoDir("desc");
          }}
          title="Country table sort"
        >
          <Globe2 size={12} style={{ color: TK.brand }} />
          Geo sort: <strong>{geoSortBy}</strong> / {geoDir}
        </Chip>
      </div>

      {/* Insights */}
      {showInsights && (mobileCROpportunity || highCtrRegions.length > 0) && (
        <div
          className="mt-3 rounded-md px-3 py-2 text-sm"
          style={{ background: "#F5F7FA", border: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {mobileCROpportunity && (
              <div className="inline-flex items-center gap-2">
                <Dot color={TK.bad} />
                <span>
                  <strong>Mobile CR</strong> is{" "}
                  {fmt.one(
                    ((desktop.convRate - mobile.convRate) / desktop.convRate) * 100,
                    0
                  )}
                  % lower than Desktop — check mobile UX for this page.
                </span>
              </div>
            )}
            {highCtrRegions.length > 0 && (
              <div className="inline-flex items-center gap-2">
                <Dot color={TK.good} />
                <span>
                  High‑interest regions detected:{" "}
                  {highCtrRegions
                    .map((r) => `${r.name} (${fmt.one(r.ctr)}% CTR)`)
                    .join(", ")}.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content grid: Device (left) | Country (right) */}
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {/* Device table card */}
        <div
          className="rounded-md bg-white p-3"
          style={{ border: `1px solid ${TK.border}`, boxShadow: "0 1px 2px rgba(17,24,39,.06)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[14px] font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" style={{ color: TK.brand }} />
              Device performance (GA4)
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                  <th className="py-2 pr-3">Device</th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Sessions"
                      active={devSortBy === "sessions"}
                      dir={devDir}
                      onClick={() => {
                        if (devSortBy === "sessions") setDevDir(devDir === "asc" ? "desc" : "asc");
                        setDevSortBy("sessions");
                      }}
                    />
                  </th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Bounce"
                      active={devSortBy === "bounceRate"}
                      dir={devDir}
                      onClick={() => {
                        if (devSortBy === "bounceRate") setDevDir(devDir === "asc" ? "desc" : "asc");
                        setDevSortBy("bounceRate");
                      }}
                    />
                  </th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Avg. Duration"
                      active={devSortBy === "avgSec"}
                      dir={devDir}
                      onClick={() => {
                        if (devSortBy === "avgSec") setDevDir(devDir === "asc" ? "desc" : "asc");
                        setDevSortBy("avgSec");
                      }}
                    />
                  </th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Conv. Rate"
                      active={devSortBy === "convRate"}
                      dir={devDir}
                      onClick={() => {
                        if (devSortBy === "convRate") setDevDir(devDir === "asc" ? "desc" : "asc");
                        setDevSortBy("convRate");
                      }}
                    />
                  </th>
                  <th className="py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b last:border-0 hover:bg-gray-50/60 transition-colors"
                    style={{ borderColor: TK.borderLight }}
                    title={`Tip: ${row.label} bounce ${fmt.pct(row.bounceRate)}; CR ${fmt.pct(row.convRate)}.`}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <DeviceIcon k={row.key} />
                        <span className="font-medium">{row.label}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="tabular-nums">{fmt.num(row.sessions)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <MetricChip
                        value={fmt.pct(row.bounceRate)}
                        toneColor={tone.bounce(row.bounceRate)}
                        title="Lower is better"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="tabular-nums">{fmt.time(row.avgSec)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <MetricChip
                        value={fmt.pct(row.convRate)}
                        toneColor={tone.cvr(row.convRate)}
                        title="Higher is better"
                      />
                    </td>
                    <td className="py-2">
                      {/* area chart per spec */}
                      <TrendArea data={row.spark} ariaLabel={`${row.label} sessions trend`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Country table card */}
        <div
          className="rounded-md bg-white p-3"
          style={{ border: `1px solid ${TK.border}`, boxShadow: "0 1px 2px rgba(17,24,39,.06)" }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[14px] font-semibold flex items-center gap-2">
              <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
              Country‑wise search (GSC)
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="inline-flex items-center gap-1 text-gray-600">
                Min Impr:
                <input
                  type="number"
                  className="h-7 w-20 rounded border px-2"
                  min={0}
                  step={50}
                  value={minImpr}
                  onChange={(e) => setMinImpr(Math.max(0, Number(e.target.value)))}
                  style={{ borderColor: TK.border }}
                  title="Hide low-visibility rows"
                />
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                  <th className="py-2 pr-3">Country</th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Clicks"
                      active={geoSortBy === "clicks"}
                      dir={geoDir}
                      onClick={() => {
                        if (geoSortBy === "clicks") setGeoDir(geoDir === "asc" ? "desc" : "asc");
                        setGeoSortBy("clicks");
                      }}
                    />
                  </th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Impressions"
                      active={geoSortBy === "impressions"}
                      dir={geoDir}
                      onClick={() => {
                        if (geoSortBy === "impressions") setGeoDir(geoDir === "asc" ? "desc" : "asc");
                        setGeoSortBy("impressions");
                      }}
                    />
                  </th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="CTR"
                      active={geoSortBy === "ctr"}
                      dir={geoDir}
                      onClick={() => {
                        if (geoSortBy === "ctr") setGeoDir(geoDir === "asc" ? "desc" : "asc");
                        setGeoSortBy("ctr");
                      }}
                    />
                  </th>
                  <th className="py-2 pr-3">
                    <SortHeader
                      label="Avg. Position"
                      active={geoSortBy === "position"}
                      dir={geoDir}
                      onClick={() => {
                        if (geoSortBy === "position") setGeoDir(geoDir === "asc" ? "desc" : "asc");
                        setGeoSortBy("position");
                      }}
                    />
                  </th>
                  <th className="py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((row) => (
                  <tr
                    key={row.code}
                    className="border-b last:border-0 hover:bg-gray-50/60 transition-colors"
                    style={{ borderColor: TK.borderLight }}
                    title={`Tip: ${row.name} CTR ${fmt.pct(row.ctr)}; Pos ${fmt.one(row.position, 1)}.`}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="tabular-nums">{fmt.num(row.clicks)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="tabular-nums">{fmt.num(row.impressions)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <MetricChip
                        value={fmt.pct(row.ctr)}
                        toneColor={tone.ctr(row.ctr)}
                        title="Higher is better"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="tabular-nums rounded px-1.5 py-0.5"
                        style={{
                          color: tone.pos(row.position),
                          background: "rgba(0,0,0,.02)",
                          border: `1px solid ${tone.pos(row.position)}22`,
                        }}
                        title="Lower rank is better"
                      >
                        {fmt.one(row.position, 1)}
                      </span>
                    </td>
                    <td className="py-2">
                      {/* area chart per spec */}
                      <TrendArea data={row.spark} ariaLabel={`${row.name} clicks trend`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Optional legend */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Green = strong metric
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Red = weak metric
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
