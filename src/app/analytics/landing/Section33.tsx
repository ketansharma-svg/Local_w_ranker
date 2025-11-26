"use client";

/**
 * Wranker · Analytics · Tab 3 → Section 3.3
 * Pages with High Impressions, Low Sessions
 *
 * Fix: Resolved "Cannot access 'filteredSorted' before initialization" by moving
 * the IntersectionObserver useEffect *after* filteredSorted is declared.
 *
 * - TailwindCSS + shadcn/ui (Card, Table, Button, Input, Checkbox, Select, Popover, Tooltip, Slider)
 * - Client-only: sorting, filters, presets, column visibility, infinite/pagination, CSV/PNG export
 * - Freemium: CSV/PNG = free; XLSX/PDF = locked (🔒)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search as SearchIcon,
  Info as InfoIcon,
  SlidersHorizontal,
  FileSpreadsheet,
  Lock,
  Image as ImageIcon,
  Eye,
  ClipboardList,
  Rocket,
} from "lucide-react";
import DemoDrawerHeaderPage from "./drawer/DemoDrawerHeaderPage"
/* ───────────────────────── Design Tokens (CSS vars with fallbacks) ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "var(--wr-action, #0077FF)",
  pastelBlue: "var(--wr-pastelBrand, #D9EEF8)",
  ok: "var(--wr-success, #10B981)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-danger, #EF4444)",
  radius: "var(--wr-radius, 6px)",
  cardBg: "var(--wr-card-bg, #FFFFFF)",
};

/* ───────────────────────── Types & Column Model ───────────────────────── */
type SortDir = "asc" | "desc" | null;
type SourceTag = "GA4" | "GSC" | "Internal" | "CMS" | "All";

type ColumnKey =
  | "select"
  | "url"
  | "impressions"
  | "organicClicks"
  | "organicCtr"
  | "sessions"
  | "gapPct"
  | "lastUpdated"
  | "actions";

export type UnderperfRow = {
  id: string;
  url: string;
  title?: string;
  impressions: number; // GSC
  organicClicks: number; // GSC
  organicCtr: number; // % (0..100) GSC
  sessions: number; // GA4
  lastUpdated?: string; // CMS ISO
};

const COL_W: Record<ColumnKey, number> = {
  select: 44,
  url: 360,
  impressions: 140,
  organicClicks: 140,
  organicCtr: 110,
  sessions: 120,
  gapPct: 110,
  lastUpdated: 150,
  actions: 150,
};

const HEADER_META: Record<ColumnKey, { label: string; tooltip?: string; src: SourceTag }> = {
  select: { label: "", src: "Internal" },
  url: { label: "Page URL / Title", tooltip: "Open Page Analyzer drawer.", src: "All" },
  impressions: { label: "Impressions", tooltip: "GSC: Organic impressions.", src: "GSC" },
  organicClicks: { label: "Organic Clicks", tooltip: "GSC: Total clicks.", src: "GSC" },
  organicCtr: { label: "CTR", tooltip: "GSC: Clicks ÷ Impressions.", src: "GSC" },
  sessions: { label: "Sessions", tooltip: "GA4: Sessions for this landing page.", src: "GA4" },
  gapPct: {
    label: "Gap %",
    tooltip: "Traffic Opportunity Gap = (1 − Sessions ÷ Clicks) × 100.",
    src: "Internal",
  },
  lastUpdated: { label: "Last Updated", tooltip: "From CMS; helps judge freshness.", src: "CMS" },
  actions: { label: "Actions", tooltip: "Analyze / Create Task / Optimize", src: "Internal" },
};

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  select: true,
  url: true,
  impressions: true,
  organicClicks: true,
  organicCtr: true,
  sessions: true,
  gapPct: true,
  lastUpdated: true,
  actions: true,
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = new Intl.NumberFormat("en-US");
const pf = (n: number, dp = 1) => `${n.toFixed(dp)}%`;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function toAgo(iso?: string) {
  if (!iso) return "Unknown";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "Unknown";
  const d = Math.floor((Date.now() - then) / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  return mo === 1 ? "1 month ago" : `${mo} months ago`;
}

function freshnessBadge(iso?: string) {
  if (!iso) return { label: "Unknown", bg: "#F3F4F6", fg: "#374151" };
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days <= 30) return { label: "Fresh", bg: "#D1FAE5", fg: "#065F46" };
  if (days <= 90) return { label: "Aging", bg: "#FEF3C7", fg: "#92400E" };
  return { label: "Stale", bg: "#FEE2E2", fg: "#991B1B" };
}

