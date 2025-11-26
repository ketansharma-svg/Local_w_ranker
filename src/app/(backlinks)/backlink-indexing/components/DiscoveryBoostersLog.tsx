"use client";
/* Discovery Boosters Log — redesigned to match “Queue & Status” reference
   - Header: title + Columns dropdown + Export
   - Filters bar: search + Status chip + Type chip + Date preset + top pager + page size
   - Sticky header + thin row dividers
   - Virtualized body
   - Bulk bar (Re-send selected)
   - Bottom pager + page size
   - Mock data fallback when API is unavailable
*/

import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ListChecks,
  Settings2,
  FileText,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Filter as FilterIcon,
  Search as SearchIcon,
  RotateCcw,
  Check,
  X,
  Loader2,
  Share2,
  Globe2,
  Rss,
  Code2,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Global Tokens (match reference)
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
   Lightweight virtualizer (same pattern as reference)
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

  const [range, setRange] = useState<{ startIndex: number; endIndex: number }>(
    { startIndex: 0, endIndex: Math.min(data.length - 1, 0) }
  );
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

  return <div aria-label="virtual-list" style={{ position: "relative", height: totalHeight }}>{children}</div>;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */
type BoosterType = "share-graph-ping" | "hub-page-publish" | "rss-emit" | "json-feed-emit";
type BoosterStatus = "Succeeded" | "Retrying" | "Failed";

export type BoosterItem = {
  id: string;
  type: BoosterType;
  ts: string;               // ISO
  latencyMs?: number;
  attempts?: number;
  status: BoosterStatus;
  requestIds?: string[];
  logs?: string[];
};

/* ──────────────────────────────────────────────────────────────────────────────
   Utilities
────────────────────────────────────────────────────────────────────────────── */
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
const csvEscape = (v: any) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
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
   Chips / Popover / Pager / PageSizer
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
  const ref = useRef<HTMLDivElement |any>(null);
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
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
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

/* ──────────────────────────────────────────────────────────────────────────────
   Status & Type UI
────────────────────────────────────────────────────────────────────────────── */
const statusMap: Record<
  BoosterStatus,
  { label: string; text: string; bg: string; icon: React.ReactNode; aria: string }
