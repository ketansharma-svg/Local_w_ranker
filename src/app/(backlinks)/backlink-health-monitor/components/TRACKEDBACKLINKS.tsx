'use client';

import { AnimatePresence, motion } from "framer-motion"
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
  ChevronDown, ChevronUp, ChevronsUpDown,
  Download, Filter, Info, RefreshCw, Search, Settings2,
  Eye, ClipboardList, Shield, AlertTriangle, TrendingDown, TrendingUp, Minus, Clock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ---------------- Wranker tokens ---------------- */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",
  valueBlue: "var(--wr-action, #1090D0)",
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
type LinkStatus = "Active" | "Removed" | "Broken (404)" | "Redirected (3xx)" | "Not Found" | "Not Checked" ;
type HealthState = "Healthy" | "At Risk" | "Toxic";
type LinkType = "Dofollow" | "Nofollow" | "Sponsored" | "UGC"|"-";

type TrackedBacklinkRow = {
  id: string;
  domain: string;               // root domain
  sourceUrl: string;            // full source
  targetPath: string;           // full target URL
  anchorText: string;
  prevAnchorText?: string;
  anchorChangedAt?: string;     // ISO (YYYY-MM-DD)
  linkStatus: LinkStatus;
  httpCode?: number | null;
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
  failedReason?: string;
  isFound?: boolean;
};

/* ---------------- Mock helpers (fallback only; unchanged UI) ---------------- */
const BASE_NOW_ISO = "2025-06-01T00:00:00.000Z";
const BASE_NOW = new Date(BASE_NOW_ISO);
function hashSeed(str: string) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function mulberry32(a: number) { return function () { let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandInt(rng: () => number, min: number, max: number) { return Math.floor(rng() * (max - min + 1)) + min; }
function daysAgoFromBase(days: number) { const ms = BASE_NOW.getTime() - days * 86400000; const d = new Date(ms); return d.toISOString().slice(0, 10); }

const STATUSES: LinkStatus[] = ["Active", "Removed", "Broken (404)", "Redirected (3xx)", "Not Found", "Not Checked"];
const HEALTHS: HealthState[] = ["Healthy", "At Risk", "Toxic"];
const TYPES: LinkType[] = ["Dofollow", "Nofollow", "Sponsored", "UGC"];

/** Mock rows as a fallback (unchanged) */
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
    });
  }
  return rows;
}

// Normalise LinkStatus for header drawer
const mapStatusForHeader = (s: LinkStatus): "active" | "removed" | "broken" | "redirected" | "not_found" | "not_checked" => {
  switch (s) {
    case "Active": return "active";
    case "Removed": return "removed";
    case "Broken (404)": return "broken";
    case "Redirected (3xx)": return "redirected";
    case "Not Found": return "not_found";
    default: return "not_checked";
  }
};
const mapTypeForHeader = (t: LinkType): "dofollow" | "nofollow" | "sponsored" | "ugc" =>
  (t === "Dofollow" ? "dofollow" : t === "Nofollow" ? "nofollow" : t.toLowerCase() as any);

