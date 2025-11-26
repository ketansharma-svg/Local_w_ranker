"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import {
  Download,
  RefreshCw,
  Search as SearchIcon,
  Eye,
  ClipboardList,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronDown as ChevronDownIcon,
  Check,
  Activity,
  Monitor,
  Smartphone,
  Tablet,
  Globe2,
  Megaphone,
  Share2,
  Link as LinkIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Wranker tokens (align with earlier sections)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  // Metric tones (sessions trend uses blue)
  sessions: { stroke: "#4286F5", fill: "rgba(66,134,245,.18)" },
};

type Device = "all" | "desktop" | "mobile" | "tablet";
type SourceKey =
  | "all"
  | "google / organic"
  | "direct / (none)"
  | "facebook / referral"
  | "google / cpc"
  | "bing / organic";
type PageType = "all" | "blog" | "product" | "guide" | "landing";

type SeriesPoint = { date: string; value: number };

type Row = {
  id: string;
  title: string;
  path: string;
  type: Exclude<PageType, "all">;
  source: Exclude<SourceKey, "all">;
  deviceHint: Exclude<Device, "all">;

  avgTimeSec: number;          // mm:ss displayed
  bounceRatePct: number;       // %
  pagesPerSession: number;     // decimal (kept; relevant to engagement)
  engagedSessions: number;     // total (30d)
  conversionRatePct?: number;  // %
  // Sessions trend (30 points) — tooltip enabled
  sessionsTrend: SeriesPoint[];
};

/* ──────────────────────────────────────────────────────────────
   Helpers / formatters
   ────────────────────────────────────────────────────────────── */
