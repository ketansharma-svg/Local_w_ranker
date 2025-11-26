"use client";
/* Queue & Status Table — Updated per new spec
   - Page size selector (10/25/50/100) in Filters bar and bottom bar
   - Source Domain: favicon only (no branded icon)
   - Filters bar: removed Retry / Boost / Add to Tracker buttons
   - Columns control: dropdown under header button (no drawer)
   - Export button in section header
   - Single container + thin horizontal row dividers connecting to borders
*/

import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Filter as FilterIcon,
  RotateCcw,
  Rocket,
  FolderPlus,
  ExternalLink,
  Clipboard as Copy,
  Check,
  Clock,
  Send,
  Search,
  AlertTriangle,
  CircleAlert,
  X,
  Globe2,
  Settings2,
  EllipsisVertical,
  FileText,
  ChevronUp,
  ChevronDown,
  ListChecks,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Global Tokens
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
  :root{
    --brand:#008CCD;
    --focus:#4286F5;
    --text:#111827;
    --text-muted:#6B7280;
    --bg-app:#F5F7FA;
    --bg-panel:#FFFFFF;
    --overlay:rgba(17,24,39,0.85);
    --border:#E5E7EB;
    --border-subtle:#EFF0F6;

    --success:#34A853;
    --success-bg:#CBF8D7;
    --warning:#F9BB04;
    --warning-bg:#FCEBB8;
    --critical:#E94134;
    --critical-bg:#FBC4BF;

    --radius:12px;
    --shadow-1:0 1px 2px rgba(17,24,39,0.06), 0 1px 1px rgba(17,24,39,0.04);
    --brand-tint: rgba(0,140,205,0.12);
    --info-tint:  rgba(66,134,245,0.12);
  }
  .wr-font{ font-family: Inter, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; }
`}</style>
);

/* ──────────────────────────────────────────────────────────────────────────────
   Lightweight virtualizer (drop-in for this page)
────────────────────────────────────────────────────────────────────────────── */
type SimpleVirtuosoProps<T> = {
  data: T[];
  itemContent: (index: number, item: T) => React.ReactNode;
  computeItemKey?: (index: number, item: T) => string | number;
  overscan?: number;
  customScrollParent?: HTMLDivElement | undefined;
  rangeChanged?: (r: { startIndex: number; endIndex: number }) => void;
};

function SimpleVirtuoso<T>({
  data,
  itemContent,
  computeItemKey,
  overscan = 6,
  customScrollParent,
  rangeChanged,
}: SimpleVirtuosoProps<T>) {
  const ITEM_HEIGHT = 56;

  const [range, setRange] = useState<{ startIndex: number; endIndex: number }>({
    startIndex: 0,
    endIndex: Math.min(data.length - 1, 0),
  });
  const parentRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const recalc = useCallback(() => {
    const parent = customScrollParent ?? (parentRef.current as HTMLElement | null);
    if (!parent) return;

    const scrollTop = parent.scrollTop || 0;
    const viewport = parent.clientHeight || 0;

    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - overscan);
    const visibleCount = Math.ceil(viewport / ITEM_HEIGHT) + overscan * 2;
    const end = Math.min(data.length - 1, start + visibleCount - 1);

    setRange((prev) => {
      if (prev.startIndex !== start || prev.endIndex !== end) {
        rangeChanged?.({ startIndex: start, endIndex: end });
        return { startIndex: start, endIndex: end };
      }
      return prev;
    });
  }, [customScrollParent, data.length, overscan, rangeChanged]);

  useEffect(() => {
    const parent = customScrollParent;
    if (!parent) return;
    parentRef.current = parent;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recalc);
    };

    const ro = new ResizeObserver(() => recalc());

    parent.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(parent);
    recalc();

    return () => {
      parent.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [customScrollParent, recalc]);

  useEffect(() => {
    recalc();
  }, [data.length, recalc]);

  const totalHeight = Math.max(0, data.length * ITEM_HEIGHT);
  const children: React.ReactNode[] = [];
  for (let i = range.startIndex; i <= range.endIndex; i++) {
    const item = data[i];
    const key = computeItemKey ? computeItemKey(i, item) : i;
    children.push(
      <div
        key={key}
        style={{
          position: "absolute",
          top: i * ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
        }}
      >
        {itemContent(i, item)}
      </div>
    );
  }

  return (
    <div aria-label="virtual-list" style={{ position: "relative", height: totalHeight }}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */
type Engine = "google" | "bing";
type Status =
  | "QUEUED"
  | "PUSHING_DISCOVERY"
  | "CRAWLED"
  | "INDEXED"
  | "NOT_INDEXABLE"
  | "FAILED"
  | "RATE_LIMITED";

export type QueueRow = {
  id: string;
  url: string;
  sourceDomain: string;
  engines: Engine[];
  submittedAt: string; // ISO
  status: Status;
  lastCheck?: string; // ISO
  attempts: number;
  priority: 1 | 2 | 3 | 4 | 5;
  lastMessage?: string;
};

/* ──────────────────────────────────────────────────────────────────────────────
   Utilities
────────────────────────────────────────────────────────────────────────────── */
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
const isStale = (iso?: string) => (iso ? Date.now() - new Date(iso).getTime() > 24 * 3600 * 1000 : false);
const pathOnly = (u: string) => {
  try {
    const { pathname, search, hash } = new URL(u);
    return (pathname + (search || "") + (hash || "")) || "/";
  } catch {
    return u;
  }
};
const useDebounced = <T,>(value: T, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};
const useLocalStorage = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
};

function useOnClickOutside(ref: React.RefObject<HTMLElement |null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

/* ──────────────────────────────────────────────────────────────────────────────
   Status Pill
────────────────────────────────────────────────────────────────────────────── */
const statusMap: Record<
  Status,
  { label: string; text: string; bg: string; icon: React.ReactNode; aria: string }
> = {
  QUEUED: {
    label: "Queued",
    text: "var(--text-muted)",
    bg: "var(--border-subtle)",
    icon: <Clock className="h-3.5 w-3.5" />,
    aria: "Status: Queued",
  },
  PUSHING_DISCOVERY: {
    label: "Pushing Discovery",
    text: "var(--brand)",
    bg: "var(--brand-tint)",
    icon: <Send className="h-3.5 w-3.5" />,
    aria: "Status: Pushing Discovery",
  },
  CRAWLED: {
    label: "Crawled",
    text: "var(--focus)",
    bg: "var(--info-tint)",
    icon: <Search className="h-3.5 w-3.5" />,
    aria: "Status: Crawled",
  },
  INDEXED: {
    label: "Indexed",
    text: "var(--success)",
    bg: "var(--success-bg)",
    icon: <Check className="h-3.5 w-3.5" />,
    aria: "Status: Indexed",
  },
  NOT_INDEXABLE: {
    label: "Not-indexable",
    text: "var(--warning)",
    bg: "var(--warning-bg)",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    aria: "Status: Not-indexable",
  },
  FAILED: {
    label: "Failed",
    text: "var(--critical)",
    bg: "var(--critical-bg)",
    icon: <X className="h-3.5 w-3.5" />,
    aria: "Status: Failed",
  },
  RATE_LIMITED: {
    label: "Rate-limited",
    text: "var(--critical)",
    bg: "var(--critical-bg)",
    icon: <CircleAlert className="h-3.5 w-3.5" />,
    aria: "Status: Rate-limited",
  },
};

function StatusPill({ status, tooltip }: { status: Status; tooltip?: string }) {
  const s = statusMap[status];
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
      title={tooltip || s.label}
      aria-label={`${s.aria}${tooltip ? ` – ${tooltip}` : ""}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

