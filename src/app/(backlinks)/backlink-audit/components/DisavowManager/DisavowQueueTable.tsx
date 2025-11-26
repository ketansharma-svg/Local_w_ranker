import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown, ExternalLink,
  Filter, Info, Search, XCircle, Shield, Megaphone, Flag, Sparkles
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
type QueueType = "Domain" | "URL";
type QueueReason = "Toxic Score" | "Spam Anchor" | "Manual Flag" | "AI Suggestion";

export type DisavowQueueItem = {
  id: string;
  type: QueueType;
  domain: string;
  url?: string;
  reason: QueueReason;
  reasonInfo?: string;
  toxicity: number;       // 0..100
  ga4: boolean;
  referral: number;       // GA4 sessions if ga4=true
  dateAdded: string;      // ISO timestamp
};

/* ---------- Reason meta (badge color + tooltip help + branded icon) ---------- */
const REASON_META: Record<
  QueueReason,
  { color: string; tooltip: string; Icon: React.ComponentType<{ className?: string; color?: string }> }
> = {
  "Toxic Score": {
    color: TOKENS.critical,
    tooltip: "Added due to high Wranker Toxicity Score. Threshold breached by model rules.",
    Icon: Shield,
  },
  "Spam Anchor": {
    color: TOKENS.warning,
    tooltip: "Anchor patterns matched spam heuristics (e.g., 'click here', casino, pharma).",
    Icon: Megaphone,
  },
  "Manual Flag": {
    color: "#EAB308",
    tooltip: "User manually flagged this item for disavow review.",
    Icon: Flag,
  },
  "AI Suggestion": {
    color: "#8B5CF6",
    tooltip: "AI suggested this item based on abnormal patterns across anchors, pages, and host.",
    Icon: Sparkles,
  },
};

/* ---------- Small UI helpers ---------- */
const Badge = ({
  text, color, title, LeadingIcon,
}: { text: string; color: string; title?: string; LeadingIcon?: React.ComponentType<{ className?: string; color?: string }> }) => (
  <span
    title={title}
    className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${color}1A`, color, border: `1px solid ${color}26` }}
  >
    {LeadingIcon ? <LeadingIcon className="h-3.5 w-3.5" color="#008CCD" /> : null}
    {text}
  </span>
);

/* ---------- Mock data (replace with live data via props) ---------- */
function makeMockQueue(count = 28): DisavowQueueItem[] {
  const reasons: QueueReason[] = ["Toxic Score", "Spam Anchor", "Manual Flag", "AI Suggestion"];
  return Array.from({ length: count }, (_, i) => {
    const type: QueueType = Math.random() > 0.55 ? "URL" : "Domain";
    const domain = `example${(i % 18) + 1}.com`;
    const toxicity = Math.floor(Math.random() * 101);
    const ga4 = Math.random() > 0.2;
    const referral = ga4 ? Math.floor(Math.random() * 800) : 0;
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const url = type === "URL" ? `https://${domain}/path/${i + 1}` : undefined;
    const now = new Date();
    const d = new Date(now.getTime() - Math.floor(Math.random() * 9) * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 86400000));
    return {
      id: `q-${i + 1}`,
      type,
      domain,
      url,
      reason,
      reasonInfo: `${reason} detected by ${reason === "Manual Flag" ? "user action" : "automated rules"} • source: ${
        reason === "AI Suggestion" ? "Anomaly model v2.1" : "Heuristics/Rules"
      }`,
      toxicity,
      ga4,
      referral,
      dateAdded: d.toISOString(),
    };
  });
}

/* ---------- Utilities ---------- */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const toxicityColor = (score: number) => {
  if (score >= 80) return TOKENS.critical;
  if (score >= 60) return TOKENS.warning;
  if (score >= 40) return "#FBBF24"; // amber-400
  return TOKENS.muted;
};

/* ---------- Props for integration with surrounding app ---------- */
type DisavowQueueTableProps = {
  data?: DisavowQueueItem[];
  onApprove?: (item: DisavowQueueItem & { approvedAt: string }) => void;
  onRemove?: (item: DisavowQueueItem & { rejectedAt: string }) => void;
  onOpenReferring?: (payload: { type: QueueType; domain: string; url?: string }) => void;
  onOpenAnalytics?: (payload: { source: string; domain: string }) => void;
  onConnectGA4?: () => void;
};

