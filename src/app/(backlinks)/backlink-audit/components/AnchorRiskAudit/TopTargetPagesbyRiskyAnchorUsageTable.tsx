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
  Download, Filter, Info, RefreshCw, Search, Settings2,
  SlidersHorizontal, Eye, ClipboardList, Trash2, Shield,
  Link as LinkIcon, CalendarDays, Percent,
  Target, Crosshair, MessageSquareText, BadgeCheck, Link2, Link2Off, Users, Megaphone
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ──────────────────────────────────────────────────────────────────────────────
   Global tokens (aligned with recent designs) + Inter, Inter Fallback
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
    :root{
      --wr-brand:#008CCD;
      --wr-brand-hover:#067AAF;
      --wr-brand-pastel:#D9EEF8;
      --wr-text:#111827;
      --wr-muted:#6B7280;
      --wr-surface:#FFFFFF;
      --wr-subtle:#F5F7FA;
      --wr-border:#E5E7EB;
      --wr-borderLight:#EFF0F6;
      --wr-success:#28C76F;
      --wr-warning:#FF9F43;
      --wr-danger:#EA5455;
      --wr-radius:12px;
    }
    .wr-font{
      font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
    }
  `}</style>
);

/* ---------- Tokens ---------- */
const TOKENS = {
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  textStrong: "var(--wr-text)",
  muted: "var(--wr-muted)",
  brand: "var(--wr-brand)",
  brandPastel: "var(--wr-brand-pastel)",
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  critical: "var(--wr-danger)",
  appBg: "var(--wr-subtle)",
  radius: "var(--wr-radius)",
};

/* ---------- Types ---------- */
type ListMode = "All" | "Whitelist" | "For Review";
type AnchorRisk = "Toxic" | "High" | "Medium" | "Low";
type AnchorType = "Exact Match" | "Partial Match" | "Naked URL" | "Generic" | "Branded";

type RiskyAnchor = {
  text: string;
  count: number;
  risk: AnchorRisk;
};

type PageRow = {
  id: string;
  page: string;                 // target page path
  risk: AnchorRisk;             // aggregated risk for the page
  riskyAnchors: number;         // total toxic+high anchors (occurrences)
  totalAnchors: number;         // total anchor occurrences
  uniqueAnchors: number;        // unique anchor variants
  backlinks: number;            // backlinks to this page
  uniqueDomains: number;        // unique referring domains to this page
  riskShare: number;            // % of anchors considered risky
  exactShare: number;           // % exact-match anchors (approx)
  ga4: boolean;
  ga4Sessions: number;          // GA4 sessions to page
  topRiskyAnchors: RiskyAnchor[];
  lastSeenDays: number;         // days since any link to this page was last seen
  whitelisted: boolean;
  forReview: boolean;
};

/* ---------- Small UI atoms ---------- */
const Dot = ({ color }: { color: string }) => (
  <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: color }} />
);

const RISK_COLORS: Record<AnchorRisk, string> = {
  Toxic: TOKENS.critical,
  High: "#F97316",
  Medium: TOKENS.warning,
  Low: TOKENS.success,
};

/* Risk pill with branded shield icon */
const RiskPill = ({ risk }: { risk: AnchorRisk }) => (
  <span
    title="Aggregated page risk"
    className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${RISK_COLORS[risk]}1A`, color: RISK_COLORS[risk], border: `1px solid ${RISK_COLORS[risk]}26` }}
  >
    <Shield className="h-3.5 w-3.5" color="#008CCD" />
    {risk}
  </span>
);

/* Anchor type icon (branded) */
const AnchorTypeIcon = ({ t, className = "h-3.5 w-3.5" }: { t: AnchorType; className?: string }) => {
  const common = { className, color: "#008CCD" };
  switch (t) {
    case "Exact Match": return <Target {...common} />;
    case "Partial Match": return <Crosshair {...common} />;
    case "Naked URL": return <Link2 {...common} />;
    case "Generic": return <MessageSquareText {...common} />;
    case "Branded": default: return <BadgeCheck {...common} />;
  }
};