function EngineChips({ engines }: { engines: Engine[] }) {
  const chip = (e: Engine) => (
    <span
      key={e}
      className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs"
      style={{ borderColor: "var(--border)", background: "#fff", color: "var(--text)" }}
      title={e}
    >
      <Globe2 className="h-3.5 w-3.5" color="var(--brand)" />
      {e === "google" ? "Google" : "Bing"}
    </span>
  );
  return <div className="flex flex-wrap gap-1.5">{engines.map(chip)}</div>;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Columns (visibility + persisted order)
────────────────────────────────────────────────────────────────────────────── */
const DEFAULT_COLUMNS = [
  { key: "url", label: "URL", width: 420, sortable: true },
  { key: "sourceDomain", label: "Source Domain", width: 220, sortable: true },
  { key: "submittedAt", label: "Submitted At", width: 180, sortable: true },
  { key: "status", label: "Status", width: 180, sortable: true },
  { key: "engines", label: "Engine", width: 140, sortable: true },
  { key: "lastCheck", label: "Last Check", width: 160, sortable: true },
  { key: "attempts", label: "Attempts", width: 120, sortable: true },
  { key: "priority", label: "Priority", width: 120, sortable: true },
  { key: "actions", label: "Actions", width: 240, sortable: true },
] as const;
type ColKey = typeof DEFAULT_COLUMNS[number]["key"];
type SortKey = Extract<ColKey, "submittedAt" | "status" | "engines" | "lastCheck" | "attempts" | "priority">;

/* ──────────────────────────────────────────────────────────────────────────────
   Selection
────────────────────────────────────────────────────────────────────────────── */
type SelectionMode = "explicit" | "allMatching";
type SelectionState = { mode: SelectionMode; ids: Set<string> };

function useSelection(totalMatching: number) {
  const [sel, setSel] = useState<SelectionState>({ mode: "explicit", ids: new Set() });
  const isSelected = useCallback(
    (id: string) => (sel.mode === "explicit" ? sel.ids.has(id) : !sel.ids.has(id)),
    [sel]
  );
  const toggleOne = useCallback((id: string) => {
    setSel((s) => {
      const next = new Set(s.ids);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...s, ids: next };
    });
  }, []);
  const selectVisible = useCallback((idsOnScreen: string[], check: boolean) => {
    setSel((s) => {
      const next = new Set(s.ids);
      if (s.mode === "explicit") {
        idsOnScreen.forEach((id) => (check ? next.add(id) : next.delete(id)));
      } else {
        idsOnScreen.forEach((id) => (check ? next.delete(id) : next.add(id)));
      }
      return { ...s, ids: next };
    });
  }, []);
  const clear = useCallback(() => setSel({ mode: "explicit", ids: new Set() }), []);
  const selectAllMatching = useCallback(() => setSel({ mode: "allMatching", ids: new Set() }), []);
  const selectedCount = sel.mode === "explicit" ? sel.ids.size : Math.max(0, totalMatching - sel.ids.size);
  return { sel, isSelected, toggleOne, selectVisible, clear, selectAllMatching, selectedCount };
}

