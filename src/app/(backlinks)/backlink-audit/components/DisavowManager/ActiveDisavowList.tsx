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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarClock, CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown,
  Download, ExternalLink, Filter, History, Info, Search, ShieldX, UploadCloud, XCircle,
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
type ItemType = "Domain" | "URL";
type ExportStatus = "Pending" | "Exported" | "Failed";

export type ActiveDisavowItem = {
  id: string;
  type: ItemType;
  domain: string;
  url?: string;                 // present if type === "URL"
  toxAtDisavow: number;         // locked score at approval time
  approvedAt: string;           // ISO (aka "Date Added")
  exportStatus: ExportStatus;
  lastExportDate?: string | null; // ISO or null when never
};

/* ---------- Helpers ---------- */
const Badge = ({ text, color, title }: { text: string; color: string; title?: string }) => (
  <span
    title={title}
    className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
    style={{ background: `${color}1A`, color, border: `1px solid ${color}26` }}
  >
    {text}
  </span>
);

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const toxicityColor = (score: number) => {
  if (score >= 80) return TOKENS.critical; // red
  if (score >= 60) return TOKENS.warning;  // orange
  if (score >= 40) return "#FBBF24";       // amber-400
  return TOKENS.muted;                      // gray <40
};

const EXPORT_META: Record<ExportStatus, { label: ExportStatus; color: string; hint: string }> = {
  Pending:  { label: "Pending",  color: TOKENS.muted,   hint: "Not yet exported to GSC." },
  Exported: { label: "Exported", color: TOKENS.success, hint: "Included in a file that was uploaded to GSC." },
  Failed:   { label: "Failed",   color: TOKENS.critical, hint: "Last export attempt failed. Try again in Upload/Sync." },
};

/* ---------- Mock data (replace with live via props) ---------- */
function makeMockActive(count = 22): ActiveDisavowItem[] {
  const statuses: ExportStatus[] = ["Pending", "Exported", "Failed"];
  return Array.from({ length: count }, (_, i) => {
    const type: ItemType = Math.random() > 0.55 ? "URL" : "Domain";
    const domain = `toxic${(i % 17) + 1}.spam`;
    const toxAtDisavow = Math.floor(Math.random() * 61) + 40; // 40..100
    const approvedAt = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 20).toISOString();
    const exportStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const lastExportDate =
      exportStatus === "Pending" ? null :
      new Date(new Date(approvedAt).getTime() + Math.random() * 1000 * 60 * 60 * 24 * 7).toISOString();
    return {
      id: `a-${i + 1}`,
      type,
      domain,
      url: type === "URL" ? `https://${domain}/bad/path/${i + 1}` : undefined,
      toxAtDisavow,
      approvedAt,
      exportStatus,
      lastExportDate,
    };
  });
}

/* ---------- Props ---------- */
type ActiveDisavowListTableProps = {
  data?: ActiveDisavowItem[];
  onRemove?: (item: ActiveDisavowItem & { removedAt: string }) => void;
  onViewHistory?: (payload: { id: string }) => void;
  onOpenReferring?: (payload: { type: ItemType; domain: string; url?: string }) => void;
  onOpenUploadSync?: (selected: ActiveDisavowItem[]) => void; // handoff to Section 4
  onUpdateExportStatus?: (item: ActiveDisavowItem, status: ExportStatus, date?: string) => void;
};