// Build the payload expected by the drawer sections (header, evidence, metrics, related, risk)
function buildDetailPayload(row: TrackedBacklinkRow, allRows: TrackedBacklinkRow[]) {
  // HeaderLinkDetail payload (minimal)
  const header = {
    link_id: row.id,
    domain: row.domain,
    source_url: row.sourceUrl,
    status: mapStatusForHeader(row.linkStatus),
    status_changed_at: row.statusChangedAt,
    health_state: row.health === "Toxic" ? "toxic" : row.health === "At Risk" ? "at_risk" : "healthy",
    link_type: mapTypeForHeader(row.linkType),
    link_type_prev: row.prevLinkType ? mapTypeForHeader(row.prevLinkType) : undefined,
    link_type_changed_at: row.linkTypeChangedAt,
    disavowed: false,
  };

  // Link Evidence & Context payload (uses target/source + simple HTTP chain if we only know a single code)
  const evidence = {
    link_id: row.id,
    domain: row.domain,
    source_url: row.sourceUrl,
    target_url: row.targetPath,
    status: header.status,
    health_state: header.health_state,
    link_type: header.link_type,
    link_type_prev: header.link_type_prev,
    link_type_changed_at: header.link_type_changed_at,
    wr: row.wrScore,
    wr_prev: row.prevWrScore,
    spam: row.spamScore,
    spam_prev: row.prevSpamScore,
    ip_risk: row.ipRisk,
    ip: row.ip,
    asn: row.asn,
    anchor_current: row.anchorText,
    anchor_prev: row.prevAnchorText,
    anchor_changed_at: row.anchorChangedAt,
    location: "unknown",
    http_chain: row.httpCode ? [{ code: String(row.httpCode), url: row.sourceUrl, at: row.lastChecked }] : [],
    first_seen: row.firstSeen,
    last_checked: row.lastChecked,
  };

  // Summary cards (re-uses WR/Spam + dates)
  const summary = {
    wr: row.wrScore,
    wr_prev: row.prevWrScore,
    wr_changed_at: row.wrChangedAt,
    spam: row.spamScore,
    spam_prev: row.prevSpamScore,
    spam_changed_at: row.spamChangedAt,
    ip_risk: row.ipRisk,
    ip: row.ip,
    asn: row.asn,
    last_checked: row.lastChecked,
    first_seen: row.firstSeen,
    index_status: "unknown" as const,
  };

  // Related links (same domain, other rows)
  const related = allRows
    .filter(r => r.domain === row.domain && r.id !== row.id)
    .slice(0, 12)
    .map(r => ({
      id: r.id,
      path: (() => { try { return new URL(r.sourceUrl).pathname || "/"; } catch { return r.sourceUrl; } })(),
      source_url: r.sourceUrl,
      status: mapStatusForHeader(r.linkStatus),
      type: mapTypeForHeader(r.linkType),
      wr: r.wrScore,
      wr_prev: r.prevWrScore,
      last_checked: r.lastChecked,
      type_prev: r.prevLinkType ? mapTypeForHeader(r.prevLinkType) : undefined,
      type_changed_at: r.linkTypeChangedAt,
    }));

  // Risk section (network slice)
  const risk = {
    link_id: row.id,
    domain: row.domain,
    ip: row.ip,
    asn: row.asn,
    host: undefined,
    ip_risk: row.ipRisk,
    ip_risk_reasons: row.ipRisk ? ["Suspicious ASN (demo)", "Shared IP pool (demo)"] : [],
    last_checked: row.lastChecked,
    disavowed: false,
  };

  // Tiny trends (leave series empty unless you have history)
  const metrics = {
    wr_series: [],
    spam_series: [],
    wr: row.wrScore,
    wr_prev: row.prevWrScore,
    spam: row.spamScore,
    spam_prev: row.prevSpamScore,
  };

  return { header, evidence, summary, related, risk, metrics };
}