function computeGapPct(clicks: number, sessions: number): number | null {
  if (clicks <= 0) return null;
  const raw = (1 - sessions / clicks) * 100;
  return clamp(raw, -100, 100);
}

/* CSV (free) */
function exportRowsToCSV(filename: string, cols: ColumnKey[], rows: UnderperfRow[]) {
  const head = cols.filter((c) => c !== "select" && c !== "actions").map((c) => HEADER_META[c].label);
  const map = (r: UnderperfRow, c: ColumnKey): string | number => {
    switch (c) {
      case "url":
        return r.url + (r.title ? ` (${r.title})` : "");
      case "impressions":
        return r.impressions;
      case "organicClicks":
        return r.organicClicks;
      case "organicCtr":
        return r.organicCtr;
      case "sessions":
        return r.sessions;
      case "gapPct":
        return computeGapPct(r.organicClicks, r.sessions) ?? "";
      case "lastUpdated":
        return r.lastUpdated ? new Date(r.lastUpdated).toISOString() : "";
      default:
        return "";
    }
  };
  const body = rows
    .map((r) =>
      cols
        .filter((c) => c !== "select" && c !== "actions")
        .map((c) => String(map(r, c)).replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(","),
    )
    .join("\n");
  const csv = [head.join(","), body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* PNG (free) — lightweight canvas table render */
async function exportRowsToPNG(filename: string, cols: ColumnKey[], rows: UnderperfRow[]) {
  const visible = cols.filter((c) => c !== "select" && c !== "actions");
  const padX = 16,
    rowH = 32,
    headerH = 40,
    footerH = 24;
  const maxRows = Math.min(rows.length, 100);
  const widths = visible.map(() => 180);
  if (visible[0] === "url") widths[0] = 320;
  const totalW = widths.reduce((a, b) => a + b, 0) + padX * 2;
  const totalH = headerH + maxRows * rowH + footerH;

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(totalW * scale);
  canvas.height = Math.floor(totalH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, totalW, totalH);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 14px Inter, ui-sans-serif";
  let x = padX,
    y = 24;
  visible.forEach((c, i) => {
    ctx.fillText(HEADER_META[c].label, x, y);
    x += widths[i];
  });

  ctx.font = "13px Inter, ui-sans-serif";
  rows.slice(0, maxRows).forEach((r, idx) => {
    const yBase = headerH + idx * rowH;
    ctx.fillStyle = idx % 2 ? "#FAFAFA" : "#FFFFFF";
    ctx.fillRect(0, yBase, totalW, rowH);
    x = padX;
    ctx.fillStyle = "#111827";
    visible.forEach((c, i) => {
      let text = "";
      switch (c) {
        case "url":
          text = r.url + (r.title ? ` — ${r.title}` : "");
          break;
        case "impressions":
          text = nf.format(r.impressions);
          break;
        case "organicClicks":
          text = nf.format(r.organicClicks);
          break;
        case "organicCtr":
          text = pf(r.organicCtr, 1);
          break;
        case "sessions":
          text = nf.format(r.sessions);
          break;
        case "gapPct": {
          const gp = computeGapPct(r.organicClicks, r.sessions);
          text = gp === null ? "—" : pf(gp, 1);
          break;
        }
        case "lastUpdated":
          text = toAgo(r.lastUpdated);
          break;
      }
      ctx.fillText(text, x, yBase + 20);
      x += widths[i];
    });
    ctx.strokeStyle = "#E5E7EB";
    ctx.beginPath();
    ctx.moveTo(0, yBase + rowH + 0.5);
    ctx.lineTo(totalW, yBase + rowH + 0.5);
    ctx.stroke();
  });

  ctx.fillStyle = "#6B7280";
  ctx.font = "12px Inter, ui-sans-serif";
  ctx.fillText(`Exported ${Math.min(maxRows, rows.length)} of ${rows.length} rows · Wranker`, padX, totalH - 8);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, "image/png");
}
/* ───────────────────────── Small Atoms ───────────────────────── */
const SourceChip: React.FC<{ src: SourceTag }> = ({ src }) => {
  const cls =
    src === "GA4"
      ? { bg: TK.pastelBlue, fg: TK.valueBlue }
      : src === "GSC"
      ? { bg: "#D1FAE5", fg: "#065F46" }
      : src === "CMS"
      ? { bg: "#F3F4F6", fg: "#374151" }
      : src === "All"
      ? { bg: "#EEF2FF", fg: "#3730A3" }
      : { bg: "#F3F4F6", fg: "#374151" };
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: cls.bg, color: cls.fg, border: `1px solid ${TK.borderLight}` }}
    >
      {src}
    </span>
  );
};