/* ---------- Component ---------- */
export default function DisavowQueueTable({
  data,
  onApprove,
  onRemove,
  onOpenReferring,
  onOpenAnalytics,
  onConnectGA4,
}: DisavowQueueTableProps) {
  /* Data */
  const [rows, setRows] = useState<DisavowQueueItem[]>(() => data ?? makeMockQueue());
  useEffect(() => { if (data) setRows(data); }, [data]);

  /* Filters */
  type GA4Filter = "All" | "Connected" | "Not Connected";
  type TypeFilter = "All" | QueueType;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [ga4Filter, setGa4Filter] = useState<GA4Filter>("All");
  const [reasonsFilter, setReasonsFilter] = useState<QueueReason[]>([]);
  const [toxMin, setToxMin] = useState(0);
  const [toxMax, setToxMax] = useState(100);

  /* Table UI state */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // Date Added default desc

  const toggleExpand = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("All");
    setGa4Filter("All");
    setReasonsFilter([]);
    setToxMin(0);
    setToxMax(100);
  };

  const reasonOn = (r: QueueReason) => reasonsFilter.includes(r);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (typeFilter !== "All" && r.type !== typeFilter) return false;
        if (ga4Filter === "Connected" && !r.ga4) return false;
        if (ga4Filter === "Not Connected" && r.ga4) return false;
        if (reasonsFilter.length && !reasonsFilter.includes(r.reason)) return false;
        if (!(r.toxicity >= toxMin && r.toxicity <= toxMax)) return false;
        if (q) {
          const hay = [r.domain, r.url ?? ""].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = new Date(a.dateAdded).getTime();
        const bv = new Date(b.dateAdded).getTime();
        return sortDir === "asc" ? av - bv : bv - av;
      });
  }, [rows, typeFilter, ga4Filter, reasonsFilter, toxMin, toxMax, query, sortDir]);

  /* Actions */
  const handleApprove = (item: DisavowQueueItem) => {
    const approvedAt = new Date().toISOString();
    onApprove?.({ ...item, approvedAt });
    setRows((rs) => rs.filter((x) => x.id !== item.id));
  };

  const handleRemove = (item: DisavowQueueItem) => {
    const rejectedAt = new Date().toISOString();
    onRemove?.({ ...item, rejectedAt });
    setRows((rs) => rs.filter((x) => x.id !== item.id));
  };

  const openReferring = (r: DisavowQueueItem) =>
    onOpenReferring?.({ type: r.type, domain: r.domain, url: r.url });

  const openAnalytics = (r: DisavowQueueItem) => {
    if (!r.ga4) return;
    onOpenAnalytics?.({ source: r.url ?? r.domain, domain: r.domain });
  };

  return (
    <section className="space-y-3 wr-font">
      <GlobalTokens />

      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Section title + branded icon */}
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Backlink Audit → Disavow Queue</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              Review and approve items before they enter the Active Disavow List.
            </span>
          </div>

          {/* Sort toggle (Date Added) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-8 cursor-pointer"
            >
              Date Added{" "}
              {sortDir === "asc" ? (
                <ChevronDown className="h-4 w-4 ml-1" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
        </CardHeader>

        {/* Filters Bar */}
        <CardContent className="border-t pt-4 space-y-3" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" color="#008CCD" /> Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Filter by type, reason, toxicity score range, GA4 connectivity, and search.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={clearFilters} className="cursor-pointer">
              Clear all
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search domain or URL…"
                className="w-[260px] pl-7"
              />
            </div>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="w-[160px] h-8 cursor-pointer">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Type — All</SelectItem>
                <SelectItem value="Domain">Domain</SelectItem>
                <SelectItem value="URL">URL</SelectItem>
              </SelectContent>
            </Select>

            {/* GA4 filter */}
            <Select value={ga4Filter} onValueChange={(v) => setGa4Filter(v as any)}>
              <SelectTrigger className="w-[175px] h-8 cursor-pointer">
                <SelectValue placeholder="GA4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">GA4 — All</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="Not Connected">Not connected</SelectItem>
              </SelectContent>
            </Select>

            {/* Reason multi-select (with branded icons) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  Reason {reasonsFilter.length ? `(${reasonsFilter.length})` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px]" align="start">
                <div className="space-y-2">
                  {(Object.keys(REASON_META) as QueueReason[]).map((r) => {
                    const { color, tooltip, Icon } = REASON_META[r];
                    return (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={reasonOn(r)}
                          onCheckedChange={(v) =>
                            setReasonsFilter((prev) => (v ? [...prev, r] : prev.filter((x) => x !== r)))
                          }
                        />
                        <Badge text={r} color={color} LeadingIcon={Icon} title={tooltip} />
                        <span className="text-muted-foreground">{tooltip}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setReasonsFilter([])}>
                    Reset
                  </Button>
                  <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Toxicity range */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  Toxicity {toxMin > 0 || toxMax < 100 ? `${toxMin}–${toxMax}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Score range</span>
                    <span className="text-muted-foreground">{toxMin} – {toxMax}</span>
                  </div>
                  <Slider
                    value={[toxMin, toxMax]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      const [a, b] = v as [number, number];
                      setToxMin(a);
                      setToxMax(b);
                    }}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={toxMin}
                      onChange={(e) => setToxMin(Math.max(0, Math.min(Number(e.target.value) || 0, toxMax)))}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={toxMax}
                      onChange={(e) => setToxMax(Math.max(toxMin, Math.min(Number(e.target.value) || 0, 100)))}
                      className="w-20"
                    />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setToxMin(0); setToxMax(100); }}>
                        Reset
                      </Button>
                      <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active chips */}
          {(() => {
            const toxActive = toxMin > 0 || toxMax < 100;
            const chips: { key: string; label: string; onClear: () => void }[] = [];
            if (query) chips.push({ key: "q", label: `Search: ${query}`, onClear: () => setQuery("") });
            if (typeFilter !== "All") chips.push({ key: "t", label: `Type: ${typeFilter}`, onClear: () => setTypeFilter("All") });
            if (ga4Filter !== "All") chips.push({ key: "g", label: `GA4: ${ga4Filter}`, onClear: () => setGa4Filter("All") });
            if (reasonsFilter.length)
              chips.push({ key: "r", label: `Reason: ${reasonsFilter.join(", ")}`, onClear: () => setReasonsFilter([]) });
            if (toxActive) chips.push({ key: "x", label: `Toxicity ${toxMin}–${toxMax}`, onClear: () => { setToxMin(0); setToxMax(100); } });

            if (!chips.length) return null;
            return (
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    className="h-7 px-2 rounded-full border text-xs inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
                    onClick={c.onClear}
                  >
                    <span>{c.label}</span>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600">×</span>
                  </button>
                ))}
              </div>
            );
          })()}
        </CardContent>

        {/* Desktop / Tablet table (all columns left-aligned) */}
        <CardContent className="p-0 hidden md:block">
          <div className="max-h-[520px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-50" style={{ background: TOKENS.appBg }}>
                <TableRow className="border-b" style={{ borderColor: TOKENS.borderLight }}>
                  <TableHead className="w-10"></TableHead>
                  <TableHead style={{ minWidth: 320 }} className="text-left">Domain / URL</TableHead>
                  <TableHead style={{ minWidth: 110 }} className="text-left">Type</TableHead>
                  <TableHead className="hidden lg:table-cell text-left" style={{ minWidth: 220 }}>Reason</TableHead>
                  <TableHead style={{ minWidth: 150 }} className="text-left">Toxicity Score</TableHead>
                  <TableHead style={{ minWidth: 200 }} className="text-left">Referral Traffic (GA4)</TableHead>
                  <TableHead style={{ minWidth: 150 }} className="text-left">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    >
                      <span>Date Added</span>
                      {sortDir === "asc" ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead style={{ minWidth: 180 }} className="text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((r) => {
                  const meta = REASON_META[r.reason];
                  return (
                    <React.Fragment key={r.id}>
                      <TableRow className="hover:bg-[var(--wr-subtle)]">
                        {/* Expander */}
                        <TableCell className="align-top">
                          <button
                            onClick={() => toggleExpand(r.id)}
                            aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                            className="rounded-md border p-1 hover:bg-muted cursor-pointer"
                          >
                            {expanded[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>

                        {/* Domain / URL */}
                        <TableCell className="align-top">
                          <div className="flex items-start gap-2">
                            <span className="inline-block mt-1 w-4 h-4 rounded bg-gray-200" aria-hidden />
                            <div className="space-y-1">
                              {r.type === "URL" ? (
                                <>
                                  <button
                                    className="underline text-left cursor-pointer"
                                    style={{ color: TOKENS.brand }}
                                    onClick={() => openReferring(r)}
                                    title="Open Referring Domains & Backlinks with filters"
                                  >
                                    {r.url}
                                  </button>
                                  <div className="text-xs text-muted-foreground">
                                    from <span className="font-medium">{r.domain}</span>
                                  </div>
                                </>
                              ) : (
                                <button
                                  className="underline text-left cursor-pointer"
                                  style={{ color: TOKENS.brand }}
                                  onClick={() => openReferring(r)}
                                  title="Open Referring Domains & Backlinks with filters"
                                >
                                  {r.domain}
                                </button>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell className="align-top">
                          <Badge text={r.type} color={r.type === "Domain" ? TOKENS.brand : TOKENS.muted} />
                        </TableCell>

                        {/* Reason (hidden on tablet) */}
                        <TableCell className="align-top hidden lg:table-cell">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Badge text={r.reason} color={meta.color} LeadingIcon={meta.Icon} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{r.reasonInfo || meta.tooltip}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Toxicity Score */}
                        <TableCell className="align-top">
                          <Badge
                            text={`${r.toxicity}`}
                            color={toxicityColor(r.toxicity)}
                            title="Wranker Toxicity score (0–100)"
                          />
                        </TableCell>

                        {/* GA4 / Referral Traffic */}
                        <TableCell className="align-top">
                          {r.ga4 ? (
                            <button
                              className="underline cursor-pointer"
                              style={{ color: TOKENS.brand }}
                              onClick={() => openAnalytics(r)}
                              title="Open Analytics with source filter"
                            >
                              {r.referral} sessions
                            </button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={onConnectGA4} className="cursor-pointer">
                              Connect GA4
                            </Button>
                          )}
                        </TableCell>

                        {/* Date Added */}
                        <TableCell className="align-top">{formatDate(r.dateAdded)}</TableCell>

                        {/* Actions (left-aligned per requirement) */}
                        <TableCell className="align-top">
                          <div className="flex gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="gap-1 cursor-pointer"
                                    style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                                    onClick={() => handleApprove(r)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" /> Approve
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Approve for Disavow</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1 cursor-pointer"
                                    onClick={() => handleRemove(r)}
                                  >
                                    <XCircle className="h-4 w-4" /> Remove
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove from Queue</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded content */}
                      {expanded[r.id] && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-[#FAFBFC] p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Reason</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge text={r.reason} color={REASON_META[r.reason].color} LeadingIcon={REASON_META[r.reason].Icon} />
                                  <span className="text-sm">{r.reasonInfo || REASON_META[r.reason].tooltip}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Open in Audit</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1 gap-2 cursor-pointer"
                                  onClick={() => openReferring(r)}
                                >
                                  <ExternalLink className="h-4 w-4" /> Referring Domains & Backlinks
                                </Button>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Toxicity Score</div>
                                <div className="mt-1">
                                  <Badge text={`${r.toxicity}`} color={toxicityColor(r.toxicity)} />
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Referral Traffic (GA4)</div>
                                <div className="mt-1">
                                  {r.ga4 ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-2 cursor-pointer"
                                      onClick={() => openAnalytics(r)}
                                    >
                                      <ExternalLink className="h-4 w-4" /> {r.referral} sessions
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" onClick={onConnectGA4} className="cursor-pointer">
                                      Connect GA4
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <div className="text-sm text-muted-foreground mb-1">Quick Actions</div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="gap-1 cursor-pointer"
                                    style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                                    onClick={() => handleApprove(r)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" /> Approve for Disavow
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1 cursor-pointer"
                                    onClick={() => handleRemove(r)}
                                  >
                                    <XCircle className="h-4 w-4" /> Remove from Queue
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Mobile cards */}
        <CardContent className="p-0 md:hidden">
          <ScrollArea className="max-h-[560px] border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="divide-y" style={{ borderColor: TOKENS.borderLight }}>
              {filtered.map((r) => {
                const meta = REASON_META[r.reason];
                return (
                  <div key={r.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">{r.type}</div>
                        <button
                          className="text-sm underline text-left cursor-pointer"
                          style={{ color: TOKENS.brand }}
                          onClick={() => openReferring(r)}
                        >
                          {r.type === "URL" ? r.url : r.domain}
                        </button>
                        {r.type === "URL" && (
                          <div className="text-xs text-muted-foreground">
                            from <span className="font-medium">{r.domain}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="cursor-pointer">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleApprove(r)} className="gap-2 cursor-pointer">
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRemove(r)} className="gap-2 text-red-600 cursor-pointer">
                            <XCircle className="h-4 w-4" /> Remove
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openReferring(r)} className="gap-2 cursor-pointer">
                            <ExternalLink className="h-4 w-4" /> Open in Audit
                          </DropdownMenuItem>
                          {r.ga4 ? (
                            <DropdownMenuItem onClick={() => openAnalytics(r)} className="gap-2 cursor-pointer">
                              <ExternalLink className="h-4 w-4" /> Analytics ({r.referral})
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={onConnectGA4} className="cursor-pointer">
                              Connect GA4
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge text={r.type} color={r.type === "Domain" ? TOKENS.brand : TOKENS.muted} />
                      <Badge text={`${r.toxicity}`} color={toxicityColor(r.toxicity)} />
                      <Badge text={r.reason} color={meta.color} LeadingIcon={meta.Icon} />
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(r.dateAdded)}</span>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {r.reasonInfo || meta.tooltip}
                    </div>

                    <div className="mt-2">
                      {r.ga4 ? (
                        <button
                          className="text-xs underline cursor-pointer"
                          style={{ color: TOKENS.brand }}
                          onClick={() => openAnalytics(r)}
                        >
                          {r.referral} sessions · Open Analytics
                        </button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={onConnectGA4} className="cursor-pointer">
                          Connect GA4
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}

