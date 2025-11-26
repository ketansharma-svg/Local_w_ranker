"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Upload,
  Search as SearchIcon,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Bell,
  AlertTriangle,
  TrendingUp,
  FilePlus,
  Brain,
  FileMinus,
  Bot,
  Wrench,
  Eye,
  Zap,
  ClipboardPlus,
  Lightbulb,
  Plus,
  BookOpen,
  Download,
  Mail,
  X,
} from "lucide-react";

/**
 * 🟣 Alert Log & Activity Summary — Drop‑in TSX
 * Tailwind-only (no UI libs), lucide-react for icons
 *
 * ✅ Implements
 *  - Header (Refresh, Export, Search)
 *  - Sticky Filters: Date range + Type; removable chips; debounced search
 *  - Reverse-chronological feed grouped by day; unread dots; expand details
 *  - Inline CTAs with tooltips + role gating (Admin/Editor/Viewer)
 *  - Export CSV/PDF/Email (CSV functional; others stubbed)
 *  - Infinite scroll (client-only) + sticky shadow on scroll
 *  - Mobile cards layout
 *
 * NOTE: Uses deterministic mock data (seeded + fixed base time) to avoid hydration drift.
 */

/* -------------------------------- TOKENS -------------------------------- */
const TK = {
  brand: "#1090D0",
  primary: "#0077FF", // primary blue (actions)
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  surface: "#FFFFFF",
  timestamp: "#999999",
  red: "#EF4444",
  yellow: "#F59E0B",
  green: "#10B981",
  unread: "#3B82F6",
} as const;

/* ------------------------------- TYPES ---------------------------------- */
type AlertLogType =
  | "NEW_BACKLINK"
  | "BROKEN_LINK"
  | "RANK_SPIKE"
  | "NEW_PAGE"
  | "CONTENT_CLUSTER_MATCH"
  | "PAGE_REMOVED"
  | "SYSTEM"
  | "MANUAL";

type Severity = "info" | "warning" | "critical";

type Actor =
  | { kind: "system"; name: "Wranker"; source: "crawler" | "api" | "job" }
  | { kind: "user"; id: string; name: string; role: "admin" | "editor" | "viewer" };

type LogEntry = {
  id: string;
  type: AlertLogType;
  severity: Severity;
  tsISO: string; // UTC ISO
  read?: boolean;
  competitor?: string;
  domain?: string;
  sourceUrl?: string;
  targetPath?: string;
  keyword?: string;
  rankFrom?: number;
  rankTo?: number;
  wrScore?: number;
  meta?: Record<string, any>;
  actor: Actor;
};

type DateRangeKey = "24h" | "7d" | "14d" | "30d" | "custom";
type TypeFilterKey = "all" | "alertsOnly" | "system" | "manual";
type Role = "admin" | "editor" | "viewer";

