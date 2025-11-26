"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Settings,
  MoreHorizontal,
  ChevronDown,
  Search as SearchIcon,
  SlidersHorizontal,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  BarChart3,
  Info as InfoIcon,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceDot,
} from "recharts";
import AlertRuleEngineDemo from "./drawers/AlertRuleEngine";
import Demo_ViewTrendModal from "./drawers/ViewTrendModal";
import SerpSnapshotViewerDemo from "./drawers/SerpSnapshotViewer";
/**
 * Wranker • Competitor Tracker — Section 2: Page Activity Monitor
 * - Title + action bar (Track New Page, Export, Manage Alerts)
 * - Sticky toolbar (search, filters, sort, rows/page or infinite)
 * - Table (URL, Rank, Word Count, KW Count, SERP, Change %, Last Seen, Actions)
 * - Trend modal (Rank + Word Count + FS markers)
 * - Track Page modal (inline; mock validation)
 * - Page Alerts modal (inline; mock)
 * - CSV export; selection bar; mock data generator; infinite scroll sentinel
 *
 * Deps: react, tailwind, lucide-react, recharts
 */

/* ------------------------------ TOKENS ------------------------------ */
const TK = {
  brand: "#1090D0", // You (context)
  valueBlue: "#0077FF", // Competitor
  text: "#282829",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  ok: "#16A34A",
  warn: "#F59E0B",
  danger: "#F04438",
  pastel: "#D9EEF8",
  radius: 6,
} as const;

