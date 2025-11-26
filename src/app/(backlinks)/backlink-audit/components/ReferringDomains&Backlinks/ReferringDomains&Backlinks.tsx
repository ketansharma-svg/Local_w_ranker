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
  Eye, ClipboardList, Trash2, Shield, Link2, Globe2, FlagTriangleRight, Tag, ListChecks, Gauge, ExternalLink, Code2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Tab 2: Referring Domains & Backlinks
 * NOTE: Wire data fetching to DataForSEO API.
 * Fonts: Inter + Inter Fallback. Hyperlink color: #0077ff. Brand icons color: #008CCD.
 */

/* ---------- Latest Tokens (aligned with recent designs) ---------- */
const TOKENS = {
  // palette
  brand: "var(--brand-600, #008CCD)",              // primary brand (icons, accents)
  brandSoft: "var(--brand-50, #E6F6FC)",
  linkBlue: "var(--link-600, #0077ff)",            // hyperlinks
  text: "var(--text-900, #0F172A)",
  textMuted: "var(--text-600, #64748B)",
  border: "var(--border-200, #E5E7EB)",
  borderLight: "var(--border-100, #EFF0F6)",
  bgApp: "var(--bg-50, #F7FAFC)",
  success: "var(--success-600, #10B981)",
  warning: "var(--warning-600, #F59E0B)",
  critical: "var(--critical-600, #EF4444)",
  radius: "var(--radius-md, 12px)",
};

/* ---------- Types ---------- */
type ListMode = "All" | "Whitelist" | "For Review";
type DisavowStatus = "Not Disavowed" | "Pending" | "Disavowed";
type AnchorRisk = "High" | "Medium" | "Low";
type LinkAttribute = "dofollow" | "nofollow" | "ugc" | "sponsored";
type ToxicMarker = "Link Farm" | "Spam" | "Malware" | "Suspicious TLD" | "Mirror Site" | "Low Authority";
type IndexStatus = "Indexed" | "Not Indexed";

type DomainRow = {
  id: string;
  domain: string;
  wrScore: number;                  // 0..100
  backlinks: number;
  anchorRisk: AnchorRisk;
  disavow: DisavowStatus;
  category: string;
  toxic: ToxicMarker[];
  attributes: LinkAttribute[];      // dominant attributes across links from domain
  isNew: boolean;
  referral: number;                 // GA4 sessions from this domain
  ga4: boolean;                     // GA4 connected?
  whitelisted: boolean;
  forReview: boolean;

  // New important metrics
  firstSeen: string;                // ISO date
  lastSeen: string;                 // ISO date
  googleIndexed: IndexStatus;
};

type LinkRow = {
  id: string;
  domain: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  anchorRisk: AnchorRisk;
  attributes: LinkAttribute[];
  toxic: ToxicMarker[];
  category: string;
  isNew: boolean;
  referral: number;                 // GA4 sessions for this source URL
  ga4: boolean;
  disavow: DisavowStatus;
  whitelisted: boolean;
  forReview: boolean;

  // New important metrics (URL-level)
  wrScore: number;                  // Page-level WR
  firstSeen: string;
  lastSeen: string;
  googleIndexed: IndexStatus;
  statusCode: number;
  linkPlacement: "Header" | "Content" | "Sidebar" | "Footer";
  isLive: boolean;
  pageTitle: string;
  canonical: string | null;
  metaRobots: string[];
  extLinks: number;                 // external links on page
  wordCount: number;
  language: string;                 // e.g., en, es
};

type GroupBy = "domain" | "url";

const CATEGORIES = ["Blog", "Business", "Directory", "Forum", "News/Media", "E‑commerce", "Other"] as const;
const ATTRS: LinkAttribute[] = ["dofollow", "nofollow", "ugc", "sponsored"];
const TOXIC: ToxicMarker[] = ["Link Farm", "Spam", "Suspicious TLD", "Low Authority", "Malware", "Mirror Site"];

/* ---------- Utilities & Micro-UI ---------- */
const FONTS = { fontFamily: 'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif' };

const Badge = ({ text, color, title }: { text: string; color: string; title?: string }) => (
  <span
    title={title}
    className="inline-flex items-center rounded-full border px-2 py-[2px] text-[12px] font-medium"
    style={{ background: `${color}16`, color, borderColor: `${color}33` }}
  >
    {text}
  </span>
);

const RiskPill = ({ risk }: { risk: AnchorRisk }) => {
  const color = risk === "High" ? TOKENS.critical : risk === "Medium" ? TOKENS.warning : TOKENS.success;
  return <Badge text={risk} color={color} title="Anchor risk level" />;
};

const DisavowPill = ({ s }: { s: DisavowStatus }) => {
  const color = s === "Disavowed" ? TOKENS.success : s === "Pending" ? TOKENS.warning : TOKENS.textMuted;
  return <Badge text={s} color={color} title="Disavow status" />;
};

const IndexPill = ({ status }: { status: IndexStatus }) => {
  const color = status === "Indexed" ? TOKENS.success : TOKENS.critical;
  return <Badge text={status} color={color} title="Google index status" />;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function randomDateWithin(days = 120) {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * days) * 24 * 60 * 60 * 1000;
  return new Date(past).toISOString();
}

/* ---------- Mini Circular Gauge for WR score ---------- */
const MiniGauge = ({ value }: { value: number }) => {
  const size = 26;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={TOKENS.brand}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="tabular-nums">{value}</span>
    </div>
  );
};