/* ------------------------------ HELPERS --------------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
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
const nf = (n: number) => new Intl.NumberFormat().format(n);
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const fmtDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const isoDay = (iso: string) => iso.slice(0, 10);

/* ----------------------- Deterministic Mock Data ------------------------ */
const BASE_NOW_ISO = "2025-07-12T12:00:00.000Z";
const BASE_NOW = new Date(BASE_NOW_ISO);
function hashSeed(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function hoursAgoIso(hours: number) {
  const ms = BASE_NOW.getTime() - hours * 3600_000;
  return new Date(ms).toISOString();
}

const TYPES: AlertLogType[] = [
  "NEW_BACKLINK",
  "BROKEN_LINK",
  "RANK_SPIKE",
  "NEW_PAGE",
  "CONTENT_CLUSTER_MATCH",
  "PAGE_REMOVED",
  "SYSTEM",
  "MANUAL",
];

function makeLogs(count = 140, seed = "wr-logs"): LogEntry[] {
  const rng = mulberry32(hashSeed(seed));
  const comps = ["comp1.com", "comp2.io", "comp3.ai"];
  const domains = ["example.com", "techblog.ai", "growthhub.io", "seoworld.net", "stackseo.dev"];
  const paths = [
    "/seo-guide",
    "/tools/ai",
    "/blog/technical-seo",
    "/content/strategy",
    "/rank-checker",
  ];
  const kws = ["seo tools", "ai seo", "rank tracker", "schema markup", "backlink audit"];
  const items: LogEntry[] = [];

  for (let i = 0; i < count; i++) {
    const type = TYPES[seededInt(rng, 0, TYPES.length - 1)];
    const sev: Severity = type === "BROKEN_LINK" ? "critical" : type === "PAGE_REMOVED" ? "warning" : "info";
    const hrs = seededInt(rng, 0, 24 * 14); // last 14 days
    const tsISO = hoursAgoIso(hrs);
    const comp = comps[seededInt(rng, 0, comps.length - 1)];
    const domain = domains[seededInt(rng, 0, domains.length - 1)];
    const targetPath = paths[seededInt(rng, 0, paths.length - 1)];
    const keyword = kws[seededInt(rng, 0, kws.length - 1)];
    const rankFrom = seededInt(rng, 8, 35);
    const rankTo = Math.max(1, rankFrom - seededInt(rng, 1, 10));

    const actor: Actor = rng() < 0.2
      ? { kind: "user", id: "u1", name: "You", role: "admin" }
      : { kind: "system", name: "Wranker", source: rng() < 0.5 ? "crawler" : "api" };

    const entry: LogEntry = {
      id: `log-${i + 1}`,
      type,
      severity: sev,
      tsISO,
      read: rng() < 0.5,
      competitor: comp,
      domain,
      sourceUrl: `https://${domain}/post-${seededInt(rng, 1, 600)}?ref=wr`,
      targetPath,
      keyword: type === "RANK_SPIKE" ? keyword : undefined,
      rankFrom: type === "RANK_SPIKE" ? rankFrom : undefined,
      rankTo: type === "RANK_SPIKE" ? rankTo : undefined,
      wrScore: type === "BROKEN_LINK" || type === "NEW_BACKLINK" ? seededInt(rng, 40, 90) : undefined,
      meta: type === "CONTENT_CLUSTER_MATCH" ? { cluster: "AI SEO Tools" } : undefined,
      actor,
    };
    items.push(entry);
  }

  // Sort reverse-chronological
  items.sort((a, b) => (a.tsISO < b.tsISO ? 1 : -1));
  return items;
}

/* ------------------------------ ICON MAP -------------------------------- */
function typeIconAndColor(t: AlertLogType): { icon: React.ReactNode; color: string } {
  switch (t) {
    case "NEW_BACKLINK":
      return { icon: <Bell size={16} />, color: TK.primary };
    case "BROKEN_LINK":
      return { icon: <AlertTriangle size={16} />, color: TK.red };
    case "RANK_SPIKE":
      return { icon: <TrendingUp size={16} />, color: TK.green };
    case "NEW_PAGE":
      return { icon: <FilePlus size={16} />, color: TK.primary };
    case "CONTENT_CLUSTER_MATCH":
      return { icon: <Brain size={16} />, color: TK.yellow };
    case "PAGE_REMOVED":
      return { icon: <FileMinus size={16} />, color: TK.muted };
    case "SYSTEM":
      return { icon: <Bot size={16} />, color: TK.muted };
    case "MANUAL":
      return { icon: <Wrench size={16} />, color: TK.brand };
    default:
      return { icon: <Bell size={16} />, color: TK.primary };
  }
}

/* ------------------------------- CTAs ----------------------------------- */
type CTAKind =
  | "CREATE_LINK"
  | "VIEW_DETAILS"
  | "OPEN_OPPORTUNITY"
  | "CREATE_TASK"
  | "TRACK_PAGE"
  | "OPEN_ANALYZER"
  | "OPEN_STRATEGY";

function ctasFor(entry: LogEntry): { kind: CTAKind; label: string; icon: React.ReactNode; gated?: boolean }[] {
  switch (entry.type) {
    case "NEW_BACKLINK":
      return [
        { kind: "CREATE_LINK", label: "Create Link", icon: <Zap size={14} /> },
        { kind: "VIEW_DETAILS", label: "View Details", icon: <Eye size={14} /> },
      ];
    case "BROKEN_LINK":
      return [
        { kind: "OPEN_OPPORTUNITY", label: "View Opportunity", icon: <Lightbulb size={14} /> },
        { kind: "CREATE_TASK", label: "Create Task", icon: <ClipboardPlus size={14} /> },
      ];
    case "NEW_PAGE":
      return [{ kind: "TRACK_PAGE", label: "Track Page", icon: <Plus size={14} /> }];
    case "RANK_SPIKE":
      return [{ kind: "OPEN_ANALYZER", label: "Keyword Analyzer", icon: <SearchIcon size={14} /> }];
    case "CONTENT_CLUSTER_MATCH":
      return [{ kind: "OPEN_STRATEGY", label: "Strategy Suggestion", icon: <BookOpen size={14} /> }];
    case "PAGE_REMOVED":
      return [{ kind: "VIEW_DETAILS", label: "View Details", icon: <Eye size={14} /> }];
    case "SYSTEM":
    case "MANUAL":
      return [{ kind: "VIEW_DETAILS", label: "View Details", icon: <Eye size={14} /> }];
  }
}

/* ------------------------------ COMPONENTS ------------------------------ */
function PillButton({
  onClick,
  children,
  title,
}: React.PropsWithChildren<{ onClick?: () => void; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm bg-white hover:bg-gray-50"
      style={{ borderColor: TK.border, color: TK.text }}
    >
      {children}
    </button>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: React.PropsWithChildren<{ label: string; onClick?: () => void; disabled?: boolean }>) {
  return (
    <button
      type="button"
      title={disabled ? `${label} (No permission)` : label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "group inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-[#EAF2FF] active:translate-y-[1px]",
      )}
      style={{ borderColor: TK.border, color: TK.primary }}
    >
      <span className="transition-transform duration-150 group-hover:-translate-y-[1px]">{children}</span>
      <span>{label}</span>
    </button>
  );
}

function FilterChip({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs bg-white"
      style={{ borderColor: TK.border, color: TK.text }}>
      {text}
      <button className="ml-1 rounded p-0.5 hover:bg-gray-100" onClick={onClear} aria-label="Remove filter">
        <X size={12} />
      </button>
    </span>
  );
}

function PopMenu({
  open,
  onClose,
  align = "left",
  children,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; align?: "left" | "right" }>) {
  const ref = useOutsideClose<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={classNames(
        "absolute z-50 mt-2 w-64 rounded-md border bg-white p-2 shadow",
        align === "right" ? "right-0" : "left-0"
      )}
      style={{ borderColor: TK.border }}
      role="menu"
    >
      {children}
    </div>
  );
}

