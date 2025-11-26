"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Upload,
  Info as InfoIcon,
  Search as SearchIcon,
  ChevronDown,
  CalendarDays,
  Filter,
  Tag,
  Layers,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Plus,
  ClipboardPlus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  AreaChart,
  Area,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

/* ------------------------------ TOKENS ------------------------------ */
const TK = {
  brand: "#1090D0", // You / Brand
  valueBlue: "#0077FF", // Primary for action icons
  text: "#282829",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  pastel: "#FAFCFE",
} as const;

/* ------------------------------ UTILS ------------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
const nf = (n: number) => new Intl.NumberFormat().format(n);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const shortPath = (u: string) => (u.length <= 42 ? u : `${u.slice(0, 22)}…${u.slice(-18)}`);
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}

/* ------------------------------ TYPES ------------------------------- */
type PageType = "Blog" | "Product" | "Service" | "Other";
type Row = {
  id: string;
  urlPath: string;
  fullUrl: string;
  title: string;
  kwCount: number;
  firstDetectedISO: string;
  type?: PageType;
  topicTags?: string[];
  noteCount?: number;
  yourClosest?: { urlPath: string; matchScore: number; kwOverlap: number } | null;
};
type KPIData = {
  newPagesCount: number;
  topTopics: string[];
  avgKwCount: number;
  microTrends: { newPagesBars: number[]; avgKwArea: number[] };
};

