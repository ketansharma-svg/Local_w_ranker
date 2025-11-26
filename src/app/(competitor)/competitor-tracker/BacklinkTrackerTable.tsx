'use client';

/**
 * Backlink Tracker — Activity Table (drop‑in)
 * 
 * Built on the shared Backlinks Tracker table components (Card, Table, Popover, etc.).
 * - Hydration-safe mock data (seeded PRNG + fixed BASE_NOW_ISO; ISO dates only)
 * - Filters, column visibility, sorting, infinite scroll
 * - Inline actions: 🔍 View Details, ⚡ Create Link (Vefogix)
 * - Vefogix availability badge (⚡) on domains with marketplace opportunity
 *
 * Replace `makeRows()` with real data and wire the action handlers as needed.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown,
  Download, Filter, Info, RefreshCw, Search, Settings2, SlidersHorizontal,
  Eye, ClipboardList, Shield, FlagTriangleRight, AlertTriangle, TrendingDown, TrendingUp, Minus, Clock, Zap
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BacklinkViewerDrawerDemo from "./drawers/BacklinkViewer"
/* ---------------- Wranker tokens ---------------- */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",            // brand blue
  valueBlue: "var(--wr-action, #1090D0)",       // action/value blue
  success: "var(--wr-good, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  orange: "#FB923C",
  redBorder: "#e53935",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  pastelBrand: "var(--wr-pastelBrand, #D2EFFF)",
  radius: "var(--wr-radius, 10px)",
};

/* ---------------- Types ---------------- */
type LinkStatus = "Active" | "Removed" | "Broken (404)" | "Redirected (3xx)" | "Not Found" | "Not Checked";
type HealthState = "Healthy" | "At Risk" | "Toxic";
type LinkType = "Dofollow" | "Nofollow" | "Sponsored" | "UGC";

type TrackedBacklinkRow = {
  id: string;
  domain: string;               // root domain
  sourceUrl: string;            // full source
  targetPath: string;           // breadcrumb path on site (e.g., /blog/post-a)
  anchorText: string;
  prevAnchorText?: string;
  anchorChangedAt?: string;     // ISO (YYYY-MM-DD)
  linkStatus: LinkStatus;
  statusChangedAt?: string;     // ISO (YYYY-MM-DD)
  health: HealthState;
  linkType: LinkType;
  prevLinkType?: LinkType;
  linkTypeChangedAt?: string;   // ISO (YYYY-MM-DD)
  wrScore: number;              // 0-100
  prevWrScore?: number;
  wrChangedAt?: string;         // ISO (YYYY-MM-DD)
  spamScore: number;            // 0-100
  prevSpamScore?: number;
  spamChangedAt?: string;       // ISO (YYYY-MM-DD)
  ipRisk: boolean;
  ip?: string;
  asn?: string;
  ipReason?: string;
  firstSeen: string;            // ISO (YYYY-MM-DD)
  lastChecked: string;          // ISO (YYYY-MM-DD)
  source: "Audit" | "Manual" | "CSV Upload";
  vefogix: boolean;             // ⚡ marketplace availability
};

/* ---------------- Hydration-safe utilities ----------------
   IMPORTANT: No Math.random(), Date.now() or toLocale* for SSR content.
   We use a seeded PRNG and fixed base dates to keep SSR and client in sync. */
const BASE_NOW_ISO = "2025-06-01T00:00:00.000Z";
const BASE_NOW = new Date(BASE_NOW_ISO); // deterministic "now" for demo content

function hashSeed(str: string) {
  // FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRandInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function daysAgoFromBase(days: number) {
  const ms = BASE_NOW.getTime() - days * 86400000;
  const d = new Date(ms);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (stable across locales)
}

/* ---------------- Mock data (deterministic) ---------------- */
const STATUSES: LinkStatus[] = ["Active", "Removed", "Broken (404)", "Redirected (3xx)", "Not Found", "Not Checked"];
const HEALTHS: HealthState[] = ["Healthy", "At Risk", "Toxic"];
const TYPES: LinkType[] = ["Dofollow", "Nofollow", "Sponsored", "UGC"];