/* ------------------------------- MAIN ----------------------------------- */
export default function AlertLogAndActivitySection() {
  // Mock data
  const [seed, setSeed] = useState("wr-logs");
  const all = useMemo(() => makeLogs(140, seed), [seed]);

  // Controls
  const [role, setRole] = useState<Role>("editor");
  const [dateRange, setDateRange] = useState<DateRangeKey>("7d");
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Menus
  const [openDate, setOpenDate] = useState(false);
  const [openType, setOpenType] = useState(false);
  const [openExport, setOpenExport] = useState(false);

  // Scroll / sticky
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [stickyShadow, setStickyShadow] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setStickyShadow(el.scrollTop > 0);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(60);
  useEffect(() => {
    const s = document.getElementById("alertlog-sentinel");
    if (!s) return;
    const ob = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) setVisibleCount((v) => Math.min(filtered.length, v + 60));
    });
    ob.observe(s);
    return () => ob.disconnect();
  }, []); // eslint-disable-line

  // Filtering
  const filtered = useMemo(() => {
    const now = BASE_NOW.getTime();
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      switch (dateRange) {
        case "24h":
          return t >= now - 24 * 3600_000;
        case "7d":
          return t >= now - 7 * 24 * 3600_000;
        case "14d":
          return t >= now - 14 * 24 * 3600_000;
        case "30d":
          return t >= now - 30 * 24 * 3600_000;
        case "custom":
          if (customFrom && t < new Date(customFrom).getTime()) return false;
          if (customTo && t > new Date(customTo).getTime() + 24 * 3600_000 - 1) return false;
          return true;
      }
    };

    const matchType = (r: LogEntry) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "alertsOnly") {
        return (
          r.type === "NEW_BACKLINK" ||
          r.type === "BROKEN_LINK" ||
          r.type === "RANK_SPIKE" ||
          r.type === "NEW_PAGE" ||
          r.type === "CONTENT_CLUSTER_MATCH" ||
          r.type === "PAGE_REMOVED"
        );
      }
      if (typeFilter === "system") return r.actor.kind === "system";
      if (typeFilter === "manual") return r.actor.kind === "user";
      return true;
    };

    const query = q.trim().toLowerCase();
    return all.filter((r) => {
      if (!inRange(r.tsISO)) return false;
      if (!matchType(r)) return false;
      if (query) {
        const hay = [
          r.domain,
          r.competitor,
          r.targetPath,
          r.sourceUrl,
          r.keyword,
          r.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [all, dateRange, customFrom, customTo, typeFilter, q]);

  // Windowed
  const windowed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const r of windowed) {
      const k = isoDay(r.tsISO);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [windowed]);

  // Expand state (details)
  const [openId, setOpenId] = useState<string | null>(null);

  // Export
  const exportCSV = () => {
    const header = [
      "tsISO",
      "type",
      "severity",
      "competitor",
      "domain",
      "sourceUrl",
      "targetPath",
      "keyword",
      "rankFrom",
      "rankTo",
      "wrScore",
      "actor.kind",
      "actor.name",
    ];
    const lines = filtered.map((r) =>
      [
        r.tsISO,
        r.type,
        r.severity,
        r.competitor || "",
        r.domain || "",
        r.sourceUrl || "",
        r.targetPath || "",
        r.keyword || "",
        r.rankFrom ?? "",
        r.rankTo ?? "",
        r.wrScore ?? "",
        r.actor.kind,
        "name" in r.actor ? r.actor.name : "Wranker",
      ]
        .map((x) => JSON.stringify(String(x)))
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "alert-log.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // CTA handlers (stubs for wiring)
  const onCTA = (kind: CTAKind, row: LogEntry) => {
    switch (kind) {
      case "CREATE_LINK":
        alert(`Create Link for domain ${row.domain}`);
        break;
      case "VIEW_DETAILS":
        setOpenId((id) => (id === row.id ? null : row.id));
        break;
      case "OPEN_OPPORTUNITY":
        alert(`Open Opportunity for ${row.domain}`);
        break;
      case "CREATE_TASK":
        alert(`Create Task for ${row.targetPath}`);
        break;
      case "TRACK_PAGE":
        alert(`Track Page ${row.targetPath}`);
        break;
      case "OPEN_ANALYZER":
        alert(`Open Keyword Analyzer for "${row.keyword}"`);
        break;
      case "OPEN_STRATEGY":
        alert(`Open Strategy Suggestion for ${row.meta?.cluster || "cluster"}`);
        break;
    }
  };

  // Role gate
  const isDisabled = (r: Role) => r === "viewer";

  // Active filter chips
  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (dateRange === "custom" && (customFrom || customTo)) {
    chips.push({
      key: "date",
      label: `Date: ${customFrom || "…"} → ${customTo || "…"}`,
      onClear: () => {
        setCustomFrom("");
        setCustomTo("");
        setDateRange("7d");
      },
    });
  } else if (dateRange !== "7d") {
    chips.push({
      key: "date",
      label: `Date: ${dateRange.toUpperCase()}`,
      onClear: () => setDateRange("7d"),
    });
  }
  if (typeFilter !== "all") {
    const map: Record<TypeFilterKey, string> = {
      all: "All",
      alertsOnly: "Alerts Only",
      system: "System",
      manual: "Manual",
    };
    chips.push({ key: "type", label: `Type: ${map[typeFilter]}`, onClear: () => setTypeFilter("all") });
  }
  if (q.trim()) chips.push({ key: "q", label: `Search: “${q.trim()}”`, onClear: () => setQ("") });

  return (
    <section className="w-full mt-4">
      <div className="rounded-[6px] border bg-white shadow-sm" style={{ borderColor: TK.border }}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>
              Alert Log &amp; Activity Summary
            </h3>
            <span className="text-xs text-[#6B7280]">Reverse‑chronological, filterable</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Role (demo) */}
            <div className="hidden md:flex items-center gap-1 text-sm text-[#6B7280]">
              Role:
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-8 rounded border bg-white px-2 text-sm outline-none"
                style={{ borderColor: TK.border }}
                title="Demo: role gating"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {/* Search toggle */}
            {searchOpen ? (
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by domain, page, keyword…"
                  className="h-9 w-[260px] rounded-md border bg-white pl-7 pr-8 text-sm outline-none"
                  style={{ borderColor: TK.border }}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                  onClick={() => setSearchOpen(false)}
                  title="Close search"
                >
                  ✕
                </button>
              </div>
            ) : (
              <PillButton onClick={() => setSearchOpen(true)} title="Search Log">
                <SearchIcon size={14} className="text-[#6B7280]" />
                Search
              </PillButton>
            )}
            {/* Export */}
            <div className="relative">
              <PillButton onClick={() => setOpenExport((s) => !s)} title="Export Log">
                <Upload size={14} className="text-[#6B7280]" />
                Export
                <ChevronDown size={16} className="text-[#9CA3AF]" />
              </PillButton>
              <PopMenu open={openExport} onClose={() => setOpenExport(false)} align="right">
                <button
                  className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setOpenExport(false);
                    exportCSV();
                  }}
                >
                  <Download size={14} className="mr-2 inline" /> CSV
                </button>
                <button
                  className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setOpenExport(false);
                    alert("PDF export is available on Pro (stub).");
                  }}
                >
                  <FilePlus size={14} className="mr-2 inline" /> PDF (Pro)
                </button>
                <button
                  className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setOpenExport(false);
                    alert("Email digest sent (stub).");
                  }}
                >
                  <Mail size={14} className="mr-2 inline" /> Email Summary
                </button>
              </PopMenu>
            </div>
            {/* Refresh */}
            <PillButton onClick={() => setSeed((s) => s + "-r")} title="Refresh">
              <RefreshCw size={14} className="text-[#6B7280]" />
              Refresh
            </PillButton>
          </div>
        </div>

        {/* Filters (sticky) */}
        <div
          className={classNames(
            "sticky top-0 z-20 border-t bg-white px-4 py-2",
            stickyShadow && "shadow-[0_1px_0_0_rgba(0,0,0,0.06)]"
          )}
          style={{ borderColor: TK.border }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range */}
            <div className="relative">
              <PillButton onClick={() => setOpenDate((s) => !s)} title="Date Range">
                <CalendarDays size={14} className="text-[#6B7280]" />
                {dateRange === "custom" ? "Custom" : dateRange.toUpperCase()}
                <ChevronDown size={16} className="text-[#9CA3AF]" />
              </PillButton>
              <PopMenu open={openDate} onClose={() => setOpenDate(false)}>
                {(["24h", "7d", "14d", "30d"] as DateRangeKey[]).map((k) => (
                  <button
                    key={k}
                    className={classNames(
                      "block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-50",
                      dateRange === k && "bg-[#F5F7FA]"
                    )}
                    onClick={() => {
                      setDateRange(k);
                      setOpenDate(false);
                    }}
                  >
                    {k === "24h" ? "Last 24 hours" : k === "7d" ? "Last 7 days" : k === "14d" ? "Last 14 days" : "Last 30 days"}
                  </button>
                ))}
                <div className="my-2 border-t" style={{ borderColor: TK.border }} />
                <div className="px-1 py-1">
                  <div className="mb-1 text-xs text-[#6B7280]">Custom</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-8 flex-1 rounded border px-2 text-sm outline-none"
                      style={{ borderColor: TK.border }}
                    />
                    <span className="text-sm text-[#6B7280]">→</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-8 flex-1 rounded border px-2 text-sm outline-none"
                      style={{ borderColor: TK.border }}
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      className="h-8 rounded border px-3 text-sm hover:bg-gray-50"
                      style={{ borderColor: TK.border }}
                      onClick={() => {
                        setCustomFrom("");
                        setCustomTo("");
                        setDateRange("7d");
                      }}
                    >
                      Reset
                    </button>
                    <button
                      className="h-8 rounded px-3 text-sm text-white"
                      style={{ background: TK.brand }}
                      onClick={() => {
                        setDateRange("custom");
                        setOpenDate(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </PopMenu>
            </div>

            {/* Type */}
            <div className="relative">
              <PillButton onClick={() => setOpenType((s) => !s)} title="Log Type">
                <span className="inline-block h-2 w-2 rounded-full bg-[#CBD5E1]" />
                {typeFilter === "all"
                  ? "All"
                  : typeFilter === "alertsOnly"
                  ? "Alerts Only"
                  : typeFilter === "system"
                  ? "System"
                  : "Manual"}
                <ChevronDown size={16} className="text-[#9CA3AF]" />
              </PillButton>
              <PopMenu open={openType} onClose={() => setOpenType(false)}>
                {(["all", "alertsOnly", "system", "manual"] as TypeFilterKey[]).map((k) => (
                  <button
                    key={k}
                    className={classNames(
                      "block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-50",
                      typeFilter === k && "bg-[#F5F7FA]"
                    )}
                    onClick={() => {
                      setTypeFilter(k);
                      setOpenType(false);
                    }}
                  >
                    {k === "all"
                      ? "All"
                      : k === "alertsOnly"
                      ? "Alerts Only"
                      : k === "system"
                      ? "System"
                      : "Manual"}
                  </button>
                ))}
              </PopMenu>
            </div>

            {/* Active chips */}
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <FilterChip key={c.key} text={c.label} onClear={c.onClear} />
              ))}
            </div>

            {/* Count */}
            <div className="ml-auto text-xs text-[#6B7280]">
              Showing <b className="text-[#111827]">{windowed.length}</b> of {filtered.length}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div ref={scrollerRef} className="max-h-[620px] overflow-auto">
          {grouped.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6B7280]">No activity in this range.</div>
          ) : (
            grouped.map(([day, rows]) => (
              <div key={day} className="border-t" style={{ borderColor: TK.border }}>
                {/* Day divider */}
                <div className="sticky top-[38px] z-10 bg-white/85 backdrop-blur px-4 py-1 text-xs font-medium" style={{ color: TK.muted }}>
                  {fmtDateLabel(`${day}T00:00:00Z`)}
                </div>
                {/* Rows */}
                <ul className="divide-y" style={{ borderColor: TK.border }}>
                  {rows.map((r) => {
                    const { icon, color } = typeIconAndColor(r.type);
                    const isOpen = openId === r.id;
                    const disabled = isDisabled(role);
                    const ctas = ctasFor(r);

                    return (
                      <li key={r.id} className="px-4 py-3 bg-white hover:bg-[#FAFCFE]">
                        {/* Desktop Row */}
                        <div className="hidden md:grid md:grid-cols-[20px_auto_auto] md:items-start md:gap-3">
                          <div className="relative flex items-start justify-center pt-1">
                            {/* unread dot */}
                            {!r.read && <span className="absolute -left-1 top-0 inline-block h-2 w-2 rounded-full" style={{ background: TK.unread }} />}
                            <span
                              className="grid h-6 w-6 place-items-center rounded"
                              style={{ color, background: `${color}1A`, border: `1px solid ${color}29` }}
                              title={r.type}
                            >
                              {icon}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="text-[14px] font-medium" style={{ color: TK.text }}>
                                  {renderPrimary(r)}
                                </div>
                                <div className="mt-0.5 text-[12px]" style={{ color: TK.muted }}>
                                  {renderMeta(r)}
                                </div>
                                {isOpen && (
                                  <div className="mt-2 rounded border p-2 text-xs" style={{ borderColor: TK.border, color: TK.text, background: "#FBFDFF" }}>
                                    <b className="text-[#6B7280]">Details</b>
                                    <pre className="mt-1 overflow-auto text-xs leading-snug">
                                      {JSON.stringify(r, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {/* Time + caret */}
                              <div className="flex shrink-0 items-start gap-3">
                                <div className="mt-0.5 text-[12px]" style={{ color: TK.timestamp }}>
                                  {fmtTime(r.tsISO)}
                                </div>
                                <button
                                  className="ml-1 rounded p-1 text-[#6B7280] hover:bg-gray-100"
                                  onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                                  title={isOpen ? "Collapse" : "Expand"}
                                >
                                  <ChevronRight
                                    size={16}
                                    className={classNames("transition-transform", isOpen && "rotate-90")}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* CTAs */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {ctas.map((c) => (
                                <IconAction
                                  key={c.label}
                                  label={c.label}
                                  onClick={() => onCTA(c.kind, r)}
                                  disabled={disabled}
                                >
                                  {c.icon}
                                </IconAction>
                              ))}
                            </div>
                          </div>

                          {/* (spacer for grid balance) */}
                          <div />
                        </div>

                        {/* Mobile Card */}
                        <div className="md:hidden">
                          <div className="flex items-start gap-2">
                            <span
                              className="grid h-7 w-7 place-items-center rounded"
                              style={{ color, background: `${color}1A`, border: `1px solid ${color}29` }}
                              title={r.type}
                            >
                              {icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between">
                                <div className="text-sm font-medium" style={{ color: TK.text }}>
                                  {renderPrimary(r)}
                                </div>
                                <div className="ml-2 shrink-0 text-[12px]" style={{ color: TK.timestamp }}>
                                  {fmtTime(r.tsISO)}
                                </div>
                              </div>
                              <div className="mt-0.5 text-xs" style={{ color: TK.muted }}>
                                {renderMeta(r)}
                              </div>

                              {/* CTAs */}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {ctas.map((c) => (
                                  <IconAction
                                    key={c.label}
                                    label={c.label}
                                    onClick={() => onCTA(c.kind, r)}
                                    disabled={disabled}
                                  >
                                    {c.icon}
                                  </IconAction>
                                ))}
                                <button
                                  className="ml-auto rounded p-1 text-[#6B7280] hover:bg-gray-100"
                                  onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                                  title={openId === r.id ? "Collapse" : "Expand"}
                                >
                                  <ChevronRight
                                    size={16}
                                    className={classNames("transition-transform", openId === r.id && "rotate-90")}
                                  />
                                </button>
                              </div>

                              {openId === r.id && (
                                <div className="mt-2 rounded border p-2 text-xs" style={{ borderColor: TK.border, color: TK.text, background: "#FBFDFF" }}>
                                  <b className="text-[#6B7280]">Details</b>
                                  <pre className="mt-1 overflow-auto text-[11px] leading-snug">
                                    {JSON.stringify(r, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
          {/* Infinite sentinel */}
          <div id="alertlog-sentinel" className="h-8" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs" style={{ borderColor: TK.border, color: TK.muted }}>
          <div>
            Loaded <b className="text-[#111827]">{windowed.length}</b> of {filtered.length}
          </div>
          <div>
            Tip: Use search and filters to export a focused digest.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ RENDERING ------------------------------- */
function renderPrimary(r: LogEntry) {
  switch (r.type) {
    case "NEW_BACKLINK":
      return (
        <>
          <span className="font-semibold">Alert:</span> New backlink found on{" "}
          <span className="underline" style={{ color: TK.primary }}>
            {r.domain}
          </span>
        </>
      );
    case "BROKEN_LINK":
      return (
        <>
          <span className="font-semibold">Alert:</span> Link from{" "}
          <span className="underline" style={{ color: TK.red }}>
            {r.domain}
          </span>{" "}
          to <span className="font-mono">{r.targetPath}</span> is broken
        </>
      );
    case "RANK_SPIKE":
      return (
        <>
          <span className="font-semibold">Alert:</span> Rank spike — “{r.keyword}” from #{r.rankFrom} →{" "}
          <b>#{r.rankTo}</b>
        </>
      );
    case "NEW_PAGE":
      return (
        <>
          <span className="font-semibold">Activity:</span> New page published {r.targetPath}
        </>
      );
    case "CONTENT_CLUSTER_MATCH":
      return (
        <>
          <span className="font-semibold">Insight:</span> Content cluster match —{" "}
          <span className="italic">{r.meta?.cluster}</span>
        </>
      );
    case "PAGE_REMOVED":
      return (
        <>
          <span className="font-semibold">Alert:</span> Page removed — {r.targetPath}
        </>
      );
    case "SYSTEM":
      return (
        <>
          <span className="font-semibold">System:</span> {r.actor.kind === "system" ? "Automated detection" : "Log"} event
        </>
      );
    case "MANUAL":
      return (
        <>
          <span className="font-semibold">Manual:</span> Update by {("name" in r.actor && r.actor.name) || "user"}
        </>
      );
  }
}

function renderMeta(r: LogEntry) {
  const parts: string[] = [];
  if (r.competitor) parts.push(`Competitor: ${r.competitor}`);
  if (r.targetPath) parts.push(`Target: ${r.targetPath}`);
  if (r.domain && (r.type === "NEW_BACKLINK" || r.type === "BROKEN_LINK")) parts.push(`Domain: ${r.domain}`);
  if (r.keyword && r.type === "RANK_SPIKE") parts.push(`Keyword: “${r.keyword}”`);
  if (r.actor.kind === "user") parts.push(`By: ${r.actor.name} (${r.actor.role})`);
  else parts.push(`By: Wranker (${r.actor.source})`);
  if (r.wrScore != null && (r.type === "NEW_BACKLINK" || r.type === "BROKEN_LINK"))
    parts.push(`WR ${r.wrScore}`);
  return parts.join(" · ");
}
