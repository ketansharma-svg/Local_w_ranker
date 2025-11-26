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
  SlidersHorizontal, Eye, ClipboardList, Trash2, Shield, Link as LinkIcon,
  CalendarDays, Percent, Link2, Link2Off, Users, Megaphone, Target, Crosshair, MessageSquareText, BadgeCheck
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

/* ---------- Tokens (read from CSS vars) ---------- */
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
type LinkAttribute = "dofollow" | "nofollow" | "ugc" | "sponsored";
type AnchorType = "Exact Match" | "Partial Match" | "Naked URL" | "Generic" | "Branded";
type AnchorRisk = "Toxic" | "High" | "Medium" | "Low";
type DisavowStatus = "Not Disavowed" | "Pending" | "Disavowed";

type AnchorRow = {
  id: string;
  anchorText: string;
  risk: AnchorRisk;
  anchorType: AnchorType;
  attribute: LinkAttribute;
  backlinks: number;
  uniqueDomains: number;
  profileShare: number;        // %
  referral: number;            // GA4 sessions
  ga4: boolean;
  topTargets: string[];        // list of slugs or paths
  lastSeenDays: number;        // days since last seen
  disavow: DisavowStatus;
  whitelisted: boolean;
  forReview: boolean;
};

/* ---------- Small UI atoms ---------- */
const Badge = ({ text, color, title }: { text: string; color: string; title?: string }) => (
  <span
    title={title}
    className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${color}1A`, color, border: `1px solid ${color}26` }}
  >
    {text}
  </span>
);

const Dot = ({ color }: { color: string }) => (
  <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: color }} />
);

const RISK_COLORS: Record<AnchorRisk, string> = {
  Toxic: TOKENS.critical,
  High: "#F97316",
  Medium: TOKENS.warning,
  Low: TOKENS.success,
};
const RiskPill = ({ risk }: { risk: AnchorRisk }) => (
  <Badge text={risk} color={RISK_COLORS[risk]} title="Anchor risk level" />
);

/* Branded icons for Anchor Types */
const AnchorTypeIcon = ({ t }: { t: AnchorType }) => {
  const common = { className: "h-4 w-4", color: "#008CCD" };
  switch (t) {
    case "Exact Match":
      return <Target {...common} />;
    case "Partial Match":
      return <Crosshair {...common} />;
    case "Naked URL":
      return <Link2 {...common} />;
    case "Generic":
      return <MessageSquareText {...common} />;
    case "Branded":
    default:
      return <BadgeCheck {...common} />;
  }
};

const TYPE_COLORS: Record<AnchorType, string> = {
  "Exact Match": TOKENS.critical,
  "Partial Match": TOKENS.warning,
  "Naked URL": TOKENS.muted,
  Generic: TOKENS.muted,
  Branded: TOKENS.success,
};

/* Pill with branded icon for anchor type */
const TypePill = ({ t }: { t: AnchorType }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${TYPE_COLORS[t]}1A`, color: TYPE_COLORS[t], border: `1px solid ${TYPE_COLORS[t]}26` }}
    title="Anchor type"
  >
    <AnchorTypeIcon t={t} />
    {t}
  </span>
);

/* Branded icon chip for Link Attribute */
const AttrPill = ({ a }: { a: LinkAttribute }) => {
  const Icon =
    a === "dofollow" ? Link2 :
    a === "nofollow" ? Link2Off :
    a === "ugc" ? Users :
    Megaphone;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded text-[12px] font-medium border bg-white"
      style={{ borderColor: TOKENS.border, color: TOKENS.textStrong }}
      title={`Link attribute: ${a}`}
    >
      <Icon className="h-4 w-4" color="#008CCD" />
      {a}
    </span>
  );
};

const DisavowPill = ({ s }: { s: DisavowStatus }) => {
  const color = s === "Disavowed" ? TOKENS.success : s === "Pending" ? TOKENS.warning : TOKENS.muted;
  return <Badge text={s} color={color} title="Disavow status" />;
};