/* ──────────────────────────────────────────────────────────────────────────────
   Demo data fallback
────────────────────────────────────────────────────────────────────────────── */
function demoRows(count = 1400): QueueRow[] {
  const engines: Engine[][] = [["google"], ["bing"], ["google", "bing"]];
  const statuses: Status[] = ["QUEUED","PUSHING_DISCOVERY","CRAWLED","INDEXED","NOT_INDEXABLE","FAILED","RATE_LIMITED"];
  const base = Date.now() - 1000 * 60 * 60 * 24 * 20;
  return Array.from({ length: count }).map((_, i) => {
    const st = statuses[i % statuses.length];
    const sub = new Date(base + i * 137_000).toISOString();
    const last = new Date(base + i * 171_000).toISOString();
    return {
      id: `q_${i.toString(36)}_${(Math.random() * 1e6) | 0}`,
      url: `https://www.example${(i % 97) + 3}.com/blog/post-${(i % 400) + 1}?ref=${i}`,
      sourceDomain: `example${(i % 97) + 3}.com`,
      engines: engines[i % engines.length],
      submittedAt: sub,
      status: st,
      lastCheck: i % 4 === 0 ? undefined : last,
      attempts: (i % 5) + 1,
      priority: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      lastMessage:
        st === "FAILED" || st === "RATE_LIMITED"
          ? i % 2
            ? "429 rate limited; retry after 120s"
            : "5xx upstream error; cooldown applied"
          : st === "NOT_INDEXABLE"
          ? "robots.txt disallow"
          : st === "CRAWLED"
          ? "Discovered by sitemap ping"
          : undefined,
    };
  });
}

/* ──────────────────────────────────────────────────────────────────────────────
   Data Hook — server paging (explicit page) + polling
────────────────────────────────────────────────────────────────────────────── */
type Filters = {
  query: string;
  statuses: Status[];
  engines: Engine[];
  priorityRange: [number, number];
  dateFrom?: string;
  dateTo?: string;
  sort?: `${SortKey}:${"asc" | "desc"}`;
  pageSize: number;
};

function buildQuery(params: Partial<Filters> & { page?: number }) {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.statuses?.length) qs.set("status", params.statuses.join(","));
  if (params.engines?.length) qs.set("engine", params.engines.join(","));
  if (params.priorityRange) qs.set("priority", `${params.priorityRange[0]}-${params.priorityRange[1]}`);
  if (params.dateFrom) qs.set("from", params.dateFrom);
  if (params.dateTo) qs.set("to", params.dateTo);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  qs.set("pageSize", String(params.pageSize || 50));
  return qs.toString();
}

function useQueueDataPaged(filters: Filters, page: number) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  const key = JSON.stringify({ ...filters, page });

//   useEffect(() => {
//     let alive = true;
//     setLoading(true);
//     setError(null);

//     (async () => {
//       try {
//         const qs = buildQuery({ ...filters, page });
//         const res = await fetch(`/api/index/queue?${qs}`, { method: "GET" });
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const data = await res.json();
//         if (!alive) return;
//         setRows(data.rows as QueueRow[]);
//         setTotal(data.total ?? (data.rows?.length || 0));
//         setLoading(false);
//       } catch {
//         const all = demoRows(1800);
//         const start = (page - 1) * filters.pageSize;
//         const end = start + filters.pageSize;
//         if (!alive) return;
//         setRows(all.slice(start, end));
//         setTotal(all.length);
//         setLoading(false);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [key]);


  // Light polling for in-flight statuses
//   useEffect(() => {
//     const interval = setInterval(async () => {
//       if (document.hidden || rows.length === 0) return;
//       const watchIds = rows
//         .filter((r) => ["QUEUED", "PUSHING_DISCOVERY", "CRAWLED"].includes(r.status))
//         .slice(0, 200)
//         .map((r) => r.id);
//       if (!watchIds.length) return;
//       try {
//         const res = await fetch(`/api/index/queue?ids=${encodeURIComponent(watchIds.join(","))}`, { method: "GET" });
//         if (!res.ok) return;
//         const data = await res.json();
//         const byId: Record<string, QueueRow> = {};
//         (data.rows as QueueRow[]).forEach((r) => (byId[r.id] = r));
//         // optimistic merge
//         setRows((prev) => prev.map((r) => byId[r.id] ?? r));
//       } catch {}
//     }, 30_000);
//     return () => clearInterval(interval);
//   }, [rows]);

  return { rows, total, loading, error, setRows };
}