/* ------------------------------ HELPERS ------------------------------ */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
const nf = (n: number) => new Intl.NumberFormat().format(n);
const kfmt = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : Math.abs(n) >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;
const pf = (n: number, d = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)}%`;
const clamp = (v: number, a = -100, b = 100) => Math.max(a, Math.min(b, v));
const shortPath = (u: string) => (u.length <= 42 ? u : `${u.slice(0, 22)}…${u.slice(-18)}`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

/* ------------------------------ TYPES ------------------------------ */
type SerpFeature = "FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES";
type PageType = "Blog" | "Product" | "Service" | "Other";
type Snapshot = { d: string; rank: number; wc: number; fs: 0 | 1 };
type TrackedPage = {
  id: string;
  url: string;
  fullUrl: string;
  title?: string;
  pageType: PageType;
  rank: number;
  prevRank: number;
  wordCount: number;
  prevWordCount: number;
  kwCount: number;
  prevKwCount: number;
  serp: SerpFeature[];
  changePct: number;
  lastSeen: string;
  series: Snapshot[];
  alertsActive?: boolean;
  notes?: string;
};

/* ------------------------------ POP PRIMS ------------------------------ */
function InfoPopover({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <span className="relative inline-flex items-center align-middle group cursor-help">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={classNames(
          "invisible group-hover:visible absolute z-50 top-full mt-1 w-80 rounded-md border bg-white p-2 text-xs leading-snug text-[#111827] shadow",
          align === "right" ? "right-0" : "left-0"
        )}
        style={{ borderColor: TK.border }}
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------ MINI SPARK ------------------------------ */
function Spark({
  series,
  w = 90,
  h = 24,
  kind,
}: {
  series: number[];
  w?: number;
  h?: number;
  kind: "rank" | "wc";
}) {
  const pad = 2;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const sx = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
  const sy = (v: number) => {
    if (max === min) return h / 2;
    const t = (v - min) / (max - min);
    return kind === "rank" ? pad + t * (h - pad * 2) : h - pad - t * (h - pad * 2);
  };
  const d = series.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke={TK.valueBlue} strokeWidth={1.75} />
    </svg>
  );
}

/* ------------------------------ EXPORT MENU ------------------------------ */
function ExportMenu({ onCSV }: { onCSV: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
        style={{ borderColor: TK.border, color: TK.text }}
        onClick={() => setOpen((s) => !s)}
        title="Export"
      >
        <Upload size={16} />
        Export
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[180px] rounded-md border bg-white shadow" style={{ borderColor: TK.border }}>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { onCSV(); setOpen(false); }}>
            Export CSV (respects filters)
          </button>
          <button className="block w-full px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed">
            Export PDF <span className="ml-1 text-xs">(Pro)</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ MODALS ------------------------------ */
function ModalShell({
  open,
  title,
  width = 720,
  onClose,
  children,
}: React.PropsWithChildren<{ open: boolean; title: string; width?: number; onClose: () => void }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 left-0 top-10 mx-auto bg-white rounded-md shadow-xl border" style={{ width, borderColor: TK.border }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.border }}>
          <div className="text-[16px] font-semibold">{title}</div>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function TrackPageModal({
  open,
  competitors,
  defaultComp,
  onClose,
  onTrack,
}: {
  open: boolean;
  competitors: string[];
  defaultComp: string;
  onClose: () => void;
  onTrack: (payload: { competitor: string; url: string; label?: string; type: PageType; notes?: string }) => void;
}) {
  const [competitor, setCompetitor] = useState(defaultComp);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<PageType>("Blog");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCompetitor(defaultComp);
      setUrl("");
      setLabel("");
      setType("Blog");
      setNotes("");
      setErr(null);
    }
  }, [open, defaultComp]);

  function validate() {
    if (!url.trim()) return setErr("Page URL is required.");
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${competitor}${url.startsWith("/") ? "" : "/"}${url}`);
      if (!u.hostname.endsWith(competitor)) return setErr("URL must belong to the selected competitor domain.");
    } catch {
      return setErr("Please enter a valid URL.");
    }
    setErr(null);
    return true;
  }

  return (
    <ModalShell open={open} title="➕ Track Competitor Page" onClose={onClose} width={520}>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium">Competitor</span>
          <div className="relative">
            <select
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              className="w-full h-9 rounded-md border px-3"
              style={{ borderColor: TK.border }}
            >
              {competitors.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 inline-flex items-center gap-1 font-medium">Page URL <span className="text-red-500">*</span></span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={`https://${competitor}/path-or-/path`}
            className="w-full h-9 rounded-md border px-3"
            style={{ borderColor: TK.border }}
          />
          {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
        </label>

        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium">Label / Nickname (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., SEO guide page"
            className="w-full h-9 rounded-md border px-3"
            style={{ borderColor: TK.border }}
          />
        </label>

        <div className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium">Page Type</span>
          <div className="flex flex-wrap gap-2">
            {(["Blog", "Product", "Service", "Other"] as PageType[]).map((t) => (
              <button
                key={t}
                className={classNames(
                  "h-8 px-3 rounded-md border text-sm",
                  type === t ? "bg-white" : "bg-[#F5F7FA]",
                  "hover:bg-[#E5E7EB]"
                )}
                style={{ borderColor: TK.border }}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium">Internal Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Why track this page?"
            className="w-full rounded-md border px-3 py-2"
            style={{ borderColor: TK.border }}
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button className="h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="h-9 px-3 rounded-md text-sm text-white"
            style={{ background: TK.brand }}
            onClick={() => {
              if (!validate()) return;
              const normalized = url.startsWith("http") ? url : `https://${competitor}${url.startsWith("/") ? "" : "/"}${url}`;
              onTrack({ competitor, url: normalized, label: label || undefined, type, notes: notes || undefined });
              onClose();
              setTimeout(() => {
                alert("Page is now being tracked.");
              }, 0);
            }}
          >
            ✅ Track Page
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function PageAlertsModal({
  open,
  page,
  onClose,
  onSave,
}: {
  open: boolean;
  page?: TrackedPage;
  onClose: () => void;
  onSave: (rules: { rankDelta: number; wcDevPct: number; fsGainLoss: boolean; brokenLink: boolean }) => void;
}) {
  const [rankDelta, setRankDelta] = useState(3);
  const [wcDev, setWcDev] = useState(10);
  const [fsGL, setFsGL] = useState(true);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (open) {
      setRankDelta(3);
      setWcDev(10);
      setFsGL(true);
      setBroken(false);
    }
  }, [open]);

  return (
    <ModalShell open={open} onClose={onClose} title={`⚙️ Page Alert Rules — ${page?.url || ""}`} width={520}>
      <div className="space-y-3 text-sm">
        <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
          <div className="font-medium mb-2">Rank change</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-20 h-9 rounded-md border px-2"
              style={{ borderColor: TK.border }}
              value={rankDelta}
              onChange={(e) => setRankDelta(Math.max(1, Math.min(50, Number(e.target.value))))}
            />
            <span>positions</span>
          </div>
        </div>

        <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
          <div className="font-medium mb-2">Word count deviation</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-20 h-9 rounded-md border px-2"
              style={{ borderColor: TK.border }}
              value={wcDev}
              onChange={(e) => setWcDev(Math.max(1, Math.min(90, Number(e.target.value))))}
            />
            <span>% change</span>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={fsGL} onChange={(e) => setFsGL(e.target.checked)} />
          <span>Alert if Featured Snippet is gained or lost</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={broken} onChange={(e) => setBroken(e.target.checked)} />
          <span>Alert if target link becomes broken</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button className="h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="h-9 px-3 rounded-md text-sm text-white"
            style={{ background: TK.brand }}
            onClick={() => {
              onSave({ rankDelta, wcDevPct: wcDev, fsGainLoss: fsGL, brokenLink: broken });
              onClose();
              setTimeout(() => alert("Alert rules saved"), 0);
            }}
          >
            Save Rules
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function TrendModal({
  open,
  page,
  onClose,
}: {
  open: boolean;
  page?: TrackedPage;
  onClose: () => void;
}) {
  const [showRank, setShowRank] = useState(true);
  const [showWC, setShowWC] = useState(true);
  const [showFS, setShowFS] = useState(true);

  useEffect(() => {
    if (open) {
      setShowRank(true);
      setShowWC(true);
      setShowFS(true);
    }
  }, [open]);

  const data = (page?.series || []).map((s) => ({
    date: s.d,
    rank: s.rank,
    wc: s.wc,
    fs: s.fs,
  }));

  return (
    <ModalShell open={open} onClose={onClose} title={`📈 Page Activity Trends — ${page?.url ?? ""}`}>
      {!page ? (
        <div className="grid h-[200px] place-items-center text-sm text-[#6B7280]">No data</div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1" style={{ borderColor: TK.border }}>
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={showRank} onChange={(e) => setShowRank(e.target.checked)} />
                Rank (line)
              </label>
              <span className="inline-block w-px h-4 bg-[#E5E7EB]" />
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={showWC} onChange={(e) => setShowWC(e.target.checked)} />
                Word Count (area)
              </label>
              <span className="inline-block w-px h-4 bg-[#E5E7EB]" />
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={showFS} onChange={(e) => setShowFS(e.target.checked)} />
                FS markers
              </label>
            </div>
            <div className="text-[#6B7280]">Date: Last 30 days</div>
          </div>

          <div className="h-[320px] rounded-md border p-2" style={{ borderColor: TK.border }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={TK.border} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: TK.muted }} />
                <YAxis
                  yAxisId="r"
                  domain={[100, 1]}
                  tick={{ fontSize: 12, fill: TK.muted }}
                  label={{ value: "Rank", angle: -90, position: "insideLeft", offset: 8, fill: TK.muted }}
                />
                <YAxis
                  yAxisId="w"
                  orientation="right"
                  tick={{ fontSize: 12, fill: TK.muted }}
                  tickFormatter={(v) => kfmt(v as number)}
                  label={{ value: "Word Count", angle: 90, position: "insideRight", offset: 8, fill: TK.muted }}
                />
                <RTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const row = payload.find(Boolean)?.payload as any;
                    return (
                      <div
                        className="rounded-md border bg-white p-2 text-xs shadow"
                        style={{ borderColor: TK.border, minWidth: 180 }}
                      >
                        <div className="font-medium text-[#111827]">{label}</div>
                        {showRank && <div>Rank: <b>#{row.rank}</b></div>}
                        {showWC && <div>Word Count: <b>{nf(row.wc)}</b></div>}
                        {showFS && <div>FS: <b>{row.fs ? "Yes" : "No"}</b></div>}
                      </div>
                    );
                  }}
                />
                {showWC && (
                  <Area
                    yAxisId="w"
                    type="monotone"
                    dataKey="wc"
                    fill={TK.valueBlue}
                    stroke={TK.valueBlue}
                    fillOpacity={0.12}
                    strokeWidth={1.5}
                  />
                )}
                {showRank && <Line yAxisId="r" type="monotone" dataKey="rank" stroke={TK.brand} strokeWidth={2} dot={false} />}
                {showFS &&
                  data
                    .filter((d) => d.fs)
                    .map((d, i) => <ReferenceDot key={i} x={d.date} y={d.rank} yAxisId="r" r={3} fill={TK.warn} stroke="#fff" strokeWidth={1} />)}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => alert("Create Task (prefilled)")}>
              Create Task
            </button>
            <button className="h-9 px-3 rounded-md text-sm text-white" style={{ background: TK.brand }} onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ------------------------------ MAIN SECTION ------------------------------ */
type ChangeType = "gains" | "losses" | "stable" | "fs" | "content";
type SortKey = "change" | "rank" | "wcDelta" | "kwDelta" | "lastSeen";
type SortDir = "asc" | "desc";

export default function PageActivityMonitorSectionMock() {
  const competitors = ["comp1.com", "comp2.io", "alpha.dev"];
  const currentCompetitor = "comp1.com";

  const [rows, setRows] = useState<TrackedPage[]>(() => makeRows(70, currentCompetitor));

  const [trackOpen, setTrackOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsPage, setAlertsPage] = useState<TrackedPage | undefined>(undefined);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendPage, setTrendPage] = useState<TrackedPage | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [changeFilters, setChangeFilters] = useState<Set<ChangeType>>(new Set());
  const [serpFilters, setSerpFilters] = useState<Set<SerpFeature>>(new Set());
  const [typeFilters, setTypeFilters] = useState<Set<PageType>>(new Set());
  const [minKW, setMinKW] = useState(0);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("change");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [infinite, setInfinite] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [visibleCount, setVisibleCount] = useState(60);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [drawerRow, setDrawerRow] = useState(false);
  const [drawerTrend, setDrawerTrend] = useState(false);
  const [drawerSerp, setSerp] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    const openTrends = () => {
    setDrawerTrend(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeTrends = () => {
    setDrawerTrend(false);
  };

  
    const openSerp = () => {
         setSerp(true);
    };
  
    // This function will handle closing the drawer
    const closeSerp = () => {
      setSerp(false);
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

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 2);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("pam-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((v) => Math.min(v + 60, rows.length));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, rows.length]);

  const filtered = useMemo(() => {
    const hasChangeFilter = changeFilters.size > 0;
    const hasSerpFilter = serpFilters.size > 0;
    const hasTypeFilter = typeFilters.size > 0;

    return rows.filter((r) => {
      if (alertsOnly && !r.alertsActive) return false;
      if (query) {
        const q = query.toLowerCase();
        const hitTitle = (r.title || "").toLowerCase().includes(q);
        const hitUrl = r.url.toLowerCase().includes(q);
        const hitKW = r.kwCount >= Number(q) && /^\d+$/.test(q);
        if (!hitTitle && !hitUrl && !hitKW) return false;
      }
      if (r.kwCount < minKW) return false;

      if (hasChangeFilter) {
        const gain = r.changePct > 2;
        const loss = r.changePct < -2;
        const stable = Math.abs(r.changePct) <= 2;
        const fsActive = r.serp.includes("FS");
        const contentChanged = Math.abs(r.wordCount - r.prevWordCount) >= 100;
        const passes =
          (changeFilters.has("gains") && gain) ||
          (changeFilters.has("losses") && loss) ||
          (changeFilters.has("stable") && stable) ||
          (changeFilters.has("fs") && fsActive) ||
          (changeFilters.has("content") && contentChanged);
        if (!passes) return false;
      }

      if (hasSerpFilter) {
        const passes = Array.from(serpFilters).every((f) => r.serp.includes(f));
        if (!passes) return false;
      }
      if (hasTypeFilter && !typeFilters.has(r.pageType)) return false;
      return true;
    });
  }, [rows, alertsOnly, query, minKW, changeFilters, serpFilters, typeFilters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: TrackedPage) => {
      switch (sortBy) {
        case "change":
          return r.changePct;
        case "rank":
          return r.rank;
        case "wcDelta":
          return r.wordCount - r.prevWordCount;
        case "kwDelta":
          return r.kwCount - r.prevKwCount;
        case "lastSeen":
          return new Date(r.lastSeen).getTime();
        default:
          return r.changePct;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av === bv) return b.kwCount - a.kwCount || a.url.localeCompare(b.url);
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const windowed = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  const pageIds = windowed.map((r) => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);

  function toggleSort(k: SortKey) {
    if (sortBy !== k) {
      setSortBy(k);
      setSortDir(k === "rank" ? "asc" : "desc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  function exportCSV(onlySelected = false) {
    const src = onlySelected ? sorted.filter((r) => selected[r.id]) : sorted;
    const hdr = [
      "URL",
      "Title",
      "PageType",
      "Rank",
      "RankDelta",
      "WordCount",
      "WordCountDelta",
      "KWCount",
      "TopFeatures",
      "ChangePct",
      "LastSeen",
      "AlertsActive",
    ];
    const lines = src.map((r) => {
      const deltaR = r.rank - r.prevRank;
      const deltaWC = r.wordCount - r.prevWordCount;
      return [
        r.fullUrl,
        r.title || "",
        r.pageType,
        r.rank,
        deltaR > 0 ? `+${deltaR}` : `${deltaR}`,
        r.wordCount,
        deltaWC > 0 ? `+${deltaWC}` : `${deltaWC}`,
        r.kwCount,
        r.serp.join("|"),
        `${r.changePct.toFixed(1)}%`,
        r.lastSeen,
        r.alertsActive ? "1" : "0",
      ]
        .map((x) => JSON.stringify(String(x)))
        .join(",");
    });
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "pages-selected.csv" : "pages.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openTrend(r: TrackedPage) {
    setTrendPage(r);
    setTrendOpen(true);
  }
  function openAlerts(r: TrackedPage) {
    setAlertsPage(r);
    setAlertsOpen(true);
  }

  return (
    <section className="w-full mt-4">
                                    {drawerRow && (
                          <Drawer title="Drawer" onClose={closeDrawer}>
                            <AlertRuleEngineDemo   />
                          </Drawer>
                        )}
                         {drawerTrend && (
                            <Demo_ViewTrendModal  onClose={closeTrends} />
                        )}
                         {drawerSerp && (
                         <Drawer title="Drawer" onClose={closeSerp}>
                             <SerpSnapshotViewerDemo   />
                          </Drawer>
                         )}
      {/* Header + Action bar */}
      <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TK.border, background: "#FFFFFF" }}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md" style={{ background: TK.pastel, border: `1px solid ${TK.border}` }}>
              <BarChart3 size={16} style={{ color: TK.valueBlue }} />
            </span>
            <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>Page Activity Monitor</h3>
            <span className="ml-2 hidden items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280] md:inline-flex">
              <InfoIcon size={12} /> Track rank/content/SERP changes of competitor pages
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white"
              style={{ background: TK.brand }}
              onClick={() => setTrackOpen(true)}
            >
              <Plus size={16} /> Track New Page
            </button>
            <ExportMenu onCSV={() => exportCSV(false)} />
            <button
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
              style={{ borderColor: TK.border, color: TK.text }}
              onClick={() => alert("Manage Alerts (bulk)")}
            >
              <SlidersHorizontal size={16} /> Manage Alerts
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-md border" style={{ borderColor: TK.border, background: TK.chipBg }}>
              <Settings size={16} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-md border" style={{ borderColor: TK.border, background: TK.chipBg }}>
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Scroll container with sticky toolbar + header + table */}
        <div ref={scrollerRef} className="mt-2 max-h-[600px] overflow-auto rounded-[6px] border" style={{ borderColor: TK.border }}>
          {/* Sticky toolbar */}
          <div
            className={classNames(
              "sticky top-0 z-20 bg-white px-3 py-2 border-b",
              scrolled ? "shadow-sm" : ""
            )}
            style={{ borderColor: TK.border }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search page or keyword…"
                  className="h-9 w-[260px] rounded-md border pl-7 pr-2 text-sm"
                  style={{ borderColor: TK.border }}
                />
              </div>

              {/* Change filters */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">Change:</span>
                {([
                  ["gains", "Gains"],
                  ["losses", "Losses"],
                  ["stable", "Stable"],
                  ["fs", "FS Only"],
                  ["content", "Content Changed"],
                ] as [ChangeType, string][]).map(([k, label]) => {
                  const active = changeFilters.has(k);
                  return (
                    <button
                      key={k}
                      className={classNames("h-8 px-3 rounded-full border text-sm", active ? "font-semibold bg-white" : "bg-[#F5F7FA]")}
                      style={{ borderColor: TK.border }}
                      onClick={() => {
                        setChangeFilters((s) => {
                          const next = new Set(s);
                          active ? next.delete(k) : next.add(k);
                          return next;
                        });
                        if (!infinite) setPage(1);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* SERP features */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">SERP:</span>
                {[
                  ["FS", "🔥"],
                  ["PAA", "💡"],
                  ["IMAGE", "🖼️"],
                  ["SITELINKS", "⭐"],
                  ["VIDEO", "🎥"],
                  ["TOP_STORIES", "📰"],
                ].map(([k, emoji]) => {
                  const active = serpFilters.has(k as SerpFeature);
                  return (
                    <button
                      key={k}
                      className={classNames("h-8 px-2 rounded-md border text-sm", active ? "bg-white" : "bg-[#F5F7FA]")}
                      style={{ borderColor: TK.border }}
                      title={k}
                      onClick={() => {
                        setSerpFilters((s) => {
                          const next = new Set(s);
                          active ? next.delete(k as SerpFeature) : next.add(k as SerpFeature);
                          return next;
                        });
                        if (!infinite) setPage(1);
                      }}
                    >
                      <span className="text-base">{emoji}</span>
                    </button>
                  );
                })}
              </div>

              {/* Page type */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">Type:</span>
                {(["Blog", "Product", "Service", "Other"] as PageType[]).map((t) => {
                  const active = typeFilters.has(t);
                  return (
                    <button
                      key={t}
                      className={classNames("h-8 px-3 rounded-full border text-sm", active ? "bg-white" : "bg-[#F5F7FA]")}
                      style={{ borderColor: TK.border }}
                      onClick={() => {
                        setTypeFilters((s) => {
                          const next = new Set(s);
                          active ? next.delete(t) : next.add(t);
                          return next;
                        });
                        if (!infinite) setPage(1);
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Min KW slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">Min KW</span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={minKW}
                  onChange={(e) => {
                    setMinKW(Number(e.target.value));
                    if (!infinite) setPage(1);
                  }}
                />
                <span className="w-10 text-right text-xs">{minKW}</span>
              </div>

              {/* Alerts only */}
              <label className="ml-2 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={alertsOnly} onChange={(e) => setAlertsOnly(e.target.checked)} />
                Only with alerts
              </label>

              {/* Reset */}
              <button
                className="ml-1 text-sm underline text-[#6B7280] hover:text-[#374151]"
                onClick={() => {
                  setQuery("");
                  setChangeFilters(new Set());
                  setSerpFilters(new Set());
                  setTypeFilters(new Set());
                  setMinKW(0);
                  setAlertsOnly(false);
                  setSortBy("change");
                  setSortDir("desc");
                }}
              >
                Reset
              </button>

              {/* Sort + rows */}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-[#6B7280]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="h-9 rounded-md border px-2"
                    style={{ borderColor: TK.border }}
                  >
                    <option value="change">Change %</option>
                    <option value="rank">Rank</option>
                    <option value="wcDelta">Word Count Δ</option>
                    <option value="kwDelta">KW Count Δ</option>
                    <option value="lastSeen">Last Seen</option>
                  </select>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-md border"
                    style={{ borderColor: TK.border, background: TK.chipBg }}
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    title="Toggle sort direction"
                  >
                    {sortDir === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={infinite} onChange={(e) => { setInfinite(e.target.checked); if (e.target.checked) setVisibleCount(60); }} />
                    Infinite
                  </label>
                  {!infinite && (
                    <>
                      <select
                        value={String(pageSize)}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="h-9 rounded-md border px-2 text-sm"
                        style={{ borderColor: TK.border }}
                      >
                        {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
                      </select>
                      <div className="inline-flex items-center gap-1">
                        <button className="grid h-9 w-9 place-items-center rounded-md border" style={{ borderColor: TK.border }} onClick={() => setPage(1)} title="First">
                          <ChevronLeft size={16} />
                        </button>
                        <button className="grid h-9 w-9 place-items-center rounded-md border" style={{ borderColor: TK.border }} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Prev">
                          <ChevronLeft size={16} />
                        </button>
                        <div className="px-2 text-sm tabular-nums">{page}</div>
                        <button
                          className="grid h-9 w-9 place-items-center rounded-md border"
                          style={{ borderColor: TK.border }}
                          onClick={() => setPage((p) => (p * pageSize >= sorted.length ? p : p + 1))}
                          title="Next"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead className="sticky top-[48px] z-10 bg-white" style={{ boxShadow: "inset 0 -1px 0 " + TK.border }}>
              <tr className="text-left">
                <ThCheckbox
                  checked={allSelected}
                  onChange={() => {
                    const next = !allSelected;
                    setSelected((prev) => {
                      const map = { ...prev };
                      pageIds.forEach((id) => (map[id] = next));
                      return map;
                    });
                  }}
                />
                <Th label="URL" width={360} info="Tracked competitor page path. Title from H1/meta; type is user‑set or auto‑detected." sticky />
                <Th label="Rank" width={110} info="Rank of primary tracked keyword; lower is better. Δ vs last snapshot." sortable onClick={() => toggleSort("rank")} active={sortBy === "rank"} dir={sortDir} />
                <Th label="Word Count" width={140} info="Indexed word count from crawler snapshots; includes visible main content." sortable onClick={() => toggleSort("wcDelta")} active={sortBy === "wcDelta"} dir={sortDir} />
                <Th label="KW Count" width={120} info="Number of keywords this page ranks for (Top‑100)." sortable onClick={() => toggleSort("kwDelta")} active={sortBy === "kwDelta"} dir={sortDir} align="right" />
                <Th label="SERP" width={160} info="SERP features present where the competitor page is included." />
                <Th label="Change %" width={120} info="Composite of rank/content/features deltas (see help for weights)." sortable onClick={() => toggleSort("change")} active={sortBy === "change"} dir={sortDir} align="right" />
                <Th label="Last Seen" width={120} info="Latest successful crawl / API refresh for this page." />
                <Th label="Actions" width={220} info="Quick actions for this tracked page." />
              </tr>
            </thead>
            <tbody>
              {windowed.map((r) => {
                const rankDelta = r.rank - r.prevRank; // positive = worse
                const wcDelta = r.wordCount - r.prevWordCount;
                const kwDelta = r.kwCount - r.prevKwCount;
                const changeColor = r.changePct > 2 ? TK.ok : r.changePct < -2 ? TK.danger : "#6B7280";
                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-b hover:bg-[#FAFCFE]" style={{ borderColor: TK.border }}>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={!!selected[r.id]}
                          onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                        />
                      </td>

                      {/* URL */}
                      <td className="sticky left-[44px] bg-white z-10 px-3 py-2 align-top" style={{ boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}>
                        <div className="flex items-center gap-2">
                          <a href={r.fullUrl} target="_blank" rel="noreferrer" className="font-medium underline decoration-1" style={{ color: TK.valueBlue }}>
                            {shortPath(r.url)}
                          </a>
                          <ExternalLink size={12} className="text-[#9CA3AF]" />
                          <span className="ml-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: TK.border }}>
                            {r.pageType}
                          </span>
                          {r.alertsActive && (
                            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px]" title="Alert triggered">
                              <AlertTriangle size={12} className="text-[#F59E0B]" />
                              Alert
                            </span>
                          )}
                        </div>
                        {r.title && <div className="mt-0.5 truncate text-xs text-[#6B7280]">{r.title}</div>}
                      </td>

                      {/* Rank */}
                      <td className="px-3 py-2 align-top">
                        <button
                          className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
                          style={{ borderColor: TK.border }}
                          title="View Trend"
                          onClick={openTrends}

                        >
                          <span className="inline-flex items-center rounded px-1 py-[1px] text-xs font-semibold"
                            style={{ background: "#F3F4F6", color: "#374151" }}>
                            #{r.rank}
                          </span>
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: rankDelta < 0 ? TK.ok : rankDelta > 0 ? TK.danger : "#6B7280" }}
                          >
                            {rankDelta === 0 ? "±0" : rankDelta < 0 ? `▲ ${Math.abs(rankDelta)}` : `▼ ${rankDelta}`}
                          </span>
                          <Spark kind="rank" series={r.series.map((s) => s.rank)} />
                        </button>
                      </td>

                      {/* Word Count */}
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{nf(r.wordCount)}</span>
                          <span className="text-xs tabular-nums" style={{ color: wcDelta > 0 ? TK.ok : wcDelta < 0 ? TK.danger : "#6B7280" }}>
                            {wcDelta === 0 ? "±0" : wcDelta > 0 ? `+${nf(wcDelta)}` : `${nf(wcDelta)}`}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Spark kind="wc" series={r.series.map((s) => s.wc)} />
                        </div>
                      </td>

                      {/* KW Count */}
                      <td className="px-3 py-2 text-right align-top">
                        <div className="inline-flex items-center gap-2">
                          <span className="tabular-nums">{r.kwCount}</span>
                          <span className="text-xs tabular-nums" style={{ color: kwDelta > 0 ? TK.ok : kwDelta < 0 ? TK.danger : "#6B7280" }}>
                            {kwDelta === 0 ? "±0" : kwDelta > 0 ? `+${kwDelta}` : `${kwDelta}`}
                          </span>
                        </div>
                      </td>

                      {/* SERP */}
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap items-center gap-1">
                          {r.serp.map((f) => (
                            <span key={f} className="rounded bg-[#F5F7FA] px-1.5 py-[1px] text-[11px] text-[#374151] cursor-pointer" title={FEATURE_LABEL[f]} onClick={openSerp}>
                              {FEATURE_EMOJI[f]}
                            </span>
                          ))}
                          {!r.serp.length && <span className="text-xs text-[#9CA3AF]">—</span>}
                        </div>
                      </td>

                      {/* Change % */}
                      <td className="px-3 py-2 text-right align-top">
                        <span className="tabular-nums font-semibold" style={{ color: changeColor }}>
                          {pf(r.changePct, 1)}
                        </span>
                        <div className="text-[11px] text-[#6B7280]">
                          <span className="inline-block h-2 w-16 overflow-hidden bg-[#E5E7EB] rounded-t-[6px]">
                            <span
                              className="block h-2"
                              style={{
                                width: `${Math.min(100, Math.abs(r.changePct))}%`,
                                background: changeColor,
                              }}
                            />
                          </span>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="px-3 py-2 align-top text-[#6B7280]">{fmtDate(r.lastSeen)}</td>

                      {/* Actions */}
                      <td className="px-3 py-2 align-top">
                        <div className="inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition">
                          <button
                            className="h-8 px-2 rounded-md border text-xs bg-white hover:bg-gray-50 cursor-pointer"
                            style={{ borderColor: TK.border }}
                            onClick={openTrends}
                          >
                            📈 View Trend
                          </button>
                          <button
                            className="h-8 px-2 rounded-md border text-xs bg-white hover:bg-gray-50 cursor-pointer"
                            style={{ borderColor: TK.border }}
                            onClick={openDrawer}
                          >
                            ⚙️ Edit Alerts
                          </button>
                          <button
                            className="h-8 px-2 rounded-md border text-xs bg-white hover:bg-gray-50"
                            style={{ borderColor: TK.border }}
                            onClick={() => {
                              const note = prompt("Add note for this page:");
                              if (note) {
                                setRows((list) => list.map((x) => (x.id === r.id ? { ...x, notes: (x.notes ? x.notes + " " : "") + note } : x)));
                              }
                            }}
                          >
                            📝 Add Note
                          </button>
                        </div>
                      </td>
                    </tr>
                    {r.notes && (
                      <tr className="border-b" style={{ borderColor: TK.border }}>
                        <td />
                        <td colSpan={8} className="px-3 py-2">
                          <div className="rounded-md border p-2 text-sm" style={{ borderColor: TK.border, background: "#FAFCFE" }}>
                            <span className="font-medium">Notes:</span> <span className="text-[#374151]">{r.notes}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {infinite && <div id="pam-sentinel" className="h-8" />}

          {windowed.length === 0 && (
            <div className="grid place-items-center py-10 text-sm text-[#6B7280]">
              No pages match current filters.
              <button className="mt-2 inline-flex items-center gap-1 text-[#0077FF] underline" onClick={() => setQuery("")}>
                <RefreshIconSpin /> Reset
              </button>
            </div>
          )}
        </div>

        {/* Selection bar */}
        {selectedIds.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md border bg-[#F5F7FA] p-2 text-sm" style={{ borderColor: TK.border }}>
            <span>
              <b>{selectedIds.length}</b> selected
            </span>
            <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
            <button className="h-8 px-3 rounded-md border text-sm bg-white hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => exportCSV(true)}>
              Export selection
            </button>
            <button className="h-8 px-3 rounded-md border text-sm bg-white hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => alert("Manage Alerts (bulk)")}>
              Manage Alerts
            </button>
            <button className="h-8 px-3 rounded-md border text-sm bg-white hover:bg-gray-50" style={{ borderColor: TK.border }} onClick={() => alert("Create Tasks (bulk)")}>
              Create Tasks
            </button>
            <div className="ml-auto">
              <button className="text-sm underline text-[#6B7280]" onClick={() => setSelected({})}>Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TrackPageModal
        open={trackOpen}
        competitors={competitors}
        defaultComp={currentCompetitor}
        onClose={() => setTrackOpen(false)}
        onTrack={(payload) => {
          const fresh = makeRows(1, payload.competitor, payload.url);
          setRows((r) => [...fresh, ...r]);
        }}
      />

      <PageAlertsModal
        open={alertsOpen}
        page={alertsPage}
        onClose={() => setAlertsOpen(false)}
        onSave={() => {
          // demo noop
        }}
      />

      <TrendModal open={trendOpen} page={trendPage} onClose={() => setTrendOpen(false)} />
    </section>
  );
}

/* ------------------------------ TABLE THs ------------------------------ */
function Th({
  label,
  info,
  sortable,
  onClick,
  active,
  dir,
  align = "left",
  width,
  sticky = false,
}: {
  label: string;
  info: string;
  sortable?: boolean;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  align?: "left" | "right" | "center";
  width?: number;
  sticky?: boolean;
}) {
  return (
    <th
      className={classNames(
        "px-3 py-2 text-sm font-medium",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        sticky ? "sticky left-[44px] bg-white z-10" : ""
      )}
      style={{ minWidth: width, width }}
    >
      <span className="inline-flex items-center gap-1">
        {sortable ? (
          <button className="inline-flex items-center gap-1 hover:underline" onClick={onClick} title={`Sort by ${label}`}>
            <span>{label}</span>
            {active ? <span className="text-[#6B7280]">{dir === "asc" ? "▲" : "▼"}</span> : <span className="text-[#9CA3AF]">⇅</span>}
          </button>
        ) : (
          <span>{label}</span>
        )}
        <InfoPopover label={info} />
      </span>
    </th>
  );
}
function ThCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <th className="px-3 py-2 w-[44px]">
      <input type="checkbox" checked={checked} onChange={onChange} />
    </th>
  );
}

/* ------------------------------ ICONS ------------------------------ */
function RefreshIconSpin() {
  return <Loader2 className="animate-spin" size={14} />;
}

const FEATURE_EMOJI: Record<SerpFeature, string> = {
  FS: "🔥",
  PAA: "💡",
  IMAGE: "🖼️",
  SITELINKS: "⭐",
  VIDEO: "🎥",
  TOP_STORIES: "📰",
};
const FEATURE_LABEL: Record<SerpFeature, string> = {
  FS: "Featured Snippet",
  PAA: "People Also Ask",
  IMAGE: "Image Pack",
  SITELINKS: "Sitelinks",
  VIDEO: "Video",
  TOP_STORIES: "Top Stories",
};

/* ------------------------------ MOCK DATA ------------------------------ */
function daysBack(n = 30) {
  const res: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    res.push(d.toISOString().slice(0, 10));
  }
  return res;
}
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function computeChangePct(prevRank: number, currRank: number, prevWC: number, currWC: number, fsDelta: number) {
  const R = clamp((prevRank - currRank) / Math.max(prevRank, 50), -1, 1); // better rank => positive
  const C = Math.max(-0.9, Math.min(0.9, Math.tanh((currWC - prevWC) / 800)));
  const F = Math.max(-0.45, Math.min(0.45, 0.15 * fsDelta));
  const res = 100 * (0.55 * R + 0.30 * C + 0.15 * F);
  return clamp(Number(res.toFixed(1)));
}
function makeOne(competitor: string, fullUrl?: string): TrackedPage {
  const basePaths = [
    "/seo-guide",
    "/tools/rank-checker",
    "/blog/ai-seo-tips",
    "/services/link-building",
    "/tools/schema-generator",
    "/blog/semrush-vs-ahrefs",
    "/product/keyword-research",
    "/academy/technical-seo",
  ];
  const path = fullUrl ? new URL(fullUrl).pathname : basePaths[rand(0, basePaths.length - 1)];
  const pageType: PageType = (["Blog", "Product", "Service", "Other"] as PageType[])[rand(0, 3)];

  const ds = daysBack(30);
  let rank0 = rand(5, 40);
  let wc0 = rand(1200, 3600);
  const series: Snapshot[] = ds.map((d) => {
    rank0 = Math.max(1, Math.min(100, rank0 + rand(-2, 2)));
    wc0 = Math.max(400, wc0 + rand(-60, 80));
    const fs = Math.random() < 0.18 ? 1 : 0;
    return { d, rank: rank0, wc: wc0, fs: fs as 0 | 1 };
  });

  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  const kwCount = rand(20, 180);
  const prevKwCount = Math.max(0, kwCount + rand(-24, 24));
  const serpAvail: SerpFeature[] = ["FS", "PAA", "IMAGE", "SITELINKS", "VIDEO", "TOP_STORIES"];
  const serp = serpAvail.filter(() => Math.random() < 0.32);
  const fsDelta = (last.fs ? 1 : 0) - (prev.fs ? 1 : 0);

  const changePct = computeChangePct(prev.rank, last.rank, prev.wc, last.wc, fsDelta);

  return {
    id: `${competitor}-${path}-${Math.random().toString(36).slice(2, 8)}`,
    url: path,
    fullUrl: `https://${competitor}${path}`,
    title: path
      .replace(/\//g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .slice(1)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase()),
    pageType,
    rank: last.rank,
    prevRank: prev.rank,
    wordCount: last.wc,
    prevWordCount: prev.wc,
    kwCount,
    prevKwCount,
    serp,
    changePct,
    lastSeen: new Date().toISOString().slice(0, 10),
    series,
    alertsActive: Math.random() < 0.2,
    notes: Math.random() < 0.15 ? "Core topic page. Lost FS in July." : undefined,
  };
}
function makeRows(n = 60, competitor = "comp1.com", forcedUrl?: string): TrackedPage[] {
  if (forcedUrl) return [makeOne(competitor, forcedUrl)];
  return Array.from({ length: n }, () => makeOne(competitor));
}

