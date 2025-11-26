import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  List,
  Loader2,
  Search,
  Settings,
  RefreshCw,
  Info,
  Ban,
  LayoutGrid as GridIcon,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Wranker — Broken Links — Section 4: Source Page Impact View (React Demo)
 *
 * Fixes in this revision:
 *  - Replaced HTML entity `&gt;` with literal ">" inside JSX copy to satisfy the JSX parser
 *  - Fixed filter-chip mapping JSX (previous stray brace caused a parse error)
 *  - Kept prior fixes: inlined ScrollArea/Popover stand‑ins; robust icon import; inline actions + bulk bar, etc.
 */

/* ----------------------------------
   Tokens
-----------------------------------*/
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  coreBlue: "#4286F5",
  critical: "#E94134",
  warning: "#F9BB04",
  success: "#34A853",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
};

/* ----------------------------------
   Mock dataset (aligned to spec)
-----------------------------------*/
const MOCK_ROWS:any = Array.from({ length: 45 }).map((_, i) => {
  const path = "/page-" + (i + 1);
  const broken = Math.floor(Math.random() * 15) + 1;
  const internal = Math.floor(broken * 0.6);
  const external = broken - internal;
  const status404 = Math.max(0, Math.floor(broken * 0.5));
  const status410 = Math.max(0, Math.floor(broken * 0.2));
  const timeout = Math.max(0, broken - status404 - status410);
  return {
    id: `row-${i + 1}`,
    pagePath: path,
    pageUrl: `https://example.com${path}`,
    brokenCount: broken,
    internalCount: internal,
    externalCount: external,
    statusBreakdown: { "404": status404, "410": status410, timeout },
    severityLabel: broken > 10 ? "High" : broken > 5 ? "Moderate" : "Low",
    lastCrawled: new Date(Date.now() - Math.random() * 40 * 86400000).toISOString(),
    traffic: Math.floor(Math.random() * 8000) + 100,
  } as Row;
});

/* ----------------------------------
   Types & Utils
-----------------------------------*/
export type Row = typeof MOCK_ROWS[number];
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString();
export type SortDir = "asc" | "desc";
export function sortList<T extends Record<string, any>>(list: T[], key: keyof T, dir: SortDir) {
  const arr = [...list];
  arr.sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === vb) return 0;
    const cmp = va > vb ? 1 : -1;
    return dir === "asc" ? cmp : -cmp;
  });
  return arr;
}

const severityRank = (label: string) => (label === "Low" ? 0 : label === "Moderate" ? 1 : 2);
const STALE_COPY = "Stale crawl (> 30d)"; // use literal ">" (no HTML entity)

/* ----------------------------------
   Lightweight replacements for missing UI primitives
-----------------------------------*/
const ScrollAreaDiv: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => (
  <div className={cn("overflow-y-auto", className)} {...rest}>{children}</div>
);

const InlinePopover: React.FC<{
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ trigger, open, onOpenChange, widthClass = "w-72", children }) => (
  <div className="relative inline-block">
    <div onClick={() => onOpenChange(!open)}>{trigger}</div>
    {open && (
      <div role="dialog" className={cn("absolute z-20 mt-2 rounded border bg-white shadow p-3", widthClass)} style={{ borderColor: TOKENS.border }}>
        {children}
      </div>
    )}
  </div>
);

