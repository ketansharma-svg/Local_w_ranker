"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info as InfoIcon,
  ChevronDown,
  Upload,
  Plus,
  Settings,
  ExternalLink,
  Search as SearchIcon,
  Filter,
  Undo2,
  SortAsc,
  SortDesc,
  FilePlus,
  Copy,
  ListChecks,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import Demo_TrackCompetitorPageModal from "./drawers/TrackCompetitor";
import SerpSnapshotViewerDemo from "./drawers/SerpSnapshotViewer";
/* ------------------------------- TOKENS -------------------------------- */
const TK = {
  brand: "#1090D0", // You / My project
  brandHover: "#0C7FB6",
  compBlue: "#0077FF", // Competitor
  text: "#282829",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  ok: "#16A34A",
  danger: "#F04438",
  grayMed: "#6B7280",
  rowHover: "#FAFCFE",
} as const;

const INTENT = {
  info: { label: "Informational", abbr: "Info", color: "#14B8A6" },
  nav: { label: "Navigational", abbr: "Nav", color: "#7C3AED" },
  comm: { label: "Commercial", abbr: "Comm", color: "#F59E0B" },
  trans: { label: "Transactional", abbr: "Trans", color: "#F43F5E" },
} as const;

const FEATURE_LABEL: Record<
  "FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES",
  string
> = {
  FS: "Featured Snippet",
  PAA: "People Also Ask",
  IMAGE: "Image Pack",
  SITELINKS: "Sitelinks",
  VIDEO: "Video",
  TOP_STORIES: "Top Stories",
};
const FEATURE_ICON: Record<
  keyof typeof FEATURE_LABEL,
  string
> = { FS: "🔥", PAA: "💡", IMAGE: "🖼️", SITELINKS: "⭐", VIDEO: "🎥", TOP_STORIES: "📰" };

/* ------------------------------- TYPES --------------------------------- */
type IntentCode = "informational" | "navigational" | "commercial" | "transactional";
type FeatureCode = "FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES";

type TrackedKeywordRow = {
  id: string;
  keyword: string;
  comp: {
    current: number | null; // 1..100, null => not ranking
    prev: number | null;
    series: number[]; // 14 points
    intent: IntentCode;
    features: FeatureCode[];
    volume: number;
  };
  you?: {
    current: number | null;
    series: number[]; // same length as comp.series
  };
  note?: string;
  updatedAtISO: string;
  _volatility?: number;
  _order?: number;
};