function makeRows(count = 220, seed = "wranker-demo"): TrackedBacklinkRow[] {
  const rng = mulberry32(hashSeed(seed));
  const pick = <T,>(arr: readonly T[]) => arr[seededRandInt(rng, 0, arr.length - 1)];
  const bool = (p = 0.5) => rng() < p;

  const rows: TrackedBacklinkRow[] = [];
  for (let i = 0; i < count; i++) {
    const n = seededRandInt(rng, 1, 90);
    const domain = `example${n}.com`;
    const status = pick(STATUSES);
    const health: HealthState = bool(0.18) ? "Toxic" : bool(0.5) ? "At Risk" : "Healthy";
    const linkType = pick(TYPES);

    const wr = seededRandInt(rng, 40, 99);
    const wrDelta = seededRandInt(rng, -12, 12);
    const prevWr = Math.max(0, Math.min(100, wr - wrDelta));

    const spam = seededRandInt(rng, 0, 75);
    const spamDelta = seededRandInt(rng, -15, 15);
    const prevSpam = Math.max(0, Math.min(100, spam - spamDelta));

    const anchorChanged = bool(0.15);
    const typeChanged = bool(0.1);
    const ipRisk = bool(0.12);

    const anchorNow = anchorChanged ? "Click here" : (bool(0.5) ? "best seo tools" : "Wranker");
    const anchorPrev = anchorChanged ? (bool(0.5) ? "Wranker" : "best seo tools") : undefined;

    rows.push({
      id: `row-${i + 1}`,
      domain,
      sourceUrl: `https://${domain}/posts/${i + 1}?ref=wr`,
      targetPath: i % 5 === 0 ? "/blog/seo-guide/how-to-rank" : `/blog/article-${(i % 24) + 1}`,
      anchorText: anchorNow,
      prevAnchorText: anchorPrev,
      anchorChangedAt: anchorPrev ? daysAgoFromBase(seededRandInt(rng, 1, 5)) : undefined,
      linkStatus: status,
      statusChangedAt: bool(0.4) ? daysAgoFromBase(seededRandInt(rng, 0, 2)) : undefined,
      health,
      linkType,
      prevLinkType: typeChanged ? (linkType === "Dofollow" ? "Nofollow" : "Dofollow") : undefined,
      linkTypeChangedAt: typeChanged ? daysAgoFromBase(seededRandInt(rng, 1, 15)) : undefined,
      wrScore: wr,
      prevWrScore: prevWr,
      wrChangedAt: daysAgoFromBase(seededRandInt(rng, 1, 20)),
      spamScore: spam,
      prevSpamScore: prevSpam,
      spamChangedAt: daysAgoFromBase(seededRandInt(rng, 1, 10)),
      ipRisk,
      ip: ipRisk ? `10.${seededRandInt(rng, 1, 254)}.${seededRandInt(rng, 1, 254)}.${seededRandInt(rng, 1, 254)}` : undefined,
      asn: ipRisk ? `AS${10000 + seededRandInt(rng, 1, 9999)}` : undefined,
      ipReason: ipRisk ? (bool(0.5) ? "Shared IP pool" : "Known PBN ASN") : undefined,
      firstSeen: daysAgoFromBase(seededRandInt(rng, 60, 260)),
      lastChecked: daysAgoFromBase(seededRandInt(rng, 0, 6)),
      source: bool(0.3) ? "Manual" : bool(0.5) ? "CSV Upload" : "Audit",
      vefogix: bool(0.35),
    });
  }
  return rows;
}

/* ---------------- Small UI primitives ---------------- */
const Badge = ({ text, color, title }: { text: string; color: string; title?: string }) => (
  <span title={title} className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${color}14`, color, border: `1px solid ${color}26` }}>
    {text}
  </span>
);

const StatusBadge = ({ status, pulse }: { status: LinkStatus; pulse?: boolean }) => {
  const map: Record<LinkStatus, { text: string; color: string }> = {
    "Active": { text: "Active", color: TOKENS.success },
    "Removed": { text: "Removed", color: TOKENS.critical },
    "Broken (404)": { text: "Broken (404)", color: TOKENS.critical },
    "Redirected (3xx)": { text: "Redirected", color: TOKENS.orange },
    "Not Found": { text: "Not Found", color: TOKENS.critical },
    "Not Checked": { text: "Not Checked", color: TOKENS.muted },
  };
  const { text, color } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium ${pulse ? "animate-pulse" : ""}`}
      style={{ background: `${color}14`, color, border: `1px solid ${color}26` }}>
      {text}
    </span>
  );
};

const HealthBadge = ({ health }: { health: HealthState }) => {
  const color = health === "Healthy" ? TOKENS.success : health === "At Risk" ? TOKENS.warning : TOKENS.critical;
  return <Badge text={health} color={color} title="Calculated from status, WR drop, spam score, IP risk, and anchor changes." />;
};

const LinkTypeBadge = ({ type, changed }: { type: LinkType; changed?: boolean }) => {
  const color = changed ? TOKENS.orange : TOKENS.valueBlue;
  return <Badge text={type} color={color} title={changed ? "Link type changed" : "Link attribute"} />;
};

const SpamBadge = ({ value }: { value: number }) => {
  const color = value <= 20 ? TOKENS.success : value <= 40 ? TOKENS.warning : TOKENS.critical;
  const label = value <= 20 ? "Low" : value <= 40 ? "Medium" : "High";
  return <Badge text={`${value} · ${label}`} color={color} title="Spam score level" />;
};