/* ---------- Mock data (swap with API data) ---------- */
const SAMPLE_ANCHORS = [
  "buy backlinks", "best seo tool", "seo tools comparison", "https://wranker.com", "click here",
  "wranker backlink insights", "online casino", "seo audits", "seo agency", "pricing wranker",
  "free credit score", "cheap flights", "visit website", "learn more", "top vpn"
] as const;

const TARGETS = [
  "/services/seo", "/tools/rank-tracker", "/blog/anchor-text-best-practices",
  "/blog/seo-guide", "/case-studies/abc-tech", "/pricing", "/contact-us",
  "/blog/keyword-research", "/blog/link-building", "/blog/tools/roundup"
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

function makeAnchorRows(count = 120): AnchorRow[] {
  const types: AnchorType[] = ["Exact Match", "Partial Match", "Naked URL", "Generic", "Branded"];
  const attrs: LinkAttribute[] = ["dofollow", "nofollow", "sponsored", "ugc"];
  const risks: AnchorRisk[] = ["Toxic", "High", "Medium", "Low"];

  return Array.from({ length: count }, (_, i) => {
    const t = pick(types);
    const risk = Math.random() > 0.85 ? "Toxic" : Math.random() > 0.6 ? "High" : Math.random() > 0.4 ? "Medium" : "Low";
    const backlinks = rand(80, 185);
    const uniqueDomains = rand(40, 90);
    const profileShare = rand(1, 25);
    const referral = Math.random() > 0.25 ? rand(150, 2400) : 0;
    const topTargets = pickMany(TARGETS, rand(1, 3));
    const lastSeenDays = rand(0, 120);
    const disavow: DisavowStatus = Math.random() > 0.93 ? "Disavowed" : Math.random() > 0.86 ? "Pending" : "Not Disavowed";
    return {
      id: `a-${i + 1}`,
      anchorText: pick(SAMPLE_ANCHORS as unknown as string[]),
      risk,
      anchorType: t,
      attribute: pick(attrs),
      backlinks,
      uniqueDomains,
      profileShare,
      referral,
      ga4: Math.random() > 0.15,
      topTargets,
      lastSeenDays,
      disavow,
      whitelisted: Math.random() > 0.88,
      forReview: Math.random() > 0.88,
    };
  });
}

/* ---------- Columns ---------- */
type ColKey =
  | "select" | "expander" | "anchorText" | "risk" | "anchorType" | "attribute"
  | "backlinks" | "uniqueDomains" | "profileShare" | "referral" | "topTargets"
  | "lastSeen" | "disavow" | "actions";

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
  { key: "anchorText", label: "Anchor Text", width: 300, sortable: true },
  { key: "risk", label: "Risk Level", width: 120, sortable: true },
  { key: "anchorType", label: "Anchor Type", width: 170, sortable: true },
  { key: "attribute", label: "Link Attribute", width: 170, sortable: true },
  { key: "backlinks", label: "Backlink Count", width: 140, sortable: true },
  { key: "uniqueDomains", label: "Unique Domains", width: 150, sortable: true },
  { key: "profileShare", label: "% of Profile", width: 140, sortable: true },
  { key: "referral", label: "Referral Traffic (GA4)", width: 190, sortable: true },
  { key: "topTargets", label: "Top Target Pages", width: 360 },
  { key: "lastSeen", label: "Last Seen", width: 120, sortable: true },
  { key: "disavow", label: "Disavow", width: 130, sortable: true },
  { key: "actions", label: "Actions", width: 200 },
];