/* ----------------------------------
   Tiny toast system (no external deps)
-----------------------------------*/
interface ToastItem { id: string; message: string; actionLabel?: string; onAction?: () => void; timeout?: number; }
const ToastShelf: React.FC<{ toasts: ToastItem[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => (
  <div className="fixed bottom-4 right-4 z-50 space-y-2">
    {toasts.map(t => (
      <div key={t.id} className="rounded-md border bg-white shadow px-3 py-2 text-sm text-gray-800 flex items-center gap-3" style={{ borderColor: TOKENS.border }}>
        <span>{t.message}</span>
        {t.actionLabel && (
          <button className="ml-auto text-[var(--brand,#008CCD)] hover:underline" onClick={() => { t.onAction?.(); onClose(t.id); }}>{t.actionLabel}</button>
        )}
        <button aria-label="Dismiss" className="text-gray-500 hover:text-gray-700" onClick={() => onClose(t.id)}>✕</button>
      </div>
    ))}
  </div>
);

export default function SourcePageImpactView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<{ key: keyof Row; dir: SortDir }>({ key: "brokenCount", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // NEW: filter chips state
  type CountRange = "1-5" | "6-10" | "11+";
  const [countRanges, setCountRanges] = useState<Set<CountRange>>(new Set());
  const [sevFilters, setSevFilters] = useState<Set<Row["severityLabel"]>>(new Set());

  // simple toast helpers
  const pushToast = (t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast = { id, timeout: 3000, ...t } as ToastItem;
    setToasts(prev => [...prev, toast]);
    if (toast.timeout && toast.timeout > 0) {
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), toast.timeout);
    }
  };
  const closeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const t = setTimeout(() => {
      setRows(MOCK_ROWS);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // helpers for filter chips
  const toggleCount = (v: CountRange) => setCountRanges(prev => { const ns = new Set(prev); ns.has(v) ? ns.delete(v) : ns.add(v); return ns; });
  const toggleSev = (v: Row["severityLabel"]) => setSevFilters(prev => { const ns = new Set(prev); ns.has(v) ? ns.delete(v) : ns.add(v); return ns; });
  const resetFilters = () => { setCountRanges(new Set()); setSevFilters(new Set()); };

  const inCountRanges = (n: number) => {
    if (countRanges.size === 0) return true;
    const hits = [
      countRanges.has("1-5") && n >= 1 && n <= 5,
      countRanges.has("6-10") && n >= 6 && n <= 10,
      countRanges.has("11+") && n >= 11,
    ].some(Boolean);
    return hits;
  };

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = rows.filter(r => !excludedIds.has(r.id));
    if (text) list = list.filter((r) => r.pagePath.toLowerCase().includes(text));
    // apply chips filters
    list = list.filter(r => inCountRanges(r.brokenCount));
    if (sevFilters.size > 0) list = list.filter(r => sevFilters.has(r.severityLabel));
    // custom sort for severity label; otherwise default
    if (sortBy.key === "severityLabel") {
      const arr = [...list].sort((a, b) => {
        const cmp = severityRank(a.severityLabel) - severityRank(b.severityLabel);
        return sortBy.dir === "asc" ? cmp : -cmp;
      });
      return arr;
    }
    if (sortBy.key === "lastCrawled") {
      const arr = [...list].sort((a, b) => {
        const ca = new Date(a.lastCrawled).getTime();
        const cb = new Date(b.lastCrawled).getTime();
        const cmp = ca - cb;
        return sortBy.dir === "asc" ? cmp : -cmp;
      });
      return arr;
    }
    return sortList(list, sortBy.key, sortBy.dir);
  }, [rows, q, sortBy, excludedIds, countRanges, sevFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const ns = new Set(prev);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  };

  const selectAllVisible = () => setSelected(new Set(paginated.map((r) => r.id))); // current page only
  const clearSelection = () => setSelected(new Set());
  const openDrawer = (row: Row) => { setActivePage(row); setDrawerOpen(true); };
  const hasSelection = selected.size > 0;

  // Inline actions
  const handleCreateTask = (row: Row) => {
    // Emit global event; global task drawer should listen.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wranker:open-task-drawer", { detail: { scope: "page", row } }));
    }
    pushToast({ message: `Task Drawer requested for ${row.pagePath}` });
  };

  const handlePrioritize = (row: Row) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, prioritized: true } as Row : r));
    pushToast({ message: `Added ${row.pagePath} to High-Priority Audit` });
  };

  const handleExclude = (row: Row) => {
    // Soft exclude now; allow undo for 5s; keep reversible logically for 30 days (mock)
    setExcludedIds(prev => new Set(prev).add(row.id));
    const undo = () => setExcludedIds(prev => { const ns = new Set(prev); ns.delete(row.id); return ns; });
    const id = Math.random().toString(36).slice(2);
    const toast: ToastItem = { id, message: `Excluded ${row.pagePath} (soft)`, actionLabel: "Undo", onAction: undo, timeout: 5000 };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => closeToast(id), toast.timeout);
  };

  const Th: React.FC<{ label: string; sortKey?: keyof Row }> = ({ label, sortKey }) => {
    const isActive = !!sortKey && sortBy.key === sortKey;
    const dir = isActive ? sortBy.dir : undefined;
    return (
      <button
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-left text-[13px] font-medium text-gray-700",
          "hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          `focus-visible:ring-[${TOKENS.valueBlue}] focus-visible:ring-offset-white`
        )}
        onClick={() => sortKey && setSortBy({ key: sortKey, dir: isActive && dir === "desc" ? "asc" : "desc" })}
        aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        {sortKey && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : dir === "desc" ? <ChevronDown className="h-3 w-3" /> : null)}
      </button>
    );
  };

  const TableRow: React.FC<{ r: Row }> = ({ r }) => {
    const isChecked = selected.has(r.id);
    return (
      <div
        role="row"
        className={cn(
          "grid min-w-[1100px] grid-cols-[40px_1.4fr_150px_150px_140px_200px_220px] items-center text-sm",
          "px-3 py-2 border-b border-gray-100 hover:bg-gray-50 focus-within:bg-gray-50"
        )}
        style={{ borderColor: TOKENS.border }}
      >
        <div role="cell" className="flex items-center sticky left-0 bg-white z-10">
          <Checkbox checked={isChecked} onCheckedChange={() => toggleSelect(r.id)} aria-label={`Select ${r.pagePath}`} />
        </div>

        <div role="cell" className="truncate sticky left-[40px] z-10 bg-white pr-3">
          <button className="text-[14px] font-semibold text-gray-900 hover:underline" onClick={() => openDrawer(r)} aria-label={`Open page drawer for ${r.pagePath}`}>
            {r.pagePath}
          </button>
          <div className="text-xs text-gray-500 truncate">{r.pageUrl}</div>
        </div>

        <div role="cell" className="flex items-center gap-2">
          <Badge style={{ backgroundColor: TOKENS.chipBg, color: TOKENS.text }} className="rounded-full">{r.brokenCount}</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-xs text-gray-600 underline-offset-2 hover:underline">Breakdown</TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-xs">
                  <div className="font-medium mb-1">Status breakdown</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: TOKENS.critical }} />404s: {r.statusBreakdown["404"] ?? 0}</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: "#F97316" }} />410s: {r.statusBreakdown["410"] ?? 0}</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: TOKENS.warning }} />Timeout: {r.statusBreakdown.timeout ?? 0}</div>
                  <Separator className="my-2" />
                  <div className="text-gray-600">Internal: {r.internalCount} · External: {r.externalCount}</div>
                  <Button variant="link" className="px-0 text-[13px]" onClick={() => openDrawer(r)}>View broken links</Button>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div role="cell" className="text-left">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">{r.severityLabel}</span>
        </div>

        <div role="cell" className="text-[13px] text-gray-700">
          <div>{formatDateTime(r.lastCrawled)}</div>
          {Date.now() - new Date(r.lastCrawled).getTime() > 30 * 86400000 && (
            <div className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> {STALE_COPY}</div>
          )}
        </div>

        <div role="cell" className="text-[13px] text-gray-600 flex items-center gap-2">
          Traffic ≈ {r.traffic}
          { (r as any).prioritized && <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] bg-blue-50 text-blue-700">Prioritized</span> }
        </div>

        <div role="cell" className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="View in Page Drawer" onClick={() => openDrawer(r)}><ExternalLink className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View in Page Drawer</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="Create Fix Task" onClick={() => handleCreateTask(r)}><List className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Create Fix Task</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="Prioritize in Audit" onClick={() => handlePrioritize(r)} disabled={(r as any).prioritized}><Flag className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Prioritize in Audit</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="Exclude Page" onClick={() => handleExclude(r)}><Ban className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mark Page as Excluded</TooltipContent></Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  const GridCard: React.FC<{ r: Row }> = ({ r }) => {
    const [open, setOpen] = useState(false);
    const pct = Math.min(100, Math.round((r.brokenCount / 20) * 100));
    return (
      <Card className="hover:shadow-sm transition-shadow" style={{ borderColor: TOKENS.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px] font-semibold truncate" title={r.pagePath}>
            <button className="hover:underline" onClick={() => openDrawer(r)}>{r.pagePath}</button>
          </CardTitle>
          <div className="text-xs text-gray-500 truncate">{r.pageUrl}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden cursor-help" aria-label={`Broken links ${r.brokenCount}`}>
                  <div className="h-2" style={{ width: `${pct}%`, background: TOKENS.valueBlue }} />
                </div>
              </TooltipTrigger>
              <TooltipContent>Broken links: {r.brokenCount}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">Internal {r.internalCount}</Badge>
            <Badge variant="secondary" className="rounded-full">External {r.externalCount}</Badge>
            <span className="ml-auto inline-flex items-center rounded-full px-2 py-1 text-xs bg-gray-100 text-gray-700">{r.severityLabel}</span>
          </div>
          <div className="text-xs text-gray-600">Last crawled: {formatDateTime(r.lastCrawled)}</div>
          <div className="flex items-center justify-between pt-1">
            <Button onClick={() => openDrawer(r)} size="sm">Fix Now</Button>
            <InlinePopover
              open={open}
              onOpenChange={setOpen}
              trigger={<Button variant="ghost" size="sm">More</Button>}
            >
              <div className="text-sm space-y-1">
                <button className="block w-full text-left px-2 py-1 hover:bg-gray-50 rounded" onClick={() => { openDrawer(r); setOpen(false); }}>View in Page Drawer</button>
                <button className="block w-full text-left px-2 py-1 hover:bg-gray-50 rounded" onClick={() => { handleCreateTask(r); setOpen(false); }}>Create Fix Task</button>
                <button className="block w-full text-left px-2 py-1 hover:bg-gray-50 rounded" onClick={() => { handlePrioritize(r); setOpen(false); }}>Prioritize in Audit</button>
                <button className="block w-full text-left px-2 py-1 hover:bg-gray-50 rounded" onClick={() => { handleExclude(r); setOpen(false); }}>Exclude Page</button>
              </div>
            </InlinePopover>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ExportControls: React.FC = () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button className="bg-[var(--brand,#008CCD)] hover:bg-[#007DB3]">Export Page Impact List</Button>
        <InlinePopover
          open={open}
          onOpenChange={setOpen}
          trigger={<Button variant="secondary"><Settings className="mr-2 h-4 w-4" /> Options</Button>}
        >
          <div className="space-y-2 text-sm">
            <div className="font-medium">Include</div>
            <div className="flex items-center gap-2"><Checkbox defaultChecked id="incl-sev" /> <label htmlFor="incl-sev">Severity & breakdown</label></div>
            <div className="flex items-center gap-2"><Checkbox defaultChecked id="incl-crawl" /> <label htmlFor="incl-crawl">Last crawled</label></div>
            <Separator className="my-2" />
            <div className="text-xs text-gray-600">Exports include filters + generatedAt metadata.</div>
          </div>
        </InlinePopover>
        <Button variant="ghost"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>
    );
  };

  const BulkToolbar: React.FC = () => (
    hasSelection ? (
      <div
        className="mx-4 mb-2 rounded-lg border bg-white shadow-sm px-3 py-2"
        style={{ borderColor: TOKENS.border }}
        role="region"
        aria-label="Quick Fix Bulk Toolbar"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">{selected.size} Page(s) selected</Badge>
          <Button variant="secondary" size="sm" onClick={selectAllVisible}>Select all visible</Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Button size="sm">Create Bulk Fix Task</Button>
          <Button size="sm" variant="outline">Export Selected</Button>
          <Button size="sm" variant="destructive">Mark Ignored</Button>
        </div>
      </div>
    ) : null
  );

  const Kpi: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className={cn("rounded-md border p-3")} style={{ borderColor: TOKENS.border }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-[15px] font-semibold text-gray-900">{value}</div>
    </div>
  );

  const PageDrawer: React.FC = () => (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerContent className="max-w-xl ml-auto mr-0 rounded-l-xl">
        <DrawerHeader>
          <DrawerTitle className="text-[16px]">{activePage?.pagePath}</DrawerTitle>
          <DrawerDescription className="text-[13px]">Broken links on this page — quick actions and context preview.</DrawerDescription>
        </DrawerHeader>
        <ScrollAreaDiv className="h-[60vh] px-4">
          {activePage ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Kpi label="Total broken" value={activePage.brokenCount} />
                <Kpi label="Internal / External" value={`${activePage.internalCount} / ${activePage.externalCount}`} />
                <Kpi label="Severity" value={activePage.severityLabel} />
                <Kpi label="Last crawled" value={formatDateTime(activePage.lastCrawled)} />
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium mb-2">Suggested Fixes (AI)</div>
                <div className="text-sm text-gray-600">Replace repeated 404 targets with working equivalents; prioritise internal pages with high traffic.</div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-600">No page selected.</div>
          )}
        </ScrollAreaDiv>
        <DrawerFooter>
          <div className="flex items-center gap-2">
            <Button className="bg-[var(--brand,#008CCD)] hover:bg-[#007DB3]">Create Fix Task</Button>
            <Button variant="outline">Add to High-Priority Audit</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );

  return (
    <div className="w-full" style={{ "--brand": TOKENS.brand } as React.CSSProperties}>
      <div className="rounded-lg border bg-white" style={{ borderColor: TOKENS.border }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-gray-900">Source Page Impact View</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-4 w-4 text-gray-500" /></TooltipTrigger>
                <TooltipContent className="max-w-xs">Identify pages with the most broken links to prioritise fixes.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <ExportControls />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-8 w-64" placeholder="Search page path…" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} aria-label="Search pages" />
          </div>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">View</span>
            <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: TOKENS.border }}>
              <button className={cn("px-3 py-1 text-sm", view === "table" ? "bg-gray-100" : "bg-white")} onClick={() => setView("table")} aria-pressed={view === "table"}>
                <List className="mr-1 h-4 w-4 inline" /> Table
              </button>
              <button className={cn("px-3 py-1 text-sm", view === "grid" ? "bg-gray-100" : "bg-white")} onClick={() => setView("grid")} aria-pressed={view === "grid"}>
                <GridIcon className="mr-1 h-4 w-4 inline" /> Grid
              </button>
            </div>
          </div>
        </div>

        {/* NEW: Filter chips (Counts & Severity) visible for both views */}
        <div className="px-4 pb-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Broken Links — Counts:</span>
            {(["1-5", "6-10", "11+"] as CountRange[]).map((c) => (
              <button
                key={c}
                onClick={() => { setPage(1); toggleCount(c); }}
                className={cn(
                  "px-2 py-1 rounded-full border text-[13px]",
                  countRanges.has(c)
                    ? "bg-[var(--brand,#008CCD)] text-white border-transparent"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
                aria-pressed={countRanges.has(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Severity:</span>
            {["Low", "Moderate", "High"].map((s) => (
              <button
                key={s}
                onClick={() => { setPage(1); toggleSev(s as Row["severityLabel"]); }}
                className={cn(
                  "px-2 py-1 rounded-full border text-[13px]",
                  sevFilters.has(s as Row["severityLabel"])
                    ? "bg-[var(--brand,#008CCD)] text-white border-transparent"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
                aria-pressed={sevFilters.has(s as Row["severityLabel"])}
              >
                {s}
              </button>
            ))}
          </div>
          {(countRanges.size > 0 || sevFilters.size > 0) && (
            <button className="text-[13px] text-gray-600 underline hover:text-gray-800" onClick={() => { resetFilters(); setPage(1); }}>
              Reset filters
            </button>
          )}
        </div>

        {/* Bulk toolbar just below filters */}
        <BulkToolbar />

        {view === "table" && (
          <div className="w-full overflow-x-auto">
            <div role="table" aria-label="Page Impact table" className="min-w-[1100px]">
              <div role="row" className="grid min-w-[1100px] grid-cols-[40px_1.4fr_150px_150px_140px_200px_220px] items-center bg-gray-50 border-y" style={{ borderColor: TOKENS.border }}>
                <div role="columnheader" className="px-3 py-2 text-[13px] text-gray-700 sticky left-0 bg-gray-50 z-10">Sel</div>
                <div role="columnheader" className="px-3 py-2 sticky left-[40px] bg-gray-50 z-10"><Th label="Page URL (Source)" sortKey="pagePath" /></div>
                <div role="columnheader" className="px-3 py-2"><Th label="Broken Links" sortKey="brokenCount" /></div>
                <div role="columnheader" className="px-3 py-2"><Th label="Severity" sortKey="severityLabel" /></div>
                <div role="columnheader" className="px-3 py-2"><Th label="Last Crawled" sortKey="lastCrawled" /></div>
                <div role="columnheader" className="px-3 py-2 text-[13px] text-gray-700">Meta</div>
                <div role="columnheader" className="px-3 py-2 text-[13px] text-gray-700">Actions</div>
              </div>

              <div className="divide-y" style={{ borderColor: TOKENS.border }}>
                {loading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading Page Impact…</div>
                ) : (
                  paginated.map((r) => <TableRow key={r.id} r={r} />)
                )}
              </div>
            </div>
          </div>
        )}

        {view === "table" && !loading && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center gap-2 text-sm">
              <span>Rows per page:</span>
              {[10, 25, 50, 100].map((sz) => (
                <button
                  key={sz}
                  onClick={() => { setPageSize(sz); setPage(1); }}
                  className={cn("px-2 py-1 rounded border", pageSize === sz ? "bg-gray-100 border-gray-300" : "border-transparent hover:bg-gray-50")}
                >
                  {sz}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}

        {view === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 px-3 pb-4">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading Page Impact…</div>
            ) : (
              paginated.map((r) => <GridCard key={r.id} r={r} />)
            )}
          </div>
        )}
      </div>

      <PageDrawer />
      <ToastShelf toasts={toasts} onClose={closeToast} />
    </div>
  );
}

/* ----------------------------------
   Lightweight Test Cases (console)
   - Kept minimal; no runtime impact on UI.
-----------------------------------*/
function __runWRSourceImpactTests__() {
  // sortList tests
  console.assert(sortList([{ a: 2 }, { a: 1 }], "a", "asc")[0].a === 1, "sortList asc failed");
  console.assert(sortList([{ a: 2 }, { a: 3 }], "a", "desc")[0].a === 3, "sortList desc failed");
  // pagination slice sanity
  const pageSize = 10;
  const total = 27;
  const arr = Array.from({ length: total }).map((_, i) => i);
  const page2 = arr.slice(pageSize, pageSize * 2);
  console.assert(page2.length === 10, "pagination length failed");
  // NEW: string sort
  console.assert(sortList([{ s: "b" }, { s: "a" }], "s", "asc")[0].s === "a", "string sort asc failed");
  console.assert(sortList([{ s: "a" }, { s: "b" }], "s", "desc")[0].s === "b", "string sort desc failed");
  // NEW: formatDateTime returns a non-empty string
  console.assert(typeof formatDateTime(new Date().toISOString()) === "string", "formatDateTime failed");
  // NEW: token presence sanity
  console.assert(!!TOKENS.brand, "TOKENS.brand missing");
  // NEW: severity rank ordering
  console.assert(severityRank("Low") < severityRank("Moderate") && severityRank("Moderate") < severityRank("High"), "severity rank order failed");
  // NEW: count range helper
  const inRanges = (ranges: string[], n: number) => {
    const s = new Set(ranges as any);
    const hit = [s.has("1-5") && n >= 1 && n <= 5, s.has("6-10") && n >= 6 && n <= 10, s.has("11+") && n >= 11].some(Boolean);
    return hit || s.size === 0;
  };
  console.assert(inRanges(["1-5"], 1) && inRanges(["1-5"], 5) && !inRanges(["1-5"], 6), "count range 1-5 failed");
  console.assert(inRanges(["6-10"], 6) && inRanges(["6-10"], 10) && !inRanges(["6-10"], 11), "count range 6-10 failed");
  console.assert(inRanges(["11+"], 11) && inRanges(["11+"], 25) && !inRanges(["11+"], 10), "count range 11+ failed");
  // NEW: stale copy uses literal ">" (no entity)
  console.assert(STALE_COPY.includes(">"), "STALE_COPY must include literal >");
}
if (typeof window !== "undefined" && !(window as any).__WR_SOURCE_IMPACT_TESTED__) {
  (window as any).__WR_SOURCE_IMPACT_TESTED__ = true;
  try { __runWRSourceImpactTests__(); } catch (e) { console.warn("SourcePageImpactView tests failed:", e); }
}