/* Infer anchor type from text (for display only) */
const inferAnchorType = (text: string): AnchorType => {
  const t = text.toLowerCase();
  if (/^https?:\/\//.test(t)) return "Naked URL";
  if (/(click here|learn more|visit website)/.test(t)) return "Generic";
  if (/(wranker|brand|\.com|\.io|\.net)/.test(t)) return "Branded";
  const words = t.trim().split(/\s+/).filter(Boolean);
  return words.length <= 3 ? "Exact Match" : "Partial Match";
};

/* ---------- Mock data (swap with API data) ---------- */
const SAMPLE_ANCHORS = [
  "buy backlinks", "best seo tool", "seo tools comparison", "https://wranker.com", "click here",
  "wranker backlink insights", "online casino", "seo audits", "seo agency", "pricing wranker",
  "free credit score", "cheap flights", "visit website", "learn more", "top vpn"
] as const;

const PAGES = [
  "/", "/pricing", "/contact-us", "/about",
  "/services/seo", "/services/ppc", "/tools/rank-tracker",
  "/blog/anchor-text-best-practices", "/blog/seo-guide",
  "/blog/keyword-research", "/blog/link-building",
  "/case-studies/abc-tech", "/case-studies/saas-growth",
  "/resources/backlink-audit-template", "/blog/tools/roundup"
];

const rand = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const pick = <T,>(arr: readonly T[]) => arr[rand(0, arr.length - 1)];
const pickMany = <T,>(arr: readonly T[], n: number) => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = rand(0, copy.length - 1);
    out.push(copy.splice(i, 1)[0] as T);
  }
  return out;
};

function makePageRows(count = 60): PageRow[] {
  return Array.from({ length: count }, (_, i) => {
    const page = pick(PAGES);
    const uniqueAnchors = rand(6, 60);
    const totalAnchors = rand(80, 900);
    const backlinks = rand(120, 1500);
    const uniqueDomains = rand(30, 260);
    const ga4 = Math.random() > 0.18;
    const ga4Sessions = ga4 ? rand(120, 12000) : 0;

    // Build top risky anchors (bias toward Toxic/High)
    const riskyListCount = rand(1, 4);
    const topRiskyAnchors: RiskyAnchor[] = Array.from({ length: riskyListCount }).map(() => {
      const r: AnchorRisk = Math.random() > 0.65 ? "Toxic" : "High";
      return { text: pick(SAMPLE_ANCHORS as unknown as string[]), count: rand(5, 80), risk: r };
    });

    const riskyAnchors = topRiskyAnchors.reduce((s, a) => s + a.count, 0) + rand(0, 40);
    const riskShare = Math.min(100, Math.max(1, Math.round((riskyAnchors / Math.max(1, totalAnchors)) * 100)));
    const exactShare = rand(3, 65);
    const lastSeenDays = rand(0, 120);

    let risk: AnchorRisk = "Low";
    if (riskShare >= 45 || topRiskyAnchors.some(a => a.risk === "Toxic" && a.count >= 20)) risk = "Toxic";
    else if (riskShare >= 28) risk = "High";
    else if (riskShare >= 12) risk = "Medium";

    return {
      id: `p-${i + 1}`,
      page,
      risk,
      riskyAnchors,
      totalAnchors,
      uniqueAnchors,
      backlinks,
      uniqueDomains,
      riskShare,
      exactShare,
      ga4,
      ga4Sessions,
      topRiskyAnchors,
      lastSeenDays,
      whitelisted: Math.random() > 0.9,
      forReview: Math.random() > 0.86,
    };
  });
}

/* ---------- Columns ---------- */
type ColKey =
  | "select" | "expander" | "page" | "risk"
  | "riskyAnchors" | "riskShare" | "exactShare"
  | "uniqueAnchors" | "backlinks" | "uniqueDomains"
  | "ga4Sessions" | "topRisky" | "lastSeen" | "actions";