/* ---------- Mock Data (replace with DataForSEO wiring) ---------- */
function makeDomainRows(count = 140): DomainRow[] {
  return Array.from({ length: count }, (_, i) => {
    const wrScore = Math.max(0, Math.min(100, Math.round(10 + Math.random() * 90)));
    const referral = Math.random() > 0.2 ? Math.floor(Math.random() * 2500) : 0;
    const anchorRisk: AnchorRisk = Math.random() > 0.75 ? "High" : Math.random() > 0.5 ? "Medium" : "Low";
    const disavow: DisavowStatus = Math.random() > 0.9 ? "Disavowed" : Math.random() > 0.8 ? "Pending" : "Not Disavowed";
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const attrs = ATTRS.filter(() => Math.random() > 0.6);
    const tox = TOXIC.filter(() => Math.random() > 0.75).slice(0, 2);
    const first = randomDateWithin(360);
    const last = randomDateWithin(60);
    const googleIndexed: IndexStatus = Math.random() > 0.2 ? "Indexed" : "Not Indexed";
    return {
      id: `d-${i + 1}`,
      domain: `example${i + 1}.com`,
      wrScore,
      backlinks: Math.floor(Math.random() * 90) + 1,
      anchorRisk,
      disavow,
      category,
      attributes: attrs.length ? attrs : ["nofollow"],
      toxic: tox,
      isNew: Math.random() > 0.85,
      referral,
      ga4: Math.random() > 0.15,
      whitelisted: Math.random() > 0.85,
      forReview: Math.random() > 0.85,
      firstSeen: first,
      lastSeen: last,
      googleIndexed,
    };
  });
}

function makeLinkRows(count = 260): LinkRow[] {
  const placements: LinkRow["linkPlacement"][] = ["Header", "Content", "Sidebar", "Footer"];
  const langs = ["en", "es", "de", "fr", "it"];
  return Array.from({ length: count }, (_, i) => {
    const domain = `example${(i % 80) + 1}.com`;
    const wrScore = Math.max(0, Math.min(100, Math.round(10 + Math.random() * 90)));
    const anchorRisk: AnchorRisk = Math.random() > 0.78 ? "High" : Math.random() > 0.5 ? "Medium" : "Low";
    const disavow: DisavowStatus = Math.random() > 0.92 ? "Disavowed" : Math.random() > 0.82 ? "Pending" : "Not Disavowed";
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const attrs = ATTRS.filter(() => Math.random() > 0.6);
    const tox = TOXIC.filter(() => Math.random() > 0.8).slice(0, 2);
    const referral = Math.random() > 0.3 ? Math.floor(Math.random() * 500) : 0;
    const first = randomDateWithin(360);
    const last = randomDateWithin(60);
    const googleIndexed: IndexStatus = Math.random() > 0.15 ? "Indexed" : "Not Indexed";
    const statusCode = [200, 200, 200, 301, 302, 404, 410][Math.floor(Math.random() * 7)];
    const linkPlacement = placements[Math.floor(Math.random() * placements.length)];
    const isLive = Math.random() > 0.08;
    const pageTitle = `Article ${(i % 20) + 1} on ${domain}`;
    const canonical = Math.random() > 0.2 ? `https://${domain}/post/${i + 1}` : null;
    const metaRobots = Math.random() > 0.9 ? ["noindex", "nofollow"] : [];
    const extLinks = Math.floor(Math.random() * 120);
    const wordCount = 300 + Math.floor(Math.random() * 2500);
    const language = langs[Math.floor(Math.random() * langs.length)];
    return {
      id: `u-${i + 1}`,
      domain,
      sourceUrl: `https://${domain}/post/${i + 1}`,
      targetUrl: `/blog/article-${(i % 20) + 1}`,
      anchorText: Math.random() > 0.75 ? "best seo tools" : Math.random() > 0.5 ? "click here" : "Wranker",
      anchorRisk,
      disavow,
      category,
      attributes: attrs.length ? attrs : ["nofollow"],
      toxic: tox,
      isNew: Math.random() > 0.85,
      referral,
      ga4: Math.random() > 0.15,
      whitelisted: Math.random() > 0.9,
      forReview: Math.random() > 0.88,
      wrScore,
      firstSeen: first,
      lastSeen: last,
      googleIndexed,
      statusCode,
      linkPlacement,
      isLive,
      pageTitle,
      canonical,
      metaRobots,
      extLinks,
      wordCount,
      language,
    };
  });
}

/* ---------- Columns ---------- */
type ColKeyDomain =
  | "select" | "expander" | "domain" | "wrScore" | "backlinks"
  | "anchorRisk" | "googleIndexed" | "firstSeen" | "lastSeen"
  | "category" | "attributes" | "toxic" | "disavow" | "isNew" | "referral" | "actions";

type ColKeyURL =
  | "select" | "expander" | "sourceUrl" | "targetUrl" | "anchorText"
  | "wrScore" | "statusCode" | "googleIndexed" | "firstSeen" | "lastSeen"
  | "anchorRisk" | "attributes" | "toxic" | "category" | "isNew" | "referral" | "disavow" | "actions";

