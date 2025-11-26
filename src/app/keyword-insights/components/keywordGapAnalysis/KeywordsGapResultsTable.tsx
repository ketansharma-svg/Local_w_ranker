"use client";

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  SlidersHorizontal,
  Download,
  RefreshCw,
  Filter,
  Info,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  Eye,
  ClipboardList,
  ExternalLink,
  BadgePlus,
  Lock,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  Cell, // ← for per‑bar styling (minimal hover effect)
} from "recharts";
import KeywordDrilldown from "../drawer/KeywordDrilldown";
import DemoKeywordDrilldownHeader from "../drawer/Header";
import DemoSerpPreviewModal, { SerpPreviewModal } from "../drawer/SerpPreview";
import DemoQuickView from "../drawer/QuickView";

/* ───────────────────────────────── TOKENS ───────────────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  action: "var(--wr-action, #008CCD)",
  appBg: "var(--wr-bg-subtle, #F5F7FA)",
  linkBlue: "#0077FF",
};

/* ───────────────────────────── TYPES / PROPS ───────────────────────────── */
type Device = "desktop" | "mobile";
type Intent = "Informational" | "Commercial" | "Transactional";
type Target = 1 | 3 | 5;
type GapType = "missing" | "weak" | "all";

export interface GapRow {
  id: string;
  keyword: string;
  volume?: number | null;
  intent: Intent;
  yourRank?: number | null; // null or >100 → Not Ranked
  bestCompetitorRank?: number | null;
  bestCompetitorDomain?: string | null;
  yourUrl?: string | null;
  competitors?: Array<{ domain: string; rank: number | null }>;
  serpPreview?: Array<{ rank: number; title: string; url: string; domain: string }>;
  isTracked: boolean;
}

interface Props {
  plan: "free" | "premium";
  scope: { device: Device; locationISO: string };
  target?: Target;
  rows: GapRow[];
}

/* ─────────────────────────────── UTILITIES ─────────────────────────────── */
const ctr = (rank: number | null | undefined): number => {
  if (rank == null || rank > 100) return 0;
  if (rank === 1) return 0.28;
  if (rank === 2) return 0.15;
  if (rank === 3) return 0.11;
  if (rank === 4) return 0.08;
  if (rank === 5) return 0.07;
  if (rank >= 6 && rank <= 10) return 0.04;
  if (rank >= 11 && rank <= 20) return 0.015;
  if (rank >= 21 && rank <= 50) return 0.005;
  return 0;
};
const fmtInt = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat().format(n));
const bucketText = (r: number | null | undefined) => {
  if (r == null || r > 100) return "";
  if (r <= 3) return "Top 3";
  if (r <= 10) return "Top 10";
  if (r <= 20) return "Top 20";
  if (r <= 50) return "Top 50";
  return "Top 100";
};

/* Avatar (no network) */
function hueHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
function Avatar({ domain }: { domain: string }) {
  const hue = hueHash(domain);
  const bg = `hsl(${hue} 75% 92%)`;
  const fg = `hsl(${hue} 55% 32%)`;
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] text-[10px] font-bold"
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {domain[0]?.toUpperCase() || "•"}
    </span>
  );
}

/* ────────────────────────────── CHIP DROPDOWNS ─────────────────────────── */
function computeSmartPos(anchor: DOMRect, desiredW: number, desiredH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  let left = Math.min(Math.max(margin, anchor.left + anchor.width - desiredW), vw - desiredW - margin);
  let top = anchor.bottom + margin;
  if (top + desiredH + margin > vh) top = Math.max(margin, anchor.top - desiredH - margin);
  left = Math.max(margin, Math.min(left, vw - desiredW - margin));
  top = Math.max(margin, Math.min(top, vh - desiredH - margin));
  return { left, top };
}