const Pill: React.FC<{ tone: "neutral" | "warn" | "bad" | "ok"; children: React.ReactNode }> = ({ tone, children }) => {
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: "#F3F4F6", fg: "#374151" },
    warn: { bg: "#FEF3C7", fg: "#92400E" },
    bad: { bg: "#FEE2E2", fg: "#991B1B" },
    ok: { bg: "#D1FAE5", fg: "#065F46" },
  };
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
      style={{ background: map[tone].bg, color: map[tone].fg, border: `1px solid ${TK.borderLight}` }}
    >
      {children}
    </span>
  );
};

const Sticky = (leftPx: number): React.CSSProperties => ({
  position: "sticky",
  left: leftPx,
  zIndex: 30,
  background: "#fff",
  boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
});

/* ───────────────────────── Drawer & Forms ───────────────────────── */
const Drawer: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode }> = ({
  open,
  title,
  onClose,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[400px] max-w-[92vw] overflow-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: TK.borderLight }}>
          <div className="text-base font-semibold">{title}</div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </aside>
    </div>
  );
};

const KPI: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
    <div className="text-xs" style={{ color: TK.muted }}>
      {label}
    </div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

const TaskForm: React.FC<{
  defaultTitle: string;
  defaultUrl: string;
  onSubmit: () => void;
}> = ({ defaultTitle, defaultUrl, onSubmit }) => {
  const [title, setTitle] = useState(defaultTitle);
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <div className="mb-1 text-xs" style={{ color: TK.muted }}>
          Project Name <span className="text-red-500">*</span>
        </div>
        <Input value={project} onChange={(e) => setProject(e.target.value)} required placeholder="Select/enter project…" />
      </div>

      <div>
        <div className="mb-1 text-xs" style={{ color: TK.muted }}>
          Task Title
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <div className="mb-1 text-xs" style={{ color: TK.muted }}>
          Page URL
        </div>
        <Input value={defaultUrl} readOnly className="bg-gray-50" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-xs" style={{ color: TK.muted }}>
            Priority
          </div>
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-1 text-xs" style={{ color: TK.muted }}>
            Due
          </div>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs" style={{ color: TK.muted }}>
            Notes
        </div>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          style={{ borderColor: TK.border }}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Context, hypothesis, acceptance criteria…"
        />
      </div>

      <div>
        <div className="mb-1 text-xs" style={{ color: TK.muted }}>
          Internal Notes (private)
        </div>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          style={{ borderColor: TK.border }}
          rows={3}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Internal-only instructions…"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => alert("Draft saved (demo)")}>
          Save Draft
        </Button>
        <Button type="submit" style={{ background: TK.brand, color: "#fff" }}>
          Create Task
        </Button>
      </div>
    </form>
  );
};

