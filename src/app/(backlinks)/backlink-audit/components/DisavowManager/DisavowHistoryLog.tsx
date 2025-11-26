import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown,
  Download, Filter, History, Info, ListFilter, UploadCloud, User2,
} from "lucide-react";

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

/* ---------- Tokens (same palette used across recent sections) ---------- */
const TOKENS = {
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  text: "var(--wr-text)",
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
type EntityType = "Domain" | "URL";
type HistoryAction =
  | "Added to Queue"
  | "Approved"
  | "Removed"
  | "Exported to GSC"
  | "Import"
  | "Sync Failure";

export type DisavowHistoryRow = {
  id: string;
  action: HistoryAction;
  entityType: EntityType;
  domain: string;
  url?: string; // when entityType === "URL"
  performedBy: {
    username: string;
    fullName?: string;
    role?: string;
    system?: boolean;
  };
  details?: string;
  createdAt: string; // ISO datetime
};

/* ---------- Meta (badge color & branded icon per action) ---------- */
const ACTION_META: Record<
  HistoryAction,
  { color: string; icon: React.ReactNode; label: string }
> = {
  "Added to Queue":   { color: TOKENS.brand,   icon: <History className="h-3.5 w-3.5" color="#008CCD" />,    label: "Added" },
  "Approved":         { color: TOKENS.brand,   icon: <CheckCircle2 className="h-3.5 w-3.5" color="#008CCD" />, label: "Approved" },
  "Removed":          { color: TOKENS.warning, icon: <AlertTriangle className="h-3.5 w-3.5" color="#008CCD" />, label: "Removed" },
  "Exported to GSC":  { color: TOKENS.success, icon: <UploadCloud className="h-3.5 w-3.5" color="#008CCD" />, label: "Exported" },
  "Import":           { color: TOKENS.brand,   icon: <Download className="h-3.5 w-3.5" color="#008CCD" />,   label: "Import" },
  "Sync Failure":     { color: TOKENS.critical,icon: <AlertTriangle className="h-3.5 w-3.5" color="#008CCD" />, label: "Failed" },
};

/* ---------- Small helpers ---------- */
const Badge = ({
  text, color, title, leading,
}: { text: string; color: string; title?: string; leading?: React.ReactNode }) => (
  <span
    title={title}
    className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${color}12`, color, border: `1px solid ${color}26` }}
  >
    {leading}{text}
  </span>
);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

/* ---------- Mock data (swap via props) ---------- */
function makeMockHistory(count = 44): DisavowHistoryRow[] {
  const actions: HistoryAction[] = [
    "Added to Queue", "Approved", "Removed", "Exported to GSC", "Import", "Sync Failure",
  ];
  return Array.from({ length: count }, (_, i) => {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entityType: EntityType = Math.random() > 0.55 ? "URL" : "Domain";
    const domain = `example${(i % 16) + 1}.com`;
    const url = entityType === "URL" ? `https://${domain}/path/${i + 1}` : undefined;

    const users = [
      { username: "alice", fullName: "Alice Martin", role: "SEO Manager" },
      { username: "devon", fullName: "Devon Ray", role: "Analyst" },
      { username: "system", system: true, fullName: "System", role: "Automated" },
      { username: "sam", fullName: "Sam Gupta", role: "Owner" },
    ];
    const performedBy = users[Math.floor(Math.random() * users.length)] as any;

    const ts = new Date(Date.now() - Math.floor(Math.random() * (14 * 24 * 60 * 60 * 1000))).toISOString();

    return {
      id: `h-${i + 1}`,
      action,
      entityType,
      domain,
      url,
      performedBy,
      details:
        action === "Sync Failure"
          ? "GSC export failed — authentication expired. User must reconnect Search Console."
          : action === "Exported to GSC"
          ? "Export v3 uploaded to GSC for sc-domain:" + domain
          : action === "Approved"
          ? `Approved for disavow (Toxicity at time: ${60 + (i % 40)})`
          : action === "Added to Queue"
          ? "Queued by AI suggestion: Spam Anchor cluster detected."
          : action === "Removed"
          ? "Removed from Active Disavow by reviewer."
          : "Imported entries merged with active list (append mode).",
      createdAt: ts,
    };
  }).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/* ---------- Props ---------- */