/* ---------- Component ---------- */
export default function OverusedSpamAnchorsTable() {
  /* data */
  const [rows, setRows] = useState<AnchorRow[]>(() => makeAnchorRows());

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
  const [typeFilter, setTypeFilter] = useState<AnchorType | "All">("All");
  const [attrsFilter, setAttrsFilter] = useState<LinkAttribute[]>([]);
  const [profileMin, setProfileMin] = useState(0);
  const [profileMax, setProfileMax] = useState(100);
  const [trafficMin, setTrafficMin] = useState(0);
  const [trafficMax, setTrafficMax] = useState(2500);
  const [lastSeenMin, setLastSeenMin] = useState(0);
  const [lastSeenMax, setLastSeenMax] = useState(120);

  const profileActive = profileMin > 0 || profileMax < 100;
  const trafficActive = trafficMin > 0 || trafficMax < 2500;
  const lastSeenActive = lastSeenMin > 0 || lastSeenMax < 120;

  /* sorting */
  const [sortBy, setSortBy] = useState<ColKey>("backlinks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (key === "select" || key === "expander" || key === "actions" || key === "topTargets") return;
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
      : key === "anchorText"
      ? { position: "sticky" as const, left: 72, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : {};

  /* filter pipeline */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (listMode === "Whitelist" && !r.whitelisted) return false;
      if (listMode === "For Review" && !r.forReview) return false;
      if (risk !== "All" && r.risk !== risk) return false;
      if (typeFilter !== "All" && r.anchorType !== typeFilter) return false;
      if (attrsFilter.length && !attrsFilter.includes(r.attribute)) return false;
      if (!(r.profileShare >= profileMin && r.profileShare <= profileMax)) return false;
      if (!(r.referral >= trafficMin && r.referral <= trafficMax)) return false;
      if (!(r.lastSeenDays >= lastSeenMin && r.lastSeenDays <= lastSeenMax)) return false;
      if (query && !r.anchorText.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [rows, listMode, risk, typeFilter, attrsFilter, profileMin, profileMax, trafficMin, trafficMax, lastSeenMin, lastSeenMax, query]);

  /* sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const map: Record<string, any> = {
        anchorText: (x: AnchorRow) => x.anchorText.toLowerCase(),
        risk: (x: AnchorRow) => x.risk,
        anchorType: (x: AnchorRow) => x.anchorType,
        attribute: (x: AnchorRow) => x.attribute,
        backlinks: (x: AnchorRow) => x.backlinks,
        uniqueDomains: (x: AnchorRow) => x.uniqueDomains,
        profileShare: (x: AnchorRow) => x.profileShare,
        referral: (x: AnchorRow) => x.referral,
        lastSeen: (x: AnchorRow) => x.lastSeenDays,
        disavow: (x: AnchorRow) => x.disavow,
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
    const el = document.getElementById("anchors-scroll-sentinel");
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
    const dataset = (onlySelected ? sorted.filter((r) => !!selected[r.id]) : sorted) as AnchorRow[];
    const headers = ["anchorText","risk","anchorType","attribute","backlinks","uniqueDomains","profileShare","referral","topTargets","lastSeenDays","disavow"];
    const header = headers.join(",");
    const lines = dataset.map((r) =>
      [
        r.anchorText, r.risk, r.anchorType, r.attribute,
        r.backlinks, r.uniqueDomains, r.profileShare, r.referral,
        r.topTargets.join("|"), r.lastSeenDays, r.disavow
      ].map((v) => JSON.stringify(String(v))).join(",")
    ).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? `overused-anchors-selected.csv` : `overused-anchors.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* bulk actions (wire to actual handlers) */
  const bulkDisavow = () => console.info("Disavow anchors:", selectedIds);
  const bulkCreateTasks = () => console.info("Create tasks for anchors:", selectedIds);

  /* clear filters */
  const clearAllFilters = () => {
    setQuery("");
    setListMode("All");
    setRisk("All");
    setTypeFilter("All");
    setAttrsFilter([]);
    setProfileMin(0); setProfileMax(100);
    setTrafficMin(0); setTrafficMax(2500);
    setLastSeenMin(0); setLastSeenMax(120);
  };

  /* expanded row content */
  const renderExpanded = (row: AnchorRow) => (
    <div className="grid grid-cols-2 gap-4 p-4 rounded-md border"
         style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}>
      <div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4" color="#008CCD" /> Anchor Text
        </div>
        <div className="text-sm font-medium">{row.anchorText}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Risk / Type</div>
        <div className="flex gap-2 items-center">
          <RiskPill risk={row.risk} />
          <TypePill t={row.anchorType} />
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Top target pages</div>
        <div className="text-sm">
          {row.topTargets.map((p) => (
            <div key={p} className="truncate" title={p}>
              <span className="underline cursor-pointer" style={{ color: TOKENS.brand }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Referral Traffic (GA4)</div>
        <div className="text-sm font-medium">
          {row.ga4 ? `${row.referral} sessions` : <Button size="sm" variant="outline" className="cursor-pointer">Connect GA4</Button>}
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
            <Shield className="h-4 w-4" color="#008CCD" /> Disavow Anchor
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
    if (typeFilter !== "All") chips.push({ key: "type", label: `Type: ${typeFilter}`, onClear: () => setTypeFilter("All") });
    if (attrsFilter.length) chips.push({ key: "attr", label: `Attr: ${attrsFilter.join(",")}`, onClear: () => setAttrsFilter([]) });
    if (profileActive) chips.push({ key: "p", label: `% Profile ${profileMin}–${profileMax}`, onClear: () => { setProfileMin(0); setProfileMax(100); } });
    if (trafficActive) chips.push({ key: "t", label: `Traffic ${trafficMin}–${trafficMax}`, onClear: () => { setTrafficMin(0); setTrafficMax(2500); } });
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
              <Link2 className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Backlink Audit → Overused / Spam Anchors</CardTitle>
            </div>
            <div
              className="inline-flex items-center rounded border px-2 py-1 text-sm"
              style={{ borderColor: TOKENS.borderLight, background: "#fff", color: TOKENS.muted }}
            >
              <Dot color={TOKENS.critical} /> <span>Toxic density, anchor patterns & target clustering</span>
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
                          disabled={c.key === "select" || c.key === "expander" || c.key === "anchorText"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                        />
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
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => setRows(makeAnchorRows())}>
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
                    Filter by risk, type, link attributes, GA4 traffic, % of profile and last seen window.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={clearAllFilters} className="cursor-pointer">Clear all</Button>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)}
                     placeholder="Search anchor text…" className="w-[260px] pl-7" />
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

            {/* Anchor Type */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[190px] h-8 cursor-pointer"><SelectValue placeholder="Anchor Type" /></SelectTrigger>
              <SelectContent>
                {(["All","Exact Match","Partial Match","Naked URL","Generic","Branded"] as const).map((t) =>
                  <SelectItem key={t} value={t as any}>Anchor Type – {t}</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Attributes multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <Settings2 className="h-4 w-4" color="#008CCD" /> Link Attribute {attrsFilter.length ? `(${attrsFilter.length})` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px]" align="start">
                <div className="grid grid-cols-2 gap-2">
                  {(["dofollow","nofollow","ugc","sponsored"] as const).map((a) => {
                    const on = attrsFilter.includes(a);
                    return (
                      <button key={a}
                              className={`h-8 px-3 rounded border text-sm text-left cursor-pointer ${on ? "bg-[var(--wr-brand-pastel)] border-[var(--wr-brand)] text-[var(--wr-text)]" : ""}`}
                              onClick={() => setAttrsFilter((s) => on ? s.filter(x => x !== a) : [...s, a])}>
                        {/* branded icon inline */}
                        <span className="inline-flex items-center gap-2">
                          {a === "dofollow" && <Link2 className="h-4 w-4" color="#008CCD" />}
                          {a === "nofollow" && <Link2Off className="h-4 w-4" color="#008CCD" />}
                          {a === "ugc" && <Users className="h-4 w-4" color="#008CCD" />}
                          {a === "sponsored" && <Megaphone className="h-4 w-4" color="#008CCD" />}
                          {a}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setAttrsFilter([])} className="cursor-pointer">Reset</Button>
                  <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* % of Profile */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <Percent className="h-4 w-4" color="#008CCD" /> % of Profile {profileActive ? `${profileMin}–${profileMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Share range</span>
                    <span className="text-muted-foreground">{profileMin}% – {profileMax}%</span>
                  </div>
                  <Slider value={[profileMin, profileMax]} min={0} max={100} step={1}
                          onValueChange={(v) => { const [a, b] = v as [number, number]; setProfileMin(a); setProfileMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={100} value={profileMin}
                           onChange={(e) => setProfileMin(Math.max(0, Math.min(Number(e.target.value)||0, profileMax)))} className="w-24" />
                    <Input type="number" min={0} max={100} value={profileMax}
                           onChange={(e) => setProfileMax(Math.max(profileMin, Math.min(Number(e.target.value)||0, 100)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setProfileMin(0); setProfileMax(100); }} className="cursor-pointer">Reset</Button>
                      <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* GA4 Traffic */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <Settings2 className="h-4 w-4" color="#008CCD" /> GA4 Traffic {trafficActive ? `${trafficMin}–${trafficMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sessions range</span>
                    <span className="text-muted-foreground">{trafficMin} – {trafficMax}</span>
                  </div>
                  <Slider value={[trafficMin, trafficMax]} min={0} max={2500} step={10}
                          onValueChange={(v) => { const [a, b] = v as [number, number]; setTrafficMin(a); setTrafficMax(b); }} />
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={2500} value={trafficMin}
                           onChange={(e) => setTrafficMin(Math.max(0, Math.min(Number(e.target.value)||0, trafficMax)))} className="w-24" />
                    <Input type="number" min={0} max={2500} value={trafficMax}
                           onChange={(e) => setTrafficMax(Math.max(trafficMin, Math.min(Number(e.target.value)||0, 2500)))} className="w-24" />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setTrafficMin(0); setTrafficMax(2500); }} className="cursor-pointer">Reset</Button>
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
                      {/* anchor text (sticky) */}
                      {visibleCols.anchorText !== false && (
                        <TableCell style={stickyStyle("anchorText") as any}>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 rounded bg-gray-200" aria-hidden />
                            <span className="font-medium">{row.anchorText}</span>
                          </div>
                        </TableCell>
                      )}
                      {/* risk */}
                      {visibleCols.risk !== false && (<TableCell><RiskPill risk={row.risk} /></TableCell>)}
                      {/* type (with branded icon) */}
                      {visibleCols.anchorType !== false && (<TableCell><TypePill t={row.anchorType} /></TableCell>)}
                      {/* attribute (with branded icon) */}
                      {visibleCols.attribute !== false && (<TableCell><AttrPill a={row.attribute} /></TableCell>)}
                      {/* metrics */}
                      {visibleCols.backlinks !== false && (<TableCell>{row.backlinks}</TableCell>)}
                      {visibleCols.uniqueDomains !== false && (<TableCell>{row.uniqueDomains}</TableCell>)}
                      {visibleCols.profileShare !== false && (<TableCell>{row.profileShare}%</TableCell>)}
                      {visibleCols.referral !== false && (
                        <TableCell>
                          {row.ga4 ? `${row.referral} sessions` : <Button size="sm" variant="outline" className="cursor-pointer">Connect GA4</Button>}
                        </TableCell>
                      )}
                      {/* targets */}
                      {visibleCols.topTargets !== false && (
                        <TableCell className="max-w-[360px] truncate"
                                   title={row.topTargets.join(", ")}>
                          {row.topTargets.join(", ")}
                        </TableCell>
                      )}
                      {/* last seen */}
                      {visibleCols.lastSeen !== false && (<TableCell>{row.lastSeenDays === 0 ? "today" : `${row.lastSeenDays}d ago`}</TableCell>)}
                      {/* disavow */}
                      {visibleCols.disavow !== false && (<TableCell><DisavowPill s={row.disavow} /></TableCell>)}
                      {/* actions (branded icons) */}
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
                                  <Button size="icon" variant="ghost" aria-label="Remove from tracking" className="cursor-pointer">
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
            {infinite && <div id="anchors-scroll-sentinel" className="h-8" />}
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