/* ───────────────────────── Section Component ───────────────────────── */
export default function Section33({ rows: propRows }: { rows?: UnderperfRow[] }) {
  /* Data */
  const [rows] = useState<UnderperfRow[]>(() => propRows ?? []);

  /* Filters */
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<"high-gap" | "low-ctr" | "all">("all");
  const [gapThreshold, setGapThreshold] = useState<number>(0);
  const [sourceFilter, setSourceFilter] = useState<"All" | "GA4" | "GSC">("All");

  /* Column visibility (auto-sync with source filter) */
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({ ...DEFAULT_VISIBLE });
  useEffect(() => {
    setVisible((prev) => {
      const next = { ...prev };
      // Always-show guard
      const guard = (k: ColumnKey) => ["select", "url", "gapPct", "lastUpdated", "actions"].includes(k);
      if (sourceFilter === "GA4") {
        next.sessions = true;
        next.impressions = false;
        next.organicClicks = false;
        next.organicCtr = false;
      } else if (sourceFilter === "GSC") {
        next.sessions = false;
        next.impressions = true;
        next.organicClicks = true;
        next.organicCtr = true;
      } else {
        (Object.keys(next) as ColumnKey[]).forEach((k) => (next[k] = true));
      }
      (Object.keys(next) as ColumnKey[]).forEach((k) => {
        if (guard(k)) next[k] = true;
      });
      return next;
    });
  }, [sourceFilter]);

  /* Sorting */
  const [sortKey, setSortKey] = useState<ColumnKey>("gapPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const toggleSort = (k: ColumnKey) => {
    if (["select", "actions"].includes(k)) return;
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : d === "asc" ? null : "desc"));
    }
  };

  /* Infinite vs pagination */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(40);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* ─ Filter + sort pipeline (declare BEFORE effects that depend on it) ─ */
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    let filtered = rows.filter((r) => {
      const matchesQ =
        !q ||
        r.url.toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        r.url.replace(/^https?:\/\//, "").toLowerCase().includes(q);
      if (!matchesQ) return false;

      const gap = computeGapPct(r.organicClicks, r.sessions);
      if (preset === "high-gap") return gap !== null && gap >= gapThreshold;
      if (preset === "low-ctr") return r.impressions > 1000 && r.organicCtr < 3;
      return true;
    });

    const getter = (r: UnderperfRow): any => {
      switch (sortKey) {
        case "url":
          return r.url;
        case "impressions":
          return r.impressions;
        case "organicClicks":
          return r.organicClicks;
        case "organicCtr":
          return r.organicCtr;
        case "sessions":
          return r.sessions;
        case "gapPct":
          return computeGapPct(r.organicClicks, r.sessions) ?? -Infinity;
        case "lastUpdated":
          return r.lastUpdated ? new Date(r.lastUpdated).getTime() : -Infinity;
        default:
          return 0;
      }
    };

    if (sortDir) {
      filtered = [...filtered].sort((a, b) => {
        const A = getter(a);
        const B = getter(b);
        if (typeof A === "string" && typeof B === "string") {
          return sortDir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
        }
        return sortDir === "asc" ? (A as number) - (B as number) : (B as number) - (A as number);
      });
    }

    return filtered;
  }, [rows, query, preset, gapThreshold, sortKey, sortDir]);

  const windowedRows = useMemo(() => {
    if (infinite) return filteredSorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, infinite, visibleCount, page, pageSize]);

  /* Infinite observer (now safely declared AFTER filteredSorted) */
  useEffect(() => {
    if (!infinite || !sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((v) => Math.min(filteredSorted.length, v + 40));
      }
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [infinite, filteredSorted.length]); // dependency is safe now

  /* Selection (page-scope) */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const pageIds = windowedRows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);

  /* Drawer */
  const [drawerRow, setDrawerRow] = useState<UnderperfRow | null>(null);

  const visibleColumns = useMemo(
    () => (Object.keys(visible) as ColumnKey[]).filter((k) => visible[k]),
    [visible],
  );

  const topGapIds = useMemo(() => {
    const ids = filteredSorted
      .filter((r) => r.organicClicks >= 100 && r.impressions >= 1000)
      .map((r) => ({ id: r.id, gap: computeGapPct(r.organicClicks, r.sessions) ?? -Infinity }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 5)
      .map((o) => o.id);
    return new Set(ids);
  }, [filteredSorted]);

  const resetAll = () => {
    setQuery("");
    setPreset("all");
    setGapThreshold(0);
    setSourceFilter("All");
    setSortKey("gapPct");
    setSortDir("desc");
    setVisible({ ...DEFAULT_VISIBLE });
    setInfinite(true);
    setVisibleCount(40);
    setPage(1);
    setPageSize(25);
    setSelected({});
  };

  /* Locked export popover */
  const [lockOpen, setLockOpen] = useState(false);
  const lockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!lockRef.current) return;
      if (!lockRef.current.contains(e.target as Node)) setLockOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
                      const [drawerRoww, setDrawerRoww] = useState(false);
                        const openDrawer = () => {
    setDrawerRoww(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRoww(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }
  return (
    <>
      <section className="space-y-3">
        <Card className="border " style={{ borderColor: TK.border, borderRadius: TK.radius }}>
          {/* Header */}
          <CardHeader
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderBottom: `1px solid ${TK.borderLight}` }}
          >
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Pages with High Clicks, Low Sessions</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Identify pages where GA4 sessions lag behind GSC clicks. Check tracking, redirects, or UX.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Infinite toggle */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Infinite</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--wr-brand,#008CCD)]"
                  checked={infinite}
                  onChange={(e) => {
                    setInfinite(e.target.checked);
                    if (e.target.checked) setVisibleCount(40);
                  }}
                />
              </div>

              {/* Source toggle */}
              <div className="hidden md:flex items-center rounded border overflow-hidden" style={{ borderColor: TK.border }}>
                {(["All", "GA4", "GSC"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSourceFilter(t)}
                    className={`h-8 px-3 text-sm ${sourceFilter === t ? "font-semibold" : ""}`}
                    style={{ background: sourceFilter === t ? TK.pastelBlue : "#fff", color: sourceFilter === t ? TK.valueBlue : TK.text }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Columns manager */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                    <SlidersHorizontal className="h-4 w-4" /> Columns
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                    {(Object.keys(DEFAULT_VISIBLE) as ColumnKey[]).map((k) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          disabled={["select", "url", "gapPct", "lastUpdated", "actions"].includes(k)}
                          checked={visible[k]}
                          onCheckedChange={(v) => setVisible((s) => ({ ...s, [k]: Boolean(v) }))}
                        />
                        <span>{HEADER_META[k].label || k}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisible({ ...DEFAULT_VISIBLE })}
                    >
                      Reset
                    </Button>
                    <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Export */}
              <div className="relative" ref={lockRef}>
                <Button
                  variant="outline"
                  className="h-8 px-3"
                  onClick={() =>
                    exportRowsToCSV(
                      "section-3.3-high-impr-low-sessions.csv",
                      visibleColumns,
                      filteredSorted,
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" /> CSV
                </Button>
                <Button
                  variant="outline"
                  className="h-8 px-3"
                  onClick={() =>
                    exportRowsToPNG(
                      "section-3.3-high-impr-low-sessions.png",
                      visibleColumns,
                      filteredSorted,
                    )
                  }
                >
                  <ImageIcon className="h-4 w-4 mr-2" /> PNG
                </Button>
                <button
                  className="h-8 px-3 ml-1 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
                  onClick={() => setLockOpen((o) => !o)}
                  aria-haspopup="dialog"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  XLSX/PDF
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {lockOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded border bg-white p-3 text-sm shadow"
                    style={{ borderColor: TK.border }}
                  >
                    <div className="font-medium mb-1">Upgrade to Pro</div>
                    <p className="text-muted-foreground mb-2">
                      XLSX and PDF exports are available on Pro plans.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>
                        View Plans
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setLockOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reset demo */}
              <Button variant="outline" className="h-8 px-3" onClick={resetAll}>
                Reset
              </Button>
            </div>
          </CardHeader>

          {/* Filters Row */}
          <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-[300px] pl-7"
                  placeholder="Search by URL or title…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (!infinite) setPage(1);
                  }}
                />
              </div>

              {/* Preset */}
              <Select
                value={preset}
                onValueChange={(v: "high-gap" | "low-ctr" | "all") => {
                  setPreset(v);
                  if (!infinite) setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[200px]">
                  <SelectValue placeholder="Preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-gap">High Gap (≥ threshold)</SelectItem>
                  <SelectItem value="low-ctr">Low CTR Pages</SelectItem>
                  <SelectItem value="all">All Pages</SelectItem>
                </SelectContent>
              </Select>

              {/* Gap threshold */}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-muted-foreground">Gap ≥</span>
                <div className="w-[160px]">
                  <Slider
                    value={[gapThreshold]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      setGapThreshold((v as number[])[0]);
                      if (!infinite) setPage(1);
                    }}
                  />
                </div>
                <span className="text-sm w-12 text-right">{gapThreshold}%</span>
              </div>

              {/* Pagination controls (when infinite OFF) */}
              {!infinite && (
                <div className="ml-auto flex items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v: any) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 px-3 w-[120px]">
                      <SelectValue placeholder="Rows / page" />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(1)}>
                    First
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <div className="text-sm w-16 text-center">{page}</div>
                  <Button
                    variant="outline"
                    className="h-8 px-3"
                    disabled={page * pageSize >= filteredSorted.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3"
                    disabled={page * pageSize >= filteredSorted.length}
                    onClick={() => setPage(Math.ceil(filteredSorted.length / pageSize))}
                  >
                    Last
                  </Button>
                </div>
              )}

              {/* Bulk bar */}
              {selectedIds.length > 0 && (
                <div
                  className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2"
                  style={{ borderColor: TK.borderLight }}
                >
                  <span className="text-sm">
                    <strong>{selectedIds.length}</strong> selected
                  </span>
                  <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => alert(`Create ${selectedIds.length} optimization tasks (demo)`)}
                  >
                    Create Tasks
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportRowsToCSV(
                        "section-3.3-selected.csv",
                        visibleColumns,
                        rows.filter((r) => selectedIds.includes(r.id)),
                      )
                    }
                  >
                    Export Selection
                  </Button>
                  <div className="ml-auto">
                    <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          {/* Table */}
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
              <Table className="text-sm">
                <TableHeader className="bg-white sticky top-0 z-40">
                  <TableRow>
                    {visible.select && (
                      <TableHead style={{ minWidth: COL_W.select, width: COL_W.select, ...Sticky(0) }}>
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={() => {
                            const checked = !allOnPageSelected;
                            setSelected((prev) => {
                              const next = { ...prev };
                              pageIds.forEach((id) => (next[id] = checked));
                              return next;
                            });
                          }}
                        />
                      </TableHead>
                    )}

                    {visible.url && (
                      <HeaderCell
                        colKey="url"
                        left={visible.select ? COL_W.select : 0}
                        width={COL_W.url}
                        label={HEADER_META.url.label}
                        tooltip={HEADER_META.url.tooltip}
                        src="All"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.impressions && (
                      <HeaderCell
                        colKey="impressions"
                        width={COL_W.impressions}
                        label={HEADER_META.impressions.label}
                        tooltip={HEADER_META.impressions.tooltip}
                        src="GSC"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.organicClicks && (
                      <HeaderCell
                        colKey="organicClicks"
                        width={COL_W.organicClicks}
                        label={HEADER_META.organicClicks.label}
                        tooltip={HEADER_META.organicClicks.tooltip}
                        src="GSC"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.organicCtr && (
                      <HeaderCell
                        colKey="organicCtr"
                        width={COL_W.organicCtr}
                        label={HEADER_META.organicCtr.label}
                        tooltip={HEADER_META.organicCtr.tooltip}
                        src="GSC"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.sessions && (
                      <HeaderCell
                        colKey="sessions"
                        width={COL_W.sessions}
                        label={HEADER_META.sessions.label}
                        tooltip={HEADER_META.sessions.tooltip}
                        src="GA4"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.gapPct && (
                      <HeaderCell
                        colKey="gapPct"
                        width={COL_W.gapPct}
                        label={HEADER_META.gapPct.label}
                        tooltip={HEADER_META.gapPct.tooltip}
                        src="Internal"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.lastUpdated && (
                      <HeaderCell
                        colKey="lastUpdated"
                        width={COL_W.lastUpdated}
                        label={HEADER_META.lastUpdated.label}
                        tooltip={HEADER_META.lastUpdated.tooltip}
                        src="CMS"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                    )}

                    {visible.actions && (
                      <TableHead style={{ minWidth: COL_W.actions, width: COL_W.actions }} className="text-center">
                        {HEADER_META.actions.label}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {windowedRows.map((r) => {

                    const gap = computeGapPct(r.organicClicks, r.sessions);
                    const isTop = topGapIds.has(r.id) && (gap ?? -Infinity) >= 60;
                    const rowBg = isTop ? (gap! > 80 ? "bg-red-50" : "bg-amber-50") : "";
                    const lowCTR = r.impressions > 1000 && r.organicCtr < 3;
                    const anomaly = (gap ?? 0) < 0; // Sessions > Clicks
                    const recency = freshnessBadge(r.lastUpdated);

                    return (
                      <TableRow key={r.id} className={`hover:bg-[#F8FAFC] ${rowBg}`}>
                        {visible.select && (
                          <TableCell style={{ ...Sticky(0), minWidth: COL_W.select, width: COL_W.select }}>
                            <Checkbox
                              checked={!!selected[r.id]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
                            />
                          </TableCell>
                        )}

                        {visible.url && (
                          <TableCell
                            style={{
                              ...Sticky(visible.select ? COL_W.select : 0),
                              minWidth: COL_W.url,
                              width: COL_W.url,
                            }}
                          >
                            <div className="max-w-[460px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      className="font-medium underline cursor-pointer"
                                      style={{ color: TK.valueBlue }}
                                      // onClick={() => setDrawerRow(r)}
                                      onClick={openDrawer}
                                    >
                                      {r.title ?? r.url}
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[380px]">{r.url}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {r.organicClicks <= 0 && <Pill tone="neutral">No Clicks Yet</Pill>}
                                {lowCTR && <Pill tone="warn">Low CTR</Pill>}
                                {gap !== null && gap >= gapThreshold && <Pill tone="bad">High Opportunity</Pill>}
                                {anomaly && <Pill tone="neutral">Tracking Anomaly</Pill>}
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visible.impressions && (
                          <TableCell>
                            <div className="flex items-center">
                              <span>{nf.format(r.impressions)}</span>
                              <SourceChip src="GSC" />
                            </div>
                          </TableCell>
                        )}

                        {visible.organicClicks && (
                          <TableCell>
                            <div className="flex items-center">
                              <span className="font-medium">{nf.format(r.organicClicks)}</span>
                              <SourceChip src="GSC" />
                            </div>
                          </TableCell>
                        )}

                        {visible.organicCtr && (
                          <TableCell>
                            <span
                              className={`rounded px-2 py-0.5 ${
                                lowCTR ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-700"
                              }`}
                              title="GSC: Clicks ÷ Impressions"
                            >
                              {pf(r.organicCtr, 1)}
                            </span>
                          </TableCell>
                        )}

                        {visible.sessions && (
                          <TableCell>
                            <div className="flex items-center">
                              <span>{nf.format(r.sessions)}</span>
                              <SourceChip src="GA4" />
                            </div>
                          </TableCell>
                        )}

                        {visible.gapPct && (
                          <TableCell title={HEADER_META.gapPct.tooltip}>
                            {gap === null ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={`rounded px-2 py-0.5 ${
                                  gap >= 80
                                    ? "bg-red-100 text-red-700"
                                    : gap >= 60
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-50 text-slate-700"
                                }`}
                              >
                                {pf(gap, 1)}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {visible.lastUpdated && (
                          <TableCell>
                            <span
                              className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
                              style={{
                                background: recency.bg,
                                color: recency.fg,
                                border: `1px solid ${TK.borderLight}`,
                              }}
                            >
                              {toAgo(r.lastUpdated)}
                            </span>
                          </TableCell>
                        )}

                        {visible.actions && (
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5 opacity-60 hover:opacity-100 transition">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-[#4286F5]"
                                      aria-label="Open Analyzer"
                                      // onClick={() => setDrawerRow(r)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open Page Analyzer</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-[#4286F5]"
                                      aria-label="Create Task"
                                      // onClick={() => setDrawerRow(r)}
                                    >
                                      <ClipboardList className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Create Task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      aria-label="Optimize Page"
                                      onClick={() => alert("Open Optimizer (demo)")}
                                    >
                                      <Rocket className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Optimize Page</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {infinite && <div ref={sentinelRef} className="h-8" />}
            </div>
          </CardContent>

          {/* Footer (infinite) */}
          {infinite && (
            <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
              <div className="text-sm text-muted-foreground">
                Loaded {windowedRows.length} of {filteredSorted.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-3"
                  onClick={() => setVisibleCount((v) => Math.min(filteredSorted.length, v + 60))}
                >
                  Load more
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Drawer: Analyzer + Task */}
      {/* <Drawer open={!!drawerRow} title="Page Analyzer" onClose={() => setDrawerRow(null)}>
        {drawerRow && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold">{drawerRow.title ?? drawerRow.url}</div>
              <div className="text-muted-foreground">{drawerRow.url}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <KPI label="Impressions (GSC)" value={nf.format(drawerRow.impressions)} />
              <KPI label="Clicks (GSC)" value={nf.format(drawerRow.organicClicks)} />
              <KPI label="CTR (GSC)" value={pf(drawerRow.organicCtr, 1)} />
              <KPI label="Sessions (GA4)" value={nf.format(drawerRow.sessions)} />
              <KPI
                label="Gap %"
                value={
                  (() => {
                    const g = computeGapPct(drawerRow.organicClicks, drawerRow.sessions);
                    return g === null ? "—" : pf(g, 1);
                  })()
                }
              />
              <KPI label="Last Updated" value={drawerRow.lastUpdated ? new Date(drawerRow.lastUpdated).toLocaleDateString() : "Unknown"} />
            </div>

            <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
              <div className="mb-1 text-sm font-semibold">Why this is flagged</div>
              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                <li>High impressions but sessions lag behind clicks (Gap).</li>
                <li>Check snippet quality if CTR is low (&lt; 3%).</li>
                <li>Check tracking/redirects if Gap is very high (&gt; 80%).</li>
              </ul>
            </div>

            <div className="pt-1">
              <div className="mb-2 font-medium">Create Task</div>
              <TaskForm
                defaultTitle={`Optimize: ${drawerRow.title ?? drawerRow.url}`}
                defaultUrl={drawerRow.url}
                onSubmit={() => {
                  alert("Task created (demo) — wire to backend");
                  setDrawerRow(null);
                }}
              />
            </div>
          </div>
        )}
      </Drawer> */}
    </>
  );
}

/* ───────────────────────── Header Cell (sortable + tooltip + source chip) ───────────────────────── */
function HeaderCell(props: {
  colKey: ColumnKey;
  width: number;
  label: string;
  tooltip?: string;
  src: SourceTag;
  sortKey: ColumnKey;
  sortDir: SortDir;
  onSort: (k: ColumnKey) => void;
  left?: number;
}) {
  const isActive = props.sortKey === props.colKey;
  const leftStyle = typeof props.left === "number" ? Sticky(props.left) : undefined;
  return (
    <TableHead
      style={{ minWidth: props.width, width: props.width, ...(leftStyle || {}) }}
      className="whitespace-nowrap"
    >
      <span className="relative group">
        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => props.onSort(props.colKey)}>
          <span>{props.label}</span>
          <SourceChip src={props.src} />
          {isActive ? (props.sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : props.sortDir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {props.tooltip && (
          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
            {props.tooltip}
          </span>
        )}
      </span>
    </TableHead>
  );
}