type DisavowHistoryLogProps = {
  data?: DisavowHistoryRow[];
  pageSize?: number; // default 20
  onOpenReferring?: (p: { type: EntityType; domain: string; url?: string }) => void;
};

/* ---------- Component ---------- */
export default function DisavowHistoryLog({
  data,
  pageSize = 20,
  onOpenReferring,
}: DisavowHistoryLogProps) {
  /* Data */
  const [rows, setRows] = useState<DisavowHistoryRow[]>(() => data ?? makeMockHistory());
  useEffect(() => { if (data) setRows(data); }, [data]);

  /* Table UI + filters */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("All");
  const [actionFilter, setActionFilter] = useState<HistoryAction[]>([]);

  const toggleExpand = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const allUsers = useMemo(() => {
    const uniq = Array.from(new Set(rows.map(r => r.performedBy.username)));
    return ["All", ...uniq];
  }, [rows]);

  const actionOn = (a: HistoryAction) => actionFilter.includes(a);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setUserFilter("All");
    setActionFilter([]);
  };

  const filtered = useMemo(() => {
    let out = rows.slice();
    if (fromDate) {
      const t = +new Date(fromDate);
      out = out.filter(r => +new Date(r.createdAt) >= t);
    }
    if (toDate) {
      const t = +new Date(toDate) + 24 * 60 * 60 * 1000 - 1; // inclusive
      out = out.filter(r => +new Date(r.createdAt) <= t);
    }
    if (userFilter !== "All") {
      out = out.filter(r => r.performedBy.username === userFilter);
    }
    if (actionFilter.length) {
      out = out.filter(r => actionFilter.includes(r.action));
    }
    out.sort((a, b) => {
      const av = +new Date(a.createdAt);
      const bv = +new Date(b.createdAt);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return out;
  }, [rows, fromDate, toDate, userFilter, actionFilter, sortDir]);

  /* Export (filtered set) */
  const exportCSV = () => {
    const dataset = filtered;
    const headers = [
      "id","action","entityType","domain","url","username","fullName","role","system","createdAt","details"
    ];
    const header = headers.join(",");
    const lines = dataset.map((r) =>
      [
        r.id, r.action, r.entityType, r.domain, r.url ?? "",
        r.performedBy.username ?? "", r.performedBy.fullName ?? "", r.performedBy.role ?? "",
        r.performedBy.system ? "true" : "false", r.createdAt, r.details ?? ""
      ].map((v) => JSON.stringify(String(v))).join(",")
    ).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "disavow-history.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Chips for active filters */
  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (fromDate || toDate) chips.push({
    key: "d", label: `Date: ${fromDate || "…"} → ${toDate || "…"}`, onClear: () => { setFromDate(""); setToDate(""); }
  });
  if (userFilter !== "All") chips.push({
    key: "u", label: `User: ${userFilter}`, onClear: () => setUserFilter("All")
  });
  if (actionFilter.length) chips.push({
    key: "a", label: `Action: ${actionFilter.join(", ")}`, onClear: () => setActionFilter([])
  });

  /* Pagination */
  const [visible, setVisible] = useState<number>(pageSize);
  useEffect(() => setVisible(pageSize), [pageSize, rows.length, fromDate, toDate, userFilter, actionFilter]);

  const visibleRows = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  /* UI */
  return (
    <section className="space-y-3 wr-font">
      <GlobalTokens />

      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Title + context */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2">
              <History className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Backlink Audit → Disavow History Log</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">Full audit trail of all disavow actions.</span>
          </div>

          {/* Header actions (Export + Sort) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 cursor-pointer"
              onClick={exportCSV}
              title="Export filtered history"
            >
              <Download className="h-4 w-4" color="#008CCD" /> Export
            </Button>

            <div className="w-px h-5 mx-1 bg-gray-200" />

            <span className="text-sm text-muted-foreground">Sort by</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-8 cursor-pointer"
            >
              Date &amp; Time {sortDir === "asc" ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronsUpDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="border-t pt-4 space-y-3" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" color="#008CCD" /> Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-3.5 w-3.5 cursor-help" /></TooltipTrigger>
                  <TooltipContent side="bottom">Filter by date range, action type, and user.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={clearFilters} className="cursor-pointer">Clear all</Button>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">From</span>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-[160px]" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">To</span>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-[160px]" />
              </div>
            </div>

            {/* User filter */}
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 text-muted-foreground" />
              <Select value={userFilter} onValueChange={(v) => setUserFilter(v)}>
                <SelectTrigger className="w-[180px] h-8 cursor-pointer">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(u => (<SelectItem key={u} value={u}>{u === "All" ? "User — All" : u}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Action filter (multi) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                  <ListFilter className="h-4 w-4" /> Action {actionFilter.length ? `(${actionFilter.length})` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px]" align="start">
                <div className="space-y-2">
                  {(Object.keys(ACTION_META) as HistoryAction[]).map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={actionOn(a)}
                        onCheckedChange={(v) =>
                          setActionFilter((prev) => (v ? [...prev, a] : prev.filter((x) => x !== a)))
                        }
                      />
                      <Badge text={ACTION_META[a].label} color={ACTION_META[a].color} leading={ACTION_META[a].icon} />
                      <span className="text-muted-foreground">{a}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setActionFilter([])} className="cursor-pointer">Reset</Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} className="cursor-pointer">Apply</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active chips */}
          {!!chips.length && (
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
          )}
        </CardContent>

        {/* Desktop / Tablet table (all columns left-aligned) */}
        <CardContent className="p-0 hidden md:block">
          <div className="max-h-[520px] overflow-auto border-top border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-50" style={{ background: TOKENS.appBg }}>
                <TableRow className="border-b" style={{ borderColor: TOKENS.borderLight }}>
                  <TableHead className="w-10 text-left"></TableHead>
                  <TableHead className="text-left" style={{ minWidth: 180 }}>Action</TableHead>
                  <TableHead className="text-left" style={{ minWidth: 320 }}>Domain / URL</TableHead>
                  <TableHead className="text-left hidden lg:table-cell" style={{ minWidth: 180 }}>Performed By</TableHead>
                  <TableHead className="text-left" style={{ minWidth: 190 }}>
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    >
                      <span>Date &amp; Time</span>
                      {sortDir === "asc" ? <ChevronDown className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-left" style={{ minWidth: 240 }}>Details</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleRows.map((r) => {
                  const meta = ACTION_META[r.action];
                  const long = (r.details ?? "").length > 120;
                  const detailsShort = long ? (r.details ?? "").slice(0, 120) + "…" : (r.details ?? "—");
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

                        {/* Action */}
                        <TableCell className="align-top">
                          <Badge text={meta.label} color={meta.color} leading={meta.icon} title={r.action} />
                        </TableCell>

                        {/* Domain / URL */}
                        <TableCell className="align-top">
                          {r.entityType === "URL" ? (
                            <>
                              <button
                                className="underline text-left cursor-pointer"
                                style={{ color: TOKENS.brand }}
                                onClick={() => onOpenReferring?.({ type: r.entityType, domain: r.domain, url: r.url })}
                                title="Open Referring Domains & Backlinks"
                              >
                                {r.url}
                              </button>
                              <div className="text-xs text-muted-foreground">from <span className="font-medium">{r.domain}</span></div>
                            </>
                          ) : (
                            <button
                              className="underline text-left cursor-pointer"
                              style={{ color: TOKENS.brand }}
                              onClick={() => onOpenReferring?.({ type: r.entityType, domain: r.domain })}
                              title="Open Referring Domains & Backlinks"
                            >
                              {r.domain}
                            </button>
                          )}
                        </TableCell>

                        {/* Performed By */}
                        <TableCell className="align-top hidden lg:table-cell">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1">
                                  <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  {r.performedBy.system ? "system" : r.performedBy.username}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {(r.performedBy.fullName || r.performedBy.role) ? (
                                  <div className="space-y-0.5">
                                    {r.performedBy.fullName && <div className="font-medium">{r.performedBy.fullName}</div>}
                                    {r.performedBy.role && <div className="text-xs text-muted-foreground">{r.performedBy.role}</div>}
                                  </div>
                                ) : ("—")}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell className="align-top whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>

                        {/* Details */}
                        <TableCell className="align-top">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm">{detailsShort}</div>
                            {long && (
                              <button
                                className="text-sm underline shrink-0 cursor-pointer"
                                style={{ color: TOKENS.brand }}
                                onClick={() => toggleExpand(r.id)}
                              >
                                View
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded content */}
                      {expanded[r.id] && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-[#FAFBFC] p-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Full Details</div>
                                <div className="mt-1 text-sm">{r.details || "—"}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Entity</div>
                                <div className="mt-1 text-sm">
                                  {r.entityType === "URL" ? (
                                    <>
                                      <span className="font-medium">{r.url}</span>
                                      <div className="text-xs text-muted-foreground">from {r.domain}</div>
                                    </>
                                  ) : (
                                    <span className="font-medium">{r.domain}</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Performed By</div>
                                <div className="mt-1 text-sm">
                                  {r.performedBy.system ? "system" : r.performedBy.username}
                                  {(r.performedBy.fullName || r.performedBy.role) && (
                                    <span className="text-xs text-muted-foreground">
                                      {" "}— {r.performedBy.fullName ?? ""} {r.performedBy.role ? `(${r.performedBy.role})` : ""}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-2">Date &amp; Time</div>
                                <div className="mt-1 text-sm">{formatDateTime(r.createdAt)}</div>
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

          {/* Load more */}
          <div className="p-3 border-t flex justify-center" style={{ borderColor: TOKENS.borderLight }}>
            {canLoadMore ? (
              <Button onClick={() => setVisible(v => v + pageSize)} variant="outline" className="cursor-pointer">Load more</Button>
            ) : (
              <span className="text-xs text-muted-foreground">Showing {visibleRows.length} of {filtered.length}</span>
            )}
          </div>
        </CardContent>

        {/* Mobile cards */}
        <CardContent className="p-0 md:hidden">
          <ScrollArea className="max-h-[560px] border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="divide-y" style={{ borderColor: TOKENS.borderLight }}>
              {visibleRows.map((r) => {
                const meta = ACTION_META[r.action];
                return (
                  <div key={r.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <Badge text={meta.label} color={meta.color} leading={meta.icon} />
                      <div className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</div>
                    </div>

                    <div className="mt-2">
                      {r.entityType === "URL" ? (
                        <>
                          <button
                            className="text-sm underline text-left cursor-pointer"
                            style={{ color: TOKENS.brand }}
                            onClick={() => onOpenReferring?.({ type: r.entityType, domain: r.domain, url: r.url })}
                          >
                            {r.url}
                          </button>
                          <div className="text-xs text-muted-foreground">from <span className="font-medium">{r.domain}</span></div>
                        </>
                      ) : (
                        <button
                          className="text-sm underline text-left cursor-pointer"
                          style={{ color: TOKENS.brand }}
                          onClick={() => onOpenReferring?.({ type: r.entityType, domain: r.domain })}
                        >
                          {r.domain}
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <User2 className="h-3.5 w-3.5" />
                      <span>{r.performedBy.system ? "system" : r.performedBy.username}</span>
                    </div>

                    <div className="mt-2 text-sm">
                      {(r.details ?? "—").length > 140 ? (
                        <>
                          {(r.details ?? "").slice(0, 140)}…
                          <button
                            className="ml-1 text-sm underline cursor-pointer"
                            style={{ color: TOKENS.brand }}
                            onClick={() => toggleExpand(r.id)}
                          >
                            View
                          </button>
                        </>
                      ) : (r.details ?? "—")}
                    </div>

                    {expanded[r.id] && (
                      <div className="mt-2 rounded-md border p-2 text-sm" style={{ borderColor: TOKENS.borderLight }}>
                        {r.details || "—"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load more on mobile */}
            <div className="p-3 border-t flex justify-center" style={{ borderColor: TOKENS.borderLight }}>
              {canLoadMore ? (
                <Button onClick={() => setVisible(v => v + pageSize)} variant="outline" className="cursor-pointer">Load more</Button>
              ) : (
                <span className="text-xs text-muted-foreground">Showing {visibleRows.length} of {filtered.length}</span>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}