type ColumnDef<K extends string> = {
  key: K;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

const cols: ColumnDef<ColKey>[] = [
  { key: "select", label: "", width: 36, align: "center" },
  { key: "expander", label: "", width: 36, align: "center" },
  { key: "page", label: "Target Page", width: 360, sortable: true },
  { key: "risk", label: "Risk Level", width: 120, sortable: true },
  { key: "riskyAnchors", label: "Risky Anchors", width: 140, sortable: true },
  { key: "riskShare", label: "Risky % of Anchors", width: 170, sortable: true },
  { key: "exactShare", label: "Exact‑Match %", width: 140, sortable: true },
  { key: "uniqueAnchors", label: "Unique Anchors", width: 140, sortable: true },
  { key: "backlinks", label: "Backlink Count", width: 140, sortable: true },
  { key: "uniqueDomains", label: "Unique Domains", width: 150, sortable: true },
  { key: "ga4Sessions", label: "GA4 Sessions (Page)", width: 190, sortable: true },
  { key: "topRisky", label: "Top Risky Anchors", width: 360 },
  { key: "lastSeen", label: "Last Seen", width: 120, sortable: true },
  { key: "actions", label: "Actions", width: 200 },
];

/* ---------- Component ---------- */
export default function TopTargetPagesByRiskyAnchorsTable() {
  /* data */
  const [rows, setRows] = useState<PageRow[]>(() => makePageRows());

  /* selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  /* expand */
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
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<ListMode>("All");
  const [risk, setRisk] = useState<AnchorRisk | "All">("All");

  const [riskyMin, setRiskyMin] = useState(0);
  const [riskyMax, setRiskyMax] = useState(100);

  const [exactMin, setExactMin] = useState(0);
  const [exactMax, setExactMax] = useState(100);

  const [sessionsMin, setSessionsMin] = useState(0);
  const [sessionsMax, setSessionsMax] = useState(12000);

  const [lastSeenMin, setLastSeenMin] = useState(0);
  const [lastSeenMax, setLastSeenMax] = useState(120);

  const riskyActive = riskyMin > 0 || riskyMax < 100;
  const exactActive = exactMin > 0 || exactMax < 100;
  const sessionsActive = sessionsMin > 0 || sessionsMax < 12000;
  const lastSeenActive = lastSeenMin > 0 || lastSeenMax < 120;

  /* sorting */
  const [sortBy, setSortBy] = useState<ColKey>("riskyAnchors");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (key === "select" || key === "expander" || key === "actions" || key === "topRisky") return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
  };

  /* column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    Object.fromEntries(cols.map(c => [c.key, true]))
  );
  const visibleColumns = useMemo(
    () => cols.filter((c) => visibleCols[c.key] !== false),
    [visibleCols]
  );

  /* sticky helpers */
  const stickyStyle = (key: ColKey) =>
    key === "select"
      ? { position: "sticky" as const, left: 0, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : key === "expander"
      ? { position: "sticky" as const, left: 36, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : key === "page"
      ? { position: "sticky" as const, left: 72, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : {};

  /* filter pipeline */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (listMode === "Whitelist" && !r.whitelisted) return false;
      if (listMode === "For Review" && !r.forReview) return false;
      if (risk !== "All" && r.risk !== risk) return false;
      if (!(r.riskShare >= riskyMin && r.riskShare <= riskyMax)) return false;
      if (!(r.exactShare >= exactMin && r.exactShare <= exactMax)) return false;
      if (!(r.ga4Sessions >= sessionsMin && r.ga4Sessions <= sessionsMax)) return false;
      if (!(r.lastSeenDays >= lastSeenMin && r.lastSeenDays <= lastSeenMax)) return false;
      if (query) {
        const hay = `${r.page} ${r.topRiskyAnchors.map(a => a.text).join(" ")}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, listMode, risk, riskyMin, riskyMax, exactMin, exactMax, sessionsMin, sessionsMax, lastSeenMin, lastSeenMax, query]);

  /* sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const map: Record<string, any> = {
        page: (x: PageRow) => x.page.toLowerCase(),
        risk: (x: PageRow) => x.risk,
        riskyAnchors: (x: PageRow) => x.riskyAnchors,
        riskShare: (x: PageRow) => x.riskShare,
        exactShare: (x: PageRow) => x.exactShare,
        uniqueAnchors: (x: PageRow) => x.uniqueAnchors,
        backlinks: (x: PageRow) => x.backlinks,
        uniqueDomains: (x: PageRow) => x.uniqueDomains,
        ga4Sessions: (x: PageRow) => x.ga4Sessions,
        lastSeen: (x: PageRow) => x.lastSeenDays,
      };
      const av = map[sortBy] ? map[sortBy](a) : 0;
      const bv = map[sortBy] ? map[sortBy](b) : 0;
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* window */
  const [visibleCountState, setVisibleCountState] = useState(visibleCount);
  useEffect(() => setVisibleCountState(visibleCount), [visibleCount]);

  const windowedRows = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCountState);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCountState, page, pageSize]);

  /* infinite sentinel */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("pages-risky-scroll-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCountState((v) => Math.min(sorted.length, v + 50));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* header checkbox state */
  const visibleIds = windowedRows.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;

  /* export CSV */
  const exportCSV = (onlySelected: boolean = false) => {
    const dataset = (onlySelected ? sorted.filter((r) => !!selected[r.id]) : sorted) as PageRow[];
    const headers = [
      "page","risk","riskyAnchors","riskShare","exactShare","uniqueAnchors","backlinks","uniqueDomains",
      "ga4Sessions","topRiskyAnchors","lastSeenDays"
    ];
    const header = headers.join(",");
    const lines = dataset.map((r) =>
      [
        r.page, r.risk, r.riskyAnchors, r.riskShare, r.exactShare, r.uniqueAnchors, r.backlinks, r.uniqueDomains,
        r.ga4Sessions, r.topRiskyAnchors.map(a => `${a.text}:${a.count}:${a.risk}`).join("|"), r.lastSeenDays
      ].map((v) => JSON.stringify(String(v))).join(",")
    ).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? `top-target-pages-risky-selected.csv` : `top-target-pages-risky.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* bulk actions (wire to actual handlers) */
  const bulkDisavow = () => console.info("Disavow links for pages:", selectedIds);
  const bulkCreateTasks = () => console.info("Create tasks for pages:", selectedIds);

  /* clear filters */
  const clearAllFilters = () => {
    setQuery("");
    setListMode("All");
    setRisk("All");
    setRiskyMin(0); setRiskyMax(100);
    setExactMin(0); setExactMax(100);
    setSessionsMin(0); setSessionsMax(12000);
    setLastSeenMin(0); setLastSeenMax(120);
  };

  /* expanded row content */
  const renderExpanded = (row: PageRow) => (
    <div className="grid grid-cols-2 gap-4 p-4 rounded-md border"
         style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}>
      <div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4" color="#008CCD" /> Target Page
        </div>
        <div className="text-sm font-medium">
          <span className="underline cursor-pointer" style={{ color: TOKENS.brand }}>{row.page}</span>
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Risk Overview</div>
        <div className="flex gap-2 items-center">
          <RiskPill risk={row.risk} />
          <span className="text-sm text-muted-foreground">Risky {row.riskShare}% • Exact {row.exactShare}%</span>
        </div>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-1">Top risky anchors</div>
        <div className="space-y-1 text-sm">
          {row.topRiskyAnchors.map((a, i) => {
            const t = inferAnchorType(a.text);
            return (
              <div key={`${a.text}-${i}`} className="flex items-center gap-2">
                <RiskPill risk={a.risk} />
                <span className="inline-flex items-center gap-1.5">
                  <AnchorTypeIcon t={t} />
                  <span className="truncate" title={`${a.text} • ${t}`}>{a.text}</span>
                </span>
                <span className="text-muted-foreground">×{a.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-1">Page metrics</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-muted-foreground">Backlinks</div>
            <div className="font-medium">{row.backlinks}</div>
          </div>
          <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-muted-foreground">Ref. Domains</div>
            <div className="font-medium">{row.uniqueDomains}</div>
          </div>
          <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-muted-foreground">Unique Anchors</div>
            <div className="font-medium">{row.uniqueAnchors}</div>
          </div>
          <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-muted-foreground">Last Seen</div>
            <div className="font-medium">{row.lastSeenDays === 0 ? "today" : `${row.lastSeenDays}d ago`}</div>
          </div>
          <div className="rounded border p-2 col-span-2" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-muted-foreground">GA4 Sessions</div>
            <div className="font-medium">
              {row.ga4 ? `${row.ga4Sessions} sessions` : <Button size="sm" variant="outline" className="cursor-pointer">Connect GA4</Button>}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <div className="text-sm text-muted-foreground mb-1">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} className="cursor-pointer">
            <Eye className="h-4 w-4 mr-1" color="#FFFFFF" /> View Links
          </Button>
          <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
            <ClipboardList className="h-4 w-4" color="#008CCD" /> Create Task
          </Button>
          <Button size="sm" variant="destructive" className="gap-1 cursor-pointer">
            <Shield className="h-4 w-4" color="#008CCD" /> Disavow Toxic
          </Button>
        </div>
      </div>
    </div>
  );

  /* filter chips */
  const ActiveChips = () => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (listMode !== "All") chips.push({ key: "list", label: `List: ${listMode}`, onClear: () => setListMode("All") });
    if (risk !== "All") chips.push({ key: "risk", label: `Risk: ${risk}`, onClear: () => setRisk("All") });
    if (riskyActive) chips.push({ key: "r", label: `Risky % ${riskyMin}–${riskyMax}`, onClear: () => { setRiskyMin(0); setRiskyMax(100); } });
    if (exactActive) chips.push({ key: "e", label: `Exact % ${exactMin}–${exactMax}`, onClear: () => { setExactMin(0); setExactMax(100); } });
    if (sessionsActive) chips.push({ key: "s", label: `Sessions ${sessionsMin}–${sessionsMax}`, onClear: () => { setSessionsMin(0); setSessionsMax(12000); } });
    if (lastSeenActive) chips.push({ key: "ls", label: `Last seen ${lastSeenMin}–${lastSeenMax}d`, onClear: () => { setLastSeenMin(0); setLastSeenMax(120); } });

    if (!chips.length) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.key}
                  className="h-7 px-2 rounded-full border text-xs inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
                  onClick={c.onClear}>
            <span>{c.label}</span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600">×</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-3 wr-font">
      <GlobalTokens />

      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Section title with branded icon */}
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Backlink Audit → Top Target Pages by Risky Anchor Usage</CardTitle>
            </div>
            <div className="inline-flex items-center rounded border px-2 py-1 text-sm"
                 style={{ borderColor: TOKENS.borderLight, background: "#fff", color: TOKENS.muted }}>
              <Dot color={TOKENS.critical} /> <span>Pages with toxic/high anchors & exact‑match clustering</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Infinite */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              <Switch
                checked={infinite}
                onCheckedChange={(v) => { setInfinite(Boolean(v)); if (Boolean(v)) setVisibleCountState(50); }}
                className="cursor-pointer"
              />
            </div>
            {/* Multi Expand */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expand multiple</span>
              <Switch checked={multiExpand} onCheckedChange={setMultiExpand} className="cursor-pointer" />
            </div>

            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4" color="#008CCD" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {cols.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          disabled={c.key === "select" || c.key === "expander" || c.key === "page"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))} />
                        <span>{c.label || c.key}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" className="cursor-pointer"
                          onClick={() => setVisibleCols(Object.fromEntries(cols.map(c => [c.key, true])))}>Reset</Button>
                  <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={() => exportCSV(anySelected)} className="cursor-pointer">
              <Download className="h-4 w-4 mr-1" color="#008CCD" /> Export
            </Button>

            {/* Refresh demo data */}
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => setRows(makePageRows())}>
              <RefreshCw className="h-4 w-4" color="#008CCD" /> Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Bulk toolbar */}
        {anySelected && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t"
               style={{ borderColor: TOKENS.borderLight, background: TOKENS.brandPastel }}>
            <div className="text-sm" style={{ color: TOKENS.textStrong }}>
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={bulkCreateTasks} className="cursor-pointer">
                <ClipboardList className="h-4 w-4 mr-1" color="#FFFFFF" /> Create Tasks
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportCSV(true)} className="cursor-pointer">
                <Download className="h-4 w-4 mr-1" color="#008CCD" /> Export Selection
              </Button>
              <Button size="sm" variant="destructive" onClick={bulkDisavow} className="cursor-pointer">
                <Shield className="h-4 w-4 mr-1" color="#008CCD" /> Disavow
              </Button>
            </div>
          </div>
        )}

        {/* Filters Row */}
        <CardContent className="border-t pt-4 space-y-3" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" color="#008CCD" /> Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Filter by risk, risky %, exact‑match %, GA4 sessions, and last seen window.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={clearAllFilters} className="cursor-pointer">Clear all</Button>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)}
                     placeholder="Search page or anchor…" className="w-[260px] pl-7" />
            </div>

            {/* List mode */}
            <Select value={listMode} onValueChange={(v) => setListMode(v as ListMode)}>
              <SelectTrigger className="w-[160px] h-8 cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["All","Whitelist","For Review"] as const).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Risk */}
            <Select value={risk} onValueChange={(v) => setRisk(v as any)}>
              <SelectTrigger className="w-[160px] h-8 cursor-pointer"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                {(["All","Toxic","High","Medium","Low"] as const).map((s) =>
                  <SelectItem key={s} value={s as any}>Risk – {s}</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Risky % */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <Percent className="h-4 w-4" color="#008CCD" /> Risky % {riskyActive ? `${riskyMin}–${riskyMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Risky % range</span>
                    <span className="text-muted-foreground">{riskyMin}% – {riskyMax}%</span>
                  </div>
                  <Slider value={[riskyMin, riskyMax]} min={0} max={100} step={1}
                          onValueChange={(v) => { const [a, b] = v as [number, number]; setRiskyMin(a); setRiskyMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={100} value={riskyMin}
                           onChange={(e) => setRiskyMin(Math.max(0, Math.min(Number(e.target.value)||0, riskyMax)))} className="w-24" />
                    <Input type="number" min={0} max={100} value={riskyMax}
                           onChange={(e) => setRiskyMax(Math.max(riskyMin, Math.min(Number(e.target.value)||0, 100)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setRiskyMin(0); setRiskyMax(100); }} className="cursor-pointer">Reset</Button>
                      <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Exact‑match % */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <Settings2 className="h-4 w-4" color="#008CCD" /> Exact % {exactActive ? `${exactMin}–${exactMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Exact‑match share</span>
                    <span className="text-muted-foreground">{exactMin}% – {exactMax}%</span>
                  </div>
                  <Slider value={[exactMin, exactMax]} min={0} max={100} step={1}
                          onValueChange={(v) => { const [a, b] = v as [number, number]; setExactMin(a); setExactMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={100} value={exactMin}
                           onChange={(e) => setExactMin(Math.max(0, Math.min(Number(e.target.value)||0, exactMax)))} className="w-24" />
                    <Input type="number" min={0} max={100} value={exactMax}
                           onChange={(e) => setExactMax(Math.max(exactMin, Math.min(Number(e.target.value)||0, 100)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setExactMin(0); setExactMax(100); }} className="cursor-pointer">Reset</Button>
                      <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* GA4 Sessions */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <Settings2 className="h-4 w-4" color="#008CCD" /> GA4 Sessions {sessionsActive ? `${sessionsMin}–${sessionsMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sessions range</span>
                    <span className="text-muted-foreground">{sessionsMin} – {sessionsMax}</span>
                  </div>
                  <Slider value={[sessionsMin, sessionsMax]} min={0} max={12000} step={50}
                          onValueChange={(v) => { const [a, b] = v as [number, number]; setSessionsMin(a); setSessionsMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={12000} value={sessionsMin}
                           onChange={(e) => setSessionsMin(Math.max(0, Math.min(Number(e.target.value)||0, sessionsMax)))} className="w-24" />
                    <Input type="number" min={0} max={12000} value={sessionsMax}
                           onChange={(e) => setSessionsMax(Math.max(sessionsMin, Math.min(Number(e.target.value)||0, 12000)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSessionsMin(0); setSessionsMax(12000); }} className="cursor-pointer">Reset</Button>
                      <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Last seen (days) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <CalendarDays className="h-4 w-4" color="#008CCD" /> Last seen {lastSeenActive ? `${lastSeenMin}–${lastSeenMax}d` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Days ago</span>
                    <span className="text-muted-foreground">{lastSeenMin} – {lastSeenMax} days</span>
                  </div>
                  <Slider value={[lastSeenMin, lastSeenMax]} min={0} max={120} step={1}
                          onValueChange={(v) => { const [a, b] = v as [number, number]; setLastSeenMin(a); setLastSeenMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={120} value={lastSeenMin}
                           onChange={(e) => setLastSeenMin(Math.max(0, Math.min(Number(e.target.value)||0, lastSeenMax)))} className="w-24" />
                    <Input type="number" min={0} max={120} value={lastSeenMax}
                           onChange={(e) => setLastSeenMax(Math.max(lastSeenMin, Math.min(Number(e.target.value)||0, 120)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setLastSeenMin(0); setLastSeenMax(120); }} className="cursor-pointer">Reset</Button>
                      <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active chips */}
          <ActiveChips />
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c.key) }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
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
                            : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow className="hover:bg-[var(--wr-subtle)]">
                      {/* select */}
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle("select") as any}>
                          <Checkbox checked={!!selected[row.id]}
                                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [row.id]: Boolean(v) }))} />
                        </TableCell>
                      )}
                      {/* expander */}
                      {visibleCols.expander !== false && (
                        <TableCell style={stickyStyle("expander") as any}>
                          <button onClick={() => toggleExpand(row.id)}
                                  aria-label={expanded[row.id] ? "Collapse" : "Expand"}
                                  className="rounded-md border p-1 hover:bg-muted cursor-pointer">
                            {expanded[row.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                      )}
                      {/* page (sticky) */}
                      {visibleCols.page !== false && (
                        <TableCell style={stickyStyle("page") as any}>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 rounded bg-gray-200" aria-hidden />
                            <span className="font-medium truncate max-w-[300px]" title={row.page}>{row.page}</span>
                          </div>
                        </TableCell>
                      )}
                      {/* risk (with branded icon) */}
                      {visibleCols.risk !== false && (<TableCell><RiskPill risk={row.risk} /></TableCell>)}
                      {/* risky count */}
                      {visibleCols.riskyAnchors !== false && (<TableCell>{row.riskyAnchors}</TableCell>)}
                      {/* risky share */}
                      {visibleCols.riskShare !== false && (<TableCell>{row.riskShare}%</TableCell>)}
                      {/* exact share */}
                      {visibleCols.exactShare !== false && (<TableCell>{row.exactShare}%</TableCell>)}
                      {/* unique anchors */}
                      {visibleCols.uniqueAnchors !== false && (<TableCell>{row.uniqueAnchors}</TableCell>)}
                      {/* backlinks */}
                      {visibleCols.backlinks !== false && (<TableCell>{row.backlinks}</TableCell>)}
                      {/* domains */}
                      {visibleCols.uniqueDomains !== false && (<TableCell>{row.uniqueDomains}</TableCell>)}
                      {/* GA4 */}
                      {visibleCols.ga4Sessions !== false && (
                        <TableCell>
                          {row.ga4 ? `${row.ga4Sessions} sessions` : <Button size="sm" variant="outline" className="cursor-pointer">Connect GA4</Button>}
                        </TableCell>
                      )}
                      {/* top risky anchors (chips with anchor type icon) */}
                      {visibleCols.topRisky !== false && (
                        <TableCell className="max-w-[360px] truncate"
                                   title={row.topRiskyAnchors.map(a => `${a.text}×${a.count}`).join(", ")}>
                          <div className="flex flex-wrap gap-1.5">
                            {row.topRiskyAnchors.map((a, i) => {
                              const t = inferAnchorType(a.text);
                              return (
                                <span key={`${a.text}-${i}`}
                                      className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded border bg-white"
                                      style={{ borderColor: TOKENS.border }}>
                                  <AnchorTypeIcon t={t} />
                                  <Dot color={RISK_COLORS[a.risk]} />
                                  <span className="truncate max-w-[180px]" title={`${a.text} • ${t}`}>{a.text}</span>
                                  <span className="text-muted-foreground">×{a.count}</span>
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}
                      {/* last seen */}
                      {visibleCols.lastSeen !== false && (<TableCell>{row.lastSeenDays === 0 ? "today" : `${row.lastSeenDays}d ago`}</TableCell>)}
                      {/* actions (brand icons) */}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="View" className="cursor-pointer">
                                    <Eye className="h-4 w-4" color="#008CCD" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">View Links</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Create Task" className="cursor-pointer">
                                    <ClipboardList className="h-4 w-4" color="#008CCD" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Create Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Disavow" className="cursor-pointer">
                                    <Shield className="h-4 w-4" color="#008CCD" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Disavow</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Remove" className="cursor-pointer">
                                    <Trash2 className="h-4 w-4" color="#008CCD" />
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
                          {renderExpanded(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {infinite && <div id="pages-risky-scroll-sentinel" className="h-8" />}
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
                <SelectTrigger className="w-[120px] h-8 cursor-pointer"><SelectValue placeholder="Page size" /></SelectTrigger>
                <SelectContent>{[10, 25, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
