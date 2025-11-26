"use client";

import * as React from "react";
import {
  Eye,
  ClipboardList,
  Download,
  Filter,
  Info,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet as TabletIcon,
  Search as SearchIcon,
  Share2,
  MousePointerClick,
  CircleDot,
  ChevronDown as CaretDown,
  TrendingDown,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  pastel: "#F5F7FA",
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ───────────────────────── Types ───────────────────────── */
type Device = "all" | "desktop" | "mobile" | "tablet";
type Source =
  | "all"
  | "google / organic"
  | "direct / (none)"
  | "facebook / referral"
  | "google / cpc"
  | "bing / organic";

type Row = {
  id: string;
  pageTitle: string;
  pagePath: string;
  device: Exclude<Device, "all">;
  source: Exclude<Source, "all">;

  pageviews: number;
  exits: number;
  exitRate: number; // %
  engagedSessions: number;
  avgEngTime: number; // seconds
  bounceRate: number; // %
  scrollPct: number; // %
};

/* ───────────────────────── Utilities ───────────────────────── */
const fmt = {
  pct: (v: number, fd = 1) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(v)}%`,
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  time: (sec: number) => {
    const m = Math.max(0, Math.floor(sec / 60));
    const s = Math.max(0, Math.floor(sec % 60));
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};
function exitTone(v: number) {
  if (v >= 60) return { color: TK.danger };
  if (v >= 45) return { color: TK.warn };
  return { color: TK.ok };
}

/* ───────────────────────── Tooltip (tiny) ───────────────────────── */
const Tip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className="absolute z-40 -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-xs shadow"
          style={{ background: TK.card, border: `1px solid ${TK.border}`, color: TK.text }}
        >
          {text}
        </div>
      )}
    </span>
  );
};

/* ───────────────────────── Mock GA4 adapter ───────────────────────── */
const SOURCES: Source[] = [
  "all",
  "google / organic",
  "direct / (none)",
  "facebook / referral",
  "google / cpc",
  "bing / organic",
];
const DEVICES: Device[] = ["all", "desktop", "mobile", "tablet"];

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]) {
  return arr[rnd(0, arr.length - 1)];
}
function idFor(path: string) {
  return path.replace(/[^a-z0-9]/gi, "_").slice(0, 64) + "_" + Math.random().toString(36).slice(2, 6);
}

/* ───────────────────────── CSV / PNG export ───────────────────────── */
function exportCSV(rows: Row[]) {
  const cols = [
    "pageTitle",
    "pagePath",
    "device",
    "source",
    "pageviews",
    "exits",
    "exitRate(%)",
    "engagedSessions",
    "avgEngTime(sec)",
    "bounceRate(%)",
    "scrollPct(%)",
  ];
  const lines = rows.map((r) =>
    [
      JSON.stringify(r.pageTitle),
      JSON.stringify(r.pagePath),
      r.device,
      r.source,
      r.pageviews,
      r.exits,
      r.exitRate,
      r.engagedSessions,
      r.avgEngTime,
      r.bounceRate,
      r.scrollPct,
    ].join(","),
  );
  const blob = new Blob([cols.join(",") + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dropoffs_exit_rates.csv";
  a.click();
}
function exportPNG(el: HTMLElement | null, filename = "dropoffs_exit_rates.png") {
  if (!el) return;
  const markup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK}">${el.outerHTML}</div>
      </foreignObject>
    </svg>`;
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
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

/* ───────────────────────── Modular Controls ───────────────────────── */
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

function ChipDropdownDevice({
  value,
  onChange,
}: {
  value: Device;
  onChange: (v: Device) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon =
    value === "desktop" ? Monitor : value === "mobile" ? Smartphone : value === "tablet" ? TabletIcon : Monitor;
  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 px-3 py-2 border rounded-[6px] text-sm hover:bg-[#F5F7FA] cursor-pointer"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((s) => !s)}
      >
        <Icon className="h-4 w-4" style={{ color: TK.brand }} />
        <span className="font-medium">Device</span>
        <span className="text-xs text-gray-600">{value}</span>
        <CaretDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-2 w-44 bg-white border rounded-[6px] p-2 shadow"
          style={{ borderColor: TK.border }}
          role="listbox"
        >
          {DEVICES.map((d) => {
            const Ic = d === "desktop" ? Monitor : d === "mobile" ? Smartphone : d === "tablet" ? TabletIcon : Monitor;
            return (
              <button
                key={d}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
              >
                <Ic className="h-4 w-4" style={{ color: TK.brand }} />
                <span className="text-sm" style={{ color: TK.text }}>
                  {d}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function iconForSource(s: Source) {
  switch (s) {
    case "google / cpc":
      return MousePointerClick;
    case "facebook / referral":
      return Share2;
    case "direct / (none)":
      return CircleDot;
    case "bing / organic":
    case "google / organic":
      return SearchIcon;
    default:
      return Filter;
  }
}
function ChipDropdownSource({
  value,
  onChange,
}: {
  value: Source;
  onChange: (v: Source) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon = iconForSource(value);
  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 px-3 py-2 border rounded-[6px] text-sm hover:bg-[#F5F7FA] cursor-pointer"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((s) => !s)}
      >
        <Icon className="h-4 w-4" style={{ color: TK.brand }} />
        <span className="font-medium">Source</span>
        <span className="text-xs text-gray-600 truncate max-w-[120px]">{value}</span>
        <CaretDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-2 w-56 bg-white border rounded-[6px] p-2 shadow"
          style={{ borderColor: TK.border }}
          role="listbox"
        >
          {SOURCES.map((s) => {
            const Ic = iconForSource(s);
            return (
              <button
                key={s}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                <Ic className="h-4 w-4" style={{ color: TK.brand }} />
                <span className="text-sm" style={{ color: TK.text }}>
                  {s}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExportMenu({
  onCSV,
  onPNG,
}: {
  onCSV: () => void;
  onPNG: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((s) => !s)}
        title="Export"
      >
        <Download className="h-4 w-4" />
        Export
        <CaretDown className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-40 bg-white border rounded-[6px] p-2 shadow"
          style={{ borderColor: TK.border }}
          role="menu"
        >
          <button
            className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              onCSV();
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4" style={{ color: TK.brand }} />
            CSV
          </button>
          <button
            className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              onPNG();
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4" style={{ color: TK.brand }} />
            PNG
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function DropoffsExitRatesSection({data}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const rows = React.useMemo<Row[]>(() => {
    if (!data?.length) return [];
    return data.map((r, i) => ({
      id: `row_${i}`,
      pageTitle: r.pageTitle ?? "(landing page)",
      pagePath: r.pagePath ?? "/",
      device: (r.device ?? "desktop") as any,
      source: (r.source ?? "(direct) / (none)") as any,
      pageviews: Number(r.pageviews ?? 0),
      exits: Number(r.exits ?? 0),
      exitRate: Number(r.exitRate ?? 0),
      engagedSessions: Number(r.engagedSessions ?? 0),
      avgEngTime: Number(r.avgEngTime ?? 0),
      bounceRate: Number(r.bounceRate ?? 0),
      scrollPct: Number(r.scrollPct ?? 0),
    }));
  }, [data]);
  
  // Controls
  const [search, setSearch] = React.useState("");
  const [device, setDevice] = React.useState<Device>("all");
  const [source, setSource] = React.useState<Source>("all");
  const [minViews, setMinViews] = React.useState(50);
  const [onlyHighExit, setOnlyHighExit] = React.useState(false);
  const [onlyLowScroll, setOnlyLowScroll] = React.useState(false);

  // Sort
  type SortKey = "exitRate" | "engagedSessions" | "avgEngTime" | "bounceRate" | "scrollPct" | "pageTitle";
  const [sortKey, setSortKey] = React.useState<SortKey>("exitRate");
  const [sortDir, setSortDir] = React.useState<"desc" | "asc">("desc");

  // Paging
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const tableRef = React.useRef<HTMLDivElement | null>(null);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (search && !`${r.pageTitle} ${r.pagePath}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (device !== "all" && r.device !== device) return false;
      if (source !== "all" && r.source !== source) return false;
      if (r.pageviews < minViews) return false;
      if (onlyHighExit && r.exitRate < 50) return false;
      if (onlyLowScroll && r.scrollPct >= 50) return false;
      return true;
    });
  }, [rows, search, device, source, minViews, onlyHighExit, onlyLowScroll]);

  const siteAvgExit = React.useMemo(() => {
    if (!filtered.length) return 0;
    return filtered.reduce((sum, r) => sum + r.exitRate, 0) / filtered.length;
  }, [filtered]);

  const sorted = React.useMemo(() => {
    const s = [...filtered].sort((a, b) => {
      const av = a[sortKey],
        bv = b[sortKey];
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return s;
  }, [filtered, sortKey, sortDir]);

  // Paging window
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = sorted.slice(start, start + pageSize);

  function toggleSort(k: SortKey) {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir(k === "pageTitle" ? "asc" : "desc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4 mt-4"
        style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
      >
        <div className="h-8 w-48 rounded bg-gray-100" />
        <div className="mt-3 h-[360px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Drop-offs & Exit Rates
          </div>
          <Tip text="Pages with high exits or low scroll can signal UX or content issues.">
            <Info className="h-4 w-4 text-gray-500 cursor-pointer" />
          </Tip>
          <span className="ml-2 text-sm text-gray-600">
            Site avg exit: <strong>{fmt.pct(siteAvgExit)}</strong>
          </span>
        </div>

        {/* Single Export button with dropdown */}
        <ExportMenu
          onCSV={() => exportCSV(sorted)}
          onPNG={() => exportPNG(tableRef.current, "dropoffs_exit_rates.png")}
        />
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search page title or path…"
            className="h-9 w-[280px] rounded border pl-8 pr-2 text-sm"
            style={{ borderColor: TK.border }}
          />
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {/* Device (chip dropdown) */}
        <ChipDropdownDevice
          value={device}
          onChange={(d) => {
            setDevice(d);
            setPage(1);
          }}
        />

        {/* Source (chip dropdown with branded icons) */}
        <ChipDropdownSource
          value={source}
          onChange={(s) => {
            setSource(s);
            setPage(1);
          }}
        />

        {/* Min views */}
        <div className="relative">
          <label className="sr-only" htmlFor="minViews">
            Min pageviews
          </label>
          <input
            id="minViews"
            type="number"
            min={0}
            value={minViews}
            onChange={(e) => {
              setMinViews(Number(e.target.value || 0));
              setPage(1);
            }}
            className="h-9 w-[140px] rounded border px-2 text-sm"
            style={{ borderColor: TK.border }}
            title="Minimum pageviews threshold"
            placeholder="Min views"
          />
        </div>

        {/* Toggles (modular) */}
        <div className="ml-auto flex items-center gap-3">
          <ToggleSwitch
            checked={onlyHighExit}
            onChange={(v) => {
              setOnlyHighExit(v);
              setPage(1);
            }}
            label="High Exit"
          />
          <ToggleSwitch
            checked={onlyLowScroll}
            onChange={(v) => {
              setOnlyLowScroll(v);
              setPage(1);
            }}
            label="Low Scroll"
          />
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <Filter className="h-4 w-4" /> {filtered.length} results
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="mt-3 max-h-[640px] overflow-auto rounded-md border"
        style={{ borderColor: TK.borderLight }}
      >
        <table className="w-full text-sm">
          <thead
            className="sticky top-0 z-10 bg-white"
            style={{ boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)" }}
          >
            <tr>
              <Th
                label="Page Title / URL"
                k="pageTitle"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <Th
                label="Exit Rate"
                k="exitRate"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                tip="Exits ÷ Pageviews • Higher = more users leaving from this page"
              />
              <Th
                label="Engaged Sessions"
                k="engagedSessions"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <Th
                label="Avg. Time"
                k="avgEngTime"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                tip="Average engaged time per session (mm:ss)"
              />
              <Th
                label="Bounce %"
                k="bounceRate"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                tip="Unengaged sessions • Higher = more bounces"
              />
              <Th
                label="Scroll %"
                k="scrollPct"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                tip="Average scroll completion • Lower may indicate CTA below the fold"
              />
              <th className="px-3 py-2 text-left" style={{ color: TK.muted }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {windowRows.map((r) => {
              const tone = exitTone(r.exitRate);
              const aboveAvg = r.exitRate > siteAvgExit;
              return (
                <tr key={r.id} className="hover:bg-[#FBFDFF]">
                  {/* Page */}
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium" style={{ color: TK.text }}>
                      {r.pageTitle}
                    </div>
                    <div className="text-xs text-gray-500">{r.pagePath}</div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1 mr-3">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> {r.source}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-gray-500" /> {r.device}
                      </span>
                    </div>
                  </td>

                  {/* Exit Rate */}
                  <td className="px-3 py-2 align-top">
                    <Tip text={`Exit Rate: ${fmt.pct(r.exitRate)} • Site avg: ${fmt.pct(siteAvgExit)}`}>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: tone.color }}>
                        {fmt.pct(r.exitRate)}
                      </span>
                    </Tip>
                    <div className="text-[11px] text-gray-500">{aboveAvg ? "Above site avg" : "Below site avg"}</div>
                  </td>

                  {/* Engaged Sessions */}
                  <td className="px-3 py-2 align-top">
                    <Tip text="Sessions with meaningful interaction (GA4)">
                      <span className="font-medium">{fmt.num(r.engagedSessions)}</span>
                    </Tip>
                  </td>

                  {/* Avg time */}
                  <td className="px-3 py-2 align-top">
                    <Tip text={`${r.avgEngTime}s engaged time`}>
                      <span className="font-medium">{fmt.time(r.avgEngTime)}</span>
                    </Tip>
                  </td>

                  {/* Bounce */}
                  <td className="px-3 py-2 align-top">
                    <Tip text="Unengaged sessions share">
                      <span
                        className="font-medium"
                        style={{ color: r.bounceRate >= 55 ? TK.danger : r.bounceRate >= 40 ? TK.warn : TK.ok }}
                      >
                        {fmt.pct(r.bounceRate)}
                      </span>
                    </Tip>
                  </td>

                  {/* Scroll */}
                  <td className="px-3 py-2 align-top">
                    <Tip text="Average scroll completion for this page">
                      <span
                        className="font-medium"
                        style={{ color: r.scrollPct < 40 ? TK.danger : r.scrollPct < 60 ? TK.warn : TK.ok }}
                      >
                        {fmt.pct(r.scrollPct)}
                      </span>
                    </Tip>
                  </td>

                  {/* Actions — icon-only, no borders, branded color */}
                  <td className="px-3 py-2 align-top text-left">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="p-1.5 rounded hover:bg-[#F5F7FA] cursor-pointer"
                        title="Open Page Detail"
                        onClick={() => window.alert(`Open Page Detail for: ${r.pagePath}`)}
                        aria-label="Open Page Detail"
                      >
                        <Eye className="h-4 w-4" style={{ color: TK.brand }} />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-[#F5F7FA] cursor-pointer"
                        title="Create Task"
                        onClick={() =>
                          window.alert(`Create Task: High exit (${fmt.pct(r.exitRate)}) on ${r.pagePath}`)
                        }
                        aria-label="Create Task"
                      >
                        <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
                      </button>
                      {r.scrollPct < 35 && (
                        <Tip text="Low scroll — CTA might be too low">
                          <span className="p-1.5 rounded hover:bg-[#F5F7FA] inline-flex cursor-pointer">
                            <AlertTriangle className="h-4 w-4" style={{ color: TK.brand }} />
                          </span>
                        </Tip>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {windowRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-left text-sm text-gray-500">
                  No results. Try clearing filters or lowering the minimum pageviews.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of{" "}
          {sorted.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-8 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => setPage(1)}
            disabled={page <= 1}
          >
            First
          </button>
          <button
            className="h-8 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <div className="text-sm w-20 text-center">{page} / {totalPages}</div>
          <button
            className="h-8 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
          <button
            className="h-8 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            Last
          </button>
          <select
            className="h-8 rounded border px-2 text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Header cell with sort & tip ───────────────────────── */
function Th({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  tip,
}: {
  label: string;
  k: "exitRate" | "engagedSessions" | "avgEngTime" | "bounceRate" | "scrollPct" | "pageTitle";
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: any) => void;
  tip?: string;
}) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-2 text-left">
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1.5 cursor-pointer" title={tip || label}>
        <span className="font-semibold" style={{ color: TK.text }}>
          {label}
        </span>
        {tip && (
          <Tip text={tip}>
            <Info className="h-3.5 w-3.5 text-gray-500" />
          </Tip>
        )}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
    </th>
  );
}