/* --------------------------- PRIMITIVES ----------------------------- */
function InfoPopover({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={classNames(
          "invisible group-hover:visible absolute z-50 top-full mt-1 w-80 rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow",
          align === "right" ? "right-0" : "left-0"
        )}
        style={{ borderColor: TK.border }}
      >
        {label}
      </span>
    </span>
  );
}
function GhostButton({
  label,
  onClick,
  icon: Icon,
  title,
}: {
  label: string;
  onClick?: () => void;
  icon?: React.ComponentType<any>;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
      style={{ borderColor: TK.border, color: TK.text }}
    >
      {Icon && <Icon size={16} className="text-[#6B7280]" />}
      <span>{label}</span>
    </button>
  );
}
function IconOnly({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md border"
      style={{ borderColor: TK.border, background: TK.chipBg, color: TK.text }}
    >
      {children}
    </button>
  );
}
function Chip({
  children,
  pressed,
  onClick,
  title,
}: React.PropsWithChildren<{ pressed?: boolean; onClick?: () => void; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 h-8 px-3 rounded-full border text-sm",
        pressed ? "font-semibold" : "",
        "hover:bg-[#E5E7EB]"
      )}
      style={{ borderColor: TK.border, background: pressed ? TK.chipBg : "#ffffff", color: TK.text }}
      aria-pressed={!!pressed}
    >
      {children}
    </button>
  );
}
function ExportMenu({
  onExport,
  items = ["CSV", "PDF", "Link"],
  proGate = ["PDF"],
}: {
  onExport?: (fmt: string) => void;
  items?: string[];
  proGate?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <IconOnly title="Export" onClick={() => setOpen((s) => !s)}>
        <Upload size={16} />
      </IconOnly>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[180px] rounded-md border bg-white shadow"
          style={{ borderColor: TK.border }}
        >
          {items.map((x) => {
            const gated = proGate.includes(x);
            return (
              <button
                key={x}
                className={classNames(
                  "block w-full px-3 py-2 text-left text-sm",
                  gated ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"
                )}
                onClick={() => {
                  if (gated) return;
                  onExport?.(x);
                  setOpen(false);
                }}
              >
                Export {x} {gated && <span className="ml-1 text-xs">(Pro)</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------- KPI MINI CHARTS ------------------------- */
function KPI_NewPages({
  value,
  series,
  onClick,
}: {
  value: number;
  series: number[];
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-between rounded-md border p-3 text-left hover:bg-[#FAFCFE]"
      style={{ borderColor: TK.border }}
      title="Open table filtered to New Pages"
    >
      <div className="min-w-0">
        <div className="text-xs text-[#6B7280]">New Pages Published</div>
        <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{nf(value)}</div>
      </div>
      <div className="h-10 w-32">
        <ResponsiveContainer>
          <BarChart data={series.map((v, i) => ({ x: i, y: v }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="x" hide />
            <YAxis hide />
            <RTooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div
                    className="rounded border bg-white p-1.5 text-[11px]"
                    style={{ borderColor: TK.border, color: TK.text }}
                  >
                    New pages: <b>{payload[0].value}</b>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="y" fill={TK.valueBlue} radius={[6, 6, 0, 0]} maxBarSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}
function KPI_Topics({
  topics,
  onClickTag,
}: {
  topics: string[];
  onClickTag?: (t: string) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-md border p-3" style={{ borderColor: TK.border }}>
      <div className="min-w-0">
        <div className="text-xs text-[#6B7280]">Most Common Topics</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => onClickTag?.(t)}
              className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs hover:bg-[#E5E7EB]"
              title={`Filter by ${t}`}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-[#CBD5E1]" />
              {t}
            </button>
          ))}
        </div>
      </div>
      <Tag size={16} className="text-[#9CA3AF]" />
    </div>
  );
}
function KPI_AvgKW({
  value,
  series,
}: {
  value: number;
  series: number[];
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-md border p-3" style={{ borderColor: TK.border }}>
      <div className="min-w-0">
        <div className="text-xs text-[#6B7280]">Avg KW Count</div>
        <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{nf(value)}</div>
      </div>
      <div className="h-10 w-32">
        <ResponsiveContainer>
          <AreaChart data={series.map((v, i) => ({ x: i, y: v }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="avgKwFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TK.valueBlue} stopOpacity={0.25} />
                <stop offset="95%" stopColor={TK.valueBlue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" hide />
            <YAxis hide />
            <RTooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded border bg-white p-1.5 text[11px]" style={{ borderColor: TK.border, color: TK.text }}>
                    Avg KW: <b>{payload[0].value}</b>
                  </div>
                ) : null
              }
            />
            <Area type="monotone" dataKey="y" stroke={TK.valueBlue} fillOpacity={1} fill="url(#avgKwFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------------- PERFORMANCE MODAL ---------------------- */
function PerformanceModal({
  open,
  onClose,
  row,
}: {
  open: boolean;
  onClose: () => void;
  row: Row | null;
}) {
  if (!open || !row) return null;

  // mock 5 keywords rank trend (lower is better)
  const kws = ["ai seo tools", "seo checklist", "rank checker", "schema generator", "content strategy"];
  const days = 20;
  const series = kws.map((name, idx) => {
    const arr = Array.from({ length: days }).map((_, i) => {
      const base = 10 + idx * 5;
      const wobble = Math.round((Math.sin(i / 2 + idx) + Math.random() * 0.7) * 3);
      return { day: i + 1, pos: Math.max(1, base + wobble) };
    });
    return { name, data: arr };
  });

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width: 640, borderLeft: `1px solid ${TK.border}` }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold">Performance Overview — {shortPath(row.urlPath)}</div>
            <div className="text-xs text-[#6B7280]">{row.title}</div>
          </div>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
            <div className="text-sm font-medium mb-2">Rank Trend (Top 5 Keywords)</div>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <LineChart
                  data={Array.from({ length: days }).map((_, i) => {
                    const row0: any = { day: i + 1 };
                    series.forEach((s) => (row0[s.name] = s.data[i].pos));
                    return row0;
                  })}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={TK.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: TK.muted }} />
                  <YAxis domain={[1, 60]} reversed tick={{ fontSize: 12, fill: TK.muted }} />
                  <RTooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded border bg-white p-2 text-[12px]" style={{ borderColor: TK.border }}>
                          <div className="text-[#6B7280]">Day {label}</div>
                          {payload.map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full" style={{ background: (p.color as string) || TK.valueBlue }} />
                              <span>{p.name}: </span>
                              <b className="tabular-nums">#{p.value}</b>
                            </div>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  {series.map((s, i) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={["#0077FF", "#1090D0", "#16A34A", "#F59E0B", "#F04438"][i % 5]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded border p-2" style={{ borderColor: TK.border }}>
              <div className="text-xs text-[#6B7280]">Keywords Ranked</div>
              <div className="text-sm font-semibold">{nf(row.kwCount)}</div>
            </div>
            <div className="rounded border p-2" style={{ borderColor: TK.border }}>
              <div className="text-xs text-[#6B7280]">Avg Rank (Top 10)</div>
              <div className="text-sm font-semibold">#{Math.max(3, Math.round(row.kwCount / 12))}</div>
            </div>
            <div className="rounded border p-2" style={{ borderColor: TK.border }}>
              <div className="text-xs text-[#6B7280]">Detected</div>
              <div className="text-sm font-semibold">{fmtDate(row.firstDetectedISO)}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="text-xs text-[#6B7280]">Tip: Lower position is better. Lines are inverted on Y‑axis.</div>
          <div className="flex items-center gap-2">
            <GhostButton label="Create Task" icon={ClipboardPlus} onClick={() => alert("Open Task Drawer")} />
            <GhostButton label="Track This Page" icon={Plus} onClick={() => alert("Open Track Page Modal")} />
            <GhostButton label="Close" onClick={onClose} />
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ----------------------------- MAIN SECTION --------------------------- */
type SortKey = "date" | "kw" | "title" | "type";
type SortDir = "asc" | "desc";

export default function ContentPublishingMonitorSectionMock() {
  /* ---------- Mock data ---------- */
  const { rows: initialRows, kpi } = useMemo(() => buildMockContentData(), []);
  const allTopics = useMemo(() => topTopicList(initialRows, 16), [initialRows]);

  /* ---------- State ---------- */
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kwChips, setKwChips] = useState<number[]>([]);
  const [topicSel, setTopicSel] = useState<string[]>([]);
  const [typeSel, setTypeSel] = useState<PageType[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [infinite, setInfinite] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [visibleCount, setVisibleCount] = useState(60);
  const [toolbarElevated, setToolbarElevated] = useState(false);

  // Performance modal
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfRow, setPerfRow] = useState<Row | null>(null);

  // sticky shadow handler
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setToolbarElevated(el.scrollTop > 2);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // infinite sentinel
  useEffect(() => {
    if (!infinite) return;
    const sentinel = document.getElementById("content-monitor-sentinel");
    if (!sentinel) return;
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setVisibleCount((v) => Math.min(sorted.length, v + 60));
    });
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [infinite]); // eslint-disable-line

  // ---------- filtering ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.urlPath} ${r.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (kwChips.length > 0) {
        const pass = kwChips.some((min) => r.kwCount > min);
        if (!pass) return false;
      }
      if (topicSel.length > 0) {
        if (!r.topicTags || !r.topicTags.some((t) => topicSel.includes(t))) return false;
      }
      if (typeSel.length > 0) {
        if (!r.type || !typeSel.includes(r.type)) return false;
      }
      return true;
    });
  }, [rows, query, kwChips, topicSel, typeSel]);

  // ---------- sorting ----------
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: Row) => {
      switch (sortBy) {
        case "date":
          return r.firstDetectedISO;
        case "kw":
          return r.kwCount;
        case "title":
          return r.title.toLowerCase();
        case "type":
          return r.type || "ZZZ";
      }
    };
    arr.sort((a, b) => {
      const av: any = getter(a);
      const bv: any = getter(b);
      if (av === bv) return a.urlPath.localeCompare(b.urlPath);
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // ---------- window ----------
  const windowed = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    return sorted.slice(0, pageSize);
  }, [sorted, infinite, visibleCount, pageSize]);

  // ---------- actions ----------
  const resetFilters = () => {
    setQuery("");
    setKwChips([]);
    setTopicSel([]);
    setTypeSel([]);
  };
  const toggleKwChip = (v: number) =>
    setKwChips((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const toggleTopic = (t: string) =>
    setTopicSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const toggleType = (t: PageType) =>
    setTypeSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const exportCSV = (onlyVisible = false) => {
    const src = onlyVisible ? windowed : sorted;
    const hdr = ["URL", "Title", "KW Count", "Date", "Type", "Topics"];
    const lines = src.map((r) =>
      [r.fullUrl, r.title, r.kwCount, r.firstDetectedISO, r.type ?? "", (r.topicTags ?? []).join("; ")]
        .map((x) => JSON.stringify(String(x)))
        .join(",")
    );
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlyVisible ? "content-monitor-visible.csv" : "content-monitor-all.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="w-full mt-4">
      {/* Header Row */}
      <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TK.border, background: "#FFFFFF" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>
              Content Publishing Monitor
            </h3>
            <InfoPopover label="New pages detected for the selected competitor in the chosen date range. Click a row to view performance or track the page." />
          </div>
          <div className="flex items-center gap-2">
            <GhostButton label="Refresh" icon={RefreshCw} onClick={() => alert("Refreshing…")} />
            <ExportMenu onExport={(fmt) => (fmt === "CSV" ? exportCSV(false) : alert(`Export ${fmt}`))} />
          </div>
        </div>

        {/* KPI Row (unchanged) */}
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <KPI_NewPages
            value={kpi.newPagesCount}
            series={kpi.microTrends.newPagesBars}
            onClick={() => {
              setSortBy("date");
              setSortDir("desc");
            }}
          />
          <KPI_Topics
            topics={kpi.topTopics}
            onClickTag={(t) => {
              if (!topicSel.includes(t)) setTopicSel((s) => [...s, t]);
            }}
          />
          <KPI_AvgKW value={kpi.avgKwCount} series={kpi.microTrends.avgKwArea} />
        </div>
      </div>

      {/* Sticky Toolbar */}
      <div className={classNames("mt-3 rounded-[6px] border", toolbarElevated ? "shadow-sm" : "")} style={{ borderColor: TK.border, background: "#FFFFFF" }}>
        <div className="sticky top-0 z-10 rounded-t-[6px]">
          <div className="flex flex-wrap items-center gap-2 p-3">
            {/* Search */}
            <div className="relative">
              <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find page or title…"
                className="h-9 w-[260px] rounded-md border pl-7 pr-8 text-sm outline-none"
                style={{ borderColor: TK.border }}
              />
              {query && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                  onClick={() => setQuery("")}
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <Chip onClick={() => setFiltersOpen((s) => !s)}>
              <Filter size={14} className="text-[#6B7280]" />
              Filters
              <ChevronDown size={16} className="text-[#9CA3AF]" />
            </Chip>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Chip title="Sort by">
                <Layers size={14} className="text-[#6B7280]" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="bg-transparent outline-none">
                  <option value="date">Published Date</option>
                  <option value="kw">KW Count</option>
                  <option value="title">Title (A–Z)</option>
                  <option value="type">Type</option>
                </select>
              </Chip>
              <button
                className="inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm hover:bg-[#E5E7EB]"
                style={{ borderColor: TK.border }}
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                title="Toggle sort direction"
              >
                {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
                {sortDir.toUpperCase()}
              </button>
            </div>

            {/* Rows / Infinite */}
            <div className="flex items-center gap-2">
              <Chip pressed={!infinite} onClick={() => setInfinite(false)} title="Use pagination">
                Rows:
                <select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} disabled={infinite} className="bg-transparent outline-none">
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Chip>
              <Chip pressed={infinite} onClick={() => setInfinite(true)} title="Use infinite scroll">
                Infinite
              </Chip>
            </div>

            {/* Actions (right) */}
            <div className="ml-auto flex items-center gap-2">
              <ExportMenu onExport={(fmt) => (fmt === "CSV" ? exportCSV(true) : alert(`Export ${fmt}`))} />
              <GhostButton label="Create Task" icon={ClipboardPlus} onClick={() => alert("Open Task Drawer")} />
              <IconOnly title="More">
                <MoreHorizontal size={16} />
              </IconOnly>
            </div>
          </div>

          {/* Expanded Filters Row */}
          {filtersOpen && (
            <div className="border-t p-3" style={{ borderColor: TK.border }}>
              <div className="flex flex-wrap items-center gap-2">
                {/* Keyword Count */}
                <span className="text-xs text-[#6B7280]">KW Count &gt;</span>
                {[10, 25, 50, 100].map((n) => (
                  <Chip key={n} pressed={kwChips.includes(n)} onClick={() => setKwChips((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))} title={`> ${n}`}>
                    {n}
                  </Chip>
                ))}

                {/* Topic Tags */}
                <span className="ml-3 text-xs text-[#6B7280]">Topics</span>
                {allTopics.slice(0, 8).map((t) => (
                  <Chip key={t} pressed={topicSel.includes(t)} onClick={() => setTopicSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} title={t}>
                    {t}
                  </Chip>
                ))}
                {allTopics.length > 8 && <TopicMore topics={allTopics.slice(8)} selected={topicSel} onToggle={(t) => setTopicSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} />}

                {/* Page Type */}
                <span className="ml-3 text-xs text-[#6B7280]">Type</span>
                {(["Blog", "Product", "Service", "Other"] as PageType[]).map((t) => (
                  <Chip key={t} pressed={typeSel.includes(t)} onClick={() => setTypeSel((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} title={t}>
                    {t}
                  </Chip>
                ))}

                {/* Date (read-only) */}
                <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-1 text-xs text-[#6B7280]">
                  <CalendarDays size={12} />
                  Inherits Panel Date
                </span>

                {/* Reset */}
                <button className="ml-auto text-sm text-[#6B7280] underline decoration-dotted hover:text-[#374151]" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table area (scroll container) */}
        <div ref={scrollerRef} className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b" style={{ borderColor: TK.border }}>
                <Th label="URL" info="Discovered URL path. Click to open live page." width={300} />
                <Th label="Title" info="Meta title or H1." />
                <Th label="KW Count" info="Estimated # of organic keywords (Top 100)." align="right" width={120} />
                <Th label="Date" info="First detected date (sitemap lastmod or first crawl)." width={140} align="center" />
                <Th label="Actions" info="Row quick actions." width={220} align="right" />
              </tr>
            </thead>
            <tbody>
              {windowed.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-b hover:bg-[#FAFCFE]" style={{ borderColor: TK.border }}>
                    <Td width={300}>
                      <a
                        href={r.fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[12px] text-[#1F2937] underline decoration-1"
                        title={r.fullUrl}
                        style={{ wordBreak: "break-all" }}
                      >
                        {shortPath(r.urlPath)}
                      </a>
                      <span className="ml-1 align-middle">
                        <ExternalLink size={12} className="text-[#9CA3AF]" />
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{r.title}</span>
                        {!!r.noteCount && (
                          <span className="rounded-full bg-[#F5F7FA] px-1.5 py-[1px] text-[11px] text-[#6B7280]" title={`${r.noteCount} notes`}>
                            📝 {r.noteCount}
                          </span>
                        )}
                        {r.type && (
                          <span className="rounded-full bg-[#F5F7FA] px-1.5 py-[1px] text-[11px] text-[#6B7280]" title="Page Type">
                            {r.type}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td align="right" width={120}>
                      <span className="inline-flex items-center justify-end rounded px-1 py-[1px] tabular-nums bg-gray-100 text-gray-700" title="Estimated keyword count">
                        {nf(r.kwCount)}
                      </span>
                    </Td>
                    <Td align="center" width={140}>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]">
                        <CalendarDays size={12} /> {fmtDate(r.firstDetectedISO)}
                      </span>
                    </Td>

                    {/* ------- UPDATED: ICON ACTIONS WITH HOVER ANIMATION + TOOLTIP ------- */}
                    <Td align="right" width={220}>
                      <div className="inline-flex items-center gap-1.5">
                        <ActionIcon
                          label="View Performance"
                          icon={Eye}
                          onClick={() => {
                            setPerfRow(r);
                            setPerfOpen(true);
                          }}
                        />
                        <ActionIcon
                          label="Track This Page"
                          icon={Plus}
                          onClick={() => alert(`Track Page: ${r.fullUrl}`)}
                        />
                        <ActionIcon
                          label="Create Task"
                          icon={ClipboardPlus}
                          onClick={() => alert(`Create Task for ${r.urlPath}`)}
                        />
                      </div>
                    </Td>
                  </tr>

                  {/* Optional “Closest Match on Your Site” sub-row (unchanged) */}
                  {r.yourClosest ? (
                    <tr className="border-b" style={{ borderColor: TK.border }}>
                      <td colSpan={5} className="p-0">
                        <div
                          className="flex items-center justify-between gap-2 border-l-4 p-2 text-xs"
                          style={{ borderLeftColor: TK.brand, background: TK.pastel }}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[#6B7280]">You:</span>
                            <span className="font-mono">{shortPath(r.yourClosest.urlPath)}</span>
                            <span className="rounded bg-[#F5F7FA] px-2 py-0.5 text-[#6B7280]">
                              KW Overlap: {r.yourClosest.kwOverlap}
                            </span>
                            <span className="rounded bg-[#F5F7FA] px-2 py-0.5 text-[#6B7280]">
                              Match: {r.yourClosest.matchScore}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GhostButton label="Open Your Page" onClick={() => alert("Open your page")} />
                            <GhostButton label="Open Gap Analyzer" onClick={() => alert("Open Gap Analyzer")} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {infinite && <div id="content-monitor-sentinel" className="h-8" />}
        </div>

        {/* Footer for infinite */}
        {infinite && (
          <div className="flex items-center justify-between border-t p-3 text-sm" style={{ borderColor: TK.border }}>
            <div className="text-[#6B7280]">Loaded {windowed.length} of {sorted.length}</div>
            <div>
              <GhostButton label="Load more" onClick={() => setVisibleCount((v) => Math.min(sorted.length, v + 60))} />
            </div>
          </div>
        )}
      </div>

      {/* Performance Modal */}
      <PerformanceModal open={perfOpen} onClose={() => setPerfOpen(false)} row={perfRow} />
    </section>
  );
}

/* ------------------------------ SUBS --------------------------------- */
function Th({
  label,
  info,
  width,
  align = "left",
}: {
  label: string;
  info: string;
  width?: number;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={classNames(
        "px-3 py-2 text-sm font-medium",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      )}
      style={{ minWidth: width, width }}
    >
      <span className="inline-flex items-center gap-1">
        <span>{label}</span>
        <InfoPopover label={info} />
      </span>
    </th>
  );
}
function Td({
  children,
  align = "left",
  width,
}: React.PropsWithChildren<{ align?: "left" | "right" | "center"; width?: number }>) {
  return (
    <td
      className={classNames(
        "px-3 py-2",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      )}
      style={{ minWidth: width, width }}
    >
      {children}
    </td>
  );
}

/** Icon-only action with tooltip + hover animation
 *  - Icon color: #0077FF
 *  - Hover: very light blue background + slight lift
 */
function ActionIcon({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
}) {
  return (
    <span className="relative inline-block group">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="grid h-8 w-8 place-items-center rounded-md transition-all duration-150 ease-out focus-visible:ring-2"
        style={{ color: TK.valueBlue }}
      >
        <Icon
          size={18}
          className="transition-transform duration-150 ease-out group-hover:-translate-y-[2px]"
        />
      </button>

      {/* Hover background effect (very light primary) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100"
        style={{ background: "rgba(0, 119, 255, 0.08)" }}
      />

      {/* Tooltip */}
      <span
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 rounded-md bg-[#111827] px-2 py-1 text-[11px] text-white opacity-0 shadow transition-opacity duration-150 ease-out group-hover:opacity-100 whitespace-nowrap z-10"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

function TopicMore({
  topics,
  selected,
  onToggle,
}: {
  topics: string[];
  selected: string[];
  onToggle: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <Chip onClick={() => setOpen((s) => !s)} title="More topics">
        + More
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </Chip>
      {open && (
        <div
          className="absolute z-50 mt-2 max-h-[240px] min-w-[220px] overflow-auto rounded-md border bg-white p-2 shadow"
          style={{ borderColor: TK.border }}
        >
          {topics.map((t) => (
            <button
              key={t}
              className={classNames(
                "mb-1 block w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-50",
                selected.includes(t) ? "font-semibold" : ""
              )}
              onClick={() => onToggle(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ MOCK DATA ---------------------------- */
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function dateWithin(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysBack));
  return d.toISOString().slice(0, 10);
}
function topTopicList(rows: Row[], limit = 16): string[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    (r.topicTags ?? []).forEach((t) => m.set(t, (m.get(t) || 0) + 1));
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
function buildMockContentData(): { rows: Row[]; kpi: KPIData } {
  const topics = ["SEO", "AI", "Backlinking", "Content", "Technical", "Local", "eCommerce", "Tools", "Analytics"];
  const types: PageType[] = ["Blog", "Product", "Service", "Other"];
  const paths = [
    "/ai-tools-guide",
    "/local-seo-guide",
    "/backlinking-hacks",
    "/seo-content-strategy",
    "/tools/rank-checker",
    "/tools/schema-generator",
    "/blog/semrush-vs-ahrefs",
    "/blog/technical-seo",
  ];
  const titles = [
    "AI Tools for SEO in 2025",
    "Local SEO Tips that Work",
    "Link Building Hacks You Need",
    "Content Strategy: The Complete Guide",
    "Accurate Rank Checker for Agencies",
    "Schema Markup Generator — Free Tool",
    "Semrush vs Ahrefs: Side‑by‑Side",
    "Technical SEO: Best Practices",
  ];

  const N = 80;
  const rows: Row[] = Array.from({ length: N }).map((_, i) => {
    const p = paths[i % paths.length] + (i > paths.length ? `-${i}` : "");
    const full = `https://competitor.com${p}`;
    const t = titles[i % titles.length];
    const kwc = rand(8, 150);
    const first = dateWithin(30);
    const topicSet = Array.from(new Set(Array.from({ length: rand(1, 3) }).map(() => pick(topics))));
    const type = types[rand(0, types.length - 1)];
    const yourClosest =
      Math.random() < 0.35
        ? { urlPath: `/your${p}`, matchScore: rand(60, 92), kwOverlap: rand(8, 36) }
        : Math.random() < 0.1
        ? null
        : undefined;
    return {
      id: `row-${i + 1}`,
      urlPath: p,
      fullUrl: full,
      title: t,
      kwCount: kwc,
      firstDetectedISO: first,
      type,
      topicTags: topicSet,
      noteCount: Math.random() < 0.25 ? rand(1, 3) : 0,
      yourClosest,
    };
  });

  const kpi: KPIData = {
    newPagesCount: rows.filter(() => Math.random() < 0.4).length,
    topTopics: ["SEO", "AI", "Backlinking"],
    avgKwCount: Math.round(rows.reduce((s, r) => s + r.kwCount, 0) / rows.length),
    microTrends: {
      newPagesBars: Array.from({ length: 18 }).map(() => rand(0, 8)),
      avgKwArea: Array.from({ length: 18 }).map(() => rand(20, 80)),
    },
  };

  return { rows, kpi };
}