const TinyDonut = ({ value, size = 26, stroke = 4, color = TOKENS.valueBlue }: { value: number; size?: number; stroke?: number; color?: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`WR ${value}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
};

const TrendIcon = ({ curr, prev }: { curr?: number; prev?: number }) => {
  if (prev == null || curr == null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (curr > prev) return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (curr < prev) return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

/* ---------------- Component ---------------- */
type ColKey =
  | "select"
  | "domain"
  | "target"
  | "anchor"
  | "status"
  | "health"
  | "type"
  | "wr"
  | "spam"
  | "ip"
  | "dates"
  | "src"
  | "actions";

type ColumnDef = { key: ColKey; label: string; width?: number; align?: "left" | "center" | "right"; sortable?: boolean; };

const COLUMNS: ColumnDef[] = [
  { key: "select", label: "", width: 36, align: "center" },
  { key: "domain", label: "Domain", width: 260, sortable: true },
  { key: "target", label: "Target Page", width: 320, sortable: true },
  { key: "anchor", label: "Anchor Text", width: 220, sortable: true },
  { key: "status", label: "Link Status", width: 160, sortable: true },
  { key: "health", label: "Health State", width: 140, sortable: true },
  { key: "type", label: "Link Type", width: 150, sortable: true },
  { key: "wr", label: "WR Score", width: 140, sortable: true },
  { key: "spam", label: "Spam Score", width: 140, sortable: true },
  { key: "ip", label: "IP Risk", width: 110, sortable: true },
  { key: "dates", label: "First Seen / Last Checked", width: 200, sortable: true },
  { key: "src", label: "Source", width: 120, sortable: true },
  { key: "actions", label: "Actions", width: 140 },
];

export default function BacklinkTrackerTable() {
  /* ---------- deterministic data ---------- */
  const [seed, setSeed] = useState("wranker-demo"); // initial SSR-safe seed
  const rows = useMemo(() => makeRows(220, seed), [seed]);

  /* ---------- selection ---------- */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  /* ---------- view controls ---------- */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(60);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* ---------- sort ---------- */
  const [sortBy, setSortBy] = useState<ColKey>("dates");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (key === "select" || key === "actions") return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); } else { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
  };

  /* ---------- columns visibility ---------- */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    Object.fromEntries(COLUMNS.map(c => [c.key, true])) as Record<ColKey, boolean>
  );
  const visibleColumns = useMemo(() => COLUMNS.filter(c => visibleCols[c.key] !== false), [visibleCols]);

  /* ---------- filters ---------- */
  const [filtersOpen, setFiltersOpen] = useState(true);                 // collapsible
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");                               // global search
  const [statusSel, setStatusSel] = useState<LinkStatus[]>([]);         // multi
  const [healthSel, setHealthSel] = useState<HealthState[]>([]);        // multi
  const [typeChange, setTypeChange] = useState<
    "No Change" | "Dofollow → Nofollow" | "Nofollow → Dofollow" | "Changed to Sponsored" | "Changed to UGC" | "Any Change" | ""
  >("");
  const [wrRange, setWrRange] = useState<[number, number]>([0, 100]);   // slider
  const [spamRange, setSpamRange] = useState<[number, number]>([0, 100]);
  const [anchorContains, setAnchorContains] = useState("");
  const [ipOnly, setIpOnly] = useState(false);
  const [srcSel, setSrcSel] = useState<{ Audit: boolean; Manual: boolean; "CSV Upload": boolean }>({ Audit: false, Manual: false, "CSV Upload": false });
  const [monitoringAge, setMonitoringAge] = useState<"" | "last7" | "last30" | "before3mo">("");
  const [lastCheckedFrom, setLastCheckedFrom] = useState<string>("");
  const [lastCheckedTo, setLastCheckedTo] = useState<string>("");
  const [onlyChanged, setOnlyChanged] = useState(false);
    const [drawerRow, setDrawerRow] = useState(false);
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

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusSel.length && !statusSel.includes(r.linkStatus)) return false;
      if (healthSel.length && !healthSel.includes(r.health)) return false;

      // Link type change filter
      if (typeChange) {
        const changed = !!r.prevLinkType && r.prevLinkType !== r.linkType;
        if (typeChange === "No Change" && changed) return false;
        if (typeChange === "Any Change" && !changed) return false;
        if (typeChange === "Dofollow → Nofollow" && !(r.prevLinkType === "Dofollow" && r.linkType === "Nofollow")) return false;
        if (typeChange === "Nofollow → Dofollow" && !(r.prevLinkType === "Nofollow" && r.linkType === "Dofollow")) return false;
        if (typeChange === "Changed to Sponsored" && !(r.linkType === "Sponsored" && r.prevLinkType && r.prevLinkType !== "Sponsored")) return false;
        if (typeChange === "Changed to UGC" && !(r.linkType === "UGC" && r.prevLinkType && r.prevLinkType !== "UGC")) return false;
      }

      // WR & Spam ranges
      if (r.wrScore < wrRange[0] || r.wrScore > wrRange[1]) return false;
      if (r.spamScore < spamRange[0] || r.spamScore > spamRange[1]) return false;

      // Anchor contains
      if (anchorContains && !r.anchorText.toLowerCase().includes(anchorContains.toLowerCase())) return false;

      // IP/ASN flagged
      if (ipOnly && !r.ipRisk) return false;

      // Source
      const anySourceChecked = srcSel.Audit || srcSel.Manual || srcSel["CSV Upload"];
      if (anySourceChecked && !srcSel[r.source]) return false;

      // Monitoring Age (relative to BASE_NOW only)
      const baseMs = BASE_NOW.getTime();
      const firstSeenMs = new Date(r.firstSeen).getTime();
      if (monitoringAge === "last7" && !(firstSeenMs >= baseMs - 7*86400000)) return false;
      if (monitoringAge === "last30" && !(firstSeenMs >= baseMs - 30*86400000)) return false;
      if (monitoringAge === "before3mo" && !(firstSeenMs <= baseMs - 90*86400000)) return false;

      // Last checked range
      if (lastCheckedFrom && new Date(r.lastChecked) < new Date(lastCheckedFrom)) return false;
      if (lastCheckedTo && new Date(r.lastChecked) > new Date(lastCheckedTo)) return false;

      // Show only changed links
      if (onlyChanged) {
        const changed = (r.prevAnchorText && r.prevAnchorText !== r.anchorText) ||
          (r.prevLinkType && r.prevLinkType !== r.linkType) ||
          (r.prevWrScore != null && r.prevWrScore !== r.wrScore) ||
          (r.prevSpamScore != null && r.prevSpamScore !== r.spamScore) ||
          !!r.statusChangedAt;
        if (!changed) return false;
      }

      // Global search
      if (query) {
        const q = query.toLowerCase();
        const match = r.domain.toLowerCase().includes(q) || r.anchorText.toLowerCase().includes(q) || r.targetPath.toLowerCase().includes(q) || r.sourceUrl.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rows, statusSel, healthSel, typeChange, wrRange, spamRange, anchorContains, ipOnly, srcSel, monitoringAge, lastCheckedFrom, lastCheckedTo, onlyChanged, query]);

  /* ---------- sort + windowing ---------- */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const sv = (r: TrackedBacklinkRow, key: ColKey) => {
        switch (key) {
          case "domain": return r.domain;
          case "target": return r.targetPath;
          case "anchor": return r.anchorText;
          case "status": return r.linkStatus;
          case "health": return r.health;
          case "type": return r.linkType;
          case "wr": return r.wrScore;
          case "spam": return r.spamScore;
          case "ip": return r.ipRisk ? 1 : 0;
          case "dates": return new Date(r.lastChecked).getTime();
          case "src": return r.source;
          default: return 0;
        }
      };
      const av = sv(a, sortBy); const bv = sv(b, sortBy);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const windowed = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* ---------- infinite sentinel ---------- */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("tbk-infinite-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((v) => Math.min(sorted.length, v + 60));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* ---------- helpers ---------- */
  const allVisibleIds = windowed.map(r => r.id);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected[id]);
  const someVisibleSelected = allVisibleIds.some(id => selected[id]) && !allVisibleSelected;

  const exportCSV = (onlySelected = false) => {
    const data = (onlySelected ? sorted.filter(r => selected[r.id]) : sorted);
    const header = ["domain","sourceUrl","targetPath","anchorText","linkStatus","health","linkType","wrScore","prevWrScore","spamScore","prevSpamScore","ipRisk","firstSeen","lastChecked","source","vefogix"];
    const lines = data.map(r => header.map(k => JSON.stringify(String((r as any)[k] ?? ""))).join(",")).join("\n");
    const csv = header.join(",") + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "backlinks-selected.csv" : "backlinks.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusSel([]); setHealthSel([]);
    setTypeChange("");
    setWrRange([0, 100]);
    setSpamRange([0, 100]);
    setAnchorContains("");
    setIpOnly(false);
    setSrcSel({ Audit: false, Manual: false, "CSV Upload": false });
    setMonitoringAge("");
    setLastCheckedFrom(""); setLastCheckedTo("");
    setOnlyChanged(false);
  };

  /* ---------- actions (stubs) ---------- */
  const onViewDetails = (row: TrackedBacklinkRow) => {
    // Wire to: Backlink Viewer Drawer for this domain/source URL
    console.info("Open Backlink Viewer:", row.id, row.sourceUrl);
  };
  const onCreateLink = (row: TrackedBacklinkRow) => {
    // Wire to: Opportunities Panel with domain pre-selected
    if (!row.vefogix) {
      alert("This domain is not available in Vefogix.");
      return;
    }
    const url = `/opportunities?domain=${encodeURIComponent(row.domain)}&from=backlinks`;
    window.location.href = url;
  };
  const onOpenPageAnalyzer = (row: TrackedBacklinkRow) => console.info("Open Page Analyzer:", row.targetPath);

  /* ---------- chips (collapsed summary) ---------- */
  const ActiveChips = () => {
    const chips: { label: string; onClear: () => void; key: string }[] = [];
    if (statusSel.length) chips.push({ key: "status", label: `Status: ${statusSel.join(", ")}`, onClear: () => setStatusSel([]) });
    if (healthSel.length) chips.push({ key: "health", label: `Health: ${healthSel.join(", ")}`, onClear: () => setHealthSel([]) });
    if (typeChange) chips.push({ key: "type", label: `Type Change: ${typeChange}`, onClear: () => setTypeChange("") });
    if (wrRange[0] > 0 || wrRange[1] < 100) chips.push({ key: "wr", label: `WR ${wrRange[0]}–${wrRange[1]}`, onClear: () => setWrRange([0,100]) });
    if (spamRange[0] > 0 || spamRange[1] < 100) chips.push({ key: "spam", label: `Spam ${spamRange[0]}–${spamRange[1]}`, onClear: () => setSpamRange([0,100]) });
    if (anchorContains) chips.push({ key: "anchor", label: `Anchor contains: ${anchorContains}`, onClear: () => setAnchorContains("") });
    if (ipOnly) chips.push({ key: "ip", label: `IP Risk: Yes`, onClear: () => setIpOnly(false) });
    const anySourceChecked = srcSel.Audit || srcSel.Manual || srcSel["CSV Upload"];
    if (anySourceChecked) {
      const list = Object.entries(srcSel).filter(([_,v]) => v).map(([k]) => k).join(", ");
      chips.push({ key: "src", label: `Source: ${list}`, onClear: () => setSrcSel({ Audit: false, Manual: false, "CSV Upload": false }) });
    }
    if (monitoringAge) chips.push({ key: "age", label: monitoringAge === "last7" ? "Added: Last 7d" : monitoringAge === "last30" ? "Added: Last 30d" : "First seen: before 3 mo", onClear: () => setMonitoringAge("") });
    if (lastCheckedFrom || lastCheckedTo) chips.push({ key: "lc", label: `Last Checked: ${lastCheckedFrom || "…"} → ${lastCheckedTo || "…"}`, onClear: () => { setLastCheckedFrom(""); setLastCheckedTo(""); } });
    if (onlyChanged) chips.push({ key: "chg", label: "Only changed", onClear: () => setOnlyChanged(false) });

    if (!chips.length) return null;
    return (
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          {chips.map(c => (
            <button key={c.key} className="h-7 px-2 rounded-full border text-xs inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
              onClick={c.onClear}>
              <span>{c.label}</span>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600">×</span>
            </button>
          ))}
        </div>
        <button onClick={clearFilters} className="text-xs text-blue-600 underline">Clear All</button>
      </div>
    );
  };

  /* ---------- status helpers ---------- */
  const isStatusRed = (s: LinkStatus) => s === "Removed" || s === "Broken (404)" || s === "Not Found";
  const isStatusOrange = (s: LinkStatus) => s === "Redirected (3xx)";
  const statusPulse = (changedAt?: string) => {
    if (!changedAt) return false;
    // Pulse if within last 24h of deterministic BASE_NOW
    const diff = new Date(BASE_NOW).getTime() - new Date(changedAt).getTime();
    return diff >= 0 && diff < 24 * 3600 * 1000;
  };

  /* ---------- render ---------- */
  return (
    <section className="w-full mt-4">
                         {drawerRow && (
                                <Drawer title="Drawer" onClose={closeDrawer}>
                                  <BacklinkViewerDrawerDemo   />
                                </Drawer>
                              )}
      <Card className="border" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Backlink Tracker → Backlink Activity</CardTitle>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> Auto-monitoring</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              <Switch checked={infinite} onCheckedChange={(v) => { setInfinite(Boolean(v)); if (Boolean(v)) setVisibleCount(60); }} />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground border hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {COLUMNS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          disabled={c.key === "select"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                        />
                        <span>{c.label || c.key}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCols(Object.fromEntries(COLUMNS.map(c => [c.key, true])) as any)}>Reset</Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => exportCSV(anySelected)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setSeed((s) => s + "-r")} // client-only refresh; does not affect SSR markup
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Bulk toolbar */}
        {anySelected && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t" style={{ borderColor: TOKENS.borderLight, background: TOKENS.pastelBrand }}>
            <div className="text-sm" style={{ color: TOKENS.text }}>
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="flex flex-wrap gap-2">
              {/* keep bulk actions; wire as needed */}
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={() => console.info("Create link opportunities for:", selectedIds)}><Zap className="h-4 w-4 mr-1" /> Create Links</Button>
              <Button size="sm" variant="outline" onClick={() => exportCSV(true)}><Download className="h-4 w-4 mr-1" /> Export Selection</Button>
              <Button size="sm" variant="outline" onClick={() => console.info("Flag selection for review:", selectedIds)}><FlagTriangleRight className="h-4 w-4 mr-1" /> Flag</Button>
            </div>
          </div>
        )}

        {/* ---------------- Filters (sticky within scroll area) ---------------- */}
        <CardContent className="border-t p-0" style={{ borderColor: TOKENS.borderLight }}>
          <div className="px-4 py-3 flex items-center justify-between gap-2 sticky top-0 z-40 bg-white border-b" style={{ borderColor: TOKENS.borderLight }}>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setFiltersOpen(v => !v)}>
                <Filter className="h-4 w-4" /> {filtersOpen ? "Hide Filters" : "Show Filters"}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    Filter by status, health, changes, WR/Spam ranges, IP/ASN risk, source, monitoring age, and last checked date.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="hidden sm:flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by domain, anchor, or target URL…" className="w-[300px] pl-7" />
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters}>Clear all</Button>
              </div>
            </div>
            {/* mobile search + drawer */}
            <div className="sm:hidden flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-[180px] pl-7" />
              </div>
              <Button size="sm" variant="outline" onClick={() => setMobileFiltersOpen(true)}>Filters</Button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: TOKENS.borderLight }}>
              <div className="flex flex-wrap items-center gap-2">

                {/* A) Link Status (multi) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                      <Settings2 className="h-4 w-4" /> Status {statusSel.length ? `(${statusSel.length})` : "(All)"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[260px]">
                    <div className="space-y-2">
                      {STATUSES.map(s => {
                        const on = statusSel.includes(s);
                        return (
                          <label key={s} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={on} onCheckedChange={(v) => setStatusSel(prev => v ? [...prev, s] : prev.filter(x => x !== s))} />
                            <span>{s}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => setStatusSel([])}>Reset</Button>
                      <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* B) Health State (pill multi) */}
                <div className="flex items-center gap-2">
                  {HEALTHS.map(h => {
                    const on = healthSel.includes(h);
                    const color = h === "Healthy" ? TOKENS.success : h === "At Risk" ? TOKENS.warning : TOKENS.critical;
                    return (
                      <button key={h} onClick={() => setHealthSel(prev => on ? prev.filter(x => x !== h) : [...prev, h])}
                        className={`h-8 px-3 rounded border text-sm ${on ? "text-white" : "text-gray-800"}`}
                        style={{ background: on ? color : "#fff", borderColor: on ? `${color}50` : TOKENS.borderLight }}>
                        {h}
                      </button>
                    );
                  })}
                </div>

                {/* C) Link Type Change (NO empty value option) */}
                <Select value={typeChange} onValueChange={(v: string) => setTypeChange(v as any)}>
                  <SelectTrigger className="w-[220px] h-8"><SelectValue placeholder="Link Type Change" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Change">No Change</SelectItem>
                    <SelectItem value="Any Change">Any Change</SelectItem>
                    <SelectItem value="Dofollow → Nofollow">Dofollow → Nofollow</SelectItem>
                    <SelectItem value="Nofollow → Dofollow">Nofollow → Dofollow</SelectItem>
                    <SelectItem value="Changed to Sponsored">Changed to Sponsored</SelectItem>
                    <SelectItem value="Changed to UGC">Changed to UGC</SelectItem>
                  </SelectContent>
                </Select>

                {/* D) WR Score range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                      <Settings2 className="h-4 w-4" /> WR {wrRange[0]}–{wrRange[1]}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px]" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Score range</span>
                        <span className="text-muted-foreground">{wrRange[0]} – {wrRange[1]}</span>
                      </div>
                      <Slider value={[wrRange[0], wrRange[1]]} min={0} max={100} step={5}
                        onValueChange={(v) => setWrRange(v as [number, number])} />
                      <div className="flex gap-2">
                        <Input type="number" min={0} max={100} value={wrRange[0]} onChange={(e) => setWrRange([Math.max(0, Math.min(Number(e.target.value) || 0, wrRange[1])), wrRange[1]])} className="w-20" />
                        <Input type="number" min={0} max={100} value={wrRange[1]} onChange={(e) => setWrRange([wrRange[0], Math.max(wrRange[0], Math.min(Number(e.target.value) || 0, 100))])} className="w-20" />
                        <div className="ml-auto flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setWrRange([0, 100])}>Reset</Button>
                          <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* E) Spam Score range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                      <Settings2 className="h-4 w-4" /> Spam {spamRange[0]}–{spamRange[1]}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px]" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Spam range</span>
                        <span className="text-muted-foreground">{spamRange[0]} – {spamRange[1]}</span>
                      </div>
                      <Slider value={[spamRange[0], spamRange[1]]} min={0} max={100} step={5}
                        onValueChange={(v) => setSpamRange(v as [number, number])} />
                      <div className="flex gap-2">
                        <Input type="number" min={0} max={100} value={spamRange[0]} onChange={(e) => setSpamRange([Math.max(0, Math.min(Number(e.target.value) || 0, spamRange[1])), spamRange[1]])} className="w-20" />
                        <Input type="number" min={0} max={100} value={spamRange[1]} onChange={(e) => setSpamRange([spamRange[0], Math.max(spamRange[0], Math.min(Number(e.target.value) || 0, 100))])} className="w-20" />
                        <div className="ml-auto flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSpamRange([0, 100])}>Reset</Button>
                          <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* F) Anchor match */}
                <div className="relative">
                  <Input value={anchorContains} onChange={(e) => setAnchorContains(e.target.value)} placeholder="Contains anchor: [keyword]" className="w-[230px]" />
                </div>

                {/* G) IP/Network Risk */}
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox checked={ipOnly} onCheckedChange={(v) => setIpOnly(Boolean(v))} />
                  <span>IP/ASN flagged only</span>
                </label>

                {/* H) Source */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                      <Settings2 className="h-4 w-4" /> Source
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[240px]">
                    {(["Audit","Manual","CSV Upload"] as const).map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={srcSel[s]} onCheckedChange={(v) => setSrcSel(prev => ({ ...prev, [s]: Boolean(v) }))} />
                        <span>{s}</span>
                      </label>
                    ))}
                    <div className="mt-3 flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => setSrcSel({ Audit: false, Manual: false, "CSV Upload": false })}>Reset</Button>
                      <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* I) Monitoring Age (NO empty value option) */}
                <Select value={monitoringAge} onValueChange={(v: string) => setMonitoringAge(v as any)}>
                  <SelectTrigger className="w-[220px] h-8"><SelectValue placeholder="Monitoring age" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last7">Added in last 7 days</SelectItem>
                    <SelectItem value="last30">Added in last 30 days</SelectItem>
                    <SelectItem value="before3mo">First seen before 3 months</SelectItem>
                  </SelectContent>
                </Select>

                {/* J) Last Checked */}
                <div className="flex items-center gap-2">
                  <Input type="date" value={lastCheckedFrom} onChange={(e) => setLastCheckedFrom(e.target.value)} className="h-8 w-[160px]" />
                  <span className="text-sm text-muted-foreground">→</span>
                  <Input type="date" value={lastCheckedTo} onChange={(e) => setLastCheckedTo(e.target.value)} className="h-8 w-[160px]" />
                </div>

                {/* K) Only Changed */}
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox checked={onlyChanged} onCheckedChange={(v) => setOnlyChanged(Boolean(v))} />
                  <span>Show only changed links</span>
                </label>
              </div>

              {/* Active filter chips */}
              <div className="mt-3">
                <ActiveChips />
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 border-b" style={{ borderColor: TOKENS.borderLight }}>
              <ActiveChips />
            </div>
          )}

          {/* ---------------- Table (desktop) ---------------- */}
          <div className="hidden sm:block max-h-[560px] overflow-auto">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              allVisibleIds.forEach((id) => (patch[id] = on));
                              setSelected((s) => ({ ...s, ...patch }));
                            }}
                          />
                        </div>
                      ) : !c.sortable ? (
                        c.label
                      ) : (
                        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                          <span>{c.label}</span>
                          {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowed.map((r, idx) => {
                  const zebra = idx % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]";
                  const base = `hover:bg-[#F5F7FA] ${zebra}`;
                  const leftBorder =
                    r.health === "Toxic" ? `4px solid ${TOKENS.redBorder}` :
                    r.health === "At Risk" ? `4px solid ${TOKENS.warning}` : "4px solid transparent";
                  const bgTint =
                    isStatusRed(r.linkStatus) ? "bg-red-50" :
                    isStatusOrange(r.linkStatus) ? "bg-orange-50" : base;
                  const pulse = statusPulse(r.statusChangedAt);
                  return (
                    <TableRow key={r.id} className={bgTint} style={{ borderLeft: leftBorder }}>
                      {/* select */}
                      {visibleCols.select !== false && (
                        <TableCell className="text-center">
                          <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))} />
                        </TableCell>
                      )}

                      {/* domain (+ Vefogix indicator) */}
                      {visibleCols.domain !== false && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={`https://${r.domain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-2 underline ${r.health === "Toxic" ? "text-red-600" : ""}`}
                                    style={{ color: r.health === "Toxic" ? undefined : TOKENS.valueBlue }}
                                  >
                                    <span className="inline-block w-4 h-4 rounded bg-gray-200" aria-hidden />
                                    {r.domain}
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">Source URL: {r.sourceUrl}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {r.vefogix && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center rounded-full border px-1.5 py-[1px] text-[11px] font-medium"
                                          style={{ borderColor: `${TOKENS.warning}55`, color: TOKENS.warning, background: `${TOKENS.warning}10` }}>
                                      <Zap className="h-3.5 w-3.5 mr-1" /> Vefogix
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    Available for guest post or link insertion via Vefogix marketplace.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* target page */}
                      {visibleCols.target !== false && (
                        <TableCell title={r.targetPath}>
                          <button onClick={() => onOpenPageAnalyzer(r)} className="underline" style={{ color: TOKENS.valueBlue }}>
                            <span className="inline-block max-w-[280px] truncate">{r.targetPath}</span>
                          </button>
                        </TableCell>
                      )}

                      {/* anchor */}
                      {visibleCols.anchor !== false && (
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[280px]">
                            <span className="truncate" title={r.anchorText}>{r.anchorText}</span>
                            {r.prevAnchorText && r.prevAnchorText !== r.anchorText && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <div className="text-xs">
                                      <div><strong>Anchor changed</strong>{r.anchorChangedAt ? ` · ${r.anchorChangedAt}` : ""}</div>
                                      <div>Old: “{r.prevAnchorText}”</div>
                                      <div>New: “{r.anchorText}”</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* status */}
                      {visibleCols.status !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div><StatusBadge status={r.linkStatus} pulse={pulse} /></div>
                              </TooltipTrigger>
                              <TooltipContent>{r.statusChangedAt ? `Changed ${r.statusChangedAt}` : "No recent change detected"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {/* health */}
                      {visibleCols.health !== false && (
                        <TableCell><HealthBadge health={r.health} /></TableCell>
                      )}

                      {/* link type */}
                      {visibleCols.type !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <LinkTypeBadge type={r.linkType} changed={!!(r.prevLinkType && r.prevLinkType !== r.linkType)} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {r.prevLinkType && r.prevLinkType !== r.linkType
                                  ? `Changed from ${r.prevLinkType} to ${r.linkType}${r.linkTypeChangedAt ? ` (${r.linkTypeChangedAt})` : ""}`
                                  : "No change"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {/* WR */}
                      {visibleCols.wr !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <TinyDonut value={r.wrScore} />
                                  <span className="tabular-nums">{r.wrScore}</span>
                                  <TrendIcon curr={r.wrScore} prev={r.prevWrScore} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {r.prevWrScore != null
                                  ? `Prev: ${r.prevWrScore} · Δ ${(r.wrScore - r.prevWrScore) >= 0 ? "+" : ""}${(r.wrScore - r.prevWrScore)}${r.wrChangedAt ? ` · ${r.wrChangedAt}` : ""}`
                                  : "No previous score"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {/* Spam */}
                      {visibleCols.spam !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-2">
                                  <SpamBadge value={r.spamScore} />
                                  <TrendIcon curr={r.spamScore} prev={r.prevSpamScore} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="text-xs">Factors: anchor risk, outbound ratio, domain signals, linking page quality.</div>
                                {r.prevSpamScore != null && <div className="text-xs mt-1">Prev: {r.prevSpamScore}{r.spamChangedAt ? ` · ${r.spamChangedAt}` : ""}</div>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {/* IP */}
                      {visibleCols.ip !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`text-sm font-medium ${r.ipRisk ? "text-red-600" : "text-gray-700"}`}>{r.ipRisk ? "Yes" : "No"}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {r.ipRisk ? (
                                  <div className="text-xs">
                                    <div>IP: {r.ip}</div>
                                    <div>ASN: {r.asn}</div>
                                    <div>Reason: {r.ipReason}</div>
                                  </div>
                                ) : "No network risk flagged"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {/* dates */}
                      {visibleCols.dates !== false && (
                        <TableCell>
                          <div className="leading-tight">
                            <div title={r.firstSeen}>First Seen: <span className="tabular-nums">{r.firstSeen}</span></div>
                            <div title={r.lastChecked} className="text-muted-foreground">Last Checked: <span className="tabular-nums">{r.lastChecked}</span></div>
                          </div>
                        </TableCell>
                      )}

                      {/* source */}
                      {visibleCols.src !== false && (
                        <TableCell>{r.source}</TableCell>
                      )}

                      {/* actions — View Details & Create Link (Vefogix) */}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="View Details"
                                    className="text-[#1D4ED8] cursor-pointer"
                                    onClick={openDrawer}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      aria-label="Create Link"
                                      className={r.vefogix ? "text-[#1D4ED8]" : "text-gray-300 cursor-not-allowed"}
                                      onClick={() => r.vefogix && onCreateLink(r)}
                                      disabled={!r.vefogix}
                                    >
                                      <Zap className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {r.vefogix ? "Create Link (Vefogix)" : "Not available in Vefogix"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* infinite sentinel */}
            {infinite && <div id="tbk-infinite-sentinel" className="h-10" />}
          </div>

          {/* ---------------- Mobile Accordion ---------------- */}
          <div className="sm:hidden divide-y" style={{ borderColor: TOKENS.borderLight }}>
            {windowed.map((r) => {
              const pulse = statusPulse(r.statusChangedAt);
              const lbColor = r.health === "Toxic" ? TOKENS.redBorder : r.health === "At Risk" ? TOKENS.warning : "transparent";
              const bgTint = isStatusRed(r.linkStatus) ? "bg-red-50" : isStatusOrange(r.linkStatus) ? "bg-orange-50" : "bg-white";
              return (
                <div key={r.id} className={`px-4 py-3 ${bgTint}`} style={{ borderLeft: `4px solid ${lbColor}` }}>
                  <details>
                    <summary className="flex items-center justify-between cursor-pointer">
                      <div className="min-w-0">
                        <div className={`truncate ${r.health === "Toxic" ? "text-red-600" : ""}`} style={{ color: r.health === "Toxic" ? undefined : TOKENS.text }}>
                          <span className="mr-2">{r.domain}</span>
                          {r.vefogix && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium"
                                  style={{ color: TOKENS.warning }}>
                              <Zap className="h-3.5 w-3.5" /> Vefogix
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={r.linkStatus} pulse={pulse} />
                          <HealthBadge health={r.health} />
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </summary>
                    <div className="mt-3 space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Target:</span> <button className="underline" style={{ color: TOKENS.valueBlue }} onClick={() => onOpenPageAnalyzer(r)}>{r.targetPath}</button></div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Anchor:</span>
                        <span className="truncate">{r.anchorText}</span>
                        {r.prevAnchorText && r.prevAnchorText !== r.anchorText && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      </div>
                      <div className="flex items-center gap-2"><span className="text-muted-foreground">Type:</span> <LinkTypeBadge type={r.linkType} changed={!!(r.prevLinkType && r.prevLinkType !== r.linkType)} /></div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">WR:</span>
                        <div className="flex items-center gap-2"><TinyDonut value={r.wrScore} /><span>{r.wrScore}</span><TrendIcon curr={r.wrScore} prev={r.prevWrScore} /></div>
                      </div>
                      <div className="flex items-center gap-2"><span className="text-muted-foreground">Spam:</span> <SpamBadge value={r.spamScore} /><TrendIcon curr={r.spamScore} prev={r.prevSpamScore} /></div>
                      <div><span className="text-muted-foreground">IP Risk:</span> {r.ipRisk ? `Yes · ${r.asn}` : "No"}</div>
                      <div className="text-xs text-muted-foreground">First: {r.firstSeen} · Checked: {r.lastChecked}</div>
                      <div className="pt-2 flex items-center gap-2">
                        <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={() => onViewDetails(r)}><Eye className="h-4 w-4 mr-1" /> View</Button>
                        <Button size="sm" variant={r.vefogix ? "default" : "outline"} disabled={!r.vefogix} onClick={() => onCreateLink(r)}><Zap className="h-4 w-4 mr-1" /> Create Link</Button>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>

          {/* ---------------- Pagination (optional) ---------------- */}
          {!infinite && (
            <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <div className="text-sm w-16 text-center">{page}</div>
                <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
                <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage(Math.ceil(sorted.length / pageSize))}>Last</Button>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Page size" /></SelectTrigger>
                  <SelectContent>{[10, 25, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Mobile Filters Drawer ---------------- */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col">
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: TOKENS.borderLight }}>
              <div className="font-medium">Filters</div>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-1 rounded hover:bg-gray-50">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 space-y-3 overflow-auto">
              {/* mirror key filters for mobile */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                {STATUSES.map(s => {
                  const on = statusSel.includes(s);
                  return (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={on} onCheckedChange={(v) => setStatusSel(prev => v ? [...prev, s] : prev.filter(x => x !== s))} />
                      <span>{s}</span>
                    </label>
                  );
                })}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Health</div>
                <div className="flex flex-wrap gap-2">
                  {HEALTHS.map(h => {
                    const on = healthSel.includes(h);
                    const color = h === "Healthy" ? TOKENS.success : h === "At Risk" ? TOKENS.warning : TOKENS.critical;
                    return (
                      <button key={h} onClick={() => setHealthSel(prev => on ? prev.filter(x => x !== h) : [...prev, h])}
                        className={`h-8 px-3 rounded border text-sm ${on ? "text-white" : "text-gray-800"}`}
                        style={{ background: on ? color : "#fff", borderColor: on ? `${color}50` : TOKENS.borderLight }}>
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link Type Change (NO empty value option) */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Link Type Change</div>
                <Select value={typeChange} onValueChange={(v: string) => setTypeChange(v as any)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Link Type Change" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Change">No Change</SelectItem>
                    <SelectItem value="Any Change">Any Change</SelectItem>
                    <SelectItem value="Dofollow → Nofollow">Dofollow → Nofollow</SelectItem>
                    <SelectItem value="Nofollow → Dofollow">Nofollow → Dofollow</SelectItem>
                    <SelectItem value="Changed to Sponsored">Changed to Sponsored</SelectItem>
                    <SelectItem value="Changed to UGC">Changed to UGC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">WR Range</div>
                <Slider value={[wrRange[0], wrRange[1]]} min={0} max={100} step={5} onValueChange={(v) => setWrRange(v as [number, number])} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Spam Range</div>
                <Slider value={[spamRange[0], spamRange[1]]} min={0} max={100} step={5} onValueChange={(v) => setSpamRange(v as [number, number])} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Anchor contains</div>
                <Input value={anchorContains} onChange={(e) => setAnchorContains(e.target.value)} placeholder="e.g. wranker" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={ipOnly} onCheckedChange={(v) => setIpOnly(Boolean(v))} />
                <span>IP/ASN flagged only</span>
              </label>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Source</div>
                {(["Audit","Manual","CSV Upload"] as const).map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={srcSel[s]} onCheckedChange={(v) => setSrcSel(prev => ({ ...prev, [s]: Boolean(v) }))} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>

              {/* Monitoring age (NO empty value option) */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Monitoring age</div>
                <Select value={monitoringAge} onValueChange={(v: string) => setMonitoringAge(v as any)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Monitoring age" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last7">Added in last 7 days</SelectItem>
                    <SelectItem value="last30">Added in last 30 days</SelectItem>
                    <SelectItem value="before3mo">First seen before 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Last Checked</div>
                <div className="flex items-center gap-2">
                  <Input type="date" value={lastCheckedFrom} onChange={(e) => setLastCheckedFrom(e.target.value)} className="h-8" />
                  <span className="text-sm text-muted-foreground">→</span>
                  <Input type="date" value={lastCheckedTo} onChange={(e) => setLastCheckedTo(e.target.value)} className="h-8" />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={onlyChanged} onCheckedChange={(v) => setOnlyChanged(Boolean(v))} />
                <span>Show only changed links</span>
              </label>
            </div>
            <div className="p-3 border-t flex items-center justify-between" style={{ borderColor: TOKENS.borderLight }}>
              <Button variant="outline" onClick={clearFilters}>Reset</Button>
              <Button style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={() => setMobileFiltersOpen(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