/* ──────────────────────────────────────────────────────────────────────────────
   Small UI Bits (Chips / Segmented / Popovers / Pager / PageSizer)
────────────────────────────────────────────────────────────────────────────── */
function Chip({
  label,
  active,
  onClick,
  className,
  title,
}: {
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={typeof title === "string" ? title : undefined}
      className={cn(
        "cursor-pointer h-8 rounded-full border px-3 text-sm transition",
        active
          ? "bg-[rgba(0,140,205,0.12)] text-[var(--brand)] border-[rgba(0,140,205,0.24)]"
          : "bg-white text-[var(--text)] hover:bg-[var(--bg-app)]",
        className
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {label}
    </button>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="inline-flex rounded-md border bg-white p-1" style={{ borderColor: "var(--border)" }}>
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            className={cn(
              "cursor-pointer h-8 rounded px-3 text-sm",
              active ? "text-white" : "text-[var(--text)] hover:bg-[var(--bg-app)]"
            )}
            style={active ? { background: "var(--brand)" } : {}}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Popover({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, onClose);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-0 top-full z-40 mt-2 w-[340px] rounded-md border bg-white p-3 shadow-xl",
        className
      )}
      style={{ borderColor: "var(--border)" }}
      role="dialog"
    >
      {children}
    </div>
  );
}

function Pager({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (next: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const go = (p: number) => onChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--text-muted)]">{start}-{end} of {total.toLocaleString()}</span>
      <button
        className="cursor-pointer rounded-md border px-2 py-1 text-sm hover:bg-[var(--bg-app)] disabled:opacity-50"
        style={{ borderColor: "var(--border)" }}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="min-w-[90px] text-center">Page {page} / {totalPages}</span>
      <button
        className="cursor-pointer rounded-md border px-2 py-1 text-sm hover:bg-[var(--bg-app)] disabled:opacity-50"
        style={{ borderColor: "var(--border)" }}
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}

function PageSizer({
  pageSize,
  onChange,
  options = [10, 25, 50, 100],
}: {
  pageSize: number;
  onChange: (next: number) => void;
  options?: number[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      Rows per page
      <select
        aria-label="Rows per page"
        className="h-8 rounded-md border bg-white px-2 text-sm text-[var(--text)]"
        style={{ borderColor: "var(--border)" }}
        value={pageSize}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Row actions
────────────────────────────────────────────────────────────────────────────── */
function ActionIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-grid h-9 w-9 place-items-center rounded-md border bg-white focus:outline-none focus:ring-2",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-[var(--bg-app)] cursor-pointer"
      )}
      style={{ borderColor: "var(--border)", boxShadow: "none", color: "var(--brand)" }}
      title={label}
      aria-label={label}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main Component
────────────────────────────────────────────────────────────────────────────── */
export default function QueueStatusTable(): ReactElement {
  /* Filters & sort */
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 300);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [priorityRange, setPriorityRange] = useState<[number, number]>([3, 5]);
  const [datePreset, setDatePreset] = useState<"Any" | "7d" | "30d" | "90d">("30d");
  const [sort, setSort] = useState<`${SortKey}:${"asc" | "desc"}` | undefined>("submittedAt:desc");
  const [pageSize, setPageSize] = useLocalStorage<number>("wr:queue:pageSize", 50);
  const [page, setPage] = useState(1);

  // Columns visibility + persistence
  const storageKey = "wr:queue:cols";
  const initialCols = DEFAULT_COLUMNS.map((c) => c.key as ColKey);
  const [visibleCols, setVisibleCols] = useLocalStorage<ColKey[]>(storageKey, initialCols);
  const columns = DEFAULT_COLUMNS.filter((c) => visibleCols.includes(c.key));

  // Filters → query object
  const filters: Filters = useMemo(() => {
    const f: Filters = { query: q, statuses, engines, priorityRange, pageSize, sort };
    const now = new Date();
    if (datePreset !== "Any") {
      const days = datePreset === "7d" ? 7 : datePreset === "30d" ? 30 : 90;
      const from = new Date(now.getTime() - days * 24 * 3600 * 1000);
      (f as any).dateFrom = from.toISOString();
      (f as any).dateTo = now.toISOString();
    }
    return f;
  }, [q, statuses, engines, priorityRange, pageSize, sort, datePreset]);

  // Data (explicit server paging)
  const { rows, total, loading, error, setRows } = useQueueDataPaged(filters, page);
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize)));

  // Reset to page 1 on filters change
  useEffect(() => { setPage(1); }, [q, statuses, engines, priorityRange, datePreset, sort, pageSize]);

  /* Selection */
  const { sel, isSelected, toggleOne, selectVisible, clear, selectAllMatching, selectedCount } = useSelection(total);
  const [visIdx, setVisIdx] = useState<{ startIndex: number; endIndex: number }>({ startIndex: 0, endIndex: 0 });
  const visibleIds = useMemo(() => rows.slice(visIdx.startIndex, visIdx.endIndex + 1).map((r) => r.id), [rows, visIdx]);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => isSelected(id));

  /* Keyboard focus */
  const [focusIndex, setFocusIndex] = useState(0);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!rows.length) return;
    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); setFocusIndex((i) => Math.min(rows.length - 1, i + 1)); }
    if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); setFocusIndex((i) => Math.max(0, i - 1)); }
    if (e.key === " " || e.code === "Space") { e.preventDefault(); toggleOne(rows[focusIndex].id); }
    if (e.key === "Enter") { e.preventDefault(); openLogs(rows[focusIndex]); }
    if (e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (rows[focusIndex].status === "INDEXED") { bulkAddToTracker([rows[focusIndex].id]); } else { toast("Row is not Indexed", "info"); }
    }
    if (e.key === "Escape") {
      setColumnsMenuOpen(false);
      setStatusDD(false);
      setFiltersDD(false);
    }
  };

  /* Scroll shadow */
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const fn = () => setScrolled(el.scrollTop > 0);
    el.addEventListener("scroll", fn);
    return () => el.removeEventListener("scroll", fn);
  }, []);

  /* Dropdowns */
  const [statusDD, setStatusDD] = useState(false);
  const [filtersDD, setFiltersDD] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  /* Permission (demo) */
  const [canAct] = useState(true);

  /* Toasts */
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "success" | "error" | "info" }[]>([]);
  const toast = (text: string, tone: "success" | "error" | "info" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  /* Actions — API patch helpers (with optimistic UI) */
  const patchRow = async (id: string, body: { action: "retry" | "boost" | "add_to_tracker" }) => {
    try {
      const res = await fetch(`/api/index/queue/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw res;
      const updated = await res.json();
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      return true;
    } catch {
      return false;
    }
  };

  const bulkRetry = async (ids: string[]) => {
    if (!ids.length) return;
    setRows((prev) =>
      prev.map((r) =>
        ids.includes(r.id)
          ? { ...r, status: "QUEUED" as Status, attempts: r.attempts + 1, lastCheck: new Date().toISOString() }
          : r
      )
    );
    toast(`Retry queued for ${ids.length} URL(s)`, "success");
    await Promise.allSettled(ids.map((id) => patchRow(id, { action: "retry" })));
  };
  const bulkBoost = async (ids: string[]) => {
    if (!ids.length) return;
    setRows((prev) =>
      prev.map((r) =>
        ids.includes(r.id)
          ? { ...r, priority: (Math.min(5, (r.priority as number) + 1) as any), status: r.status === "INDEXED" ? r.status : "QUEUED" }
          : r
      )
    );
    const res = await Promise.allSettled(ids.map((id) => patchRow(id, { action: "boost" })));
    const rejected = res.filter((x: any) => x.status === "rejected" || x.value === false);
    if (rejected.length) toast("Some rows could not be boosted due to rate limits.", "error");
    else toast(`Boosted ${ids.length} row(s)`, "success");
  };
  const bulkAddToTracker = async (ids: string[]) => {
    if (!ids.length) return;
    const eligible = rows.filter((r) => ids.includes(r.id) && r.status === "INDEXED").map((r) => r.id);
    if (!eligible.length) { toast("No eligible rows (Indexed) to add.", "info"); return; }
    const res = await Promise.allSettled(eligible.map((id) => patchRow(id, { action: "add_to_tracker" })));
    const ok = res.filter((r) => r.status === "fulfilled").length;
    const skipped = ids.length - ok;
    toast(`Added ${ok} to Tracker${skipped ? ` — skipped ${skipped}` : ""}.`, "success");
  };

  const openSource = (row: QueueRow) => {
    const href = row.sourceDomain ? `https://${row.sourceDomain}` : row.url;
    window.open(href, "_blank", "noopener,noreferrer");
  };
  const openLogs = (row: QueueRow) => {
    window.open(`/api/index/queue/${encodeURIComponent(row.id)}/logs`, "_blank");
  };

  /* Filters chip count */
  const activeFiltersCount =
    (statuses.length ? 1 : 0) +
    (engines.length ? 1 : 0) +
    (!(priorityRange[0] === 1 && priorityRange[1] === 5) ? 1 : 0) +
    (datePreset !== "Any" ? 1 : 0);

  /* Master checkbox (visible) */
  const onToggleAllVisible = () => { selectVisible(visibleIds, !allVisibleChecked); };

  /* Sorting */
  const setSortBy = (k: SortKey) => {
    setSort((prev) => {
      const dir = prev?.startsWith(k) && prev.endsWith(":desc") ? "asc" : "desc";
      return `${k}:${dir}`;
    });
  };

  /* Copy helper */
  const copyUrl = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast("URL copied", "success"); }
    catch { toast("Copy failed", "error"); }
  };

  /* Export (CSV, current page, visible columns order excluding Actions) */
  const exportCSV = () => {
    const exportCols = columns.filter((c) => c.key !== "actions");
    const csvEscape = (v: any) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const getCell = (r: QueueRow, key: ColKey) => {
      switch (key) {
        case "url": return r.url;
        case "sourceDomain": return r.sourceDomain;
        case "submittedAt": return r.submittedAt;
        case "status": return statusMap[r.status].label;
        case "engines": return r.engines.join("|");
        case "lastCheck": return r.lastCheck ?? "";
        case "attempts": return r.attempts;
        case "priority": return r.priority;
        default: return "";
      }
    };
    const header = exportCols.map((c) => c.label).join(",");
    const rowsCsv = rows.map((r) => exportCols.map((c) => csvEscape(getCell(r, c.key))).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${header}\n${rowsCsv}`], { type: "text/csv;charset=utf-8;" });
    const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `queue-export-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* Columns menu (dropdown) helpers */
  const toggleCol = (k: ColKey) =>
    setVisibleCols(visibleCols.includes(k) ? (visibleCols.filter((x) => x !== k) as ColKey[]) : ([...visibleCols, k] as ColKey[]));
  const moveCol = (k: ColKey, dir: -1 | 1) => {
    const idx = visibleCols.indexOf(k);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= visibleCols.length) return;
    const next = visibleCols.slice();
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    setVisibleCols(next as ColKey[]);
  };

  /* Selected IDs for bulk bar actions */
  const selectedIdsForBulk = sel.mode === "allMatching" ? rows.map((r) => r.id) : Array.from(sel.ids);

  return (
    <div className="wr-font w-full mt-4 px-2" onKeyDown={onKeyDown}>
      <GlobalTokens />

      {/* Section Container */}
      <section className="w-full rounded-md border bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
        {/* Section header with title + controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" color="var(--brand)" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Queue &amp; Status</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Columns control (dropdown below button) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnsMenuOpen((o) => !o)}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm hover:bg-[var(--bg-app)]"
                style={{ borderColor: "var(--border)" }}
                title="Columns"
              >
                <Settings2 className="h-4 w-4" color="var(--brand)" />
                Columns
              </button>
              <Popover open={columnsMenuOpen} onClose={() => setColumnsMenuOpen(false)} className="w-[360px]">
                <div className="max-h-[360px] overflow-auto pr-1">
                  <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Show / Hide &amp; Reorder</div>
                  <div className="space-y-1">
                    {DEFAULT_COLUMNS.map((c) => (
                      <div
                        key={c.key}
                        className="flex items-center justify-between rounded-md border p-2"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border cursor-pointer"
                            style={{ borderColor: "var(--border)" }}
                            checked={visibleCols.includes(c.key as ColKey)}
                            onChange={() => toggleCol(c.key as ColKey)}
                          />
                          <span className="text-sm text-[var(--text)]">{c.label}</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            className="cursor-pointer rounded-md border p-1 hover:bg-gray-50"
                            style={{ borderColor: "var(--border)" }}
                            onClick={() => moveCol(c.key as ColKey, -1)}
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            className="cursor-pointer rounded-md border p-1 hover:bg-gray-50"
                            style={{ borderColor: "var(--border)" }}
                            onClick={() => moveCol(c.key as ColKey, +1)}
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setVisibleCols(DEFAULT_COLUMNS.map((c) => c.key as ColKey))}
                  >
                    Restore defaults
                  </button>
                  <button
                    className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setColumnsMenuOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </Popover>
            </div>

            {/* Export (current page) */}
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm hover:bg-[var(--bg-app)]"
              style={{ borderColor: "var(--border)" }}
              title="Export current page (CSV)"
            >
              <FileText className="h-4 w-4" color="var(--brand)" />
              Export
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: "var(--border)" }}>
          {/* Left cluster: search + chips */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full min-w-[260px] flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search URL or Source Domain…"
                className="w-full rounded-md border pl-9 pr-9 text-sm leading-9 placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none"
                style={{ borderColor: "var(--border)" }}
              />
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              {query && (
                <button
                  className="absolute right-2 top-2 h-5 w-5 cursor-pointer rounded-full text-[var(--text-muted)] hover:bg-gray-100"
                  title="Clear"
                  onClick={() => setQuery("")}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Status chip → dropdown */}
            <div className="relative">
              <Chip
                label={
                  <span className="flex items-center gap-1">
                    <FilterIcon className="h-4 w-4" color="var(--brand)" /> Status{statuses.length ? `: ${statuses.length}` : ""}
                  </span>
                }
                active={statuses.length > 0}
                onClick={() => setStatusDD((o) => !o)}
                title="Filter by status"
              />
              <Popover open={statusDD} onClose={() => setStatusDD(false)}>
                <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Status</div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(statusMap).map((k) => {
                    const s = k as Status;
                    const active = statuses.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() =>
                          setStatuses((prev) => (active ? prev.filter((x) => x !== s) : [...prev, s]))
                        }
                        className={cn("cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1", active ? "" : "hover:bg-[var(--bg-app)]")}
                        style={{ background: active ? statusMap[s].bg : "#fff", color: active ? statusMap[s].text : "var(--text)", borderColor: active ? "transparent" : "var(--border)" }}
                        title={statusMap[s].label}
                      >
                        {statusMap[s].label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    className="cursor-pointer rounded-md border px-3 py-1 text-sm hover:bg-[var(--bg-app)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setStatuses([])}
                  >
                    Clear
                  </button>
                  <button
                    className="cursor-pointer rounded-md border px-3 py-1 text-sm hover:bg-[var(--bg-app)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setStatusDD(false)}
                  >
                    Done
                  </button>
                </div>
              </Popover>
            </div>

            {/* Engine segmented */}
            <Segmented
              options={[{ label: "Google", value: "google" }, { label: "Bing", value: "bing" }]}
              value={engines}
              onChange={(v) => setEngines(v as Engine[])}
            />

            {/* Priority display (range via Filters dropdown) */}
            <Chip label={<span>Priority: {priorityRange[0]}–{priorityRange[1]}</span>} active={!(priorityRange[0] === 1 && priorityRange[1] === 5)} />

            {/* Date preset chip opens Filters dropdown */}
            <Chip label={`Date: ${datePreset === "Any" ? "Any" : datePreset}`} active={datePreset !== "Any"} onClick={() => setFiltersDD((o) => !o)} title="Date range (open Filters to change)" />

            {/* Filters dropdown button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersDD((o) => !o)}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm hover:bg-[var(--bg-app)]"
                style={{ borderColor: "var(--border)" }}
                title="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" color="var(--brand)" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-xs font-semibold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Filters Dropdown */}
              <Popover open={filtersDD} onClose={() => setFiltersDD(false)} className="w-[360px]">
                <div className="space-y-5">
                  <section>
                    <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Status</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(statusMap).map((k) => {
                        const s = k as Status;
                        const active = statuses.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => setStatuses((prev) => (active ? prev.filter((x) => x !== s) : [...prev, s]))}
                            className={cn("cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1", active ? "" : "hover:bg-[var(--bg-app)]")}
                            style={{ background: active ? statusMap[s].bg : "#fff", color: active ? statusMap[s].text : "var(--text)", borderColor: active ? "transparent" : "var(--border)" }}
                            title={statusMap[s].label}
                          >
                            {statusMap[s].label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Engine</div>
                    <Segmented
                      options={[{ label: "Google", value: "google" }, { label: "Bing", value: "bing" }]}
                      value={engines}
                      onChange={(v) => setEngines(v as Engine[])}
                    />
                  </section>

                  <section>
                    <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Priority (1–5)</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="h-8 w-20 rounded-md border px-2 text-sm"
                        style={{ borderColor: "var(--border)" }}
                        min={1}
                        max={5}
                        value={priorityRange[0]}
                        onChange={(e) => setPriorityRange([Math.max(1, Math.min(5, Number(e.target.value))), priorityRange[1]])}
                      />
                      <span className="text-[var(--text-muted)]">to</span>
                      <input
                        type="number"
                        className="h-8 w-20 rounded-md border px-2 text-sm"
                        style={{ borderColor: "var(--border)" }}
                        min={1}
                        max={5}
                        value={priorityRange[1]}
                        onChange={(e) => setPriorityRange([priorityRange[0], Math.max(1, Math.min(5, Number(e.target.value)))])}
                      />
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Date Range (Submitted At)</div>
                    <div className="flex flex-wrap gap-2">
                      {(["Any", "7d", "30d", "90d"] as const).map((opt) => (
                        <Chip key={opt} label={opt} active={datePreset === opt} onClick={() => setDatePreset(opt)} />
                      ))}
                    </div>
                  </section>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-[var(--bg-app)]"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => { setStatuses([]); setEngines([]); setPriorityRange([1, 5]); setDatePreset("Any"); }}
                    >
                      Reset all
                    </button>
                    <button
                      className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-[var(--bg-app)]"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => setFiltersDD(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Popover>
            </div>
          </div>

          {/* Right cluster: TOP pager + page size (actions removed per spec) */}
          <div className="flex items-center gap-3">
            <PageSizer pageSize={pageSize} onChange={(n) => setPageSize(n)} />
            <div className="ml-1">
              <Pager page={page} total={total} pageSize={pageSize} onChange={(p) => { setPage(p); setFocusIndex(0); }} />
            </div>
          </div>
        </div>

        {/* Sticky table header + scroller */}
        <div className={cn("sticky top-0 z-30 border-b bg-[var(--bg-panel)]", scrolled ? "shadow-sm" : "")}
             style={{ borderColor: "var(--border)", boxShadow: scrolled ? "var(--shadow-1)" : "none" }}>
          <div
            className="grid w-full items-center gap-0 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            style={{ gridTemplateColumns: `40px ${columns.map((c) => `${c.key === "url" ? "minmax(420px,1fr)" : `${c.width}px`}`).join(" ")}` }}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border cursor-pointer"
                style={{ borderColor: "var(--border)" }}
                checked={allVisibleChecked}
                onChange={onToggleAllVisible}
                aria-label="Select visible"
                title="Select visible rows"
              />
            </div>
            {columns.map((c) => (
              <div key={c.key} className="py-1">
                {c.sortable ? (
                  <button
                    className="flex cursor-pointer items-center gap-1 text-left hover:opacity-80"
                    onClick={() => setSortBy(c.key as SortKey)}
                    title={`Sort by ${c.label}`}
                  >
                    {c.label}
                    {sort?.startsWith(c.key) && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                        {sort.endsWith(":asc") ? (
                          <path d="M7 14l5-5 5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M7 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                    )}
                  </button>
                ) : (
                  <span>{c.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body (virtualized) */}
        <div ref={scrollerRef} className="h-[560px] overflow-auto">
          <SimpleVirtuoso<QueueRow>
            data={rows}
            computeItemKey={(_, item) => item.id}
            overscan={6}
            customScrollParent={scrollerRef.current || undefined}
            rangeChanged={(r) => setVisIdx(r)}
            itemContent={(index, r) => {
              const checked = isSelected(r.id);
              const focus = index === focusIndex;
              const stale = isStale(r.lastCheck);
              const canRetry = ["FAILED", "RATE_LIMITED", "NOT_INDEXABLE"].includes(r.status);
              const canBoost = r.priority < 5;
              const canAddTracker = r.status === "INDEXED";

              return (
                <div
                  data-rowid={r.id}
                  className={cn("grid items-center px-3 text-sm hover:bg-[#FAFAFA] focus-within:bg-[#FAFAFA]")}
                  style={{
                    gridTemplateColumns: `40px ${columns.map((c) => (c.key === "url" ? "minmax(420px,1fr)" : `${c.width}px`)).join(" ")}`,
                    minHeight: 44,
                    outline: focus ? "1px solid var(--brand)" : "none",
                    outlineOffset: "-1px",
                    borderTop: "1px solid var(--border)", // thin line connecting edges
                  }}
                  tabIndex={0}
                  onFocus={() => setFocusIndex(index)}
                >
                  {/* Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border cursor-pointer"
                      style={{ borderColor: "var(--border)" }}
                      checked={checked}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Select row ${index + 1}`}
                    />
                  </div>

                  {/* Dynamic cells in column order */}
                  {columns.map((c) => {
                    switch (c.key) {
                      case "url":
                        return (
                          <div key={`${r.id}-url`} className="flex items-start gap-2 py-2">
                            <div className="min-w-0">
                              <div className="line-clamp-2 break-words text-[var(--text)]">{pathOnly(r.url)}</div>
                              <div className="mt-0.5 text-xs text-[var(--text-muted)]" title={r.url}>
                                {(() => { try { return new URL(r.url).hostname; } catch { return r.sourceDomain || "—"; } })()}
                              </div>
                            </div>
                            <button
                              className="ml-auto inline-grid h-8 w-8 place-items-center rounded-md border hover:bg-[var(--bg-app)] cursor-pointer"
                              style={{ borderColor: "var(--border)" }}
                              title="Copy URL"
                              aria-label="Copy URL"
                              onClick={() => copyUrl(r.url)}
                            >
                              <Copy className="h-4 w-4" color="var(--brand)" />
                            </button>
                          </div>
                        );
                      case "sourceDomain":
                        return (
                          <div key={`${r.id}-src`} className="py-2">
                            <div className="flex items-center gap-2">
                              {/* Favicon only */}
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.sourceDomain)}&sz=32`}
                                alt=""
                                className="h-4 w-4 rounded-sm"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                              <a
                                className="truncate hover:underline"
                                style={{ color: "#0077ff" }}
                                href={`https://${r.sourceDomain}`}
                                target="_blank"
                                rel="noreferrer"
                                title={r.sourceDomain}
                              >
                                {r.sourceDomain}
                              </a>
                            </div>
                          </div>
                        );
                      case "submittedAt":
                        return <div key={`${r.id}-sub`} className="py-2" title={r.submittedAt}>{new Date(r.submittedAt).toLocaleString()}</div>;
                      case "status":
                        return <div key={`${r.id}-status`} className="py-2"><StatusPill status={r.status} tooltip={r.lastMessage} /></div>;
                      case "engines":
                        return <div key={`${r.id}-eng`} className="py-2"><EngineChips engines={r.engines} /></div>;
                      case "lastCheck":
                        return (
                          <div key={`${r.id}-lc`} className="flex items-center gap-2 py-2" title={r.lastCheck || "—"}>
                            {fmt(r.lastCheck)}
                            {stale && <span className="inline-block h-2 w-2 rounded-full" style={{ background: "rgba(249,187,4,0.9)" }} title="Stale > 24h" />}
                          </div>
                        );
                      case "attempts":
                        return <div key={`${r.id}-att`} className="py-2" title={`Attempts: ${r.attempts}`}>{r.attempts}</div>;
                      case "priority":
                        return (
                          <div key={`${r.id}-prio`} className="py-2">
                            <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md border px-2 text-xs" style={{ borderColor: "var(--border)" }} title="Priority (1–5)">
                              {r.priority}
                            </span>
                          </div>
                        );
                      case "actions":
                        return (
                          <div key={`${r.id}-act`} className="flex items-center gap-2 py-1">
                            <ActionIcon label="Re-try" onClick={() => bulkRetry([r.id])} disabled={!canAct || !canRetry}><RotateCcw className="h-4 w-4" /></ActionIcon>
                            <ActionIcon label={r.priority >= 5 ? "Max priority" : "Boost again"} onClick={() => bulkBoost([r.id])} disabled={!canAct || !canBoost}><Rocket className="h-4 w-4" /></ActionIcon>
                            <ActionIcon label="Add to Tracker" onClick={() => bulkAddToTracker([r.id])} disabled={!canAct || !canAddTracker}><FolderPlus className="h-4 w-4" /></ActionIcon>
                            <ActionIcon label="View logs" onClick={() => openLogs(r)}><FileText className="h-4 w-4" /></ActionIcon>
                            <ActionIcon label="Open source" onClick={() => openSource(r)}><ExternalLink className="h-4 w-4" /></ActionIcon>
                          </div>
                        );
                      default:
                        return <div key={`${r.id}-${(c as any).key}`} className="py-2">—</div>;
                    }
                  })}
                </div>
              );
            }}
          />
        </div>

        {/* Loading / Error / Empty */}
        {loading && rows.length === 0 && <div className="p-4 text-sm text-[var(--text-muted)]">Loading queue…</div>}
        {!loading && !!error && (
          <div className="m-3 rounded-md border p-3 text-sm" style={{ borderColor: "var(--critical-bg)", background: "#FFF4F4", color: "var(--critical)" }}>
            We couldn’t load the queue. <button className="cursor-pointer underline" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
        {!loading && rows.length === 0 && !error && (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No URLs match your filters.{" "}
            <button
              className="cursor-pointer underline"
              onClick={() => { setStatuses([]); setEngines([]); setPriorityRange([1, 5]); setDatePreset("Any"); setQuery(""); }}
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Bulk selection bar (sticky under header inside container) */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2" style={{ borderColor: "var(--border)", background: "rgba(0,140,205,0.08)" }}>
            <div className="text-sm text-[var(--text)]">
              {sel.mode === "allMatching" ? <strong>All {total.toLocaleString()}</strong> : <strong>{selectedCount.toLocaleString()}</strong>} selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]" style={{ borderColor: "var(--border)" }} onClick={() => bulkRetry(selectedIdsForBulk)} title="Retry">
                <RotateCcw className="h-4 w-4" color="var(--brand)" /> Retry
              </button>
              <button className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]" style={{ borderColor: "var(--border)" }} onClick={() => bulkBoost(selectedIdsForBulk)} title="Boost">
                <Rocket className="h-4 w-4" color="var(--brand)" /> Boost
              </button>
              <button className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]" style={{ borderColor: "var(--border)" }} onClick={() => bulkAddToTracker(selectedIdsForBulk)} title="Add to Tracker">
                <FolderPlus className="h-4 w-4" color="var(--brand)" /> Add to Tracker
              </button>
              {sel.mode !== "allMatching" && (
                <button className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]" style={{ borderColor: "var(--border)" }} onClick={selectAllMatching} title="Select all matching across pages">
                  Select all matching
                </button>
              )}
              <button className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]" style={{ borderColor: "var(--border)" }} onClick={clear} title="Clear selection">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Bottom pagination: page size + pager */}
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2" style={{ borderColor: "var(--border)" }}>
          <PageSizer pageSize={pageSize} onChange={(n) => setPageSize(n)} />
          <Pager page={page} total={total} pageSize={pageSize} onChange={(p) => { setPage(p); setFocusIndex(0); }} />
        </div>
      </section>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[1100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn("rounded-md px-3 py-2 text-sm text-white shadow-lg", t.tone === "success" ? "bg-emerald-600" : t.tone === "error" ? "bg-rose-600" : "bg-slate-800")}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
