"use client";

import React, { useMemo, useState } from "react";

/* UI kit */
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Info,
  RefreshCw,
  Search as SearchIcon,
  SlidersHorizontal,
  Star,
  ClipboardList,
  Target as TargetIcon,
  FileText,
  Compass,
  ShoppingCart,
  BadgeDollarSign,
  Download,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Global tokens + Inter / Inter Fallback (aligned with recent designs)
──────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-brand-hover:#067AAF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-surface:#FFFFFF;
  --wr-subtle:#F5F7FA;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-success:#28C76F;
  --wr-warning:#FF9F43;
  --wr-danger:#EA5455;
  --wr-accent:#D9EEF8;
  --wr-radius:12px;
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;}
`}</style>
);

/* ────────────────────────────────────────────────────────────────────────────
   Tokens local alias
──────────────────────────────────────────────────────────────────────────── */
const TK = {
  brand: "var(--wr-brand)",
  brandHover: "var(--wr-brand-hover)",
  text: "var(--wr-text)",
  muted: "var(--wr-muted)",
  surface: "var(--wr-surface)",
  subtle: "var(--wr-subtle)",
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  danger: "var(--wr-danger)",
  accent: "var(--wr-accent)",
  radius: "var(--wr-radius)",
};

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */
type Intent = "Informational" | "Navigational" | "Commercial" | "Transactional";
type Status = "Primary" | "Targeted" | "Suggested";

type Coverage = {
  title: boolean;
  h1: boolean;
  h2: boolean;
  body: boolean;
  alt: boolean;
};

type Row = {
  id: string;
  kw: string;
  title: string;
  intent: Intent;
  volume: number;
  kd: number; // 0..100
  cpc: number; // USD
  rank_g: number | null; // Google Desktop
  rank_m: number | null; // Google Mobile
  rank_prev: number | null; // previous Google rank (for Δ)
  gsc_clicks: number;
  gsc_impr: number;
  coverage: Coverage;
  serp_features: number;
  status: Status;
  target_url: string;
};

type ColumnKey =
  | "select"
  | "kw"
  | "intent"
  | "volume"
  | "kd"
  | "cpc"
  | "rank"
  | "gsc"
  | "coverage"
  | "serp"
  | "status"
  | "actions";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

type SortDir = "asc" | "desc";
type SortKey = Extract<
  ColumnKey,
  "kw" | "intent" | "volume" | "kd" | "cpc" | "rank" | "gsc" | "serp" | "status"
>;
type SortSpec = { key: SortKey; dir: SortDir };

/* ────────────────────────────────────────────────────────────────────────────
   Demo data + helpers
──────────────────────────────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString();
const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function makeRows(count = 240): Row[] {
  const intents: Intent[] = ["Informational", "Navigational", "Commercial", "Transactional"];
  const bases = [
    "keyword research",
    "best seo tools",
    "wranker pricing",
    "content optimization",
    "technical seo audit",
    "on page seo checklist",
    "schema generator",
    "seo writing guide",
    "json ld how to",
    "image alt text",
    "internal linking strategy",
  ];
  const rows: Row[] = [];
  for (let i = 1; i <= count; i++) {
    const kw = `${pick(bases)} ${i}`;
    const volume = randInt(100, 12000);
    const kd = randInt(0, 100);
    const cpc = +(Math.random() * 7.5).toFixed(2);
    const g = Math.random() > 0.15 ? randInt(1, 100) : null;
    const m = Math.random() > 0.18 ? randInt(1, 100) : null;
    const prev = g !== null && Math.random() > 0.2 ? clamp(g + randInt(-9, 9), 1, 100) : null;
    const clicks = Math.round((Math.max(0, 110 - (g ?? 110)) / 110) * volume * 0.12);
    const impr = Math.round(volume * (0.8 + Math.random() * 0.6));
    rows.push({
      id: `kw-${i}`,
      kw,
      title: `${kw.replace(/\b\w/g, (c) => c.toUpperCase())} — Guide`,
      intent: pick(intents),
      volume,
      kd,
      cpc,
      rank_g: g,
      rank_m: m,
      rank_prev: prev,
      gsc_clicks: clicks,
      gsc_impr: impr,
      coverage: {
        title: Math.random() > 0.2,
        h1: Math.random() > 0.25,
        h2: Math.random() > 0.45,
        body: Math.random() > 0.6,
        alt: Math.random() > 0.5,
      },
      serp_features: randInt(0, 6),
      status: pick(["Primary", "Targeted", "Suggested"]),
      target_url: `/guide/page-${i % 25}`,
    });
  }
  return rows;
}

/* ────────────────────────────────────────────────────────────────────────────
   Micro UI
──────────────────────────────────────────────────────────────────────────── */
function HeaderSort({
  active,
  dir,
  onClick,
  children,
  tooltip,
}: {
  active?: boolean;
  dir?: SortDir;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="relative inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
            title="Click to sort • Shift+Click to multi-sort"
          >
            <span>{children}</span>
            {active ? (
              dir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </TooltipTrigger>
        {tooltip && <TooltipContent side="bottom">{tooltip}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

function Chip({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className={`h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 cursor-pointer ${
        active
          ? "bg-[rgba(0,140,205,0.08)] text-[#008CCD] border-[#008CCD33]"
          : "bg-white hover:bg-[var(--wr-subtle)]"
      }`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

const intentIcon = (intent: Intent) => {
  const common = { size: 14, style: { color: "var(--wr-brand)" } };
  switch (intent) {
    case "Informational":
      return <FileText {...common} />;
    case "Navigational":
      return <Compass {...common} />;
    case "Commercial":
      return <ShoppingCart {...common} />;
    case "Transactional":
      return <BadgeDollarSign {...common} />;
  }
};

function IntentBadge({ intent }: { intent: Intent }) {
  // Table rows: **no border line**; soft brand-tinted background
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-xs"
      style={{ background: "rgba(0,140,205,0.08)", color: "var(--wr-brand)" }}
    >
      {intentIcon(intent)}
      <span>{intent}</span>
    </span>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const needle = q.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let i = 0;
  let idx: number;
  const lower = text.toLowerCase();
  while ((idx = lower.indexOf(needle, i)) !== -1) {
    const pre = text.slice(i, idx);
    const hit = text.slice(idx, idx + needle.length);
    if (pre) parts.push(pre);
    parts.push(
      <mark
        key={idx}
        className="rounded px-1"
        style={{ background: TK.accent, color: "inherit" }}
      >
        {hit}
      </mark>
    );
    i = idx + needle.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}

function IconAction({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="inline-grid h-8 w-8 place-items-center rounded-md border bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
            style={{ borderColor: TK.border }}
            aria-label={label}
            title={label}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────────────────────── */
export default function TargetKeywordsSetSection() {
  /* Data */
  const [rows, setRows] = useState<Row[]>(() => makeRows(240));

  /* Controls */
  const [device, setDevice] = useState<"Desktop" | "Mobile">("Desktop");
  const [locale, setLocale] = useState("en-US");
  const [query, setQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<Intent | "All">("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");

  /* Extra filter chips (as per columns) */
  const [top10, setTop10] = useState(false); // Rank Top 10
  const [serpAny, setSerpAny] = useState(false); // SERP features > 0
  const [covT, setCovT] = useState(false);
  const [covH1, setCovH1] = useState(false);
  const [covH2, setCovH2] = useState(false);
  const [covB, setCovB] = useState(false);
  const [covAlt, setCovAlt] = useState(false);
  const [kdBand, setKdBand] = useState<"all" | "low" | "mid" | "high">("all"); // ≤30 / 31–60 / ≥61
  const [cpcBand, setCpcBand] = useState<"all" | "1+" | "3+">("all");

  /* Columns */
  const columns: ColumnDef[] = [
    { key: "select", label: "", width: 40, align: "center" },
    { key: "kw", label: "KW", width: 380, sortable: true },
    { key: "intent", label: "Intent", width: 160, sortable: true },
    { key: "volume", label: "Volume", width: 120, align: "right", sortable: true },
    { key: "kd", label: "KD", width: 90, align: "right", sortable: true },
    { key: "cpc", label: "CPC", width: 110, align: "right", sortable: true },
    { key: "rank", label: "Rank (G/M, Δ)", width: 170, sortable: true },
    { key: "gsc", label: "Clicks / Impr (GSC)", width: 170, sortable: true },
    { key: "coverage", label: "Coverage (T/H1/H2/B/Alt)", width: 240 },
    { key: "serp", label: "SERP feats", width: 120, align: "center", sortable: true },
    { key: "status", label: "Status", width: 140, sortable: true },
    { key: "actions", label: "Actions", width: 160 },
  ];
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true,
    kw: true,
    intent: true,
    volume: true,
    kd: true,
    cpc: true,
    rank: true,
    gsc: true,
    coverage: true,
    serp: true,
    status: true,
    actions: true,
  });

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  /* Sorting (multi via Shift+Click) */
  const [sorts, setSorts] = useState<SortSpec[]>([
    { key: "rank", dir: "asc" },
    { key: "volume", dir: "desc" },
  ]);
  const toggleSort = (key: SortKey, e: React.MouseEvent) => {
    setSorts((prev) => {
      const i = prev.findIndex((s) => s.key === key);
      if (!e.shiftKey) {
        if (i === -1) return [{ key, dir: "asc" }];
        if (prev[i].dir === "asc") return [{ key, dir: "desc" }];
        return [];
      }
      const next = [...prev];
      if (i === -1) next.push({ key, dir: "asc" });
      else if (next[i].dir === "asc") next[i] = { key, dir: "desc" };
      else next.splice(i, 1);
      return next;
    });
  };

  /* Filtering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(r.kw.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))) return false;
      if (intentFilter !== "All" && r.intent !== intentFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (top10 && !((r.rank_g ?? 999) <= 10)) return false;
      if (serpAny && !(r.serp_features > 0)) return false;
      if (kdBand !== "all") {
        if (kdBand === "low" && !(r.kd <= 30)) return false;
        if (kdBand === "mid" && !(r.kd > 30 && r.kd <= 60)) return false;
        if (kdBand === "high" && !(r.kd > 60)) return false;
      }
      if (cpcBand !== "all") {
        if (cpcBand === "1+" && !(r.cpc >= 1)) return false;
        if (cpcBand === "3+" && !(r.cpc >= 3)) return false;
      }
      // Coverage chips: if any is required, enforce true
      const coverageReqs = [
        covT ? r.coverage.title : true,
        covH1 ? r.coverage.h1 : true,
        covH2 ? r.coverage.h2 : true,
        covB ? r.coverage.body : true,
        covAlt ? r.coverage.alt : true,
      ];
      if (!coverageReqs.every(Boolean)) return false;

      // Device/locale can scope rank in real app; kept as UI state only here.
      return true;
    });
  }, [rows, query, intentFilter, statusFilter, top10, serpAny, kdBand, cpcBand, covT, covH1, covH2, covB, covAlt]);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sorts.length === 0) return arr;
    const intentOrder: Record<Intent, number> = {
      Informational: 0,
      Navigational: 1,
      Commercial: 2,
      Transactional: 3,
    };
    const statusOrder: Record<Status, number> = { Primary: 0, Targeted: 1, Suggested: 2 };
    arr.sort((a, b) => {
      for (const s of sorts) {
        let av: any, bv: any;
        switch (s.key) {
          case "kw": av = a.kw.toLowerCase(); bv = b.kw.toLowerCase(); break;
          case "intent": av = intentOrder[a.intent]; bv = intentOrder[b.intent]; break;
          case "volume": av = a.volume; bv = b.volume; break;
          case "kd": av = a.kd; bv = b.kd; break;
          case "cpc": av = a.cpc; bv = b.cpc; break;
          case "rank": av = a.rank_g ?? 1e9; bv = b.rank_g ?? 1e9; break;
          case "gsc": av = a.gsc_clicks; bv = b.gsc_clicks; break;
          case "serp": av = a.serp_features; bv = b.serp_features; break;
          case "status": av = statusOrder[a.status]; bv = statusOrder[b.status]; break;
          default: av = 0; bv = 0;
        }
        if (av === bv) continue;
        return s.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
      }
      return 0;
    });
    return arr;
  }, [filtered, sorts]);

  /* Pagination */
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = sorted.slice(start, end);

  /* Sticky helpers */
  const stickyStyle = (key: ColumnKey) =>
    key === "select"
      ? ({ position: "sticky" as const, left: 0, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" })
      : key === "kw"
      ? ({ position: "sticky" as const, left: 40, zIndex: 20, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,.06)" })
      : ({});

  /* Export (all or selected when any) */
  const exportCSV = () => {
    const src = anySelected ? sorted.filter(r => selected[r.id]) : sorted;
    const cols = ["kw","title","intent","volume","kd","cpc","rank_g","rank_m","rank_prev","gsc_clicks","gsc_impr","serp_features","status","target_url"];
    const header = cols.join(",");
    const lines = src.map(r => [
      r.kw, r.title, r.intent, r.volume, r.kd, r.cpc,
      r.rank_g ?? "", r.rank_m ?? "", r.rank_prev ?? "",
      r.gsc_clicks, r.gsc_impr, r.serp_features, r.status, r.target_url
    ].map(v => JSON.stringify(v)).join(",")).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = anySelected ? "target-keywords-selected.csv" : "target-keywords.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Column descriptions */
  const columnHint: Record<ColumnKey,string> = {
    select: "Select visible rows for bulk actions",
    kw: "Keyword with page title and target URL",
    intent: "User intent type",
    volume: "Monthly search volume",
    kd: "Keyword difficulty (0–100)",
    cpc: "Avg CPC in USD",
    rank: "Google ranks (Desktop/Mobile) and change vs previous",
    gsc: "GSC Clicks / Impressions",
    coverage: "On-page coverage: Title/H1/H2/Body/Alt",
    serp: "SERP features count",
    status: "Primary / Targeted / Suggested",
    actions: "Quick actions",
  };

  return (
    <>
      <GlobalTokens />
      <section className="wr-font space-y-3 mt-4">
        <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
          {/* ─ Header: title + branded icon + export ─ */}
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5" color="#008CCD" />
              <CardTitle className="text-lg">Target Keywords Set</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-pointer" color="#008CCD" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px]">
                    Multi-sort (Shift+Click headers), modern filter chips, icon-only row actions with full labels on hover.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Device */}
              <Select value={device} onValueChange={(v) => setDevice(v as any)}>
                <SelectTrigger className="h-8 w-[140px] rounded border px-3 text-sm cursor-pointer">
                  <SelectValue placeholder="Device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Desktop">Desktop</SelectItem>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>

              {/* Locale */}
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="h-8 w-[140px] rounded border px-3 text-sm cursor-pointer">
                  <SelectValue placeholder="Locale" />
                </SelectTrigger>
                <SelectContent>
                  {["en-US", "en-GB", "de-DE", "fr-FR", "es-ES"].map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Columns */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                    <SlidersHorizontal className="h-4 w-4" /> Columns
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="mb-2 text-sm font-medium">Show / Hide Columns</div>
                  <ScrollArea className="max-h-[320px] pr-2">
                    <div className="space-y-2">
                      {columns.map((c) => (
                        <label key={c.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            disabled={c.key === "select" || c.key === "kw"}
                            checked={visibleCols[c.key] !== false}
                            onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                          />
                          <span>{c.label || c.key}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setVisibleCols({
                      select:true,kw:true,intent:true,volume:true,kd:true,cpc:true,rank:true,gsc:true,coverage:true,serp:true,status:true,actions:true
                    })}>
                      Reset
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Export */}
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 cursor-pointer">
                <Download className="h-4 w-4" color="#008CCD" /> Export
              </Button>

              {/* Refresh demo */}
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => { setSelected({}); setRows(makeRows(240)); }}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </CardHeader>

          {/* ─ Bulk bar ─ */}
          {anySelected && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2"
                 style={{ borderColor: TK.borderLight, background: TK.accent }}>
              <div className="text-sm" style={{ color: TK.text }}>
                <strong>{selectedIds.length}</strong> selected
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={exportCSV} className="cursor-pointer">Export selected</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected({})} className="cursor-pointer">Clear</Button>
              </div>
            </div>
          )}

          {/* ─ Filter bar (chips above header) ─ */}
          <CardContent className="border-t pt-3" style={{ borderColor: TK.borderLight }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" color="#008CCD" />
                <span>Filters</span>
              </div>

              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search keyword or title…"
                  className="w-[280px] pl-7"
                />
              </div>

              {/* Intent select (icon in trigger text area via label) */}
              <Select value={intentFilter} onValueChange={(v) => setIntentFilter(v as any)}>
                <SelectTrigger className="h-8 w-[200px] rounded border px-3 text-sm cursor-pointer">
                  <div className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4" color="#008CCD" />
                    <SelectValue placeholder="Intent" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(["All","Informational","Navigational","Commercial","Transactional"] as const).map(i=>(
                    <SelectItem key={i} value={i as any}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status select */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-8 w-[180px] rounded border px-3 text-sm cursor-pointer">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {(["All","Primary","Targeted","Suggested"] as const).map(s=>(
                    <SelectItem key={s} value={s as any}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Column-inspired chips */}
              <Chip active={top10} onClick={() => setTop10(v=>!v)} title="Rank (Google Desktop) ≤ 10">
                <span className="inline-flex items-center gap-2">
                  <TargetIcon size={14} color="#008CCD" /> Top 10
                </span>
              </Chip>

              <Chip active={serpAny} onClick={() => setSerpAny(v=>!v)} title="SERP features present">
                <span className="inline-flex items-center gap-2">
                  <ExternalLink size={14} color="#008CCD" /> SERP feats
                </span>
              </Chip>

              {/* KD bands */}
              <Chip active={kdBand==="low"} onClick={()=>setKdBand(kdBand==="low"?"all":"low")} title="KD ≤ 30">
                KD ≤ 30
              </Chip>
              <Chip active={kdBand==="mid"} onClick={()=>setKdBand(kdBand==="mid"?"all":"mid")} title="30 < KD ≤ 60">
                KD 31–60
              </Chip>
              <Chip active={kdBand==="high"} onClick={()=>setKdBand(kdBand==="high"?"all":"high")} title="KD ≥ 61">
                KD ≥ 61
              </Chip>

              {/* CPC bands */}
              <Chip active={cpcBand==="1+"} onClick={()=>setCpcBand(cpcBand==="1+"?"all":"1+")} title="CPC ≥ $1">
                CPC ≥ $1
              </Chip>
              <Chip active={cpcBand==="3+"} onClick={()=>setCpcBand(cpcBand==="3+"?"all":"3+")} title="CPC ≥ $3">
                CPC ≥ $3
              </Chip>

              {/* Coverage toggles */}
              <Chip active={covT} onClick={()=>setCovT(v=>!v)} title="Title contains keyword">Title</Chip>
              <Chip active={covH1} onClick={()=>setCovH1(v=>!v)} title="H1 contains keyword">H1</Chip>
              <Chip active={covH2} onClick={()=>setCovH2(v=>!v)} title="H2 contains keyword">H2</Chip>
              <Chip active={covB} onClick={()=>setCovB(v=>!v)} title="Body contains keyword">Body</Chip>
              <Chip active={covAlt} onClick={()=>setCovAlt(v=>!v)} title="Image alt contains keyword">Alt</Chip>
            </div>
          </CardContent>

          {/* ─ Table ─ */}
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
              <Table className="text-sm">
                <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                  <TableRow>
                    {columns
                      .filter((c) => visibleCols[c.key] !== false)
                      .map((c) => {
                        const sIdx = sorts.findIndex((s) => s.key === (c.key as SortKey));
                        const sortedActive = sIdx > -1;
                        return (
                          <TableHead
                            key={c.key}
                            style={{ minWidth: c.width, ...stickyStyle(c.key) }}
                            className={
                              c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined
                            }
                          >
                            {c.key === "select" ? (
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={
                                    pageRows.length > 0 && pageRows.every((r) => selected[r.id])
                                      ? true
                                      : pageRows.some((r) => selected[r.id])
                                      ? "indeterminate"
                                      : false
                                  }
                                  onCheckedChange={(v) => {
                                    const on = Boolean(v);
                                    const patch: Record<string, boolean> = {};
                                    pageRows.forEach((r) => (patch[r.id] = on));
                                    setSelected((s) => ({ ...s, ...patch }));
                                  }}
                                  aria-label="Select current page"
                                />
                              </div>
                            ) : c.sortable ? (
                              <HeaderSort
                                active={sortedActive}
                                dir={sortedActive ? sorts[sIdx].dir : undefined}
                                onClick={(e) => toggleSort(c.key as SortKey, e)}
                                tooltip={columnHint[c.key]}
                              >
                                {c.label}
                              </HeaderSort>
                            ) : (
                              <span title={columnHint[c.key]}>{c.label}</span>
                            )}
                          </TableHead>
                        );
                      })}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        <div className="py-14 text-center text-sm text-muted-foreground">
                          No keywords match the current filters.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((r) => {
                      const delta = r.rank_prev && r.rank_g ? r.rank_prev - r.rank_g : null;
                      const improved = delta !== null && delta > 0;
                      const declined = delta !== null && delta < 0;
                      return (
                        <TableRow key={r.id} className="hover:bg-[#F5F7FA]">
                          {visibleCols.select !== false && (
                            <TableCell style={stickyStyle("select") as any}>
                              <Checkbox
                                checked={!!selected[r.id]}
                                onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
                              />
                            </TableCell>
                          )}

                          {visibleCols.kw !== false && (
                            <TableCell style={stickyStyle("kw") as any}>
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  <Highlight text={r.kw} q={query} />
                                </div>
                                <div className="text-[12px] text-muted-foreground">
                                  <Highlight text={r.title} q={query} />
                                </div>
                                <a
                                  href={r.target_url}
                                  className="text-[12px] underline cursor-pointer"
                                  style={{ color: TK.brand }}
                                  title={r.target_url}
                                >
                                  {r.target_url}
                                </a>
                              </div>
                            </TableCell>
                          )}

                          {visibleCols.intent !== false && (
                            <TableCell>
                              <IntentBadge intent={r.intent} />
                            </TableCell>
                          )}

                          {visibleCols.volume !== false && (
                            <TableCell className="text-right">{fmt(r.volume)}</TableCell>
                          )}

                          {visibleCols.kd !== false && (
                            <TableCell className="text-right">{r.kd}</TableCell>
                          )}

                          {visibleCols.cpc !== false && (
                            <TableCell className="text-right">{money(r.cpc)}</TableCell>
                          )}

                          {visibleCols.rank !== false && (
                            <TableCell>
                              <div className="inline-flex items-center gap-2">
                                <span className="font-medium">
                                  {r.rank_g ?? "—"} / {r.rank_m ?? "—"}
                                </span>
                                {delta !== null ? (
                                  <span
                                    className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px]"
                                    style={{
                                      background:
                                        improved
                                          ? "rgba(40,199,111,.12)"
                                          : declined
                                          ? "rgba(234,84,85,.12)"
                                          : "rgba(107,114,128,.12)",
                                      color: improved ? "#166534" : declined ? "#B42318" : "#374151",
                                    }}
                                  >
                                    {improved ? "▲" : declined ? "▼" : "—"} {Math.abs(delta)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {visibleCols.gsc !== false && (
                            <TableCell>
                              <div className="inline-flex items-center gap-2">
                                <span className="font-medium">{fmt(r.gsc_clicks)}</span>
                                <span className="text-muted-foreground">/</span>
                                <span>{fmt(r.gsc_impr)}</span>
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px]"
                                  style={{
                                    background: "rgba(0,140,205,.08)",
                                    color: "var(--wr-brand)",
                                  }}
                                >
                                  {pct(r.gsc_clicks, r.gsc_impr)}% CTR
                                </span>
                              </div>
                            </TableCell>
                          )}

                          {visibleCols.coverage !== false && (
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(["title","h1","h2","body","alt"] as const).map((k) => {
                                  const on = r.coverage[k];
                                  return (
                                    <span
                                      key={k}
                                      className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[11px]"
                                      style={{
                                        background: on ? "rgba(40,199,111,.12)" : "#FFFFFF",
                                        color: on ? "#166534" : TK.muted,
                                        border: `1px solid ${on ? "rgba(40,199,111,.30)" : TK.border}`,
                                      }}
                                      title={k.toUpperCase()}
                                    >
                                      {k.toUpperCase()}
                                    </span>
                                  );
                                })}
                              </div>
                            </TableCell>
                          )}

                          {visibleCols.serp !== false && (
                            <TableCell className="text-center">
                              <span
                                className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px]"
                                style={{ background: TK.subtle, color: TK.text, border: `1px solid ${TK.borderLight}` }}
                              >
                                {r.serp_features}
                              </span>
                            </TableCell>
                          )}

                          {visibleCols.status !== false && (
                            <TableCell>
                              <span
                                className="inline-flex items-center rounded-full px-2 py-[2px] text-xs"
                                style={{
                                  background:
                                    r.status === "Primary"
                                      ? "rgba(0,140,205,.10)"
                                      : r.status === "Targeted"
                                      ? "rgba(40,199,111,.12)"
                                      : "rgba(107,114,128,.12)",
                                  color:
                                    r.status === "Primary"
                                      ? "var(--wr-brand)"
                                      : r.status === "Targeted"
                                      ? "#166534"
                                      : "#374151",
                                  border: `1px solid ${
                                    r.status === "Primary"
                                      ? "rgba(0,140,205,.28)"
                                      : r.status === "Targeted"
                                      ? "rgba(40,199,111,.30)"
                                      : "rgba(107,114,128,.30)"
                                  }`,
                                }}
                              >
                                {r.status}
                              </span>
                            </TableCell>
                          )}

                          {visibleCols.actions !== false && (
                            <TableCell>
                              <div className="inline-flex items-center gap-1.5">
                                {/* Branded icon-only actions; full name on hover */}
                                <IconAction label="Set as Primary" onClick={() => setRows(all => all.map(x => x.id===r.id?{...x,status:"Primary"}:x))}>
                                  <Star className="h-4 w-4" color="#008CCD" />
                                </IconAction>

                                <IconAction label="Add to Targeted" onClick={() => setRows(all => all.map(x => x.id===r.id?{...x,status:"Targeted"}:x))}>
                                  <TargetIcon className="h-4 w-4" color="#008CCD" />
                                </IconAction>

                                <IconAction label="Open SERP">
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(r.kw)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="grid place-items-center h-full w-full"
                                    aria-label="Open SERP"
                                  >
                                    <ExternalLink className="h-4 w-4" color="#008CCD" />
                                  </a>
                                </IconAction>

                                <IconAction label="Create Task" onClick={() => console.log("Create Task:", r.kw)}>
                                  <ClipboardList className="h-4 w-4" color="#008CCD" />
                                </IconAction>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ─ Pagination bar ─ */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t"
                 style={{ borderColor: TK.borderLight }}>
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{start + 1}</span>–<span className="font-medium text-foreground">{end}</span> of{" "}
                <span className="font-medium text-foreground">{total}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { const n = Number(v); setPageSize(n); setPage(1); }}>
                  <SelectTrigger className="h-8 w-[90px] rounded border px-3 text-sm cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="ml-2 inline-flex items-center gap-1">
                  <button
                    className="h-8 w-8 grid place-items-center rounded border hover:bg-[var(--wr-subtle)] cursor-pointer"
                    style={{ borderColor: TK.border }}
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="h-8 w-8 grid place-items-center rounded border hover:bg-[var(--wr-subtle)] cursor-pointer"
                    style={{ borderColor: TK.border }}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[80px] text-center text-sm">
                    Page <span className="font-medium">{safePage}</span> / {totalPages}
                  </span>
                  <button
                    className="h-8 w-8 grid place-items-center rounded border hover:bg-[var(--wr-subtle)] cursor-pointer"
                    style={{ borderColor: TK.border }}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    className="h-8 w-8 grid place-items-center rounded border hover:bg-[var(--wr-subtle)] cursor-pointer"
                    style={{ borderColor: TK.border }}
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}