function ChipDropdown({
  label,
  badge,
  children,
  width = 320,
}: {
  label: string;
  badge?: string | number | null;
  children: (close: () => void) => React.ReactNode;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  const pop = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const place = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos(computeSmartPos(r, Math.min(width, window.innerWidth - 16), 280));
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (pop.current?.contains(t)) return;
      setOpen(false);
    };
    const onReflow = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-2 rounded-full border bg-white px-3 text-sm hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TK.border, color: TK.text }}
        title={label}
      >
        {label}
        {badge != null && badge !== "" && <span className="rounded-full bg-gray-100 px-2 py-[1px] text-[11px] text-gray-600">{badge}</span>}
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={pop}
            className="z-[10010] rounded-md border bg-white shadow-xl"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.min(width, window.innerWidth - 16), borderColor: TK.border }}
          >
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: TK.border }}>
              <div className="text-sm font-medium text-gray-700">{label}</div>
              <button className="rounded p-1 hover:bg-gray-100 cursor-pointer" title="Close" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-auto p-3 text-sm text-gray-800">{children(() => setOpen(false))}</div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ───────────────────────── Columns Popover (PORTAL) ─────────────────────── */
function ColumnsPopover({
  columns,
  visibleCols,
  setVisibleCols,
}: {
  columns: { key: string; label: string }[];
  visibleCols: Record<string, boolean>;
  setVisibleCols: (updater: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; w: number } | null>(null);
  const WIDTH = 320;

  const computePos = () => {
    if (!btnRef.current) return null;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - WIDTH - 8, r.right - WIDTH));
    const top = r.bottom + 8;
    return { top, left, w: WIDTH };
  };

  useLayoutEffect(() => {
    if (open) setPos(computePos());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = () => setPos(computePos());
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current && btnRef.current.contains(t)) return;
      if (portalRef.current && portalRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        className="inline-flex h-8 items-center gap-2 rounded border bg-white px-3 text-sm hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TK.border, color: TK.text }}
        onClick={() => setOpen((o) => !o)}
        title="Show/Hide Columns"
      >
        <SlidersHorizontal className="h-4 w-4" style={{ color: TK.brand }} />
        Columns
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={portalRef}
            className="z-[10000] max-h-96 overflow-auto rounded-md border bg-white p-3 shadow"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.w, borderColor: TK.border }}
          >
            <div className="mb-2 text-sm font-medium">Show / Hide Columns</div>
            <div className="space-y-2">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer"
                    checked={visibleCols[c.key] !== false}
                    onChange={(e) => setVisibleCols((s: any) => ({ ...s, [c.key]: e.target.checked }))}
                    disabled={c.key === "select" || c.key === "expander" || c.key === "keyword"}
                  />
                  <span>{c.label || c.key}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              <button
                className="cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                style={{ borderColor: TK.border }}
                onClick={() => {
                  const v: any = {};
                  columns.forEach((c) => (v[c.key] = true));
                  setVisibleCols(v);
                }}
              >
                Reset
              </button>
              <button className="cursor-pointer rounded border px-3 py-1.5 text-sm text-white" style={{ backgroundColor: TK.brand, borderColor: TK.brand }} onClick={() => setOpen(false)}>
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─────────────────────────────── MAIN SECTION ───────────────────────────── */
export function GapResultsTableSection({ plan, scope, rows, target: initialTarget = 3 }: Props) {
  const [target, setTarget] = useState<Target>(initialTarget);

  /* filters */
  const [query, setQuery] = useState("");
  const [gapType, setGapType] = useState<GapType>("all");
  const [excludeTracked, setExcludeTracked] = useState(false);
  const allComps = useMemo(() => Array.from(new Set(rows.flatMap((r) => (r.competitors || []).map((c) => c.domain)))), [rows]);
  const [compF, setCompF] = useState<string[]>([]);
  const [minVol, setMinVol] = useState(0);
  const [minGap, setMinGap] = useState(0);
  const [intentF, setIntentF] = useState<Intent[]>([]);

  /* selection / expand */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /* sorting */
  type SortKey = "keyword" | "volume" | "yourRank" | "rankGap" | "lift";
  const [sortKey, setSortKey] = useState<SortKey>("lift");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  /* derived rows: lift & rank gap */
  type CalcRow = GapRow & { volume0: number; lift: number; rankGap: number };
  const calcRows: CalcRow[] = useMemo(() => {
    return rows.map((r) => {
      const vol = r.volume ?? 0;
      const currentTP = Math.round(vol * ctr(r.yourRank));
      const projected = Math.round(vol * ctr(target));
      const lift = Math.max(0, projected - currentTP);
      const yr = r.yourRank == null ? 101 : r.yourRank;
      const br = r.bestCompetitorRank == null ? 101 : r.bestCompetitorRank;
      const rankGap = yr - br;
      return { ...r, volume0: vol, lift, rankGap };
    });
  }, [rows, target]);

  /* filter + sort pipeline */
  const filtered = useMemo(() => {
    let list = calcRows.slice();
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.keyword.toLowerCase().includes(q) || (r.yourUrl || "").toLowerCase().includes(q));
    if (gapType === "missing") list = list.filter((r) => r.yourRank == null);
    if (gapType === "weak") list = list.filter((r) => r.yourRank != null && r.rankGap >= 3);
    if (intentF.length) list = list.filter((r) => intentF.includes(r.intent));
    if (minVol > 0) list = list.filter((r) => r.volume0 >= minVol);
    if (minGap > 0) list = list.filter((r) => r.rankGap >= minGap);
    if (compF.length) list = list.filter((r) => (r.competitors || []).some((c) => compF.includes(c.domain)));
    if (excludeTracked) list = list.filter((r) => !r.isTracked);

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const A: any =
        sortKey === "keyword"
          ? a.keyword
          : sortKey === "volume"
          ? a.volume0
          : sortKey === "yourRank"
          ? a.yourRank == null
            ? 999
            : a.yourRank
          : sortKey === "rankGap"
          ? a.rankGap
          : a.lift;
      const B: any =
        sortKey === "keyword"
          ? b.keyword
          : sortKey === "volume"
          ? b.volume0
          : sortKey === "yourRank"
          ? b.yourRank == null
            ? 999
            : b.yourRank
          : sortKey === "rankGap"
          ? b.rankGap
          : b.lift;
      if (A === B) return 0;
      return (A > B ? 1 : -1) * dir;
    });
    return list;
  }, [calcRows, query, gapType, intentF, minVol, minGap, compF, excludeTracked, sortKey, sortDir]);

  const counts = {
    total: filtered.length,
    missing: filtered.filter((r) => r.yourRank == null).length,
    weak: filtered.filter((r) => r.yourRank != null && r.rankGap >= 3).length,
  };

  /* columns (left-aligned only) */
  const columns = [
    { key: "select", label: "", width: 36, sortable: true },
    { key: "expander", label: "", width: 36, sortable: true },
    { key: "keyword", label: "Keyword", width: 320, sortable: true },
    { key: "volume", label: "Search Volume", width: 140, sortable: true },
    { key: "intent", label: "Intent", width: 120, sortable: true },
    { key: "yourRank", label: "Your Rank", width: 120, sortable: true },
    { key: "bestRank", label: "Best Competitor Rank", width: 180, sortable: true },
    { key: "rankingComp", label: "Ranking Competitor", width: 200, sortable: true },
    { key: "landing", label: "Landing Page", width: 320, sortable: true },
    { key: "rankGap", label: "Rank Gap Δ", width: 120, sortable: true },
    { key: "lift", label: "Lift (clicks)", width: 140, sortable: true },
    { key: "opp", label: "Opportunity", width: 140, sortable: true },
    { key: "actions", label: "Actions", width: 180, sortable: true },
  ] as const;
  type ColumnKey = (typeof columns)[number]["key"];

  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(() => {
    const v: any = {};
    columns.forEach((c) => (v[c.key] = true));
    return v;
  });
  const visibleColumns = useMemo(() => columns.filter((c) => visibleCols[c.key] !== false), [visibleCols]);

  const stickyStyle = (key: ColumnKey) =>
    key === "select"
      ? { position: "sticky" as const, left: 0, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" }
      : key === "expander"
      ? { position: "sticky" as const, left: 36, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" }
      : key === "keyword"
      ? { position: "sticky" as const, left: 72, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" }
      : {};

  const visibleIds = filtered.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;

  const clearAllFilters = () => {
    setQuery("");
    setGapType("all");
    setIntentF([]);
    setMinVol(0);
    setMinGap(0);
    setCompF([]);
    setExcludeTracked(false);
  };

  /* opportunity helper */
  const oppLabel = (lift: number) => (lift >= 800 ? "High" : lift >= 250 ? "Medium" : "Low");

  /* ── NEW: minimal-hover state for competitor bars + smart tooltip data ── */
  const [compHoverIdx, setCompHoverIdx] = useState<Record<string, number | null>>({});

  /* Custom (smart) tooltip for competitor bars — shows Rank and Gap */
  function CompTooltip(props: any) {
    const { active, payload } = props;
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload as { domain: string; rank: number | null; gap: number };
    if (!d) return null;
    const rankLabel = d.rank == null ? "Not Ranked" : `#${d.rank}`;
    const gapVal = d.gap;
    const gapTxt = gapVal > 0 ? `+${gapVal}` : `${gapVal}`;
    const gapClass = gapVal > 0 ? "text-red-600" : gapVal < 0 ? "text-green-700" : "text-gray-700";
    return (
      <div
        className="rounded-md border bg-white px-2.5 py-1.5 text-[12px] shadow"
        style={{ borderColor: TK.border }}
      >
        <div className="font-medium text-gray-800">{d.domain}</div>
        <div className="mt-0.5 text-gray-600">
          Rank: <span className="font-semibold">{rankLabel}</span>
        </div>
        <div className={`text-gray-600`}>
          Gap: <span className={`font-semibold ${gapClass}`}>{gapTxt}</span>
        </div>
      </div>
    );
  }

  const [drawerRow, setDrawerRow] = useState(false);
  const [serp, setSerp] = useState(false);
  const [landing, setLanding] = useState(false);

    const openLanding = () => {
    setLanding(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeLanding = () => {
    setLanding(false);
  };


  const openSerp = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
         if (e) e.stopPropagation();
    setSerp(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeSerp = () => {
    setSerp(false);
  };
    const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
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
          <aside className="absolute right-0 top-0 h-full w-[72vw] overflow-auto bg-white p-4 shadow-xl">
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
    <section
      className="space-y-3 mt-4"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
                                   {serp && (
                        <div
                          style={{
                            display:"hidden",
                            position: "absolute",
                            zIndex: 1001,
                            padding: "20px",
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                                    <DemoSerpPreviewModal onClose={closeSerp}  />
                                  </div> 
                                )}
      {/* CARD */}
      <div className="w-full rounded-2xl border bg-white" style={{ borderColor: TK.border }}>
                      {drawerRow &&  (
                <Drawer title="Keyword Drilldown" onClose={closeDrawer}>
                <KeywordDrilldown/> 
                </Drawer>
              )}
                                    {landing &&  (
                <Drawer title="Quick View" onClose={closeLanding}>
                <DemoQuickView/> 
                </Drawer>
              )}
        {/* Header */}
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: TK.text }}>
            <TrendingUp className="h-5 w-5" style={{ color: TK.brand }} />  
            Keywords Gap Results
            <span className="ml-1 text-sm font-normal text-gray-500">· {counts.total} results</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Target buttons */}
            <div className="inline-flex items-center gap-2">
              <span className="text-sm text-gray-600">Target:</span>
              {[1, 3, 5].map((t) => (
                <button
                  key={t}
                  className={`h-8 rounded-full border px-3 text-sm cursor-pointer ${target === t ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"}`}
                  style={{ borderColor: TK.border }}
                  onClick={() => setTarget(t as Target)}
                  title={`Project to Top ${t}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <ColumnsPopover columns={columns as any} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />

            <button
              className="inline-flex h-8 items-center gap-2 rounded border bg-white px-3 text-sm hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TK.border, color: TK.text }}
              onClick={() => {
                const cols = [
                  "keyword",
                  "volume",
                  "intent",
                  "yourRank",
                  "bestCompetitorRank",
                  "bestCompetitorDomain",
                  "yourUrl",
                  "rankGap",
                  "lift",
                ] as const;
                const header = cols.join(",");
                const data = filtered
                  .map((r) =>
                    [
                      r.keyword,
                      r.volume ?? "",
                      r.intent,
                      r.yourRank ?? "",
                      r.bestCompetitorRank ?? "",
                      r.bestCompetitorDomain ?? "",
                      r.yourUrl ?? "",
                      (r as any).rankGap ?? "",
                      (r as any).lift ?? "",
                    ]
                      .map((v) => JSON.stringify(v ?? ""))
                      .join(",")
                  )
                  .join("\n");
                const csv = header + "\n" + data;
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "keyword-gap-results.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              title="Export"
            >
              <Download className="h-4 w-4" style={{ color: TK.brand }} />
              Export
            </button>

            <button
              className="inline-flex h-8 items-center gap-2 rounded border bg-white px-3 text-sm hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TK.border, color: TK.text }}
              onClick={() => window.location.reload()}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" style={{ color: TK.brand }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters row (all filters live here; dropdown chips for common types) */}
        <div className="border-t px-4 pt-4" style={{ borderColor: TK.border }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: TK.muted }}>
              <Filter className="h-4 w-4" style={{ color: TK.brand }} /> Filters
              <Info className="h-3.5 w-3.5" aria-label="Use chips to refine by gap type, intent, competitors and thresholds." />
            </div>

            <button
              onClick={() => {
                setQuery("");
                setGapType("all");
                setIntentF([]);
                setMinVol(0);
                setMinGap(0);
                setCompF([]);
                setExcludeTracked(false);
              }}
              className="inline-flex h-8 items-center gap-2 rounded border bg-white px-3 text-sm hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TK.border, color: TK.text }}
              title="Clear all filters"
            >
              Clear all
            </button>

            {/* Gap Type (radio) */}
            <ChipDropdown label="Gap Type" badge={gapType === "all" ? undefined : gapType}>
              {(close) => (
                <div className="space-y-2">
                  {([
                    { v: "all", label: `All Overlap (${counts.total})` },
                    { v: "missing", label: `Missing Only (${counts.missing})` },
                    { v: "weak", label: `Weak Only (${counts.weak})` },
                  ] as const).map((opt) => (
                    <label key={opt.v} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="gapType"
                        checked={gapType === (opt.v as GapType)}
                        onChange={() => {
                          setGapType(opt.v as GapType);
                          close();
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </ChipDropdown>

            {/* Intent (multi) */}
            <ChipDropdown label="Intent" badge={intentF.length ? intentF.length : undefined}>
              {(close) => (
                <div className="space-y-2">
                  {(["Informational", "Commercial", "Transactional"] as Intent[]).map((it) => (
                    <label key={it} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={intentF.includes(it)}
                        onChange={(e) => setIntentF((arr) => (e.target.checked ? [...arr, it] : arr.filter((x) => x !== it)))}
                      />
                      <span>{it}</span>
                    </label>
                  ))}
                  <div className="pt-2">
                    <button
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer"
                      style={{ borderColor: TK.border }}
                      onClick={() => {
                        setIntentF([]);
                        close();
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </ChipDropdown>

            {/* Competitors (multi) */}
            <ChipDropdown label="Competitors" badge={compF.length ? compF.length : undefined} width={360}>
              {(close) => (
                <div className="space-y-2">
                  {allComps.length === 0 && <div className="text-sm text-gray-500">No competitors found.</div>}
                  {allComps.map((c) => (
                    <label key={c} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={compF.includes(c)}
                        onChange={(e) => setCompF((arr) => (e.target.checked ? [...arr, c] : arr.filter((x) => x !== c)))}
                      />
                      <span className="inline-flex items-center gap-2">
                        <Avatar domain={c} /> {c}
                      </span>
                    </label>
                  ))}
                  <div className="pt-2">
                    <button
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer"
                      style={{ borderColor: TK.border }}
                      onClick={() => {
                        setCompF([]);
                        close();
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </ChipDropdown>

            {/* Thresholds */}
            <ChipDropdown label={`Vol ≥ ${fmtInt(minVol)}`}>
              {(close) => (
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={50000}
                    step={1000}
                    value={minVol}
                    onChange={(e) => setMinVol(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600">Current: {fmtInt(minVol)}</div>
                  <div className="pt-2 flex items-center gap-2">
                    <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} onClick={() => setMinVol(0)}>
                      Reset
                    </button>
                    <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} onClick={close}>
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </ChipDropdown>

            <ChipDropdown label={`Δ ≥ ${minGap}`}>
              {(close) => (
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={minGap}
                    onChange={(e) => setMinGap(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600">Current: {minGap}</div>
                  <div className="pt-2 flex items-center gap-2">
                    <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} onClick={() => setMinGap(0)}>
                      Reset
                    </button>
                    <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} onClick={close}>
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </ChipDropdown>

            {/* Exclude Tracked toggle */}
            <label className="ml-1 inline-flex cursor-pointer select-none items-center gap-2 text-sm">
              <input type="checkbox" checked={excludeTracked} onChange={(e) => setExcludeTracked(e.target.checked)} className="h-4 w-4 rounded border" style={{ borderColor: TK.border }} />
              <span>Exclude tracked</span>
            </label>

            {/* Search */}
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: TK.brand }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search keyword or URL…"
                className="h-8 w-[260px] rounded border pl-7 pr-2 text-sm outline-none focus:ring-2 cursor-text"
                style={{ borderColor: TK.border }}
              />
            </div>
          </div>

          {/* Bulk bar (appears when selected) */}
          {selectedIds.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-2" style={{ borderColor: TK.border, background: "#D2EFFF" }}>
              <div className="text-sm" style={{ color: TK.text }}>
                <strong>{selectedIds.length}</strong> selected
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="cursor-pointer rounded border px-3 py-1.5 text-sm text-white" style={{ backgroundColor: TK.brand, borderColor: TK.brand }} title="Add to Tracking">
                  <BadgePlus className="mr-1 inline h-4 w-4" />
                  Add to Tracking
                </button>
                <button className="cursor-pointer rounded border px-3 py-1.5 text-sm" style={{ borderColor: TK.border }} title="Assign Task">
                  <ClipboardList className="mr-1 inline h-4 w-4" />
                  Assign Task
                </button>
                <button className="cursor-pointer rounded border px-3 py-1.5 text-sm text-red-600" style={{ borderColor: TK.border }} onClick={() => setSelected({})} title="Clear selection">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.border }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <tr>
                  {visibleColumns.map((c) => (
                    <th
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c.key as ColumnKey) }}
                      className="px-3 py-2 text-left text-sm font-semibold text-gray-600"
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer"
                            checked={someVisibleSelected ? true : allVisibleSelected}
                            onChange={(e) => {
                              const on = e.target.checked;
                              const patch: Record<string, boolean> = {};
                              visibleIds.forEach((id) => (patch[id] = !!on));
                              setSelected((s) => ({ ...s, ...patch }));
                            }}
                            aria-label="Select visible rows"
                          />
                        </div>
                      ) : c.key === "expander" || !c.sortable ? (
                        <span className="relative inline-block">{c.label}</span>
                      ) : (
                        <button className="relative inline-flex items-center gap-1 hover:text-gray-900 cursor-pointer" onClick={() => toggleSort(c.key as SortKey)} title={`Sort by ${c.label}`}>
                          <span>{c.label}</span>
                          {sortKey === (c.key as any) ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-gray-400" />}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => {
                  const isSel = !!selected[r.id];
                  const isExp = !!expanded[r.id];
                  const yr = r.yourRank == null ? null : r.yourRank;
                  const br = r.bestCompetitorRank == null ? null : r.bestCompetitorRank;
                  const liftVal = (r as any).lift as number;
                  const gapVal = (r as any).rankGap as number;

                  return (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-[#F5F7FA]">
                        {visibleCols.select !== false && (
                          <td className="px-3 py-2" style={stickyStyle("select") as any}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer"
                              checked={isSel}
                              onChange={(e) => setSelected((s) => ({ ...s, [r.id]: !!e.target.checked }))}
                              aria-label={`Select ${r.keyword}`}
                            />
                          </td>
                        )}

                        {visibleCols.expander !== false && (
                          <td className="px-3 py-2" style={stickyStyle("expander") as any}>
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                              className="rounded-md border p-1 hover:bg-gray-100 cursor-pointer"
                              style={{ borderColor: TK.border }}
                              aria-label={isExp ? "Collapse" : "Expand"}
                              title={isExp ? "Collapse" : "Expand"}
                            >
                              {isExp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                        )}

                        {visibleCols.keyword !== false && (
                          <td className="px-3 py-2" style={stickyStyle("keyword") as any}>
                            <button className="font-medium underline cursor-pointer" style={{ color: TK.linkBlue }} title="Open keyword" onClick={openDrawer}>
                              {r.keyword}
                            </button>
                          </td>
                        )}

                        {visibleCols.volume !== false && <td className="px-3 py-2">{fmtInt(r.volume)}</td>}

                        {visibleCols.intent !== false && <td className="px-3 py-2">{r.intent}</td>}

                        {visibleCols.yourRank !== false && (
                          <td className="px-3 py-2">
                            {yr == null ? (
                              <span className="text-red-600">Not Ranked</span>
                            ) : (
                              <>
                                #{yr}
                                {bucketText(r.yourRank) && <span className="text-gray-600"> · {bucketText(r.yourRank)}</span>}
                              </>
                            )}
                          </td>
                        )}

                        {visibleCols.bestRank !== false && <td className="px-3 py-2">{br == null ? "—" : `#${br}`}</td>}

                        {visibleCols.rankingComp !== false && (
                          <td className="px-3 py-2">
                            {r.bestCompetitorDomain ? (
                              <span className="inline-flex items-center gap-2">
                                <Avatar domain={r.bestCompetitorDomain} /> {r.bestCompetitorDomain}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}

                        {visibleCols.landing !== false && (
                          <td className="px-3 py-2">
                            {r.yourUrl ? (
                              <a
                                // href={r.yourUrl}
                                onClick={openLanding}
                                className="max-w-[320px] truncate underline cursor-pointer"
                                style={{ color: TK.linkBlue }}
                                title={r.yourUrl}
                              >
                                {r.yourUrl} <ExternalLink className="inline h-4 w-4 align-[-2px]" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}

                        {visibleCols.rankGap !== false && <td className="px-3 py-2">{gapVal}</td>}

                        {visibleCols.lift !== false && (
                          <td className="px-3 py-2" title={`Projected @Top ${target} − Current`}>
                            {fmtInt(liftVal)}
                          </td>
                        )}

                        {visibleCols.opp !== false && (
                          <td className="px-3 py-2">
                            {plan === "free" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs" style={{ borderColor: TK.border }}>
                                <Lock className="h-3.5 w-3.5" style={{ color: TK.brand }} /> Score (Locked)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs" style={{ borderColor: TK.border }}>
                                {oppLabel(liftVal)}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleCols.actions !== false && (
                          <td className="px-3 py-2">
                            <div className="inline-flex items-center gap-1.5">
                              <button className="rounded p-1 hover:bg-gray-100 cursor-pointer" title="Open SERP" style={{ color: TK.brand }} onClick={openSerp}>
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="rounded p-1 hover:bg-gray-100 cursor-pointer" title="Add to Tracking" style={{ color: TK.brand }} disabled={r.isTracked}>
                                <BadgePlus className="h-4 w-4" />
                              </button>
                              <button className="rounded p-1 hover:bg-gray-100 cursor-pointer" title="Assign Task" style={{ color: TK.brand }}>
                                <ClipboardList className="h-4 w-4" />
                              </button>
                              {r.yourUrl && (
                                <button className="rounded p-1 hover:bg-gray-100 cursor-pointer" title="Open Page" style={{ color: TK.brand }}>
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>

                      {isExp && (
                        <tr>
                          <td className="px-3 py-2" colSpan={visibleColumns.length}>
                            <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2" style={{ borderColor: TK.border, background: TK.appBg }}>
                              {/* Competitor Bars — minimal hover effect + smart tooltip */}
                              <div>
                                <div className="mb-2 text-sm text-gray-500">Competitor Visibility (higher bars = better ranks)</div>
                                <div style={{ height: 180 }}>
                                  {(() => {
                                    const yourEff = r.yourRank == null || r.yourRank > 100 ? 101 : r.yourRank;
                                    const data = (r.competitors || []).map((c) => {
                                      const rank = c.rank == null || c.rank > 100 ? null : c.rank;
                                      const compEff = rank == null ? 101 : rank;
                                      const gap = yourEff - compEff; // +ve → we’re behind
                                      return {
                                        domain: c.domain,
                                        score: Math.max(0, 101 - compEff), // 100 at #1 … 0 at >100
                                        rank,
                                        gap,
                                      };
                                    });
                                    const hIdx = compHoverIdx[r.id] ?? null;
                                    return (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data}>
                                          <CartesianGrid stroke={TK.borderLight} vertical={false} />
                                          <XAxis dataKey="domain" />
                                          <YAxis domain={[0, 100]} hide />
                                          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                            {data.map((d, i) => (
                                              <Cell
                                                key={i}
                                                fill={i === hIdx ? "#2B87FF" : TK.linkBlue}
                                                fillOpacity={i === hIdx ? 0.9 : 1}
                                                style={{ transition: "fill 120ms ease, fill-opacity 120ms ease" }}
                                                onMouseEnter={() => setCompHoverIdx((m) => ({ ...m, [r.id]: i }))}
                                                onMouseLeave={() => setCompHoverIdx((m) => ({ ...m, [r.id]: null }))}
                                              />
                                            ))}
                                          </Bar>
                                          {/* Smart popover on hover — show Competitor Rank + Gap; no bar overshadow */}
                                          <RTooltip cursor={{ fill: "transparent" }} content={(p) => <CompTooltip {...p} />} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* SERP Snapshot */}
                              <div>
                                <div className="mb-2 text-sm text-gray-500">SERP Snapshot</div>
                                <ol className="list-decimal pl-5 text-sm">
                                  {(r.serpPreview || []).slice(0, plan === "free" ? 3 : 5).map((s, i) => (
                                    <li key={i} className="mb-1">
                                      <span className="mr-2 rounded-full border px-2 py-[1px] text-xs" style={{ borderColor: TK.border }}>
                                        #{s.rank}
                                      </span>
                                      <strong>{s.title}</strong>{" "}
                                      <span className="text-gray-500">· {s.domain}</span>
                                    </li>
                                  ))}
                                </ol>
                                <div className="mt-3 flex items-center gap-2">
                                  <button className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} title="Add to Tracking">
                                    <BadgePlus className="h-4 w-4" style={{ color: TK.brand }} />
                                    Track
                                  </button>
                                  <button className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} title="Assign Task">
                                    <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
                                    Task
                                  </button>
                                  <button className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer" style={{ borderColor: TK.border }} title="Open SERP">
                                    <Eye className="h-4 w-4" style={{ color: TK.brand }} />
                                    SERP
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── DEMO (optional) ─────────────────────────── */
const demoRows: GapRow[] = [
  {
    id: "1",
    keyword: "seo tools",
    volume: 33100,
    intent: "Commercial",
    yourRank: null,
    bestCompetitorRank: 3,
    bestCompetitorDomain: "ahrefs.com",
    yourUrl: null,
    competitors: [
      { domain: "ahrefs.com", rank: 3 },
      { domain: "semrush.com", rank: 5 },
      { domain: "moz.com", rank: 8 },
    ],
    serpPreview: [
      { rank: 1, title: "Best SEO Tools", url: "#", domain: "ahrefs.com" },
      { rank: 2, title: "All‑in‑one SEO", url: "#", domain: "semrush.com" },
      { rank: 3, title: "Moz tools", url: "#", domain: "moz.com" },
      { rank: 4, title: "Wix SEO", url: "#", domain: "wix.com" },
      { rank: 5, title: "Google tools", url: "#", domain: "google.com" },
    ],
    isTracked: false,
  },
  {
    id: "2",
    keyword: "local seo company",
    volume: 22200,
    intent: "Commercial",
    yourRank: null,
    bestCompetitorRank: 9,
    bestCompetitorDomain: "semrush.com",
    yourUrl: null,
    competitors: [{ domain: "semrush.com", rank: 9 }],
    serpPreview: [],
    isTracked: false,
  },
  {
    id: "3",
    keyword: "keyword research",
    volume: 33100,
    intent: "Informational",
    yourRank: 7,
    bestCompetitorRank: 3,
    bestCompetitorDomain: "ahrefs.com",
    yourUrl: "/blog/keyword-research-guide",
    competitors: [
      { domain: "ahrefs.com", rank: 3 },
      { domain: "semrush.com", rank: 5 },
    ],
    serpPreview: [
      { rank: 1, title: "Keyword Research", url: "#", domain: "ahrefs.com" },
      { rank: 2, title: "Semrush Research", url: "#", domain: "semrush.com" },
      { rank: 3, title: "Moz Guide", url: "#", domain: "moz.com" },
      { rank: 4, title: "Backlinko", url: "#", domain: "backlinko.com" },
      { rank: 5, title: "Google Planner", url: "#", domain: "google.com" },
    ],
    isTracked: true,
  },
  {
    id: "4",
    keyword: "rank tracker",
    volume: 12100,
    intent: "Informational",
    yourRank: 12,
    bestCompetitorRank: 6,
    bestCompetitorDomain: "semrush.com",
    yourUrl: "/keywords/rank-tracker",
    competitors: [
      { domain: "semrush.com", rank: 6 },
      { domain: "ahrefs.com", rank: 8 },
    ],
    serpPreview: [],
    isTracked: false,
  },
];

export default function GapResultsTableSectionApp() {
  return <GapResultsTableSection plan="free" scope={{ device: "desktop", locationISO: "IN" }} rows={demoRows} />;
}