/* ---------- Component ---------- */
export default function ActiveDisavowListTable({
  data,
  onRemove,
  onViewHistory,
  onOpenReferring,
  onOpenUploadSync,
  onUpdateExportStatus,
}: ActiveDisavowListTableProps) {
  /* Data */
  const [rows, setRows] = useState<ActiveDisavowItem[]>(() => data ?? makeMockActive());
  useEffect(() => { if (data) setRows(data); }, [data]);

  /* Filters */
  type TypeFilter = "All" | ItemType;
  type StatusFilter = "All" | ExportStatus;

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  /* Selection for bulk handoff to Upload/Sync */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedRows = useMemo(() => rows.filter(r => selectedIds.includes(r.id)), [rows, selectedIds]);

  /* Table UI state */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // Date Added default desc

  const toggleExpand = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("All");
    setStatusFilter("All");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (typeFilter === "All" || r.type === typeFilter))
      .filter((r) => (statusFilter === "All" || r.exportStatus === statusFilter))
      .filter((r) => {
        if (!q) return true;
        const hay = [r.domain, r.url ?? ""].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const av = new Date(a.approvedAt).getTime();
        const bv = new Date(b.approvedAt).getTime();
        return sortDir === "asc" ? av - bv : bv - av;
      });
  }, [rows, typeFilter, statusFilter, query, sortDir]);

  /* CSV export */
  const exportCSV = () => {
    const dataset = (selectedRows.length ? selectedRows : filtered) as ActiveDisavowItem[];
    const headers = [
      "type","domain","url","toxAtDisavow","approvedAt","exportStatus","lastExportDate"
    ];
    const header = headers.join(",");
    const lines = dataset.map((r) =>
      [
        r.type, r.domain, r.url ?? "", r.toxAtDisavow,
        r.approvedAt, r.exportStatus, r.lastExportDate ?? ""
      ].map((v) => JSON.stringify(String(v))).join(",")
    ).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = selectedRows.length ? "active-disavow-selected.csv" : "active-disavow.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Actions */
  const openReferring = (r: ActiveDisavowItem) => {
    onOpenReferring?.({ type: r.type, domain: r.domain, url: r.url });
  };

  const handleRemove = (item: ActiveDisavowItem) => {
    const removedAt = new Date().toISOString();
    onRemove?.({ ...item, removedAt }); // -> History as "Removed"
    setRows((rs) => rs.filter((x) => x.id !== item.id));
    setSelected((s) => {
      const n = { ...s }; delete n[item.id]; return n;
    });
  };

  const handleViewHistory = (item: ActiveDisavowItem) => onViewHistory?.({ id: item.id });

  const toggleSelectAll = (checked: boolean) => {
    const m: Record<string, boolean> = {};
    if (checked) filtered.forEach((r) => m[r.id] = true);
    setSelected(m);
  };

  const toggleSelectOne = (id: string, checked: boolean) =>
    setSelected((s) => ({ ...s, [id]: checked }));

  const handoffToUploadSync = () => {
    if (!selectedRows.length) return;
    onOpenUploadSync?.(selectedRows);
  };

  const markRowExported = (item: ActiveDisavowItem) => {
    const now = new Date().toISOString();
    onUpdateExportStatus?.(item, "Exported", now);
    setRows((rs) =>
      rs.map((r) => (r.id === item.id ? { ...r, exportStatus: "Exported", lastExportDate: now } : r))
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
              <ShieldX className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Backlink Audit → Active Disavow List</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              Approved items currently excluded from link evaluation. Manage export status & history.
            </span>
          </div>

          {/* Header actions (Export + Upload/Sync + Sort) */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 cursor-pointer"
              onClick={exportCSV}
              title="Export CSV (selected or all)"
            >
              <Download className="h-4 w-4" color="#008CCD" /> Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 cursor-pointer"
              onClick={handoffToUploadSync}
              disabled={!selectedRows.length}
              title="Open Upload/Sync Panel with selected items"
            >
              <UploadCloud className="h-4 w-4" color="#008CCD" /> Upload/Sync ({selectedRows.length})
            </Button>

            <div className="w-px h-5 mx-1 bg-gray-200" />

            <span className="text-sm text-muted-foreground">Sort by</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-8 cursor-pointer"
            >
              Date Added {sortDir === "asc" ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronsUpDown className="h-4 w-4 ml-1" />}
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
                  <TooltipTrigger asChild><Info className="h-3.5 w-3.5 cursor-help" /></TooltipTrigger>
                  <TooltipContent side="bottom">
                    Filter by type, export status, and search. Date sorting uses “Date Added”.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={clearFilters} className="cursor-pointer">Clear all</Button>

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
              <SelectTrigger className="w-[160px] h-8 cursor-pointer"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Type — All</SelectItem>
                <SelectItem value="Domain">Domain</SelectItem>
                <SelectItem value="URL">URL</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[200px] h-8 cursor-pointer"><SelectValue placeholder="Export Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Export — All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Exported">Exported</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active chips */}
          {(() => {
            const chips: { key: string; label: string; onClear: () => void }[] = [];
            if (query) chips.push({ key: "q", label: `Search: ${query}`, onClear: () => setQuery("") });
            if (typeFilter !== "All") chips.push({ key: "t", label: `Type: ${typeFilter}`, onClear: () => setTypeFilter("All") });
            if (statusFilter !== "All") chips.push({ key: "s", label: `Export: ${statusFilter}`, onClear: () => setStatusFilter("All") });

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
                  <TableHead className="w-10 text-left">
                    <Checkbox
                      aria-label="Select all"
                      checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      onCheckedChange={(v: boolean) => toggleSelectAll(!!v)}
                    />
                  </TableHead>
                  <TableHead className="w-10 text-left" />
                  <TableHead className="text-left" style={{ minWidth: 320 }}>Domain / URL</TableHead>
                  <TableHead className="text-left" style={{ minWidth: 110 }}>Type</TableHead>
                  <TableHead className="text-left" style={{ minWidth: 170 }}>
                    <div className="inline-flex items-center gap-1">
                      Toxicity Score
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild><Info className="h-3.5 w-3.5 cursor-help" /></TooltipTrigger>
                          <TooltipContent>Toxicity score is stored for historical comparison.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-left" style={{ minWidth: 150 }}>
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    >
                      <span>Date Added</span>
                      {sortDir === "asc" ? <ChevronDown className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-left" style={{ minWidth: 160 }}>Export Status</TableHead>
                  <TableHead className="text-left hidden lg:table-cell" style={{ minWidth: 170 }}>Last Export Date</TableHead>
                  <TableHead className="text-left" style={{ minWidth: 210 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((r) => {
                  const exportMeta = EXPORT_META[r.exportStatus];
                  const isSelected = !!selected[r.id];
                  return (
                    <React.Fragment key={r.id}>
                      <TableRow className="hover:bg-[var(--wr-subtle)]">
                        {/* Select */}
                        <TableCell className="align-top">
                          <Checkbox
                            aria-label={`Select ${r.type === "URL" ? r.url : r.domain}`}
                            checked={isSelected}
                            onCheckedChange={(v: boolean) => toggleSelectOne(r.id, !!v)}
                          />
                        </TableCell>

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
                                  <div className="text-xs text-muted-foreground">from <span className="font-medium">{r.domain}</span></div>
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

                        {/* Toxicity (locked) */}
                        <TableCell className="align-top">
                          <Badge text={`${r.toxAtDisavow}`} color={toxicityColor(r.toxAtDisavow)} title="Locked at time of disavow" />
                        </TableCell>

                        {/* Date Added */}
                        <TableCell className="align-top">{formatDate(r.approvedAt)}</TableCell>

                        {/* Export Status */}
                        <TableCell className="align-top">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span><Badge text={exportMeta.label} color={exportMeta.color} title={exportMeta.hint} /></span>
                              </TooltipTrigger>
                              <TooltipContent>{exportMeta.hint}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Last Export Date (desktop only) */}
                        <TableCell className="align-top hidden lg:table-cell">
                          <div className="inline-flex items-center gap-1 text-sm">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" /> {formatDate(r.lastExportDate ?? null)}
                          </div>
                        </TableCell>

                        {/* Actions (left-aligned; branded icons) */}
                        <TableCell className="align-top">
                          <div className="flex gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 cursor-pointer"
                                    onClick={() => handleViewHistory(r)}
                                  >
                                    <History className="h-4 w-4" color="#008CCD" /> History
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Export & Action History</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Mark Exported — only available when the row is selected */}
                            {isSelected && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="gap-1 cursor-pointer"
                                      style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                                      onClick={() => markRowExported(r)}
                                    >
                                      <CheckCircle2 className="h-4 w-4" color="#FFFFFF" /> Mark Exported
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Set status to Exported for this item</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1 cursor-pointer"
                                    onClick={() => handleRemove(r)}
                                  >
                                    <ShieldX className="h-4 w-4" color="#008CCD" /> Remove
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove from Active List (sent to History)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded content */}
                      {expanded[r.id] && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-[#FAFBFC] p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Open in Audit</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1 gap-2 cursor-pointer"
                                  onClick={() => openReferring(r)}
                                >
                                  <ExternalLink className="h-4 w-4" color="#008CCD" /> Referring Domains & Backlinks
                                </Button>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Toxicity Score (locked)</div>
                                <div className="mt-1">
                                  <Badge text={`${r.toxAtDisavow}`} color={toxicityColor(r.toxAtDisavow)} />
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Export Status</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge text={EXPORT_META[r.exportStatus].label} color={EXPORT_META[r.exportStatus].color} />
                                  <span className="text-xs text-muted-foreground">{EXPORT_META[r.exportStatus].hint}</span>
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Last Export Date</div>
                                <div className="mt-1 inline-flex items-center gap-1 text-sm">
                                  <CalendarClock className="h-4 w-4 text-muted-foreground" /> {formatDate(r.lastExportDate ?? null)}
                                </div>
                              </div>

                              <div className="md:col-span-2">
                                <div className="text-sm text-muted-foreground mb-1">Quick Actions</div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" className="gap-2 cursor-pointer" onClick={() => handleViewHistory(r)}>
                                    <History className="h-4 w-4" color="#008CCD" /> View History
                                  </Button>
                                  {selected[r.id] && (
                                    <Button
                                      size="sm"
                                      className="gap-2 cursor-pointer"
                                      style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                                      onClick={() => markRowExported(r)}
                                    >
                                      <CheckCircle2 className="h-4 w-4" color="#FFFFFF" /> Mark Exported
                                    </Button>
                                  )}
                                  <Button size="sm" variant="destructive" className="gap-2 cursor-pointer" onClick={() => handleRemove(r)}>
                                    <XCircle className="h-4 w-4" /> Remove from Disavow
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
                const meta = EXPORT_META[r.exportStatus];
                const isSelected = !!selected[r.id];
                return (
                  <div key={r.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            aria-label={`Select ${r.type === "URL" ? r.url : r.domain}`}
                            checked={isSelected}
                            onCheckedChange={(v: boolean) => toggleSelectOne(r.id, !!v)}
                          />
                          <Badge text={r.type} color={r.type === "Domain" ? TOKENS.brand : TOKENS.muted} />
                        </div>
                        <button
                          className="mt-1 block text-sm underline text-left truncate cursor-pointer"
                          style={{ color: TOKENS.brand }}
                          onClick={() => openReferring(r)}
                        >
                          {r.type === "URL" ? r.url : r.domain}
                        </button>
                        {r.type === "URL" && (
                          <div className="text-xs text-muted-foreground truncate">from <span className="font-medium">{r.domain}</span></div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge text={`${r.toxAtDisavow}`} color={toxicityColor(r.toxAtDisavow)} />
                          <Badge text={meta.label} color={meta.color} />
                          <span className="text-xs text-muted-foreground">{formatDate(r.approvedAt)}</span>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" /> {formatDate(r.lastExportDate ?? null)}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="cursor-pointer">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewHistory(r)} className="gap-2 cursor-pointer">
                            <History className="h-4 w-4" color="#008CCD" /> View History
                          </DropdownMenuItem>
                          {/* Mark Exported only when selected */}
                          {isSelected && (
                            <DropdownMenuItem onClick={() => markRowExported(r)} className="gap-2 cursor-pointer">
                              <CheckCircle2 className="h-4 w-4" color="#008CCD" /> Mark Exported
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleRemove(r)} className="gap-2 text-red-600 cursor-pointer">
                            <XCircle className="h-4 w-4" /> Remove
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenUploadSync?.([r])} className="gap-2 cursor-pointer">
                            <UploadCloud className="h-4 w-4" color="#008CCD" /> Upload/Sync
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openReferring(r)} className="gap-2 cursor-pointer">
                            <ExternalLink className="h-4 w-4" color="#008CCD" /> Open in Audit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