/* ---------------- Small UI primitives ---------------- */
const Badge = ({ text, color, title }: { text: string; color: string; title?: string }) => (
  <span title={title} className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${color}14`, color, border: `1px solid ${color}26` }}>
    {text}
  </span>
);

const StatusBadge = ({ status, pulse }: { status: LinkStatus; pulse?: boolean }) => {
  // Extract the base part (before any extra info like (code: 200))
  const baseStatus = status.split(" (")[0] as LinkStatus;

  const map: Record<LinkStatus, { text: string; color: string }> = {
    "Active": { text: "Active", color: TOKENS.success },
    "Removed": { text: "Removed", color: TOKENS.critical },
    "Broken (404)": { text: "Broken (404)", color: TOKENS.critical },
    "Redirected (3xx)": { text: "Redirected (3xx)", color: TOKENS.orange },
    "Not Found": { text: "Not Found", color: TOKENS.critical },
    "Not Checked": { text: "Not Checked", color: TOKENS.muted },
  };

  const { text, color } = map[baseStatus] || { text: baseStatus, color: TOKENS.muted };

  return (
    <span
      className={`inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium ${pulse ? "animate-pulse" : ""}`}
      style={{ background: `${color}14`, color, border: `1px solid ${color}26` }}
    >
      {status}
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
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
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
  { key: "domain", label: "Domain", width: 240, sortable: true },
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
  // { key: "actions", label: "Actions", width: 180 },
];

type ApiBacklinkItem = {
  id: number;
  backlinks: Array<{
    id: number;
    anchor_text: string | null;
    anchor_link: string | null;
    rel_attribute: string | null;
    status_code: string | number | null;
    first_seen: string | null;
    is_broken?: boolean;
    source_type?: string | null;
  }>;
  referal_url: string;
  status: string;                 
  status_code?: string | number;  
  is_found?: boolean;             
  last_checked: string | null;
  response_json?: { error?: string; post_url?: string } | null;
};

type ApiPayload = {
  /** Either an array of items OR { data: items, ... } – supports both shapes */
  results: ApiBacklinkItem[] | { data: ApiBacklinkItem[] }
  stats?: any
}

export default function TrackedBacklinksTable({ api, onOpenDetail }: { api?: ApiPayload, onOpenDetail?: (detail: any) => void; }) {

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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusSel, setStatusSel] = useState<LinkStatus[]>([]);
  const [healthSel, setHealthSel] = useState<HealthState[]>([]);
  const [typeChange, setTypeChange] = useState<
    "No Change" | "Dofollow → Nofollow" | "Nofollow → Dofollow" | "Changed to Sponsored" | "Changed to UGC" | "Any Change" | ""
  >("");
  const [wrRange, setWrRange] = useState<[number, number]>([0, 100]);
  const [spamRange, setSpamRange] = useState<[number, number]>([0, 100]);
  const [anchorContains, setAnchorContains] = useState("");
  const [ipOnly, setIpOnly] = useState(false);
  const [srcSel, setSrcSel] = useState<{ Audit: boolean; Manual: boolean; "CSV Upload": boolean }>({ Audit: false, Manual: false, "CSV Upload": false });
  const [monitoringAge, setMonitoringAge] = useState<"" | "last7" | "last30" | "before3mo">("");
  const [lastCheckedFrom, setLastCheckedFrom] = useState<string>("");
  const [lastCheckedTo, setLastCheckedTo] = useState<string>("");
  const [onlyChanged, setOnlyChanged] = useState(false);

  /* ---------- API → rows mapping (dynamic) ---------- */
// UPDATED: in rowsFromApi useMemo()
const rowsFromApi: TrackedBacklinkRow[] | null = useMemo(() => {
  const apiResults = (api as any)?.results;
  const items: ApiBacklinkItem[] = Array.isArray(apiResults)
    ? apiResults as ApiBacklinkItem[]
    : (apiResults?.data ?? []) as ApiBacklinkItem[];

  if (!items?.length) return null;

  const out: TrackedBacklinkRow[] = [];

  for (const item of items) {
    const sourceUrl = item.referal_url;
    const domain = (() => { try { return new URL(sourceUrl).host; } catch { return sourceUrl; } })();

    // ---------------------------------------------------------
    // CASE B: backlinks empty → add ONE row with httpCode = null
    // ---------------------------------------------------------
    if (!item.backlinks || item.backlinks.length === 0) {
      out.push({
        id: `api-${item.id}-nolinks`,
        domain,
        sourceUrl,
        targetPath: "—",
        anchorText: "—",
        linkStatus: "Not Checked",   // not shown in UI, ok to keep
        httpCode: null,              // ← IMPORTANT: no backlink code exists
        health: "At Risk",
        linkType: "-",
        wrScore: 70,
        spamScore: 15,
        ipRisk: false,
        firstSeen: "—",
        lastChecked: item.last_checked ? item.last_checked.slice(0, 10) : "—",
        source: "Audit",
      });
      continue;
    }

    // ---------------------------------------------------------
    // CASE A: backlinks present → use ONLY backlink.status_code
    // ---------------------------------------------------------
    for (const bl of item.backlinks) {
      const codeRaw = bl?.status_code ?? null;                  // ← backlink only
      const codeNum =
        typeof codeRaw === "string" ? parseInt(codeRaw, 10) :
        typeof codeRaw === "number" ? codeRaw : undefined;

      const linkTypeRaw = (bl.rel_attribute || "").toLowerCase();
      const linkType: LinkType =
        linkTypeRaw === "dofollow" ? "Dofollow" :
        linkTypeRaw === "sponsored" ? "Sponsored" :
        linkTypeRaw === "ugc" ? "UGC" : "Nofollow";

      out.push({
        id: `api-${item.id}-${bl.id}`,
        domain,
        sourceUrl,
        targetPath: bl.anchor_link || "—",
        anchorText: bl.anchor_text || "—",
        linkStatus: "Active",        // not shown; safe placeholder
        httpCode: codeNum ?? null,   // ← backlink-only
        health: "Healthy",
        linkType,
        wrScore: 70,
        spamScore: 15,
        ipRisk: false,
        firstSeen: bl.first_seen ? bl.first_seen.slice(0, 10) : "—",
        lastChecked: item.last_checked ? item.last_checked.slice(0, 10) : "—",
        source: (bl.source_type || "").toLowerCase() === "manual" ? "Manual" : "Audit",
      });
    }
  }

  return out;
}, [api]);


  // ---------- choose data source (API → mock fallback) ----------
  const useApi = Boolean(rowsFromApi && rowsFromApi.length);
  const [seed, setSeed] = useState("wranker-demo");
  const mockRows = useMemo(() => makeRows(220, seed), [seed]);
  const rows = useMemo(() => (useApi ? rowsFromApi! : []), [useApi, rowsFromApi]);

  // ---------- dynamic filter option sets built from current rows ----------
  const AVAILABLE_STATUS = useMemo(() => Array.from(new Set(rows.map(r => r.linkStatus))), [rows]);
  const AVAILABLE_TYPES = useMemo(() => Array.from(new Set(rows.map(r => r.linkType))), [rows]);
  const AVAILABLE_HEALTH = useMemo(() => Array.from(new Set(rows.map(r => r.health))), [rows]);

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusSel.length && !statusSel.includes(r.linkStatus)) return false;
      if (healthSel.length && !healthSel.includes(r.health)) return false;

      if (typeChange) {
        const changed = !!r.prevLinkType && r.prevLinkType !== r.linkType;
        if (typeChange === "No Change" && changed) return false;
        if (typeChange === "Any Change" && !changed) return false;
        if (typeChange === "Dofollow → Nofollow" && !(r.prevLinkType === "Dofollow" && r.linkType === "Nofollow")) return false;
        if (typeChange === "Nofollow → Dofollow" && !(r.prevLinkType === "Nofollow" && r.linkType === "Dofollow")) return false;
        if (typeChange === "Changed to Sponsored" && !(r.linkType === "Sponsored" && r.prevLinkType && r.prevLinkType !== "Sponsored")) return false;
        if (typeChange === "Changed to UGC" && !(r.linkType === "UGC" && r.prevLinkType && r.prevLinkType !== "UGC")) return false;
      }

      if (r.wrScore < wrRange[0] || r.wrScore > wrRange[1]) return false;
      if (r.spamScore < spamRange[0] || r.spamScore > spamRange[1]) return false;

      if (anchorContains && !r.anchorText.toLowerCase().includes(anchorContains.toLowerCase())) return false;

      if (ipOnly && !r.ipRisk) return false;

      const anySourceChecked = srcSel.Audit || srcSel.Manual || srcSel["CSV Upload"];
      if (anySourceChecked && !srcSel[r.source]) return false;

      const baseMs = BASE_NOW.getTime();
      const firstSeenMs = new Date(r.firstSeen).getTime();
      if (monitoringAge === "last7" && !(firstSeenMs >= baseMs - 7 * 86400000)) return false;
      if (monitoringAge === "last30" && !(firstSeenMs >= baseMs - 30 * 86400000)) return false;
      if (monitoringAge === "before3mo" && !(firstSeenMs <= baseMs - 90 * 86400000)) return false;

      if (lastCheckedFrom && new Date(r.lastChecked) < new Date(lastCheckedFrom)) return false;
      if (lastCheckedTo && new Date(r.lastChecked) > new Date(lastCheckedTo)) return false;

      if (onlyChanged) {
        const changed = (r.prevAnchorText && r.prevAnchorText !== r.anchorText) ||
          (r.prevLinkType && r.prevLinkType !== r.linkType) ||
          (r.prevWrScore != null && r.prevWrScore !== r.wrScore) ||
          (r.prevSpamScore != null && r.prevSpamScore !== r.spamScore) ||
          !!r.statusChangedAt;
        if (!changed) return false;
      }

      if (query) {
        const q = query.toLowerCase();
        const match = r.domain.toLowerCase().includes(q) || r.anchorText.toLowerCase().includes(q) || r.targetPath.toLowerCase().includes(q) || r.sourceUrl.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rows, statusSel, healthSel, typeChange, wrRange, spamRange, anchorContains, ipOnly, srcSel, monitoringAge, lastCheckedFrom, lastCheckedTo, onlyChanged, query]);

  /* ---------- sort + windowing ---------- */
  useEffect(() => { setSortDir(sortDir); }, [sortDir]);
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
    const header = ["domain", "sourceUrl", "targetPath", "anchorText", "linkStatus", "health", "linkType", "wrScore", "prevWrScore", "spamScore", "prevSpamScore", "ipRisk", "firstSeen", "lastChecked", "source"];
    const lines = data.map(r => header.map(k => JSON.stringify(String((r as any)[k] ?? ""))).join(",")).join("\n");
    const csv = header.join(",") + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "tracked-backlinks-selected.csv" : "tracked-backlinks.csv";
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
  const onOpenSourceDrawer = (row: TrackedBacklinkRow) => console.info("Open Source Link Drawer →", row.id);
  const onCreateTask = (row: TrackedBacklinkRow) => console.info("Create Task prefilled:", { title: `Recover backlink from ${row.domain}`, project: "(pick)", link: row.sourceUrl, anchor: row.anchorText, type: row.linkType, issue: row.linkStatus });
  const onDisavow = (row: TrackedBacklinkRow) => {
    const url = `/backlinks/disavow?domain=${encodeURIComponent(row.domain)}`;
    window.location.href = url;
  };

  /* ---------- status helpers ---------- */
  const statusPulse = (changedAt?: string) => {
    if (!changedAt) return false;
    const diff = new Date(BASE_NOW).getTime() - new Date(changedAt).getTime();
    return diff >= 0 && diff < 24 * 3600 * 1000;
  };

  const HttpStatusPill = ({ code }: { code?: number | string | null }) => {
    const n = typeof code === "string" ? parseInt(code, 10) : (typeof code === "number" ? code : NaN);
    let label = "—";
    let color = TOKENS.muted;

    if (!Number.isNaN(n)) {
      if (n >= 200 && n <= 299) { label = `${n} OK`; color = TOKENS.success; }
      else if (n >= 300 && n <= 399) { label = `${n} Redirect`; color = TOKENS.orange; }
      else if (n >= 400 && n <= 499) { label = `${n} Not Found`; color = TOKENS.critical; }
      else if (n >= 500 && n <= 599) { label = `${n} Server Error`; color = TOKENS.critical; }
      else { label = String(n); color = TOKENS.muted; }
    }

    return (
      <span
        className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
        style={{ background: `${color}14`, color, border: `1px solid ${color}26` }}
        title="HTTP status code returned by the source page for the link"
      >
        {label}
      </span>
    );
  };


  /* ---------- Renderers for desktop table cells ---------- */
  const renderCell = (r: TrackedBacklinkRow, col: ColKey) => {

    switch (col) {
      case "select":
        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={!!selected[r.id]}
              onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
            />
          </div>
        );
      case "domain":
        return (
          <div className="flex flex-col">
            <a
              href={r.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline "
              // onClick={(e) => {
              //   e.preventDefault();
              //   onOpenDetail?.(buildDetailPayload(r, rows));
              // }}
            >
              {r.domain}
            </a>
            <div className="text-xs text-muted-foreground truncate max-w-[260px]">{r.sourceUrl}</div>
          </div>
        );

      case "target":
        return (
          <div className="flex flex-col">
            <a href={r.targetPath} target="_blank" rel="noreferrer" className="hover:underline break-all text-brand-blue1">{r.targetPath}</a>
          </div>
        );
      case "anchor":
        return (
          <div className="max-w-[280px] truncate" title={r.anchorText}>{r.anchorText}</div>
        );
case "status":
  const code = r.httpCode
  return (
    <div className="flex items-center gap-2">
      <HttpStatusPill code={r.httpCode} />
      
      {r.failedReason ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {r.failedReason}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
      case "health":
        return <HealthBadge health={r.health} />;
      case "type":
        return <LinkTypeBadge type={r.linkType} changed={!!(r.prevLinkType && r.prevLinkType !== r.linkType)} />;
      case "wr":
        return (
          <div className="flex items-center gap-2 relative  filter blur-xs cursor-not-allowed">
            <TinyDonut value={r.wrScore} />
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{r.wrScore}</span>
              <TrendIcon curr={r.wrScore} prev={r.prevWrScore} />
            </div>
          </div>
        );
      case "spam":
        return (
          <div className="flex items-center gap-2 filter blur-xs cursor-not-allowed">
            <SpamBadge value={r.spamScore} />
            <TrendIcon curr={r.spamScore} prev={r.prevSpamScore} />
          </div>
        );
      case "ip":
        return (
          r.ipRisk ? (
            <div className="inline-flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Flagged</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )
        );
      case "dates":
        return (
          <div className="text-sm">
            <div className="text-foreground">{r.firstSeen}</div>
            <div className="text-muted-foreground">{r.lastChecked}</div>
          </div>
        );
      case "src":
        return <span className="text-sm">{r.source}</span>;
      case "actions":
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpenDetail?.(buildDetailPayload(r, rows))}
              className="h-7 px-2">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCreateTask(r)} className="h-7 px-2">
              <ClipboardList className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDisavow(r)} className="h-7 px-2">
              <Shield className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  /* ---------- chips (collapsed summary) ---------- */
  const ActiveChips = () => {
    const chips: { label: string; onClear: () => void; key: string }[] = [];
    if (statusSel.length) chips.push({ key: "status", label: `Status: ${statusSel.join(", ")}`, onClear: () => setStatusSel([]) });
    if (healthSel.length) chips.push({ key: "health", label: `Health: ${healthSel.join(", ")}`, onClear: () => setHealthSel([]) });
    if (typeChange) chips.push({ key: "type", label: `Type Change: ${typeChange}`, onClear: () => setTypeChange("") });
    if (wrRange[0] > 0 || wrRange[1] < 100) chips.push({ key: "wr", label: `WR ${wrRange[0]}–${wrRange[1]}`, onClear: () => setWrRange([0, 100]) });
    if (spamRange[0] > 0 || spamRange[1] < 100) chips.push({ key: "spam", label: `Spam ${spamRange[0]}–${spamRange[1]}`, onClear: () => setSpamRange([0, 100]) });
    if (anchorContains) chips.push({ key: "anchor", label: `Anchor contains: ${anchorContains}`, onClear: () => setAnchorContains("") });
    if (ipOnly) chips.push({ key: "ip", label: `IP Risk: Yes`, onClear: () => setIpOnly(false) });
    const anySourceChecked = srcSel.Audit || srcSel.Manual || srcSel["CSV Upload"];
    if (anySourceChecked) {
      const list = Object.entries(srcSel).filter(([_, v]) => v).map(([k]) => k).join(", ");
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

  return (
    <section className="space-y-3">
      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Backlink Audit → Tracked Backlinks</CardTitle>
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
                  <Settings2 className="h-4 w-4" /> Columns
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
              onClick={() => setSeed((s) => s + "-r")}
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
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={() => console.info("Create tasks for:", selectedIds)}><ClipboardList className="h-4 w-4 mr-1" /> Create Tasks</Button>
              <Button size="sm" variant="outline" onClick={() => exportCSV(true)}><Download className="h-4 w-4 mr-1" /> Export Selection</Button>
              <Button size="sm" variant="destructive" onClick={() => console.info("Disavow selection:", selectedIds)}><Shield className="h-4 w-4 mr-1" /> Disavow</Button>
            </div>
          </div>
        )}

        {/* ---------------- Filters (unchanged UI) ---------------- */}
        <CardContent className="border-t p-0  " style={{ borderColor: TOKENS.borderLight }}>
<div
  className="px-4 py-3 flex items-center justify-between bg-white border-b"
  style={{ borderColor: TOKENS.borderLight }}
>
  {/* Left side - filters and clear */}
  <div className="flex items-center gap-2">
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      onClick={() => setFiltersOpen((v) => !v)}
    >
      <Filter className="h-4 w-4" />
      {filtersOpen ? "Hide Filters" : "Show Filters"}
    </Button>

    <Button
      variant="outline"
      size="sm"
      className="hidden sm:inline-flex"
      onClick={clearFilters}
    >
      Clear all
    </Button>
  </div>

  {/* Right side - search + responsive filters */}
  <div className="flex items-center gap-2">
    {/* Desktop search */}
    <div className="hidden sm:block relative">
      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by domain, anchor, or target URL…"
        className="w-[300px] pl-7 border rounded-md p-2"
      />
    </div>

    {/* Mobile search */}
    <div className="sm:hidden relative">
      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="w-[180px] pl-7"
      />
    </div>

    {/* Mobile filters */}
    <Button
      size="sm"
      variant="outline"
      className="sm:hidden"
      onClick={() => setMobileFiltersOpen(true)}
    >
      Filters
    </Button>
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

                {/* B) Health State */}
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

                {/* C) Link Type Change */}
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

                {/* D) WR Score */}
                {/* <Popover>
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
                </Popover> */}

                {/* E) Spam Score */}
                {/* <Popover>
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
                </Popover> */}

                {/* F) Anchor contains */}
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
                    {(["Audit", "Manual", "CSV Upload"] as const).map(s => (
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

                {/* I) Monitoring Age */}
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

          {/* ---------------- Table (desktop) → now fully dynamic ---------------- */}
          <div className="hidden sm:block max-h-[560px] overflow-auto">
            <Table className="text-sm">
              <TableHeader className=" bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
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
                <AnimatePresence initial={false}>
                  {windowed.map((r, idx) => {
                    const zebra = idx % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]";
                    const leftBorder = r.health === "Toxic" ? `4px solid ${TOKENS.redBorder}` :
                      r.health === "At Risk" ? `4px solid ${TOKENS.warning}` : "4px solid transparent";
                    const family = typeof r.httpCode === "number" ? Math.floor(r.httpCode / 100) : 0;
                    const bgTint =
                      family === 4 || family === 5 ? "bg-red-50"
                        : family === 3 ? "bg-orange-50"
                          : zebra;

                    return (
                      <motion.tr
                        key={r.id}
                        className={bgTint}
                        style={{ borderLeft: leftBorder }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: Math.min(idx, 8) * 0.02 } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
                        layout
                      >
                        {visibleColumns.map((c) => (
                          <TableCell
                            key={c.key}
                            className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                            style={{ minWidth: c.width }}
                          >
                            {renderCell(r, c.key)}
                          </TableCell>
                        ))}
                      </motion.tr>
                    );
                  })}

{!windowed.length && (
  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-muted-foreground">
      No backlinks match your filters.
      {/* Optional improvement: if api provided items but many were blocked, you can compute a count and show a hint */}
    </TableCell>
  </motion.tr>
)}

                </AnimatePresence>
              </TableBody>
            </Table>

            {/* infinite sentinel */}
            {infinite && <div id="tbk-infinite-sentinel" className="h-10" />}
          </div>

          {/* ---------------- Mobile Accordion (UI unchanged placeholder) ---------------- */}
          <div className="sm:hidden divide-y" style={{ borderColor: TOKENS.borderLight }}>
            <AnimatePresence initial={false}>
              {windowed.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: Math.min(i, 8) * 0.02 } }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                >
                  {/* existing mobile row markup unchanged */}
                  <div className="p-3">
                    <div className="font-medium">{r.domain}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.sourceUrl}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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

      {/* ---------------- Mobile Filters Drawer (unchanged) ---------------- */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0  sm:hidden" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col">
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: TOKENS.borderLight }}>
              <div className="font-medium">Filters</div>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-1 rounded hover:bg-gray-50">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 space-y-3 overflow-auto">
              {/* Mirror of key filters (kept minimal to avoid UI change) */}
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