/* ---------------------------- HELPERS/FORMAT --------------------------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const kfmt = (n: number) =>
  Math.abs(n) >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : Math.abs(n) >= 1_000 ? (n / 1_000).toFixed(1) + "K" : nf(n);

function classNames(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}
function bucketColorComp(pos: number | null) {
  if (pos == null) return "#9CA3AF";
  if (pos <= 3) return TK.ok;
  if (pos <= 10) return TK.compBlue;
  if (pos <= 20) return TK.grayMed;
  return "#9CA3AF";
}
function bucketColorYou(pos: number | null) {
  if (pos == null) return "#9CA3AF";
  if (pos <= 3) return TK.ok;
  if (pos <= 10) return TK.brand;
  if (pos <= 20) return TK.grayMed;
  return "#9CA3AF";
}
function compactPos(pos: number | null) {
  return pos == null ? "—" : `#${pos}`;
}
function rankDelta(
  curr: number | null,
  prev: number | null
): { raw: number | null; tone: "up" | "down" | "flat"; text: string } {
  if (curr == null || prev == null) return { raw: null, tone: "flat", text: "—" };
  const d = prev - curr; // positive => improvement (lower rank)
  if (d > 0) return { raw: d, tone: "up", text: `▲${d}` };
  if (d < 0) return { raw: d, tone: "down", text: `▼${Math.abs(d)}` };
  return { raw: 0, tone: "flat", text: "— 0" };
}
function stddev(xs: number[]) {
  const clean = xs.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!clean.length) return 0;
  const m = clean.reduce((a, b) => a + b, 0) / clean.length;
  const v = clean.reduce((a, b) => a + Math.pow(b - m, 2), 0) / clean.length;
  return Math.sqrt(v);
}
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}

/* ---------------------------- PRIMITIVES/UI ---------------------------- */
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
function Chip({
  children,
  active,
  onClick,
  icon,
  title,
}: React.PropsWithChildren<{ active?: boolean; onClick?: () => void; icon?: React.ReactNode; title?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={classNames(
        "inline-flex items-center gap-2 h-8 px-3 rounded-full border text-sm",
        active ? "font-semibold" : "",
        "hover:bg-[#E5E7EB]"
      )}
      style={{ borderColor: TK.border, background: active ? TK.chipBg : "#FFFFFF", color: TK.text }}
    >
      {icon}
      {children}
    </button>
  );
}
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: TK.border }}>
      {options.map((o, i) => {
        const sel = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange?.(o.key)}
            className={classNames("px-3 h-8 text-sm", sel ? "bg-white font-medium" : "bg-[#F5F7FA] hover:bg-[#E5E7EB]")}
            style={{ borderLeft: i ? `1px solid ${TK.border}` : undefined }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function IconBtn({ title, onClick, children }: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md border hover:bg-gray-50"
      style={{ borderColor: TK.border, background: "#FFFFFF", color: TK.text }}
    >
      {children}
    </button>
  );
}

/* ---------------------------- SPARKLINE CELL --------------------------- */
function Sparkline({
  compSeries,
  youSeries,
  compareOn,
  height = 40,
}: {
  compSeries: number[];
  youSeries?: number[];
  compareOn: boolean;
  height?: number;
}) {
  const data = useMemo(
    () =>
      compSeries.map((v, i) => ({
        idx: i,
        t: i,
        comp: v,
        you: youSeries?.[i] ?? null,
      })),
    [compSeries, youSeries]
  );
  const yMax = Math.max(100, Math.max(...compSeries, ...(youSeries ?? [1])));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis type="number" domain={[1, yMax]} reversed hide />
          {!compareOn && (
            <Area type="monotone" dataKey="comp" stroke="transparent" fill={TK.compBlue} fillOpacity={0.18} isAnimationActive={false} />
          )}
          <RTooltip
            cursor={{ stroke: TK.compBlue, strokeDasharray: "3 3", strokeOpacity: 0.25 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as any;
              const i = p.idx as number;
              const compCurr = p.comp as number | null;
              const compPrev = i > 0 ? (data[i - 1].comp as number | null) : null;
              const youCurr = p.you as number | null;
              const youPrev = i > 0 ? (data[i - 1].you as number | null) : null;

              const compDelta = rankDelta(compCurr, compPrev);
              const youDelta = youSeries ? rankDelta(youCurr, youPrev) : null;
              const pctDelta = (curr: number | null, prev: number | null) => {
                if (curr == null || prev == null || prev === 0) return "—";
                const change = prev - curr; // improvement positive
                const pct = (change / prev) * 100;
                const s = pct > 0 ? "+" : pct < 0 ? "−" : "";
                return `${s}${Math.abs(pct).toFixed(1)}%`;
              };

              return (
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${TK.border}`,
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 12,
                    boxShadow: "0 1px 2px rgba(17,24,39,.06)",
                  }}
                >
                  <div className="text-[#6B7280]">Snapshot #{i + 1}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.compBlue }} />
                    <span className="text-[#111827] font-medium">Comp:</span>
                    <span className="ml-1">{compCurr ?? "—"}</span>
                    <span
                      className={classNames(
                        "ml-1",
                        compDelta.tone === "up" ? "text-[#16A34A]" : compDelta.tone === "down" ? "text-[#F04438]" : "text-[#6B7280]"
                      )}
                    >
                      {compDelta.text} ({pctDelta(compCurr, compPrev)})
                    </span>
                  </div>
                  {compareOn && youSeries && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.brand }} />
                      <span className="text-[#111827] font-medium">You:</span>
                      <span className="ml-1">{youCurr ?? "—"}</span>
                      {youDelta && (
                        <span
                          className={classNames(
                            "ml-1",
                            youDelta.tone === "up" ? "text-[#16A34A]" : youDelta.tone === "down" ? "text-[#F04438]" : "text-[#6B7280]"
                          )}
                        >
                          {youDelta.text} ({pctDelta(youCurr, youPrev)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="comp" stroke={TK.compBlue} strokeWidth={2} dot={false} isAnimationActive={false} />
          {compareOn && youSeries && (
            <Line type="monotone" dataKey="you" stroke={TK.brand} strokeWidth={2} dot={false} isAnimationActive={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- MAIN VIEW ----------------------------- */

type SortKey = "relevance" | "volume" | "position" | "intent" | "youRank";
type SortDir = "asc" | "desc";
type PosBucket = "top3" | "p4_10" | "p11_20" | "p21_100";
type ChangeType = "all" | "gains" | "losses" | "stable";
type YouFilter = "all" | "you-ranked" | "not-ranked";

export default function KeywordTrackingMonitorSectionMock({ compareOn = true }: { compareOn?: boolean }) {
  // data
  const [rows, setRows] = useState<TrackedKeywordRow[]>(() => buildMockRows(150));

  // UI state
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<Set<PosBucket>>(new Set());
  const [intent, setIntent] = useState<Set<keyof typeof INTENT>>(new Set());
  const [features, setFeatures] = useState<Set<FeatureCode>>(new Set());
  const [changeType, setChangeType] = useState<ChangeType>("all");
  const [youFilter, setYouFilter] = useState<YouFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [infinite] = useState(true);
  const [visible, setVisible] = useState(40);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false); // FIX: define modal state

  // toolbar shadow on scroll
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 2);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Infinite observer
  useEffect(() => {
    if (!infinite) return;
    const sentinel = document.getElementById("kw-track-sentinel");
    if (!sentinel) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(v + 40, filteredSorted.length));
      }
    });
    obs.observe(sentinel);
    return () => obs.disconnect();
  });

  // --- filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byBucket = (p: number | null): PosBucket | null => {
      if (p == null) return null;
      if (p <= 3) return "top3";
      if (p <= 10) return "p4_10";
      if (p <= 20) return "p11_20";
      return "p21_100";
    };
    const matchPos = (r: TrackedKeywordRow) => pos.size === 0 || (r.comp.current != null && pos.has(byBucket(r.comp.current)!));
    const matchIntent = (r: TrackedKeywordRow) => {
      if (intent.size === 0) return true;
      const key = r.comp.intent === "informational" ? "info" : r.comp.intent === "navigational" ? "nav" : r.comp.intent === "commercial" ? "comm" : "trans";
      return intent.has(key as any);
    };
    const matchFeatures = (r: TrackedKeywordRow) => features.size === 0 || r.comp.features.some((f) => features.has(f));
    const matchChange = (r: TrackedKeywordRow) => {
      if (changeType === "all") return true;
      const d = rankDelta(r.comp.current, r.comp.prev).raw;
      if (d == null) return false;
      if (changeType === "gains") return d > 0;
      if (changeType === "losses") return d < 0;
      return d === 0;
    };
    const matchYou = (r: TrackedKeywordRow) => {
      if (!compareOn || youFilter === "all") return true;
      const ranked = r.you?.current != null;
      return youFilter === "you-ranked" ? ranked : !ranked;
    };

    return rows.filter((r) => {
      if (q) {
        const hit = r.keyword.toLowerCase().includes(q) || (r.note ? r.note.toLowerCase().includes(q) : false);
        if (!hit) return false;
      }
      if (!matchPos(r)) return false;
      if (!matchIntent(r)) return false;
      if (!matchFeatures(r)) return false;
      if (!matchChange(r)) return false;
      if (!matchYou(r)) return false;
      return true;
    });
  }, [rows, search, pos, intent, features, changeType, youFilter, compareOn]);

  // --- sorting
  const filteredSorted = useMemo(() => {
    if (sortBy === "relevance") {
      return filtered.slice().sort((a, b) => (a._order ?? 0) - (b._order ?? 0));
    }
    const arr = [...filtered];
    const intentOrder: Record<IntentCode, number> = {
      informational: 1,
      navigational: 2,
      commercial: 3,
      transactional: 4,
    };
    arr.sort((a, b) => {
      let av: any = 0;
      let bv: any = 0;
      switch (sortBy) {
        case "volume":
          av = a.comp.volume;
          bv = b.comp.volume;
          break;
        case "position":
          av = a.comp.current ?? 999;
          bv = b.comp.current ?? 999;
          break;
        case "intent":
          av = intentOrder[a.comp.intent];
          bv = intentOrder[b.comp.intent];
          break;
        case "youRank":
          av = a.you?.current ?? 999;
          bv = b.you?.current ?? 999;
          break;
      }
      if (av === bv) return (a._order ?? 0) - (b._order ?? 0);
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const windowRows = useMemo(() => (infinite ? filteredSorted.slice(0, visible) : filteredSorted), [filteredSorted, infinite, visible]);

  // --- selection helpers
  const pageIds = windowRows.map((r) => r.id);
  const [sortOpen, setSortOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const sortRef = useOutsideClose<HTMLDivElement>(sortOpen, () => setSortOpen(false));
  const exportRef = useOutsideClose<HTMLDivElement>(exportOpen, () => setExportOpen(false));

  const allSelected = pageIds.length > 0 && pageIds.every((id) => selection[id]);
  const toggleSelectAll = () => {
    const next = { ...selection };
    const val = !allSelected;
    pageIds.forEach((id) => (next[id] = val));
    setSelection(next);
  };
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const selectedRows = windowRows.filter((r) => selection[r.id]);

  // --- actions
  function resetFilters() {
    setSearch("");
    setPos(new Set());
    setIntent(new Set());
    setFeatures(new Set());
    setChangeType("all");
    setYouFilter("all");
    setSortBy("relevance");
    setSortDir("desc");
  }
  function exportCSV(useSelection = false) {
    const src = useSelection ? selectedRows : filteredSorted;
    const hdr = ["Keyword", "Comp_Current", "Comp_Prev", "Volume", "Intent", "Features", ...(compareOn ? ["You_Current"] : []), "UpdatedAt"];
    const lines = src.map((r) => {
      const cols = [r.keyword, r.comp.current ?? "", r.comp.prev ?? "", r.comp.volume, r.comp.intent, r.comp.features.join("|")];
      if (compareOn) cols.push(r.you?.current ?? "");
      cols.push(r.updatedAtISO);
      return cols.map((x) => JSON.stringify(String(x))).join(",");
    });
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = useSelection ? "keywords-selected.csv" : "keywords.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function addToTask(rowsArg: TrackedKeywordRow[]) {
    if (rowsArg.length === 0) return;
    alert(`Open Task Drawer (prefilled): ${rowsArg.length} keyword(s).`);
  }
  function addKeywordModal() {
    setAddOpen(true);
  }

  // --- Sticky toolbar
  const Toolbar = (
    <div className={classNames("sticky top-0 z-10 bg-white", scrolled ? "shadow-[0_2px_8px_rgba(0,0,0,0.06)]" : "")}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {/* Search */}
        <div className="relative">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            className="h-9 w-[260px] rounded-md border pl-7 pr-2 text-sm"
            style={{ borderColor: TK.border }}
            placeholder="Search keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
          <Filter size={14} /> Filters:
        </span>

        {/* Position buckets */}
        {(["top3", "p4_10", "p11_20", "p21_100"] as PosBucket[]).map((k) => (
          <Chip
            key={k}
            active={pos.has(k)}
            onClick={() => {
              const s = new Set(pos);
              s.has(k) ? s.delete(k) : s.add(k);
              setPos(s);
            }}
            title="Position range"
          >
            {k === "top3" ? "Top 3" : k === "p4_10" ? "4–10" : k === "p11_20" ? "11–20" : "21–100"}
          </Chip>
        ))}

        {/* Intent (multi) */}
        {(["info", "nav", "comm", "trans"] as const).map((k) => (
          <Chip
            key={k}
            active={intent.has(k)}
            onClick={() => {
              const s = new Set(intent);
              s.has(k) ? s.delete(k) : s.add(k);
              setIntent(s);
            }}
            title="Intent"
            icon={<span className="inline-block h-2 w-2 rounded-full" style={{ background: (INTENT as any)[k].color }} />}
          >
            {(INTENT as any)[k].abbr}
          </Chip>
        ))}

        {/* Features (multi) */}
        {(Object.keys(FEATURE_LABEL) as FeatureCode[]).map((f) => (
          <Chip
            key={f}
            active={features.has(f)}
            onClick={() => {
              const s = new Set(features);
              s.has(f) ? s.delete(f) : s.add(f);
              setFeatures(s);
            }}
            title="SERP Feature"
          >
            {FEATURE_ICON[f]} {f === "SITELINKS" ? "Sitelinks" : f}
          </Chip>
        ))}

        {/* Change type */}
        <Segmented
          options={[
            { key: "all", label: "All" },
            { key: "gains", label: "Gains" },
            { key: "losses", label: "Losses" },
            { key: "stable", label: "Stable" },
          ]}
          value={changeType}
          onChange={(v) => setChangeType(v as ChangeType)}
        />

        {/* You ranking */}
        {compareOn && (
          <Segmented
            options={[
              { key: "all", label: "All" },
              { key: "you-ranked", label: "You ranked" },
              { key: "not-ranked", label: "Not ranked" },
            ]}
            value={youFilter}
            onChange={(v) => setYouFilter(v as YouFilter)}
          />
        )}

        {/* Reset */}
        <button
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F3F4F6]"
          onClick={resetFilters}
          title="Reset filters & search"
        >
          <Undo2 size={14} /> Reset
        </button>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Sort */}
          <div className="relative" ref={sortRef}>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm bg-white hover:bg-gray-50"
              style={{ borderColor: TK.border, color: TK.text }}
              onClick={() => setSortOpen((s) => !s)}
              title="Sort by"
              aria-expanded={sortOpen}
              aria-haspopup="menu"
            >
              Sort: {sortBy === "relevance" ? "Relevance" : sortBy === "volume" ? "Volume" : sortBy === "position" ? "Position" : sortBy === "intent" ? "Intent" : "You Rank"}
              <ChevronDown size={16} className="text-[#9CA3AF]" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-md border bg-white shadow" style={{ borderColor: TK.border }} role="menu">
                {(["relevance", "volume", "position", "intent", ...(compareOn ? ["youRank"] : [])] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setSortBy(k);
                      setSortOpen(false);
                    }}
                    role="menuitem"
                  >
                    {k === "relevance" ? "Relevance" : k === "volume" ? "Volume" : k === "position" ? "Position" : k === "intent" ? "Intent" : "You Rank"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-md border hover:bg-gray-50"
            style={{ borderColor: TK.border, background: "#FFFFFF", color: TK.text }}
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title="Toggle sort direction"
          >
            {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>

          {/* Export */}
          <div className="relative" ref={exportRef}>
            <IconBtn title="Export" onClick={() => setExportOpen((s) => !s)}>
              <Upload size={16} />
            </IconBtn>
            {exportOpen && (
              <div className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-md border bg-white shadow" style={{ borderColor: TK.border }} role="menu">
                <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => exportCSV(false)} role="menuitem">
                  Export CSV (all)
                </button>
                <button
                  className={classNames("block w-full px-3 py-2 text-left text-sm hover:bg-gray-50", selectedRows.length ? "" : "cursor-not-allowed text-gray-400")}
                  onClick={() => selectedRows.length && exportCSV(true)}
                  role="menuitem"
                >
                  Export CSV (selection)
                </button>
                <button className="block w-full px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed" role="menuitem">
                  Export PDF (Pro)
                </button>
              </div>
            )}
          </div>

          {/* Add Keyword */}
          <button
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white shadow-sm"
            style={{ background: TK.brand }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brandHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brand)}
            onClick={addKeywordModal}
            title="Add Keyword to Track"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add Keyword</span>
          </button>

          {/* Manage Rules */}
          <IconBtn title="Manage Rules" onClick={() => alert("Open Manage Rules modal")}>
            <Settings size={16} />
          </IconBtn>
        </div>
      </div>
      <div className="border-b" style={{ borderColor: TK.border }} />
    </div>
  );

  return (
    <section className="w-full">
      {/* Section header strip */}
      <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TK.border, background: "#FFFFFF" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md" style={{ background: "#D2EFFF", border: `1px solid ${TK.border}` }}>
              <SearchIcon size={16} style={{ color: TK.brand }} />
            </span>
            <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>Keyword Tracking Monitor</h3>
            <span className="ml-2 hidden md:inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]">
              <InfoIcon size={12} /> Track competitor keyword movements & SERP gains
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5">Compare: <b className="ml-1">{compareOn ? "ON" : "OFF"}</b></span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5">Tracked: <b className="ml-1">{filteredSorted.length}</b></span>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white shadow-sm"
            style={{ background: TK.brand }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brandHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brand)}
            onClick={addKeywordModal}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add Keyword to Track</span>
          </button>
          <button
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text }}
            onClick={() => exportCSV(false)}
          >
            <Upload size={16} />
            Export
          </button>
          <button
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text }}
            onClick={() => alert("Open Manage Rules")}
          >
            <Settings size={16} />
            Manage Rules
          </button>
        </div>

        {/* TABLE CARD */}
        <div className="mt-4 rounded-[6px] border" style={{ borderColor: TK.border }}>
          {/* Sticky toolbar */}
          {Toolbar}

          {/* Scroll body */}
          <div ref={bodyRef} className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b" style={{ borderColor: TK.border }}>
                  <ThSelect allSelected={allSelected} onToggleAll={toggleSelectAll} />
                  <Th label="Keyword" info="Search query for selected device, country & date." width={320} />
                  <Th label="Trend" info="Ranking movement (lower is better). Hover for shared tooltip." width={140} />
                  <Th label="Current" info="Latest position for competitor page." width={90} align="center" />
                  <Th label="Change" info="Delta vs previous snapshot." width={100} align="center" />
                  <Th
                    label="Volume"
                    info="Estimated monthly search volume."
                    width={110}
                    align="right"
                    sortable
                    active={sortBy === "volume"}
                    dir={sortDir}
                    onSort={() => setSortBy("volume")}
                  />
                  <Th
                    label="Intent"
                    info="Dominant intent class for the query."
                    width={110}
                    sortable
                    active={sortBy === "intent"}
                    dir={sortDir}
                    onSort={() => setSortBy("intent")}
                  />
                  <Th label="SERP" info="SERP features present on page 1; badge shown if competitor is inside that feature." width={150} />
                  {compareOn && (
                    <Th
                      label="You Rank?"
                      info="Your best position; ‘—’ means not ranking."
                      width={120}
                      align="center"
                      sortable
                      active={sortBy === "youRank"}
                      dir={sortDir}
                      onSort={() => setSortBy("youRank")}
                    />
                  )}
                  <Th label="" info="" width={110} />
                </tr>
              </thead>
              <tbody>
                {windowRows.map((r) => (
                  <RowView
                    key={r.id}
                    row={r}
                    checked={!!selection[r.id]}
                    onCheck={(val) => setSelection((s) => ({ ...s, [r.id]: val }))}
                    compareOn={compareOn}
                    onAddNote={(text) => {
                      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, note: text } : x)));
                    }}
                  />
                ))}
              </tbody>
            </table>
            {/* Empty / sentinel */}
            {windowRows.length === 0 && (
              <div className="grid h-[200px] place-items-center text-sm text-[#6B7280]">
                No results for current filters.{" "}
                <button className="ml-2 underline" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            )}
            {infinite && windowRows.length < filteredSorted.length && <div id="kw-track-sentinel" className="h-8" />}
          </div>

          {/* Footer load more */}
          {infinite && windowRows.length < filteredSorted.length && (
            <div className="flex items-center justify-between border-t p-3" style={{ borderColor: TK.border }}>
              <div className="text-sm text-[#6B7280]">
                Loaded {windowRows.length} of {filteredSorted.length}
              </div>
              <button
                className="inline-flex items-center gap-2 h-8 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
                style={{ borderColor: TK.border, color: TK.text }}
                onClick={() => setVisible((v) => Math.min(v + 40, filteredSorted.length))}
              >
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Bulk bar */}
        {selectedIds.length > 0 && (
          <div className="mt-3 w-full rounded-md border bg-[#F5F7FA] p-2 text-sm" style={{ borderColor: TK.border }}>
            <div className="flex items-center gap-2">
              <span>
                <b>{selectedIds.length}</b> selected
              </span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <button className="h-8 rounded-md border px-3 hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => exportCSV(true)}>
                Export selection
              </button>
              <button className="h-8 rounded-md border px-3 hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => addToTask(selectedRows)}>
                Add to Task
              </button>
              <button className="ml-auto h-8 rounded-md border px-3 hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => setSelection({})}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Keyword Modal */}
      <AddKeywordModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(kw) => {
          const newRow = makeRow(rows.length + 1, kw);
          setRows((rs) => [newRow, ...rs].map((r, i) => ({ ...r, _order: i })));
          setAddOpen(false);
        }}
      />
    </section>
  );
}

/* --------------------------- TABLE SUBCOMPONENTS ----------------------- */
function Th({
  label,
  info,
  align = "left",
  width,
  sortable,
  active,
  dir,
  onSort,
}: {
  label: string;
  info: string;
  align?: "left" | "right" | "center";
  width?: number;
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onSort?: () => void;
}) {
  return (
    <th
      className={classNames(
        "px-3 py-2 text-sm font-medium",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      )}
      style={{ minWidth: width, width }}
    >
      <span className="inline-flex items-center gap-1">
        {sortable ? (
          <button className="inline-flex items-center gap-1 hover:underline" onClick={onSort} title={`Sort by ${label}`}>
            <span>{label}</span>
            <span className="text-[#9CA3AF]">{active ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
          </button>
        ) : (
          <span>{label}</span>
        )}
        <InfoPopover label={info} />
      </span>
    </th>
  );
}
function ThSelect({ allSelected, onToggleAll }: { allSelected: boolean; onToggleAll: () => void }) {
  return (
    <th className="px-3 py-2 w-[44px]">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
        checked={allSelected}
        onChange={onToggleAll}
        aria-label="Select all"
      />
    </th>
  );
}

function RowView({
  row,
  checked,
  onCheck,
  compareOn,
  onAddNote,
}: {
  row: TrackedKeywordRow;
  checked: boolean;
  onCheck: (v: boolean) => void;
  compareOn: boolean;
  onAddNote: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [noteVal, setNoteVal] = useState(row.note ?? "");
  const d = rankDelta(row.comp.current, row.comp.prev);

  const intentKey =
    row.comp.intent === "informational"
      ? "info"
      : row.comp.intent === "navigational"
      ? "nav"
      : row.comp.intent === "commercial"
      ? "comm"
      : "trans";

  const openSERP = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(row.keyword)}`, "_blank");
  };
  const copyKeyword = async () => {
    try {
      await navigator.clipboard.writeText(row.keyword);
    } catch {}
  };

  const [drawerRow, setDrawerRow] = useState(false);
  const [drawerSerp, setSerp] = useState(false);

  const openSerp = () => {
       setSerp(true);
  };

  // This function will handle closing the drawer
  const closeSerp = () => {
    setSerp(false);
  };

    const openDrawer = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
       if (e) e.stopPropagation();
       setDrawerRow(true);
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }


  return (
    <>
                            {drawerRow && (
                                        <div
            style={{
              display:"hidden",
              position: "absolute",
              zIndex: 1001,
              padding: "20px",
            }}
            onClick={e => e.stopPropagation()}
          >
                    <Demo_TrackCompetitorPageModal onClose={closeDrawer}  />
                    </div>
                )}
                                         {drawerSerp && (
                                                <Drawer title="Drawer" onClose={closeSerp}>
                                                  <SerpSnapshotViewerDemo   />
                                                </Drawer>
                                              )}
      <tr className="border-b hover:bg-[#FAFCFE]" style={{ borderColor: TK.border }}>
        <td className="px-3 py-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
            checked={checked}
            onChange={(e) => onCheck(e.target.checked)}
            aria-label="Select row"
          />
        </td>

        {/* Keyword */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              className="font-medium underline decoration-1 underline-offset-2 cursor-pointer"
              style={{ color: TK.compBlue }}
              onClick={openDrawer}
              title="Open Keyword Analyzer"
            >
              {row.keyword}
            </button>
            <button title="Open SERP Snapshot" onClick={openSERP} className="text-[#9CA3AF] hover:text-[#6B7280]">
              <ExternalLink size={14} />
            </button>
            {row.note && <span title="Has note">📝</span>}
          </div>
        </td>

        {/* Trend */}
        <td className="px-3 py-2">
          <Sparkline compSeries={row.comp.series} youSeries={row.you?.series} compareOn={compareOn} />
        </td>

        {/* Current */}
        <td className="px-3 py-2 text-center">
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
            style={{ background: "#F3F4F6", color: bucketColorComp(row.comp.current), border: `1px solid ${TK.border}` }}
          >
            {compactPos(row.comp.current)}
          </span>
        </td>

        {/* Change */}
        <td className="px-3 py-2 text-center">
          <span className={classNames("tabular-nums", d.tone === "up" ? "text-[#16A34A]" : d.tone === "down" ? "text-[#F04438]" : "text-[#6B7280]")}>
            {d.text}
          </span>
        </td>

        {/* Volume */}
        <td className="px-3 py-2 text-right tabular-nums">{kfmt(row.comp.volume as number)}</td>

        {/* Intent */}
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1 text-xs">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: (INTENT as any)[intentKey].color }} />
            {(INTENT as any)[intentKey].abbr}
          </span>
        </td>

        {/* SERP */}
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {row.comp.features.map((f) => (
              <span key={f} className="rounded bg-[#F5F7FA] px-1.5 py-[1px] text-[11px] text-[#374151] cursor-pointer" title={FEATURE_LABEL[f]} onClick={openSerp}>
                {FEATURE_ICON[f]}
              </span>
            ))}
          </div>
        </td>

        {/* You Rank? */}
        {compareOn && (
          <td className="px-3 py-2 text-center">
            <span
              className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
              style={{ background: "#F3F4F6", color: bucketColorYou(row.you?.current ?? null), border: `1px solid ${TK.border}` }}
            >
              {compactPos(row.you?.current ?? null)}
            </span>
          </td>
        )}

        {/* Quick actions */}
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity hover:opacity-100">
            <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#F3F4F6]" title="Open SERP" onClick={openSERP}>
              <ExternalLink size={14} />
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#F3F4F6]" title="Copy keyword" onClick={copyKeyword}>
              <Copy size={14} />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#F3F4F6]"
              title="Add to Task"
              onClick={() => alert(`Open Task Drawer with keyword: ${row.keyword}`)}
            >
              <ListChecks size={14} />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#F3F4F6]"
              title={editing ? "Cancel" : "Add Note"}
              onClick={() => setEditing((s) => !s)}
            >
              <FilePlus size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* Inline note editor */}
      {editing && (
        <tr className="border-b" style={{ borderColor: TK.border }}>
          <td />
          <td colSpan={compareOn ? 9 : 8} className="px-3 pb-3">
            <div className="mt-2 rounded-md border p-2" style={{ borderColor: TK.border, background: "#F9FAFB" }}>
              <div className="mb-1 text-xs" style={{ color: TK.muted }}>
                Notes (internal)
              </div>
              <textarea
                className="w-full rounded-md border p-2 text-sm"
                rows={3}
                style={{ borderColor: TK.border }}
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm bg-white hover:bg-gray-50"
                  style={{ borderColor: TK.border, color: TK.text }}
                  onClick={() => {
                    onAddNote(noteVal.trim());
                    setEditing(false);
                  }}
                >
                  Save note
                </button>
                <button className="h-8 rounded-md border px-3 text-sm hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                {row.note && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#6B7280]">
                    <Sparkles size={12} /> Note exists
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------ ADD MODAL ------------------------------ */
function AddKeywordModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (kw: string) => void }) {
  const [kw, setKw] = useState("");
  const [intent, setIntent] = useState<IntentCode>("informational");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 left-0 top-12 mx-auto w-full max-w-[520px] rounded-lg border bg-white shadow-xl" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="text-[16px] font-semibold">Track Competitor Keyword</div>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="text-sm text-[#6B7280]">Add a keyword to monitor for the current competitor.</div>
          <label className="text-sm font-medium">
            Keyword<span className="text-[#F04438]"> *</span>
          </label>
          <input
            className="w-full rounded-md border p-2 text-sm"
            style={{ borderColor: TK.border }}
            placeholder="e.g., best seo tools"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <div>
            <div className="mb-1 text-sm font-medium">Intent (optional)</div>
            <div className="flex flex-wrap items-center gap-2">
              {(["informational", "navigational", "commercial", "transactional"] as IntentCode[]).map((i) => {
                const key = i === "informational" ? "info" : i === "navigational" ? "nav" : i === "commercial" ? "comm" : "trans";
                return (
                  <Chip
                    key={i}
                    active={intent === i}
                    onClick={() => setIntent(i)}
                    icon={<span className="inline-block h-2 w-2 rounded-full" style={{ background: (INTENT as any)[key].color }} />}
                  >
                    {(INTENT as any)[key].abbr}
                  </Chip>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-3" style={{ borderColor: TK.border }}>
          <button className="h-9 rounded-md border px-3 text-sm hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white shadow-sm"
            style={{ background: TK.brand }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brandHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brand)}
            onClick={() => {
              const s = kw.trim();
              if (!s) return alert("Please enter a keyword.");
              onAdd(s.toLowerCase());
            }}
          >
            <Plus size={16} /> Add Keyword
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ MOCK DATA ------------------------------ */
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function choose<T>(arr: T[]) {
  return arr[rand(0, arr.length - 1)];
}
function makeSeries(len = 14, start = rand(4, 30)) {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < len; i++) {
    v = Math.max(1, Math.min(100, v + rand(-4, 4)));
    out.push(v);
  }
  return out;
}
function makeRow(i: number, kw?: string): TrackedKeywordRow {
  const kword = kw ?? (i % 3 === 0 ? `best seo tools ${i}` : i % 3 === 1 ? `rank tracker ${i}` : `technical seo ${i}`);
  const compSeries = makeSeries(14, rand(4, 30));
  const youSeries = Math.random() > 0.25 ? makeSeries(14, rand(8, 50)) : Array(14).fill(null) as any;
  const compCurrent = compSeries[compSeries.length - 1];
  const compPrev = compSeries.length > 1 ? compSeries[compSeries.length - 2] : null;
  const youCurrent = youSeries && youSeries[youSeries.length - 1] !== null ? (youSeries[youSeries.length - 1] as number) : null;

  const intents: IntentCode[] = ["informational", "navigational", "commercial", "transactional"];
  const feats: FeatureCode[] = ["FS", "PAA", "IMAGE", "SITELINKS", "VIDEO", "TOP_STORIES"];
  const pickFeats = () => {
    const n = rand(0, 3);
    const shuffled = [...feats].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
    };

  return {
    id: `kw-${i}`,
    keyword: kword,
    comp: {
      current: compCurrent,
      prev: compPrev,
      series: compSeries,
      intent: choose(intents),
      features: pickFeats(),
      volume: rand(300, 40000),
    },
    you: youSeries ? { current: youCurrent, series: youSeries as number[] } : undefined,
    updatedAtISO: new Date().toISOString(),
    _volatility: Math.min(100, Math.round(stddev(compSeries) * 4)),
    _order: i,
  };
}
function buildMockRows(n = 150): TrackedKeywordRow[] {
  return Array.from({ length: n }, (_, i) => makeRow(i + 1));
}