const fmt = {
  time: (sec: number) => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.floor(Math.max(0, sec) % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
  pct: (v: number, fd = 1) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(v)}%`,
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number, fd = 1) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n),
};

/* ──────────────────────────────────────────────────────────────
   Mock GA4 adapter (deterministic‑ish, non‑zero)
   ────────────────────────────────────────────────────────────── */
const SOURCES: Exclude<SourceKey, "all">[] = [
  "google / organic",
  "direct / (none)",
  "facebook / referral",
  "google / cpc",
  "bing / organic",
];
const DEVICES: Exclude<Device, "all">[] = ["desktop", "mobile", "tablet"];
const TYPES: Exclude<PageType, "all">[] = ["blog", "product", "guide", "landing"];

// smooth date label series
function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function base(i: number, phase = 0) {
  const s = Math.sin((i + phase) / 3.2);
  const c = Math.cos((i + phase) / 5.1);
  return {
    time: 120 + s * 16 + c * 7, // seconds
    sessions: 720 + s * 80 + c * 60, // count
  };
}
const deviceAdj = {
  desktop: { time: +40, bounce: -6, pages: +0.7, engaged: +300, cr: +1.1 },
  mobile: { time: -18, bounce: +7, pages: -0.4, engaged: +140, cr: -0.6 },
  tablet: { time: +10, bounce: +1, pages: +0.2, engaged: +60, cr: +0.2 },
};
const sourceAdj: Record<
  Exclude<SourceKey, "all">,
  { time: number; bounce: number; pages: number; engaged: number; cr: number }
> = {
  "google / organic": { time: +16, bounce: -3, pages: +0.3, engaged: +420, cr: +0.8 },
  "direct / (none)": { time: -6, bounce: +3, pages: -0.1, engaged: +260, cr: +0.2 },
  "facebook / referral": { time: -14, bounce: +9, pages: -0.5, engaged: +120, cr: -0.8 },
  "google / cpc": { time: +8, bounce: +5, pages: +0.1, engaged: +180, cr: +1.2 },
  "bing / organic": { time: +10, bounce: -2, pages: +0.2, engaged: +90, cr: +0.4 },
};

function sessionsTrend(days = 30, dev: Device, src: SourceKey, phase = 0): SeriesPoint[] {
  const list: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const b = base(i, phase).sessions;
    const d = dev === "all" ? 0 : deviceAdj[dev as Exclude<Device, "all">].engaged;
    const s = src === "all" ? 0 : sourceAdj[src as Exclude<SourceKey, "all">].engaged;
    const v = Math.max(20, b + d + s);
    list.push({ date: dayLabel(i), value: Math.round(v) });
  }
  return list;
}

/* ──────────────────────────────────────────────────────────────
   Trend MiniSpark (sessions) + Smart tooltip
   ────────────────────────────────────────────────────────────── */
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const swatch = p.color || p.stroke || TK.sessions.stroke;
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border, color: TK.text }}
      role="tooltip"
    >
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {String(label)}
      </div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: swatch }} />
          <Activity className="h-3.5 w-3.5" color={TK.brand} aria-hidden />
          <span>Sessions</span>
        </div>
        <span className="font-semibold">{fmt.num(Number(p.value))}</span>
      </div>
    </div>
  );
}

function MiniSessionsSpark({
  data,
  tone = TK.sessions,
}: {
  data: SeriesPoint[];
  tone?: { stroke: string; fill: string };
}) {
  return (
    <div className="h-10 w-[200px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={TK.borderLight} />
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
          <RTooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={tone.stroke}
            fill={tone.fill}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Export helpers (single Export button with dropdown)
   ────────────────────────────────────────────────────────────── */
function exportCSV(rows: Row[], filename = "top-pages-engagement.csv") {
  const cols = [
    "title",
    "path",
    "type",
    "source",
    "device",
    "avgTime(sec)",
    "bounceRate(%)",
    "pagesPerSession",
    "engagedSessions",
    "conversionRate(%)",
  ];
  const lines = rows.map((r) =>
    [
      JSON.stringify(r.title),
      r.path,
      r.type,
      r.source,
      r.deviceHint,
      Math.round(r.avgTimeSec),
      r.bounceRatePct.toFixed(1),
      r.pagesPerSession.toFixed(2),
      Math.round(r.engagedSessions),
      r.conversionRatePct?.toFixed(2) ?? "",
    ].join(",")
  );
  const blob = new Blob([cols.join(",") + "\n" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportPNG(el: HTMLElement | null, filename = "top-pages-engagement.png") {
  if (!el) return;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif;">
        ${el.outerHTML}
      </div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* Export dropdown (single button) */
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
    const onDoc = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
        style={{ borderColor: TK.border, background: "#FFF" }}
        aria-expanded={open}
        title="Export"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-[180px] rounded-md border bg-white p-1 shadow-lg"
          style={{ borderColor: TK.border }}
        >
          <button
            className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              onCSV();
              setOpen(false);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </span>
            <Check className="h-4 w-4 opacity-0" />
          </button>
          <button
            className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              onPNG();
              setOpen(false);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              PNG
            </span>
            <Check className="h-4 w-4 opacity-0" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Modular chips (dropdown)
   ────────────────────────────────────────────────────────────── */
function DropdownChip({
  icon,
  label,
  valueLabel,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  valueLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
        style={{ borderColor: TK.border, background: "#FFF" }}
        aria-expanded={open}
      >
        {icon}
        <span className="font-medium">{label}</span>
        {valueLabel && <span className="text-gray-600">• {valueLabel}</span>}
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-[240px] rounded-md border bg-white p-1 shadow-lg"
          style={{ borderColor: TK.border }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
function MenuItem({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-2 text-sm hover:bg-gray-50"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      {active && <Check className="h-4 w-4 text-emerald-600" />}
    </button>
  );
}

function sourceItemIcon(s: SourceKey) {
  const common = { className: "h-4 w-4", color: TK.brand } as const;
  if (s.includes("organic")) return <SearchIcon {...common} />;
  if (s.includes("cpc")) return <Megaphone {...common} />;
  if (s.includes("referral")) return <Share2 {...common} />;
  if (s.startsWith("direct")) return <LinkIcon {...common} />;
  return <Globe2 {...common} />;
}

/* ──────────────────────────────────────────────────────────────
   Virtualized table
   ────────────────────────────────────────────────────────────── */
const ROW_H = 64;
type SortKey =
  | "avgTimeSec"
  | "bounceRatePct"
  | "pagesPerSession"
  | "engagedSessions"
  | "conversionRatePct"
  | "title";

export default function TopPagesByEngagementTable({data}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Data & controls
  const allRows: Row[] = React.useMemo(() => {
    // group by source+device
    const groups = new Map<string, Row>();
    (data ?? []).forEach((d, i) => {
      const key = `${d.sessionSourceMedium}|${d.deviceCategory}`;
      const g = groups.get(key);
      const avgTime = Number(d.averageSessionDuration ?? 0);
      const bouncePct = (d.bounceRate ?? 0) > 1 ? Number(d.bounceRate) : Number(d.bounceRate ?? 0) * 100;
      const sess = Number(d.engagedSessions ?? 0);
      const dateLabel = d.date;
      const point = { date: dateLabel, value: Number(d.screenPageViews ?? 0) };
  
      if (!g) {
        groups.set(key, {
          id: key,
          title: `${d.sessionSourceMedium}`,
          path: `/${(d.sessionSourceMedium || "source").replace(/\W+/g, "-")}`,
          type: "landing",
          source: d.sessionSourceMedium || "(unknown)",
          deviceHint: (d.deviceCategory || "desktop") as any,
          avgTimeSec: avgTime,
          bounceRatePct: bouncePct,
          pagesPerSession: 0,
          engagedSessions: sess,
          conversionRatePct: undefined,
          sessionsTrend: [point],
        });
      } else {
        g.avgTimeSec = avgTime || g.avgTimeSec;
        g.bounceRatePct = bouncePct || g.bounceRatePct;
        g.engagedSessions += sess;
        g.sessionsTrend.push(point);
      }
    });
    return Array.from(groups.values());
  }, [data]);
    const [query, setQuery] = React.useState("");
  const [device, setDevice] = React.useState<Device>("all");
  const [source, setSource] = React.useState<SourceKey>("all");
  const [ptype, setPtype] = React.useState<PageType>("all");

  const [sortBy, setSortBy] = React.useState<SortKey>("avgTimeSec");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  // Derived averages for contextual badges
  const siteAvgBounce = React.useMemo(
    () => allRows.reduce((a, r) => a + r.bounceRatePct, 0) / allRows.length,
    [allRows]
  );

  // Filtering
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      if (q && !(`${r.title} ${r.path}`.toLowerCase().includes(q))) return false;
      if (device !== "all" && r.deviceHint !== device) return false;
      if (source !== "all" && r.source !== source) return false;
      if (ptype !== "all" && r.type !== ptype) return false;
      return true;
    });
  }, [allRows, query, device, source, ptype]);

  // Sorting
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = (a as any)[sortBy] ?? -Infinity;
      const bv = (b as any)[sortBy] ?? -Infinity;
      if (av === bv) return 0;
      return sortDir === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Virtualization state
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [vh, setVh] = React.useState(560);
  const [scrollTop, setScrollTop] = React.useState(0);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll);
    const ro = new ResizeObserver(() => setVh(el.clientHeight));
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  const total = sorted.length;
  const visibleCount = Math.max(1, Math.ceil(vh / ROW_H) + 4);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_H) - 2);
  const endIndex = Math.min(total, startIndex + visibleCount);
  const padTop = startIndex * ROW_H;
  const padBottom = Math.max(0, (total - endIndex) * ROW_H);

  function colHeader(label: string, key: SortKey, width?: number) {
    const active = sortBy === key;
    const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <th
        className="px-3 py-2 font-semibold text-sm text-left"
        style={{ color: TK.text, width }}
      >
        <button
          className="inline-flex items-center gap-1 hover:underline cursor-pointer"
          onClick={() => {
            if (sortBy !== key) {
              setSortBy(key);
              setSortDir(key === "title" ? "asc" : "desc");
            } else {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            }
          }}
        >
          {label}
          <Icon className="h-4 w-4 text-gray-500" />
        </button>
      </th>
    );
  }

  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4 mt-4"
        style={{
          border: `1px solid ${TK.border}`,
          fontFamily:
            "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
        }}
      >
        <div className="h-6 w-52 rounded bg-gray-100" />
        <div className="mt-3 h-[520px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      className="rounded-md bg-white p-4 mt-4"
      style={{
        border: `1px solid ${TK.border}`,
        fontFamily:
          "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Header & controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" color={TK.brand} aria-hidden />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Top Pages by Engagement
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              className="h-9 pl-7 pr-2.5 rounded-md border text-sm"
              style={{ borderColor: TK.border }}
              placeholder="Search title or URL…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Filter chips (dropdowns) */}
          <DropdownChip
            icon={<Monitor className="h-4 w-4" color={TK.brand} />}
            label="Device"
            valueLabel={device}
          >
            <MenuItem active={device === "all"} onClick={() => setDevice("all")} icon={<Monitor className="h-4 w-4" />}>
              All
            </MenuItem>
            <MenuItem active={device === "desktop"} onClick={() => setDevice("desktop")} icon={<Monitor className="h-4 w-4" />}>
              Desktop
            </MenuItem>
            <MenuItem active={device === "mobile"} onClick={() => setDevice("mobile")} icon={<Smartphone className="h-4 w-4" />}>
              Mobile
            </MenuItem>
            <MenuItem active={device === "tablet"} onClick={() => setDevice("tablet")} icon={<Tablet className="h-4 w-4" />}>
              Tablet
            </MenuItem>
          </DropdownChip>

          <DropdownChip
            icon={<Globe2 className="h-4 w-4" color={TK.brand} />}
            label="Source"
            valueLabel={source}
          >
            <MenuItem active={source === "all"} onClick={() => setSource("all")} icon={<Globe2 className="h-4 w-4" />}>
              all
            </MenuItem>
            {SOURCES.map((s) => (
              <MenuItem
                key={s}
                active={source === s}
                onClick={() => setSource(s)}
                icon={sourceItemIcon(s)}
              >
                {s}
              </MenuItem>
            ))}
          </DropdownChip>

          <DropdownChip
            icon={<Activity className="h-4 w-4" color={TK.brand} />}
            label="Type"
            valueLabel={ptype}
          >
            <MenuItem active={ptype === "all"} onClick={() => setPtype("all")} icon={<Activity className="h-4 w-4" />}>
              all
            </MenuItem>
            {TYPES.map((t) => (
              <MenuItem key={t} active={ptype === t} onClick={() => setPtype(t as PageType)}>
                {t}
              </MenuItem>
            ))}
          </DropdownChip>

          {/* Single Export (dropdown) + Refresh */}
          <ExportMenu
            onCSV={() => exportCSV(sorted)}
            onPNG={() => exportPNG(scrollerRef.current, "top-pages-engagement.png")}
          />
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
            style={{ borderColor: TK.border, background: "#FFF" }}
            onClick={() => {
              // nudge viewport height to softly refresh virtualization
              setTimeout(() => setVh((v) => v + 1), 0);
              setTimeout(() => setVh((v) => v - 1), 0);
            }}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        ref={scrollerRef}
        className="mt-3 max-h-[620px] overflow-auto rounded-md"
        style={{ border: `1px solid ${TK.borderLight}` }}
      >
        <table className="w-full text-sm">
          <thead
            className="sticky top-0 z-10 bg-white"
            style={{ boxShadow: `inset 0 -1px 0 ${TK.borderLight}` }}
          >
            <tr>
              {colHeader("Page Title", "title")}
              <th className="px-3 py-2 text-left font-semibold text-sm" style={{ color: TK.text }}>
                URL Path
              </th>
              {colHeader("Avg. Time", "avgTimeSec", 140)}
              {colHeader("Bounce Rate", "bounceRatePct", 140)}
              {/* Pages / Session is relevant to engagement → keep */}
              {colHeader("Pages / Session", "pagesPerSession", 140)}
              {colHeader("Engaged Sessions", "engagedSessions", 160)}
              {colHeader("CR", "conversionRatePct", 100)}
              <th className="px-3 py-2 text-left font-semibold text-sm" style={{ color: TK.text, width: 220 }}>
                Trend
              </th>
              <th className="px-3 py-2 text-left font-semibold text-sm" style={{ color: TK.text, width: 140 }}>
                Actions
              </th>
            </tr>
          </thead>

          {/* Virtual body */}
          <tbody>
            {/* top spacer */}
            {padTop > 0 && (
              <tr>
                <td colSpan={9} style={{ height: padTop }} />
              </tr>
            )}

            {sorted.slice(startIndex, endIndex).map((r) => {
              // time delta vs ~previous week point (for info only)
              const last = r.avgTimeSec;
              const prev = r.sessionsTrend.at(-8)?.value ?? r.sessionsTrend[0]?.value ?? last;
              const dTime = last - prev * 0.1; // scale to seconds change approximation

              const bounceHigh = r.bounceRatePct > siteAvgBounce + 3;
              const bounceLow = r.bounceRatePct < siteAvgBounce - 3;

              return (
                <tr
                  key={r.id}
                  className="hover:bg-[#FBFDFF]"
                  style={{ height: ROW_H, borderBottom: `1px solid ${TK.borderLight}` }}
                >
                  {/* Title */}
                  <td className="px-3 text-left">
                    <div className="max-w-[280px] truncate font-medium" style={{ color: TK.text }}>
                      {r.title}
                    </div>
                    <div className="text-xs capitalize" style={{ color: TK.muted }}>
                      {r.type} • {r.source} • {r.deviceHint}
                    </div>
                  </td>

                  {/* Path */}
                  <td className="px-3 text-left">
                    <a
                      href={r.path}
                      className="max-w-[320px] block truncate underline cursor-pointer"
                      style={{ color: "#4286F5" }}
                      title={r.path}
                      onClick={(e) => e.preventDefault()}
                    >
                      {r.path}
                    </a>
                  </td>

                  {/* Avg Time */}
                  <td className="px-3 text-left">
                    <div className="font-medium" style={{ color: TK.text }}>
                      {fmt.time(r.avgTimeSec)}
                    </div>
                    <div className="text-xs" style={{ color: dTime >= 0 ? "#10B981" : "#EF4444" }}>
                      {dTime >= 0 ? "+" : "−"} {fmt.time(Math.abs(dTime))}
                    </div>
                  </td>

                  {/* Bounce */}
                  <td className="px-3 text-left">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        bounceHigh
                          ? "bg-red-50 text-red-600"
                          : bounceLow
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {fmt.pct(r.bounceRatePct)}
                    </span>
                  </td>

                  {/* Pages / Session (kept) */}
                  <td className="px-3 text-left">
                    <span className="font-medium">{fmt.one(r.pagesPerSession, 2)}</span>
                  </td>

                  {/* Engaged Sessions */}
                  <td className="px-3 text-left">
                    <span className="font-medium">{fmt.num(r.engagedSessions)}</span>
                  </td>

                  {/* CR */}
                  <td className="px-3 text-left">
                    {r.conversionRatePct != null ? fmt.pct(r.conversionRatePct, 2) : "—"}
                  </td>

                  {/* Trend (sessions) with smart popover */}
                  <td className="px-3 text-left">
                    <MiniSessionsSpark data={r.sessionsTrend} />
                  </td>

                  {/* Actions — direct branded icons (no borders) */}
                  <td className="px-3 text-left">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="p-1 cursor-pointer hover:opacity-80"
                        title="View Page"
                        onClick={() => alert(`Open Page View: ${r.path}`)}
                      >
                        <Eye className="h-4 w-4" color={TK.brand} />
                      </button>
                      <button
                        className="p-1 cursor-pointer hover:opacity-80"
                        title="Assign Task"
                        onClick={() => alert(`Assign Task for: ${r.path}`)}
                      >
                        <ClipboardList className="h-4 w-4" color={TK.brand} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* bottom spacer */}
            {padBottom > 0 && (
              <tr>
                <td colSpan={9} style={{ height: padBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="mt-2 text-xs text-gray-500">
        Showing {sorted.length.toLocaleString()} pages • Avg. bounce:{" "}
        <strong>{fmt.pct(siteAvgBounce)}</strong>
      </div>
    </section>
  );
}