> = {
  Succeeded: {
    label: "Succeeded",
    text: "var(--success)",
    bg: "var(--success-bg)",
    icon: <Check className="h-3.5 w-3.5" />,
    aria: "Status: Succeeded",
  },
  Retrying: {
    label: "Retrying",
    text: "var(--warning)",
    bg: "var(--warning-bg)",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    aria: "Status: Retrying",
  },
  Failed: {
    label: "Failed",
    text: "var(--critical)",
    bg: "var(--critical-bg)",
    icon: <X className="h-3.5 w-3.5" />,
    aria: "Status: Failed",
  },
};
function StatusPill({ status }: { status: BoosterStatus }) {
  const s = statusMap[status];
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
      aria-label={s.aria}
      title={s.label}
    >
      {s.icon}
      {s.label}
    </span>
  );
}
const TYPE_META: Record<BoosterType, { label: string; icon: React.ReactNode }> = {
  "share-graph-ping": { label: "Share‑graph ping", icon: <Share2 className="h-3.5 w-3.5" /> },
  "hub-page-publish": { label: "Hub‑page publish", icon: <Globe2 className="h-3.5 w-3.5" /> },
  "rss-emit":         { label: "RSS emit",         icon: <Rss className="h-3.5 w-3.5" /> },
  "json-feed-emit":   { label: "JSON feed emit",   icon: <Code2 className="h-3.5 w-3.5" /> },
};
function TypeChip({ type }: { type: BoosterType }) {
  const t = TYPE_META[type];
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-full border bg-white px-2 text-xs"
      style={{ borderColor: "var(--border)", color: "var(--text)" }}
      title={t.label}
    >
      {t.icon}
      {t.label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Columns config (visibility + persisted order)
────────────────────────────────────────────────────────────────────────────── */
const DEFAULT_COLUMNS = [
  { key: "type", label: "Booster Type", width: 240, sortable: true },
  { key: "timestamp", label: "Timestamp", width: 200, sortable: true },
  { key: "status", label: "Status", width: 160, sortable: true },
  { key: "attempts", label: "Attempts", width: 120, sortable: true },
  { key: "latency", label: "Latency", width: 120, sortable: true },
  { key: "actions", label: "Actions", width: 160, sortable: true },
] as const;

type ColKey = typeof DEFAULT_COLUMNS[number]["key"];
type SortKey = Extract<ColKey, "timestamp" | "status" | "attempts" | "latency">;

/* ──────────────────────────────────────────────────────────────────────────────
   Selection (explicit / allMatching) — same pattern as reference
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
   Demo data fallback (mock data)
────────────────────────────────────────────────────────────────────────────── */
function demoBoosters(count = 1200): BoosterItem[] {
  const types: BoosterType[] = ["share-graph-ping", "hub-page-publish", "rss-emit", "json-feed-emit"];
  const statuses: BoosterStatus[] = ["Succeeded", "Retrying", "Failed"];

  // Generate rows across the *last 29 → 18 days*, which is inside the default Date: 30d filter
  const stepMs = 10 * 60 * 1000; // 10 minutes between rows
  const start = Date.now() - 29 * 24 * 60 * 60 * 1000; // 29 days ago

  return Array.from({ length: count }).map((_, i) => {
    const type = types[(i * 7) % types.length];
    const status = statuses[i % statuses.length];
    const ts = new Date(start + i * stepMs).toISOString();

    const attempts =
      status === "Succeeded" ? ((i % 2) ? 1 : 2) : ((i % 4) + 1);
    const latencyMs = 80 + ((i * 13) % 2600);

    return {
      id: `b_${i.toString(36)}_${(Math.random() * 1e6) | 0}`,
      type,
      ts,
      status,
      attempts,
      latencyMs,
      requestIds: i % 3 ? undefined : [`req_${i}_${(Math.random() * 1e5) | 0}`],
      logs: i % 5 ? undefined : [
        `[${ts}] POST /boosters/${type} → 2xx`,
        i % 2 ? "attempt=1 latency=120ms" : "attempt=2 latency=680ms",
      ],
    };
  });
}


/* ──────────────────────────────────────────────────────────────────────────────
   Filters + Data (explicit paging with API → fallback to mock)
────────────────────────────────────────────────────────────────────────────── */
type Filters = {
  query: string;
  statuses: BoosterStatus[];
  types: BoosterType[];
  datePreset: "Any" | "7d" | "30d" | "90d";
  sort?: `${SortKey}:${"asc" | "desc"}`;
  pageSize: number;
};

function buildQuery(params: Partial<Filters> & { page?: number }) {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.statuses?.length) qs.set("status", params.statuses.join(","));
  if (params.types?.length) qs.set("type", params.types.join(","));
  if (params.datePreset && params.datePreset !== "Any") qs.set("date", params.datePreset);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  qs.set("pageSize", String(params.pageSize || 50));
  return qs.toString();
}

function useBoostersDataPaged(filters: Filters, page: number) {
  const [rows, setRows] = useState<BoosterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  const key = JSON.stringify({ ...filters, page });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Try your API first (optional server support for paging)
        const qs = buildQuery({ ...filters, page });
        const res = await fetch(`/api/index/boosters?${qs}`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setRows(data.rows as BoosterItem[]);
        setTotal(data.total ?? (data.rows?.length || 0));
        setLoading(false);
      } catch {
        // Fallback to mock demo data (always available)
        const all = demoBoosters(1600);

        // Client-side filter & sort for demo
        const { query, statuses, types, datePreset, sort, pageSize } = filters;
        const matches = all.filter((r) => {
          if (statuses.length && !statuses.includes(r.status)) return false;
          if (types.length && !types.includes(r.type)) return false;
          if (query) {
            const t = query.toLowerCase();
            const typeLabel = TYPE_META[r.type].label.toLowerCase();
            if (
              !r.id.toLowerCase().includes(t) &&
              !typeLabel.includes(t)
            ) return false;
          }
          if (datePreset !== "Any") {
            const days = datePreset === "7d" ? 7 : datePreset === "30d" ? 30 : 90;
            const from = Date.now() - days * 24 * 3600 * 1000;
            if (new Date(r.ts).getTime() < from) return false;
          }
          return true;
        });

        const sorted = (() => {
          if (!sort) return matches.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
          const [k, dir] = sort.split(":") as [SortKey, "asc" | "desc"];
          const mul = dir === "asc" ? 1 : -1;
          return matches.slice().sort((a, b) => {
            switch (k) {
              case "timestamp": return (+new Date(a.ts) - +new Date(b.ts)) * mul;
              case "status": return a.status.localeCompare(b.status) * mul;
              case "attempts": return ((a.attempts || 0) - (b.attempts || 0)) * mul;
              case "latency": return ((a.latencyMs || 0) - (b.latencyMs || 0)) * mul;
            }
          });
        })();

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        if (!alive) return;
        setRows(sorted.slice(start, end));
        setTotal(matches.length);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [key]);

  return { rows, total, loading, error, setRows };
}

/* ──────────────────────────────────────────────────────────────────────────────
   Row actions + helpers
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
export function DiscoveryBoostersLog(): ReactElement{
  /* Filters & sort */
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 300);

  const [statuses, setStatuses] = useState<BoosterStatus[]>([]);
  const [types, setTypes] = useState<BoosterType[]>([]);
  const [datePreset, setDatePreset] = useState<"Any" | "7d" | "30d" | "90d">("30d");
  const [sort, setSort] = useState<`${SortKey}:${"asc" | "desc"}` | undefined>("timestamp:desc");
  const [pageSize, setPageSize] = useLocalStorage<number>("wr:boosters:pageSize", 50);
  const [page, setPage] = useState(1);

  // Columns visibility + persistence
  const storageKey = "wr:boosters:cols";
  const initialCols = DEFAULT_COLUMNS.map((c) => c.key as ColKey);
  const [visibleCols, setVisibleCols] = useLocalStorage<ColKey[]>(storageKey, initialCols);
  const columns = DEFAULT_COLUMNS.filter((c) => visibleCols.includes(c.key));

  // Filters → object
  const filters: Filters = useMemo(() => {
    return { query: q, statuses, types, datePreset, pageSize, sort };
  }, [q, statuses, types, datePreset, pageSize, sort]);

  // Data
  const { rows, total, loading, error, setRows } = useBoostersDataPaged(filters, page);

  // Reset page on filters change
  useEffect(() => { setPage(1); }, [q, statuses, types, datePreset, sort, pageSize]);

  /* Selection */
  const { sel, isSelected, toggleOne, selectVisible, clear, selectAllMatching, selectedCount } = useSelection(total);
  const [visIdx, setVisIdx] = useState<{ startIndex: number; endIndex: number }>({ startIndex: 0, endIndex: 0 });
  const visibleIds = useMemo(() => rows.slice(visIdx.startIndex, visIdx.endIndex + 1).map((r) => r.id), [rows, visIdx]);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => isSelected(id));
  const onToggleAllVisible = () => { selectVisible(visibleIds, !allVisibleChecked); };

  /* Scroll shadow for sticky header */
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
  const [typeDD, setTypeDD] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  /* Toasts */
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "success" | "error" | "info" }[]>([]);
  const toast = (text: string, tone: "success" | "error" | "info" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  /* Actions — API + optimistic UI */
  const retryOne = async (id: string) => {
    // optimistic
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Retrying" as BoosterStatus } : r))
    );
    try {
      const res = await fetch(`/api/index/boosters/${encodeURIComponent(id)}/retry`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      toast("Re‑send queued", "success");
    } catch {
      toast("Couldn’t queue re‑send (mocked ok in demo).", "info");
    }
  };
  const bulkRetry = async (ids: string[]) => {
    if (!ids.length) return;
    setRows((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: "Retrying" as BoosterStatus } : r))
    );
    toast(`Re‑send queued for ${ids.length}`, "success");
    // Fire & forget
    await Promise.allSettled(ids.map(async (id) => {
      try {
        const res = await fetch(`/api/index/boosters/${encodeURIComponent(id)}/retry`, { method: "POST" });
        if (!res.ok) throw new Error();
      } catch {}
    }));
  };

  /* Filters chip count (for Filters button if you add one) */
  const activeFiltersCount = (statuses.length ? 1 : 0) + (types.length ? 1 : 0) + (datePreset !== "Any" ? 1 : 0);

  /* Sorting (click on header) */
  const setSortBy = (k: SortKey) => {
    setSort((prev) => {
      const dir = prev?.startsWith(k) && prev.endsWith(":desc") ? "asc" : "desc";
      return `${k}:${dir}`;
    });
  };

  /* Export (CSV, current page, visible columns order excluding Actions) */
  const exportCSV = () => {
    const exportCols = columns.filter((c) => c.key !== "actions");
    const getCell = (r: BoosterItem, key: ColKey) => {
      switch (key) {
        case "type": return TYPE_META[r.type].label;
        case "timestamp": return r.ts;
        case "status": return r.status;
        case "attempts": return r.attempts ?? 0;
        case "latency": return r.latencyMs ?? "";
        default: return "";
      }
    };
    const header = exportCols.map((c) => c.label).join(",");
    const rowsCsv = rows.map((r) => exportCols.map((c) => csvEscape(getCell(r, c.key))).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${header}\n${rowsCsv}`], { type: "text/csv;charset=utf-8;" });
    const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `boosters-export-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* Columns menu helpers */
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
    <div className="wr-font w-full mt-4 px-2">
      <GlobalTokens />

      {/* Section Container */}
      <section className="w-full rounded-md border bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
        {/* Section header with title + controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" color="var(--brand)" />
            <h2 className="text-lg font-semibold text-[var(--text)]">Discovery Boosters Log</h2>
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
          {/* Left: search + chips */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full min-w-[260px] flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ID or Booster Type…"
                className="w-full rounded-md border pl-9 pr-3 text-sm leading-9 placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none"
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
                    <FilterIcon className="h-4 w-4" color="var(--brand)" />
                    Status{statuses.length ? `: ${statuses.length}` : ""}
                  </span>
                }
                active={statuses.length > 0}
                onClick={() => setStatusDD((o) => !o)}
                title="Filter by status"
              />
              <Popover open={statusDD} onClose={() => setStatusDD(false)}>
                <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Status</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusMap) as BoosterStatus[]).map((s) => {
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

            {/* Type chip → dropdown (multi) */}
            <div className="relative">
              <Chip
                label={
                  <span className="flex items-center gap-1">
                    <SlidersHorizontal className="h-4 w-4" color="var(--brand)" />
                    Type{types.length ? `: ${types.length}` : ""}
                  </span>
                }
                active={types.length > 0}
                onClick={() => setTypeDD((o) => !o)}
                title="Filter by type"
              />
              <Popover open={typeDD} onClose={() => setTypeDD(false)}>
                <div className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Booster Type</div>
                <div className="flex flex-col gap-1">
                  {(["share-graph-ping","hub-page-publish","rss-emit","json-feed-emit"] as BoosterType[]).map((t) => {
                    const active = types.includes(t);
                    return (
                      <label key={t} className="flex items-center gap-2 rounded-md p-1 hover:bg-[var(--bg-app)] cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border cursor-pointer"
                          style={{ borderColor: "var(--border)" }}
                          checked={active}
                          onChange={() => setTypes((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))}
                        />
                        <span className="text-sm text-[var(--text)]">{TYPE_META[t].label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    className="cursor-pointer rounded-md border px-3 py-1 text-sm hover:bg-[var(--bg-app)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setTypes([])}
                  >
                    Clear
                  </button>
                  <button
                    className="cursor-pointer rounded-md border px-3 py-1 text-sm hover:bg-[var(--bg-app)]"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setTypeDD(false)}
                  >
                    Done
                  </button>
                </div>
              </Popover>
            </div>

            {/* Date preset chip (simple, per reference) */}
            <Chip
              label={`Date: ${datePreset === "Any" ? "Any" : datePreset}`}
              active={datePreset !== "Any"}
              onClick={() => setDatePreset((p) => (p === "Any" ? "30d" : p === "30d" ? "7d" : p === "7d" ? "90d" : "Any"))}
              title="Click to cycle Any → 30d → 7d → 90d"
            />
          </div>

          {/* Right: TOP pager + page size */}
          <div className="flex items-center gap-3">
            <PageSizer pageSize={pageSize} onChange={(n) => setPageSize(n)} />
            <div className="ml-1">
              <Pager page={page} total={total} pageSize={pageSize} onChange={(p) => { setPage(p); }} />
            </div>
          </div>
        </div>

        {/* Sticky table header */}
        <div className={cn("sticky top-0 z-30 border-b bg-[var(--bg-panel)]", scrolled ? "shadow-sm" : "")}
             style={{ borderColor: "var(--border)", boxShadow: scrolled ? "var(--shadow-1)" : "none" }}>
          <div
            className="grid w-full items-center gap-0 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            style={{ gridTemplateColumns: `40px ${columns.map((c) => `${c.key === "type" ? "minmax(260px,1fr)" : `${c.width}px`}`).join(" ")}` }}
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
          <SimpleVirtuoso<BoosterItem>
            data={rows}
            computeItemKey={(_, item) => item.id}
            overscan={6}
            customScrollParent={scrollerRef.current || undefined}
            rangeChanged={(r) => setVisIdx(r)}
            itemContent={(index, r) => {
              const checked = isSelected(r.id);
              const canRetry = r.status === "Failed" || r.status === "Retrying";

              return (
                <div
                  data-rowid={r.id}
                  className={cn("grid items-center px-3 text-sm hover:bg-[#FAFAFA]")}
                  style={{
                    gridTemplateColumns: `40px ${columns.map((c) => (c.key === "type" ? "minmax(260px,1fr)" : `${c.width}px`)).join(" ")}`,
                    minHeight: 44,
                    borderTop: "1px solid var(--border)", // thin connecting line
                  }}
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
                      case "type":
                        return (
                          <div key={`${r.id}-type`} className="py-2 flex items-center gap-2">
                            <TypeChip type={r.type} />
                            <span className="text-xs text-[var(--text-muted)]">ID: {r.id}</span>
                          </div>
                        );
                      case "timestamp":
                        return (
                          <div key={`${r.id}-ts`} className="py-2" title={r.ts}>
                            {fmt(r.ts)}
                          </div>
                        );
                      case "status":
                        return (
                          <div key={`${r.id}-st`} className="py-2">
                            <StatusPill status={r.status} />
                          </div>
                        );
                      case "attempts":
                        return (
                          <div key={`${r.id}-att`} className="py-2" title={`Attempts: ${r.attempts ?? 0}`}>
                            {r.attempts ?? 0}
                          </div>
                        );
                      case "latency":
                        return (
                          <div key={`${r.id}-lat`} className="py-2" title="Last latency">
                            {r.latencyMs != null ? (r.latencyMs < 1000 ? `${r.latencyMs} ms` : `${(r.latencyMs/1000).toFixed(1)} s`) : "—"}
                          </div>
                        );
                      case "actions":
                        return (
                          <div key={`${r.id}-act`} className="flex items-center gap-2 py-1">
                            <ActionIcon label="Re‑send" onClick={() => retryOne(r.id)} disabled={!canRetry}>
                              <RotateCcw className="h-4 w-4" />
                            </ActionIcon>
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
        {loading && rows.length === 0 && <div className="p-4 text-sm text-[var(--text-muted)]">Loading boosters…</div>}
        {!loading && !!error && (
          <div
            className="m-3 rounded-md border p-3 text-sm"
            style={{ borderColor: "var(--critical-bg)", background: "#FFF4F4", color: "var(--critical)" }}
          >
            We couldn’t load boosters. Using demo rows. Reload to try again.
          </div>
        )}
        {!loading && rows.length === 0 && !error && (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No items match your filters.{" "}
            <button
              className="cursor-pointer underline"
              onClick={() => { setStatuses([]); setTypes([]); setDatePreset("Any"); setQuery(""); }}
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Bulk selection bar */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2" style={{ borderColor: "var(--border)", background: "rgba(0,140,205,0.08)" }}>
            <div className="text-sm text-[var(--text)]">
              {sel.mode === "allMatching" ? <strong>All {total.toLocaleString()}</strong> : <strong>{selectedCount.toLocaleString()}</strong>} selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]"
                style={{ borderColor: "var(--border)" }}
                onClick={() => bulkRetry(selectedIdsForBulk)}
                title="Re‑send"
              >
                <RotateCcw className="h-4 w-4" color="var(--brand)" /> Re‑send
              </button>
              {sel.mode !== "allMatching" && (
                <button
                  className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]"
                  style={{ borderColor: "var(--border)" }}
                  onClick={selectAllMatching}
                  title="Select all matching across pages"
                >
                  Select all matching
                </button>
              )}
              <button
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg-app)]"
                style={{ borderColor: "var(--border)" }}
                onClick={clear}
                title="Clear selection"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Bottom pagination */}
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2" style={{ borderColor: "var(--border)" }}>
          <PageSizer pageSize={pageSize} onChange={(n) => setPageSize(n)} />
          <Pager page={page} total={total} pageSize={pageSize} onChange={(p) => { setPage(p); }} />
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

export default DiscoveryBoostersLog;