type ColumnDef<K extends string> = {
  key: K;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

const domainColumns: ColumnDef<ColKeyDomain>[] = [
  { key: "select", label: "", width: 36, align: "center" },
  { key: "expander", label: "", width: 36, align: "center" },
  { key: "domain", label: "Domain", width: 260, sortable: true },
  { key: "wrScore", label: "WR Score", width: 130, sortable: true },
  { key: "backlinks", label: "Ref. Backlinks", width: 140, sortable: true },
  { key: "anchorRisk", label: "Anchor Risk", width: 130, sortable: true },
  { key: "googleIndexed", label: "Google Index", width: 140, sortable: true },
  { key: "firstSeen", label: "First Seen", width: 140, sortable: true },
  { key: "lastSeen", label: "Last Seen", width: 140, sortable: true },
  { key: "category", label: "Category", width: 160, sortable: true },
  { key: "attributes", label: "Link Attributes", width: 200 },
  { key: "toxic", label: "Toxic Markers", width: 220 },
  { key: "disavow", label: "Disavow", width: 130, sortable: true },
  { key: "isNew", label: "New", width: 80, sortable: true },
  { key: "referral", label: "Referral Traffic", width: 170, sortable: true },
  { key: "actions", label: "Actions", width: 210 },
];

const urlColumns: ColumnDef<ColKeyURL>[] = [
  { key: "select", label: "", width: 36, align: "center" },
  { key: "expander", label: "", width: 36, align: "center" },
  { key: "sourceUrl", label: "Source URL", width: 360, sortable: true },
  { key: "targetUrl", label: "Target URL", width: 300, sortable: true },
  { key: "anchorText", label: "Anchor", width: 220, sortable: true },
  { key: "wrScore", label: "WR Score", width: 130, sortable: true },
  { key: "statusCode", label: "HTTP", width: 110, sortable: true },
  { key: "googleIndexed", label: "Google Index", width: 140, sortable: true },
  { key: "firstSeen", label: "First Seen", width: 140, sortable: true },
  { key: "lastSeen", label: "Last Seen", width: 140, sortable: true },
  { key: "anchorRisk", label: "Anchor Risk", width: 130, sortable: true },
  { key: "attributes", label: "Link Attribute", width: 180 },
  { key: "toxic", label: "Toxic Markers", width: 220 },
  { key: "category", label: "Category", width: 160, sortable: true },
  { key: "isNew", label: "New", width: 80, sortable: true },
  { key: "referral", label: "Referral Traffic", width: 170, sortable: true },
  { key: "disavow", label: "Disavow", width: 130, sortable: true },
  { key: "actions", label: "Actions", width: 210 },
];

/* ---------- Component ---------- */
export default function ReferringDomainsBacklinks() {
  /* base data */
  const [groupBy, setGroupBy] = useState<GroupBy>("domain");
  const [domainRows, setDomainRows] = useState<DomainRow[]>(() => makeDomainRows());
  const [linkRows, setLinkRows] = useState<LinkRow[]>(() => makeLinkRows());

  /* selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  /* expansion */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true;
      return next;
    });
  };

  /* infinite / pagination */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* filters */
  type SearchMode = "Domain" | "Source URL" | "Target URL" | "Anchor";
  const [searchMode, setSearchMode] = useState<SearchMode>("Domain");
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<ListMode>("All");
  const [newOnly, setNewOnly] = useState(false);
  const [category, setCategory] = useState<string | "All">("All");
  const [anchorRisk, setAnchorRisk] = useState<AnchorRisk | "All">("All");
  const [attrsFilter, setAttrsFilter] = useState<LinkAttribute[]>([]);
  const [toxicsFilter, setToxicsFilter] = useState<ToxicMarker[]>([]);
  const [wrMin, setWrMin] = useState(0);
  const [wrMax, setWrMax] = useState(100);
  const [trafficMin, setTrafficMin] = useState(0);
  const [trafficMax, setTrafficMax] = useState(2500);
  const [indexFilter, setIndexFilter] = useState<"All" | IndexStatus>("All");
  const [httpMin, setHttpMin] = useState(100);
  const [httpMax, setHttpMax] = useState(599);

  const wrActive = wrMin > 0 || wrMax < 100;
  const trafficActive = trafficMin > 0 || trafficMax < 2500;
  const httpActive = httpMin > 100 || httpMax < 599 || groupBy === "domain" ? false : true;

  /* sorting */
  const [sortBy, setSortBy] = useState<string>("wrScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  useEffect(() => {
    setSortBy(groupBy === "domain" ? "wrScore" : "referral");
    setSortDir("desc");
    // reset search mode for clarity
    setSearchMode(groupBy === "domain" ? "Domain" : "Source URL");
  }, [groupBy]);

  const toggleSort = (key: string) => {
    if (key === "select" || key === "expander" || key === "actions") return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
  };

  /* visible columns control */
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    Object.fromEntries([...domainColumns, ...urlColumns].map(c => [c.key, true]))
  );
  const columns = groupBy === "domain" ? domainColumns : urlColumns;
  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols[c.key] !== false),
    [columns, visibleCols]
  );

  /* sticky helpers */
  const stickyStyle = (key: string) =>
    key === "select"
      ? { position: "sticky" as const, left: 0, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : key === "expander"
      ? { position: "sticky" as const, left: 36, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : (groupBy === "domain" && key === "domain") || (groupBy === "url" && key === "sourceUrl")
      ? { position: "sticky" as const, left: 72, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : {};

  /* filtering pipeline */
  const filtered = useMemo(() => {
    if (groupBy === "domain") {
      return domainRows.filter((r) => {
        if (listMode === "Whitelist" && !r.whitelisted) return false;
        if (listMode === "For Review" && !r.forReview) return false;
        if (newOnly && !r.isNew) return false;
        if (category !== "All" && r.category !== category) return false;
        if (anchorRisk !== "All" && r.anchorRisk !== anchorRisk) return false;
        if (attrsFilter.length && !attrsFilter.some((a) => r.attributes.includes(a))) return false;
        if (toxicsFilter.length && !toxicsFilter.some((t) => r.toxic.includes(t))) return false;
        if (indexFilter !== "All" && r.googleIndexed !== indexFilter) return false;
        if (!(r.wrScore >= wrMin && r.wrScore <= wrMax)) return false;
        if (!(r.referral >= trafficMin && r.referral <= trafficMax)) return false;
        if (query) {
          const q = query.toLowerCase();
          if (!r.domain.toLowerCase().includes(q)) return false;
        }
        return true;
      });
    } else {
      return linkRows.filter((r) => {
        if (listMode === "Whitelist" && !r.whitelisted) return false;
        if (listMode === "For Review" && !r.forReview) return false;
        if (newOnly && !r.isNew) return false;
        if (category !== "All" && r.category !== category) return false;
        if (anchorRisk !== "All" && r.anchorRisk !== anchorRisk) return false;
        if (attrsFilter.length && !attrsFilter.some((a) => r.attributes.includes(a))) return false;
        if (toxicsFilter.length && !toxicsFilter.some((t) => r.toxic.includes(t))) return false;
        if (indexFilter !== "All" && r.googleIndexed !== indexFilter) return false;
        if (!(r.referral >= trafficMin && r.referral <= trafficMax)) return false;
        if (!(r.statusCode >= httpMin && r.statusCode <= httpMax)) return false;
        if (query) {
          const q = query.toLowerCase();
          if (searchMode === "Source URL" && !r.sourceUrl.toLowerCase().includes(q)) return false;
          if (searchMode === "Target URL" && !r.targetUrl.toLowerCase().includes(q)) return false;
          if (searchMode === "Anchor" && !r.anchorText.toLowerCase().includes(q)) return false;
          if (searchMode === "Domain" && !r.domain.toLowerCase().includes(q)) return false;
        }
        return true;
      });
    }
  }, [
    groupBy, domainRows, linkRows, listMode, newOnly, category, anchorRisk, attrsFilter, toxicsFilter,
    indexFilter, wrMin, wrMax, trafficMin, trafficMax, httpMin, httpMax, query, searchMode
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered] as any[];
    arr.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const windowedRows: any[] = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* infinite sentinel */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("rd-scroll-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((v) => Math.min(sorted.length, v + 50));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* selection helpers */
  const visibleIds = windowedRows.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;

  /* export */
  const exportCSV = (onlySelected: boolean = false) => {
    const dataset = (onlySelected ? sorted.filter((r: any) => !!selected[r.id]) : sorted) as any[];
    const cols = groupBy === "domain"
      ? ["domain","wrScore","backlinks","anchorRisk","googleIndexed","firstSeen","lastSeen","category","attributes","toxic","disavow","isNew","referral"]
      : ["domain","sourceUrl","targetUrl","anchorText","wrScore","statusCode","googleIndexed","firstSeen","lastSeen","anchorRisk","attributes","toxic","category","isNew","referral","disavow"];
    const header = cols.join(",");
    const lines = dataset.map((r) => cols.map((k) => JSON.stringify(String(Array.isArray(r[k]) ? r[k].join("|") : r[k] ?? ""))).join(",")).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? `ref-${groupBy}-selected.csv` : `ref-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* bulk actions */
  const bulkDisavow = () => console.info("Disavow selection:", selectedIds);
  const bulkCreateTasks = () => console.info("Create tasks for:", selectedIds);

  /* clear filters */
  const clearAllFilters = () => {
    setQuery("");
    setSearchMode(groupBy === "domain" ? "Domain" : "Source URL");
    setListMode("All");
    setNewOnly(false);
    setCategory("All");
    setAnchorRisk("All");
    setAttrsFilter([]);
    setToxicsFilter([]);
    setWrMin(0); setWrMax(100);
    setTrafficMin(0); setTrafficMax(2500);
    setIndexFilter("All");
    setHttpMin(100); setHttpMax(599);
  };

  /* helpers */
  const openBacklinksForDomain = (domain: string) => {
    setGroupBy("url");
    setSearchMode("Domain");
    setQuery(domain);
  };

  /* expanded row content */
  const renderExpandedDomain = (row: DomainRow) => {
    const five = linkRows.filter(l => l.domain === row.domain).slice(0, 5);
    return (
      <div className="space-y-4 p-4 rounded-md border" style={{ borderColor: TOKENS.borderLight, background: TOKENS.bgApp }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Globe2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Domain</div>
            <div className="text-sm font-medium">{row.domain}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Gauge className="h-4 w-4" style={{ color: TOKENS.brand }} /> WR Score</div>
            <div className="text-sm font-medium"><MiniGauge value={row.wrScore} /></div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">First Seen</div>
            <div className="text-sm font-medium">{formatDate(row.firstSeen)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Last Seen</div>
            <div className="text-sm font-medium">{formatDate(row.lastSeen)}</div>
          </div>
        </div>

        {/* Mini Backlinks table for this domain */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Recent Backlinks (5)
          </div>
          <div className="border rounded-md overflow-hidden" style={{ borderColor: TOKENS.border }}>
            <Table className="text-sm">
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead className="min-w-[320px]">Source URL</TableHead>
                  <TableHead className="min-w-[220px]">Target URL</TableHead>
                  <TableHead>Anchor</TableHead>
                  <TableHead>Attr</TableHead>
                  <TableHead>WR</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Index</TableHead>
                  <TableHead>First</TableHead>
                  <TableHead>Last</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {five.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="max-w-[380px] truncate">
                      <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="underline cursor-pointer" style={{ color: TOKENS.linkBlue }}>
                        {l.sourceUrl}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">{l.targetUrl}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={l.anchorText}>{l.anchorText}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        <Link2 className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
                        {l.attributes.map((a) => <Badge key={a} text={a} color={TOKENS.brand} />)}
                      </div>
                    </TableCell>
                    <TableCell><MiniGauge value={l.wrScore} /></TableCell>
                    <TableCell>{l.statusCode}</TableCell>
                    <TableCell><IndexPill status={l.googleIndexed} /></TableCell>
                    <TableCell>{formatDate(l.firstSeen)}</TableCell>
                    <TableCell>{formatDate(l.lastSeen)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" className="gap-1 cursor-pointer" onClick={() => openBacklinksForDomain(row.domain)}>
              <ExternalLink className="h-4 w-4" style={{ color: TOKENS.brand }} />
              <span style={{ color: TOKENS.brand }}>View All backlinks</span>
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                <Eye className="h-4 w-4 mr-1" /> Open Domain
              </Button>
              <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
                <ClipboardList className="h-4 w-4" style={{ color: TOKENS.brand }} /> Create Task
              </Button>
              <Button size="sm" variant="destructive" className="gap-1 cursor-pointer">
                <Shield className="h-4 w-4" /> Disavow Domain
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExpandedURL = (row: LinkRow) => (
    <div className="space-y-4 p-4 rounded-md border" style={{ borderColor: TOKENS.borderLight, background: TOKENS.bgApp }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Source URL</div>
          <a className="text-sm underline cursor-pointer break-all" href={row.sourceUrl} target="_blank" rel="noreferrer" style={{ color: TOKENS.linkBlue }}>
            {row.sourceUrl}
          </a>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Code2 className="h-3.5 w-3.5" /> HTTP {row.statusCode} · {row.isLive ? "Live" : "Not live"}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Target URL</div>
          <div className="text-sm break-all">{row.targetUrl}</div>
          <div className="text-xs text-muted-foreground mt-1">Placement: {row.linkPlacement}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Anchor</div>
          <div className="text-sm font-medium">{row.anchorText}</div>
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            <Link2 className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
            {row.attributes.map((a) => <Badge key={a} text={a} color={TOKENS.brand} />)}
          </div>
        </div>
      </div>

      {/* Additional data not in main table */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Page Title</div>
          <div className="text-sm font-medium truncate" title={row.pageTitle}>{row.pageTitle}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Canonical</div>
          <div className="text-sm truncate" title={row.canonical || "—"}>{row.canonical || "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Meta Robots</div>
          <div className="text-sm">{row.metaRobots.length ? row.metaRobots.join(", ") : "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">External Links</div>
          <div className="text-sm">{row.extLinks}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Word Count</div>
          <div className="text-sm">{row.wordCount.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Language</div>
          <div className="text-sm uppercase">{row.language}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">First Seen</div>
          <div className="text-sm">{formatDate(row.firstSeen)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Last Seen</div>
          <div className="text-sm">{formatDate(row.lastSeen)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}><Eye className="h-4 w-4 mr-1" /> View Source</Button>
        <Button size="sm" variant="outline" className="gap-1 cursor-pointer"><ClipboardList className="h-4 w-4" style={{ color: TOKENS.brand }} /> Create Task</Button>
        <Button size="sm" variant="destructive" className="gap-1 cursor-pointer"><Shield className="h-4 w-4" /> Disavow Link</Button>
      </div>
    </div>
  );

  /* Active filter chips */
  const ActiveChips = () => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (listMode !== "All") chips.push({ key: "listMode", label: `List: ${listMode}`, onClear: () => setListMode("All") });
    if (newOnly) chips.push({ key: "newOnly", label: "New only", onClear: () => setNewOnly(false) });
    if (category !== "All") chips.push({ key: "category", label: `Category: ${category}`, onClear: () => setCategory("All") });
    if (anchorRisk !== "All") chips.push({ key: "risk", label: `Risk: ${anchorRisk}`, onClear: () => setAnchorRisk("All") });
    if (attrsFilter.length) chips.push({ key: "attrs", label: `Attr: ${attrsFilter.join(", ")}`, onClear: () => setAttrsFilter([]) });
    if (toxicsFilter.length) chips.push({ key: "toxic", label: `Toxic: ${toxicsFilter.join(", ")}`, onClear: () => setToxicsFilter([]) });
    if (indexFilter !== "All") chips.push({ key: "index", label: `Index: ${indexFilter}`, onClear: () => setIndexFilter("All") });
    if (groupBy === "domain" && (wrMin > 0 || wrMax < 100)) chips.push({ key: "wr", label: `WR ${wrMin}–${wrMax}`, onClear: () => { setWrMin(0); setWrMax(100); } });
    if (trafficActive) chips.push({ key: "tra", label: `Traffic ${trafficMin}–${trafficMax}`, onClear: () => { setTrafficMin(0); setTrafficMax(2500); } });
    if (groupBy === "url" && (httpMin !== 100 || httpMax !== 599)) chips.push({ key: "http", label: `HTTP ${httpMin}–${httpMax}`, onClear: () => { setHttpMin(100); setHttpMax(599); } });

    if (!chips.length) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            className="h-7 px-3 rounded-full border text-xs inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer transition-colors"
            onClick={c.onClear}
            style={{ borderColor: TOKENS.border }}
          >
            <span>{c.label}</span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600">×</span>
          </button>
        ))}
      </div>
    );
  };

  /* segmented toggle */
  const Segmented = () => (
    <div className="inline-flex items-center rounded-full border p-1 bg-white" style={{ borderColor: TOKENS.border }}>
      {[
        { k: "domain" as const, label: "Referring Domains" },
        { k: "url" as const, label: "Backlinks" },
      ].map((o) => {
        const active = groupBy === o.k;
        return (
          <button
            key={o.k}
            onClick={() => setGroupBy(o.k)}
            className={`h-8 px-3 rounded-full text-sm cursor-pointer transition ${active ? "text-white" : "text-gray-700 hover:bg-gray-50"}`}
            style={{ background: active ? TOKENS.brand : "transparent" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );

  /* Bulk toolbar row injected **just above** the first selected row in the table */
  const BulkToolbarRow = ({ colSpan }: { colSpan: number }) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t"
          style={{ borderColor: TOKENS.borderLight, background: TOKENS.brandSoft }}
        >
          <div className="text-sm" style={{ color: TOKENS.text }}>
            <strong>{selectedIds.length}</strong> selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={bulkCreateTasks}>
              <ListChecks className="h-4 w-4 mr-1" /> Create Tasks
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportCSV(true)} className="cursor-pointer">
              <Download className="h-4 w-4 mr-1" /> Export Selection
            </Button>
            <Button size="sm" variant="destructive" onClick={bulkDisavow} className="cursor-pointer">
              <Shield className="h-4 w-4 mr-1" /> Disavow
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );

  /* find first selected index in current window to insert bulk bar just above it */
  const firstSelectedIdx = windowedRows.findIndex(r => !!selected[r.id]);

  return (
    <section className="space-y-3" style={FONTS}>
      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex w-full flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" style={{ color: TOKENS.brand }} />
                Backlink Audit → Referring Domains &amp; Backlinks
              </CardTitle>
              <Segmented />
            </div>

            {/* Left-side quick filters */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TOKENS.border }}
                >
                  <Filter className="h-4 w-4" style={{ color: TOKENS.brand }} /> Filters
                </button>
              </PopoverTrigger>
              {/* Quick filters popover */}
              <PopoverContent align="start" className="w-[360px]">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Quick Filters</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={listMode} onValueChange={(v) => setListMode(v as ListMode)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="List" /></SelectTrigger>
                      <SelectContent>
                        {(["All","Whitelist","For Review"] as const).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={indexFilter} onValueChange={(v) => setIndexFilter(v as any)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Index" /></SelectTrigger>
                      <SelectContent>
                        {(["All","Indexed","Not Indexed"] as const).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={anchorRisk} onValueChange={(v) => setAnchorRisk(v as any)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Risk" /></SelectTrigger>
                      <SelectContent>
                        {(["All","High","Medium","Low"] as const).map((s) => <SelectItem key={s} value={s as any}>Risk: {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {groupBy === "domain" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>WR Score</span>
                        <span className="text-muted-foreground">{wrMin} – {wrMax}</span>
                      </div>
                      <Slider value={[wrMin, wrMax]} min={0} max={100} step={1} onValueChange={(v) => { const [a, b] = v as [number, number]; setWrMin(a); setWrMax(b); }} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>GA4 Sessions</span>
                      <span className="text-muted-foreground">{trafficMin} – {trafficMax}</span>
                    </div>
                    <Slider value={[trafficMin, trafficMax]} min={0} max={2500} step={10} onValueChange={(v) => { const [a, b] = v as [number, number]; setTrafficMin(a); setTrafficMax(b); }} />
                  </div>

                  {groupBy === "url" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>HTTP Status</span>
                        <span className="text-muted-foreground">{httpMin} – {httpMax}</span>
                      </div>
                      <Slider value={[httpMin, httpMax]} min={100} max={599} step={1} onValueChange={(v) => { const [a, b] = v as [number, number]; setHttpMin(a); setHttpMax(b); }} />
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear all</Button>
                    <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Toggles */}
            <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <span>Infinite</span>
                <Switch checked={infinite} onCheckedChange={(v) => { setInfinite(Boolean(v)); if (Boolean(v)) setVisibleCount(50); }} />
              </label>
              <label className="inline-flex items-center gap-2">
                <span>Expand multiple</span>
                <Switch checked={multiExpand} onCheckedChange={setMultiExpand} />
              </label>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 cursor-pointer"
              onClick={() => { setDomainRows(makeDomainRows()); setLinkRows(makeLinkRows()); setSelected({}); setExpanded({}); }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>

            {/* Right-aligned: Columns (left) then Export (far right) */}
            <div className="ml-auto flex items-center gap-2">
              {/* Columns control (moved to header) */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                    style={{ borderColor: TOKENS.border }}
                  >
                    <Settings2 className="h-4 w-4" /> Columns
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                  <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                  <ScrollArea className="max-h-[360px] pr-2">
                    <div className="space-y-2">
                      {columns.map((c) => (
                        <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            disabled={c.key === "select" || c.key === "expander" || c.key === (groupBy === "domain" ? "domain" : "sourceUrl")}
                            checked={visibleCols[c.key] !== false}
                            onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                          />
                          <span>{c.label || c.key}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-3 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleCols(Object.fromEntries([...domainColumns, ...urlColumns].map(c => [c.key, true])))}
                    >
                      Reset
                    </Button>
                    <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Export (far right) */}
              <Button variant="outline" size="sm" onClick={() => exportCSV(anySelected)} className="cursor-pointer">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filters Row (inline controls + chips inside the bar) */}
        <CardContent className="border-t pt-4 space-y-3" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" style={{ color: TOKENS.brand }} />
              <span>Inline Filters</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Filter by toxicity, attributes, WR score, anchor risk, GA4 traffic, indexing, etc.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={clearAllFilters} className="cursor-pointer">Clear all</Button>

            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Search in…" />
              </SelectTrigger>
              <SelectContent>
                {(["Domain","Source URL","Target URL","Anchor"] as const).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${searchMode.toLowerCase()}…`} className="w-[280px] pl-7" />
            </div>

            <Select value={listMode} onValueChange={(v) => setListMode(v as ListMode)}>
              <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["All","Whitelist","For Review"] as const).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="inline-flex items-center gap-2 text-sm ml-1 cursor-pointer select-none">
              <Checkbox checked={newOnly} onCheckedChange={(v) => setNewOnly(Boolean(v))} />
              <span className="inline-flex items-center gap-1">New only</span>
            </label>

            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger className="w-[180px] h-8">
                <div className="inline-flex items-center gap-2">
                  <Tag className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Category – All</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={anchorRisk} onValueChange={(v) => setAnchorRisk(v as any)}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                {(["All","High","Medium","Low"] as const).map((s) => <SelectItem key={s} value={s as any}>Anchor Risk – {s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={indexFilter} onValueChange={(v) => setIndexFilter(v as any)}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Google Index" /></SelectTrigger>
              <SelectContent>
                {(["All","Indexed","Not Indexed"] as const).map((s) => <SelectItem key={s} value={s as any}>Google Index – {s}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Attributes multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                        style={{ borderColor: TOKENS.border }}>
                  <Link2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Link Attributes {attrsFilter.length ? `(${attrsFilter.length})` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px]" align="start">
                <div className="grid grid-cols-2 gap-2">
                  {ATTRS.map((a) => {
                    const on = attrsFilter.includes(a);
                    return (
                      <button
                        key={a}
                        className={`h-8 px-3 rounded-full border text-sm text-left cursor-pointer ${on ? "bg-[#F0FAFF] border-blue-200" : ""}`}
                        onClick={() => { setAttrsFilter((s) => on ? s.filter(x => x !== a) : [...s, a]); }}
                        style={{ borderColor: TOKENS.border }}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setAttrsFilter([])}>Reset</Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Toxic Markers multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                        style={{ borderColor: TOKENS.border }}>
                  <FlagTriangleRight className="h-4 w-4" style={{ color: TOKENS.brand }} /> Toxic Markers {toxicsFilter.length ? `(${toxicsFilter.length})` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px]" align="start">
                <div className="grid grid-cols-2 gap-2">
                  {TOXIC.map((t) => {
                    const on = toxicsFilter.includes(t);
                    return (
                      <button
                        key={t}
                        className={`h-8 px-3 rounded-full border text-sm text-left cursor-pointer ${on ? "bg-[#FFF4F2] border-red-200" : ""}`}
                        onClick={() => { setToxicsFilter((s) => on ? s.filter(x => x !== t) : [...s, t]); }}
                        style={{ borderColor: TOKENS.border }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setToxicsFilter([])}>Reset</Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* WR Score range (domain view only) */}
            {groupBy === "domain" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                          style={{ borderColor: TOKENS.border }}>
                    <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> WR Score {wrActive ? `${wrMin}–${wrMax}` : "(All)"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px]" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Score range</span>
                      <span className="text-muted-foreground">{wrMin} – {wrMax}</span>
                    </div>
                    <Slider value={[wrMin, wrMax]} min={0} max={100} step={1} onValueChange={(v) => { const [a, b] = v as [number, number]; setWrMin(a); setWrMax(b); }} />
                    <div className="flex gap-2">
                      <Input type="number" min={0} max={100} value={wrMin} onChange={(e) => setWrMin(Math.max(0, Math.min(Number(e.target.value)||0, wrMax)))} className="w-20" />
                      <Input type="number" min={0} max={100} value={wrMax} onChange={(e) => setWrMax(Math.max(wrMin, Math.min(Number(e.target.value)||0, 100)))} className="w-20" />
                      <div className="ml-auto flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setWrMin(0); setWrMax(100); }}>Reset</Button>
                        <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* GA4 Traffic range */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                        style={{ borderColor: TOKENS.border }}>
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> GA4 Traffic {trafficActive ? `${trafficMin}–${trafficMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sessions range</span>
                    <span className="text-muted-foreground">{trafficMin} – {trafficMax}</span>
                  </div>
                  <Slider value={[trafficMin, trafficMax]} min={0} max={2500} step={10} onValueChange={(v) => { const [a, b] = v as [number, number]; setTrafficMin(a); setTrafficMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={2500} value={trafficMin} onChange={(e) => setTrafficMin(Math.max(0, Math.min(Number(e.target.value)||0, trafficMax)))} className="w-24" />
                    <Input type="number" min={0} max={2500} value={trafficMax} onChange={(e) => setTrafficMax(Math.max(trafficMin, Math.min(Number(e.target.value)||0, 2500)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setTrafficMin(0); setTrafficMax(2500); }}>Reset</Button>
                      <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Chips placed inside the filter bar (right aligned) */}
            <div className="ml-auto">
              <ActiveChips />
            </div>
          </div>
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              {/* Sticky header at the very top so first row isn't hidden; select-all is visible */}
              <TableHeader className="sticky top-0 bg-white z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c.key) }}
                      className={`${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : ""}`}
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              visibleIds.forEach((id) => (patch[id] = on));
                              setSelected((s) => ({ ...s, ...patch }));
                            }}
                          />
                        </div>
                      ) : !c.sortable ? (
                        c.label
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                          onClick={() => toggleSort(c.key)}
                        >
                          <span>{c.label}</span>
                          {sortBy === c.key
                            ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                            : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.map((row: any, idx: number) => (
                  <React.Fragment key={row.id}>
                    {/* Bulk bar just above the first selected row/rows */}
                    {anySelected && idx === firstSelectedIdx && (
                      <BulkToolbarRow colSpan={visibleColumns.length} />
                    )}

                    <TableRow className="hover:bg-[#F5F7FA]">
                      {/* select */}
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle("select") as any}>
                          <Checkbox checked={!!selected[row.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [row.id]: Boolean(v) }))} />
                        </TableCell>
                      )}
                      {/* expander */}
                      {visibleCols.expander !== false && (
                        <TableCell style={stickyStyle("expander") as any}>
                          <button onClick={() => toggleExpand(row.id)} aria-label={expanded[row.id] ? "Collapse" : "Expand"} className="rounded-md border p-1 hover:bg-muted cursor-pointer">
                            {expanded[row.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                      )}

                      {/* sticky primary cell */}
                      {groupBy === "domain" && visibleCols.domain !== false && (
                        <TableCell style={stickyStyle("domain") as any}>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 rounded bg-gray-200" aria-hidden />
                            <span className="underline cursor-pointer" style={{ color: TOKENS.linkBlue }}>{row.domain}</span>
                            {row.isNew && <Badge text="New" color={TOKENS.brand} />}
                          </div>
                        </TableCell>
                      )}
                      {groupBy === "url" && visibleCols.sourceUrl !== false && (
                        <TableCell style={stickyStyle("sourceUrl") as any}>
                          <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="underline cursor-pointer" style={{ color: TOKENS.linkBlue }}>{row.sourceUrl}</a>
                        </TableCell>
                      )}

                      {/* domain view cells */}
                      {groupBy === "domain" && (
                        <>
                          {visibleCols.wrScore !== false && (<TableCell><MiniGauge value={row.wrScore} /></TableCell>)}
                          {visibleCols.backlinks !== false && (<TableCell>{row.backlinks}</TableCell>)}
                          {visibleCols.anchorRisk !== false && (<TableCell><RiskPill risk={row.anchorRisk} /></TableCell>)}
                          {visibleCols.googleIndexed !== false && (<TableCell><IndexPill status={row.googleIndexed} /></TableCell>)}
                          {visibleCols.firstSeen !== false && (<TableCell>{formatDate(row.firstSeen)}</TableCell>)}
                          {visibleCols.lastSeen !== false && (<TableCell>{formatDate(row.lastSeen)}</TableCell>)}
                          {visibleCols.category !== false && (
                            <TableCell>
                              <div className="inline-flex items-center gap-2">
                                <Tag className="h-4 w-4" style={{ color: TOKENS.brand }} />
                                <span>{row.category}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.attributes !== false && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1 items-center">
                                <Link2 className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
                                {row.attributes.map((a: LinkAttribute) => <Badge key={a} text={a} color={TOKENS.brand} />)}
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.toxic !== false && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.toxic.length ? row.toxic.map((t: string) => <Badge key={t} text={t} color={TOKENS.critical} />) : <span className="text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.disavow !== false && (<TableCell><DisavowPill s={row.disavow} /></TableCell>)}
                          {visibleCols.isNew !== false && (<TableCell>{row.isNew ? "Yes" : "—"}</TableCell>)}
                          {visibleCols.referral !== false && (
                            <TableCell>
                              {row.ga4 ? `${row.referral} sessions` : <Button size="sm" variant="outline" className="cursor-pointer">Connect GA4</Button>}
                            </TableCell>
                          )}
                        </>
                      )}

                      {/* url view cells */}
                      {groupBy === "url" && (
                        <>
                          {visibleCols.targetUrl !== false && (<TableCell className="max-w-[300px] truncate">{row.targetUrl}</TableCell>)}
                          {visibleCols.anchorText !== false && (<TableCell className="max-w-[240px] truncate" title={row.anchorText}>{row.anchorText}</TableCell>)}
                          {visibleCols.wrScore !== false && (<TableCell><MiniGauge value={row.wrScore} /></TableCell>)}
                          {visibleCols.statusCode !== false && (<TableCell>{row.statusCode}</TableCell>)}
                          {visibleCols.googleIndexed !== false && (<TableCell><IndexPill status={row.googleIndexed} /></TableCell>)}
                          {visibleCols.firstSeen !== false && (<TableCell>{formatDate(row.firstSeen)}</TableCell>)}
                          {visibleCols.lastSeen !== false && (<TableCell>{formatDate(row.lastSeen)}</TableCell>)}
                          {visibleCols.anchorRisk !== false && (<TableCell><RiskPill risk={row.anchorRisk} /></TableCell>)}
                          {visibleCols.attributes !== false && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1 items-center">
                                <Link2 className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
                                {row.attributes.map((a: LinkAttribute) => <Badge key={a} text={a} color={TOKENS.brand} />)}
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.toxic !== false && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.toxic.length ? row.toxic.map((t: string) => <Badge key={t} text={t} color={TOKENS.critical} />) : <span className="text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.category !== false && (
                            <TableCell>
                              <div className="inline-flex items-center gap-2">
                                <Tag className="h-4 w-4" style={{ color: TOKENS.brand }} />
                                <span>{row.category}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.isNew !== false && (<TableCell>{row.isNew ? "Yes" : "—"}</TableCell>)}
                          {visibleCols.referral !== false && (
                            <TableCell>
                              {row.ga4 ? `${row.referral} sessions` : <Button size="sm" variant="outline" className="cursor-pointer">Connect GA4</Button>}
                            </TableCell>
                          )}
                          {visibleCols.disavow !== false && (<TableCell><DisavowPill s={row.disavow} /></TableCell>)}
                        </>
                      )}

                      {/* actions */}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="View" className="cursor-pointer" style={{ color: TOKENS.brand }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">View</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Create Task" className="cursor-pointer" style={{ color: TOKENS.brand }}>
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Create Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Disavow" className="text-red-600 cursor-pointer">
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Disavow</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Remove" className="text-red-600 cursor-pointer">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Remove</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* expanded */}
                    {expanded[row.id] && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length}>
                          {groupBy === "domain" ? renderExpandedDomain(row as DomainRow) : renderExpandedURL(row as LinkRow)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {infinite && <div id="rd-scroll-sentinel" className="h-8" />}
          </div>
        </CardContent>

        {/* Pagination (when Infinite OFF) */}
        {!infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)} className="cursor-pointer">First</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="cursor-pointer">Prev</Button>
              <div className="text-sm w-16 text-center">{page}</div>
              <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage((p) => p + 1)} className="cursor-pointer">Next</Button>
              <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage(Math.ceil(sorted.length / pageSize))} className="cursor-pointer">Last</Button>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Page size" /></SelectTrigger>
                <SelectContent>{[10, 25, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
