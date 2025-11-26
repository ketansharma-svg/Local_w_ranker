"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Download, Search, Info as InfoIcon,
  Eye, ClipboardList, Wrench, Rocket, FileSpreadsheet, Lock,
} from "lucide-react";
import DemoDrawerHeaderPage from "./drawer/DemoDrawerHeaderPage";
/** ─────────────────────────────────────────────────────────────────────────────
 *  Wranker · Analytics · Section 3.4 — Drop‑offs Before Conversion (Redesigned)
 *  - Follows the UI shell and micro‑interactions from the reference (Section 3.3).
 *  - Tailwind + shadcn/ui + lucide-react.
 *  - Client-side only: sorting, filtering, column visibility, selection,
 *    infinite scroll/pagination, CSV/PNG export (free), XLSX/PDF (🔒 Pro).
 *  - Includes Step Analyzer Drawer + inline row expander.
 *  - Safe to drop in; no external data dependencies (mock generator included).
 *  ──────────────────────────────────────────────────────────────────────────── */

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
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────── Types ───────────────────────── */
type SourceTag = "GA4" | "GSC" | "CMS" | "Internal" | "All";
type StepStage =
  | "Landing"
  | "Category"
  | "Product"
  | "Cart"
  | "Checkout"
  | "Payment"
  | "Review"
  | "ThankYou";

export type LeakRow = {
  id: string;
  step: string;
  url?: string;
  stage: StepStage;
  entrants: number;
  progressed: number;
  avgTimeToNextSec: number;
  issueHints?: string[];
};

type SortDir = "asc" | "desc";
type Preset = "top" | "checkout" | "all";

type ColKey =
  | "select"
  | "expander"
  | "step"
  | "entrants"
  | "progressed"
  | "advanceRate"
  | "dropOffs"
  | "dropOffRate"
  | "avgTimeToNext"
  | "issues"
  | "actions";

type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sticky?: boolean;
  source?: SourceTag;
};

/* ───────────────────────── Column Model & Descriptions ───────────────────────── */

const COLS: ColDef[] = [
  { key: "select", label: "", width: 44, align: "center", sticky: true },
  { key: "expander", label: "", width: 44, align: "center", sticky: true },
  { key: "step", label: "Step / Page", width: 340, sortable: true, sticky: true, source: "All" },
  { key: "entrants", label: "Entrants", width: 120, sortable: true, align: "right", source: "GA4" },
  { key: "progressed", label: "Progressed", width: 130, sortable: true, align: "right", source: "GA4" },
  { key: "advanceRate", label: "Advance %", width: 120, sortable: true, align: "right", source: "Internal" },
  { key: "dropOffs", label: "Drop‑offs", width: 120, sortable: true, align: "right", source: "Internal" },
  { key: "dropOffRate", label: "Drop‑off %", width: 120, sortable: true, align: "right", source: "Internal" },
  { key: "avgTimeToNext", label: "Avg Time → Next", width: 150, sortable: true, align: "center", source: "GA4" },
  { key: "issues", label: "Issues", width: 260, source: "Internal" },
  { key: "actions", label: "Actions", width: 140, source: "Internal" },
];

const columnDescriptions: Record<ColKey, string> = {
  select: "Select rows for bulk actions.",
  expander: "Expand to view details and quick actions.",
  step: "Click to open Step Analyzer.",
  entrants: "Users/Sessions who reached this step (GA4).",
  progressed: "Users/Sessions who advanced to the next step (GA4).",
  advanceRate: "Advance Rate = Progressed ÷ Entrants.",
  dropOffs: "Entrants who did not advance to the next step.",
  dropOffRate: "Drop‑off Rate = (1 − Progressed ÷ Entrants) × 100.",
  avgTimeToNext: "Average time (mm:ss) taken to reach the next step (GA4).",
  issues: "Auto‑detected hints from behavior patterns.",
  actions: "View Analyzer / Create Task / Optimize Step",
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pf = (n: number, dp = 1) => `${n.toFixed(dp)}%`;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const secsToMmss = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};
const computeAdvanceRate = (entrants: number, progressed: number): number | null => {
  if (entrants <= 0) return null;
  const raw = (progressed / entrants) * 100;
  return clamp(raw, 0, 100);
};
const computeDropOffs = (entrants: number, progressed: number): number | null => {
  if (entrants < 0 || progressed < 0) return null;
  return Math.max(0, entrants - progressed);
};
const computeDropOffRate = (entrants: number, progressed: number): number | null => {
  if (entrants <= 0) return null;
  const raw = (1 - progressed / entrants) * 100;
  return clamp(raw, 0, 100);
};

const timeTone = (secs: number) =>
  secs <= 30 ? { label: "Fast", bg: "rgba(16,185,129,0.12)", fg: TK.ok } // emerald-ish
    : secs <= 60 ? { label: "OK", bg: "#F1F5F9", fg: "#374151" } // slate-ish
      : { label: "Slow", bg: "rgba(245,158,11,0.15)", fg: TK.warn };

/* ───────────────────────── Export Helpers ───────────────────────── */

/** CSV (free) */
function exportRowsToCSV(filename: string, cols: ColKey[], rows: LeakRow[]) {
  const usable = cols.filter((c) => !["select", "expander", "actions"].includes(c));
  const headers = usable.map((c) => COLS.find(k => k.key === c)?.label ?? c);

  const map = (r: LeakRow, c: ColKey): string | number => {
    switch (c) {
      case "step": return r.step + (r.url ? ` (${r.url})` : "");
      case "entrants": return r.entrants;
      case "progressed": return r.progressed;
      case "advanceRate": {
        const a = computeAdvanceRate(r.entrants, r.progressed);
        return a === null ? "" : a.toFixed(1);
      }
      case "dropOffs": {
        const d = computeDropOffs(r.entrants, r.progressed);
        return d === null ? "" : d;
      }
      case "dropOffRate": {
        const d = computeDropOffRate(r.entrants, r.progressed);
        return d === null ? "" : d.toFixed(1);
      }
      case "avgTimeToNext": return secsToMmss(r.avgTimeToNextSec);
      case "issues": return (r.issueHints ?? []).join(" | ");
      default: return "";
    }
  };

  const body = rows.map((r) =>
    usable.map((c) => JSON.stringify(String(map(r, c)))).join(","),
  ).join("\n");

  const csv = [headers.join(","), body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** PNG (free) — lightweight canvas table render */
async function exportRowsToPNG(filename: string, cols: ColKey[], rows: LeakRow[]) {
  const visible = cols.filter((c) => !["select", "expander", "actions"].includes(c));
  const padX = 16, rowH = 32, headerH = 40, footerH = 24;
  const maxRows = Math.min(rows.length, 100);
  const widths = visible.map((k) => {
    if (k === "step") return 320;
    if (k === "issues") return 240;
    return 140;
  });
  const totalW = widths.reduce((a, b) => a + b, 0) + padX * 2;
  const totalH = headerH + maxRows * rowH + footerH;

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(totalW * scale);
  canvas.height = Math.floor(totalH * scale);
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, totalW, totalH);
  ctx.fillStyle = "#111827"; ctx.font = "bold 14px Inter, ui-sans-serif";
  let x = padX, y = 24;
  visible.forEach((c, i) => {
    const label = COLS.find(k => k.key === c)?.label ?? c;
    ctx.fillText(label, x, y); x += widths[i];
  });

  ctx.font = "13px Inter, ui-sans-serif";
  rows.slice(0, maxRows).forEach((r, idx) => {
    const yBase = headerH + idx * rowH;
    ctx.fillStyle = idx % 2 ? "#FAFAFA" : "#FFFFFF";
    ctx.fillRect(0, yBase, totalW, rowH);
    x = padX; ctx.fillStyle = "#111827";
    visible.forEach((c, i) => {
      let text = "";
      switch (c) {
        case "step": text = r.step + (r.url ? ` — ${r.url}` : ""); break;
        case "entrants": text = nf(r.entrants); break;
        case "progressed": text = nf(r.progressed); break;
        case "advanceRate": {
          const a = computeAdvanceRate(r.entrants, r.progressed);
          text = a === null ? "—" : pf(a, 1);
          break;
        }
        case "dropOffs": {
          const d = computeDropOffs(r.entrants, r.progressed);
          text = d === null ? "—" : nf(d);
          break;
        }
        case "dropOffRate": {
          const d = computeDropOffRate(r.entrants, r.progressed);
          text = d === null ? "—" : pf(d, 1);
          break;
        }
        case "avgTimeToNext": text = secsToMmss(r.avgTimeToNextSec); break;
        case "issues": text = (r.issueHints ?? []).join(" • "); break;
      }
      ctx.fillText(text, x, yBase + 20); x += widths[i];
    });
    ctx.strokeStyle = "#E5E7EB";
    ctx.beginPath(); ctx.moveTo(0, yBase + rowH + 0.5); ctx.lineTo(totalW, yBase + rowH + 0.5); ctx.stroke();
  });

  ctx.fillStyle = "#6B7280"; ctx.font = "12px Inter, ui-sans-serif";
  ctx.fillText(`Exported ${Math.min(maxRows, rows.length)} of ${rows.length} rows · Wranker`, padX, totalH - 8);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

/* ───────────────────────── Mock data ───────────────────────── */
function mockLeakRows(n = 48): LeakRow[] {
  const steps: Array<Pick<LeakRow, "step" | "url" | "stage">> = [
    { step: "Landing Page", url: "/promo/summer", stage: "Landing" },
    { step: "Category Page", url: "/category/widgets", stage: "Category" },
    { step: "Product Page", url: "/products/widget-3000", stage: "Product" },
    { step: "Add to Cart", url: "/cart", stage: "Cart" },
    { step: "Begin Checkout", url: "/checkout", stage: "Checkout" },
    { step: "Shipping Details", url: "/checkout/shipping", stage: "Checkout" },
    { step: "Payment", url: "/checkout/payment", stage: "Payment" },
    { step: "Review Order", url: "/checkout/review", stage: "Review" },
  ];
  const out: LeakRow[] = [];
  for (let i = 0; i < n; i++) {
    const s = steps[i % steps.length];
    const entrants = 600 + Math.floor(Math.random() * 24000);
    const band =
      s.stage === "Landing" || s.stage === "Category" ? [0.35, 0.75]
        : s.stage === "Product" ? [0.45, 0.85]
          : s.stage === "Cart" ? [0.40, 0.80]
            : s.stage === "Checkout" ? [0.35, 0.70]
              : s.stage === "Payment" ? [0.55, 0.95]
                : [0.50, 0.90];
    const advance = band[0] + Math.random() * (band[1] - band[0]);
    const progressed = Math.min(entrants, Math.max(0, Math.floor(entrants * advance)));
    const avgTimeToNextSec =
      (s.stage === "Checkout" || s.stage === "Payment")
        ? 35 + Math.floor(Math.random() * 90)
        : 15 + Math.floor(Math.random() * 60);

    const hints: string[] = [];
    const dor = computeDropOffRate(entrants, progressed) ?? 0;
    if (dor >= 70) hints.push("High friction");
    if (avgTimeToNextSec > 60) hints.push("Slow form");
    if (s.stage === "Payment" && dor >= 60) hints.push("Payment failures?");

    out.push({
      id: `leak_${i}`,
      step: s.step,
      url: s.url,
      stage: s.stage,
      entrants,
      progressed,
      avgTimeToNextSec,
      issueHints: Math.random() < 0.12 ? [] : hints,
    });
  }
  return out;
}

/* ───────────────────────── Micro UI ───────────────────────── */
const SourceChip: React.FC<{ src: SourceTag }> = ({ src }) => {
  const map: Record<SourceTag, React.CSSProperties> = {
    GA4: { background: TK.pastelBlue, color: TK.valueBlue, border: `1px solid ${TK.borderLight}` },
    GSC: { background: "#ECFDF5", color: "#047857", border: `1px solid ${TK.borderLight}` },
    CMS: { background: "#F3F4F6", color: "#374151", border: `1px solid ${TK.borderLight}` },
    Internal: { background: "#F5F5F5", color: "#374151", border: `1px solid ${TK.borderLight}` },
    All: { background: "#EEF2FF", color: "#4338CA", border: `1px solid ${TK.borderLight}` },
  };
  return (
    <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={map[src]}>{src}</span>
  );
};

const TonePill: React.FC<{ text: string; bg: string; fg: string }> = ({ text, bg, fg }) => (
  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
        style={{ background: bg, color: fg, border: `1px solid ${TK.borderLight}` }}>
    {text}
  </span>
);

/* ───────────────────────── Component ───────────────────────── */

export default function Analytics_Dropoffs_BeforeConversion() {
  /* Data */
  const [rows, setRows] = useState<LeakRow[]>(() => mockLeakRows());
  const [drawerRoww, setDrawerRoww] = useState(false);
  /* Filters */
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<Preset>("top");
  const [rateThreshold, setRateThreshold] = useState(55);
  const [sourceFilter, setSourceFilter] = useState<"All" | "GA4">("All");

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("dropOffRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const toggleSort = (key: ColKey) => {
    const col = COLS.find(c => c.key === key);
    if (!col?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("desc"); }
    else setSortDir(d => (d === "desc" ? "asc" : "desc"));
  };

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);

  /* Expanders */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true;
      return next;
    });
  };

  /* Analyzer Drawer */
  const [drawerRow, setDrawerRow] = useState<LeakRow | null>(null);

  /* Infinite vs pagination */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(40);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* Source filter ↔ column visibility sync (guards keep key cols visible) */
  useEffect(() => {
    setVisibleCols((prev) => {
      const next: Record<ColKey, boolean> = { ...prev };
      const guard = (k: ColKey) =>
        k === "select" || k === "expander" || k === "step" || k === "dropOffRate" || k === "actions";
      if (sourceFilter === "GA4") {
        next.entrants = true;
        next.progressed = true;
        next.avgTimeToNext = true;
        next.advanceRate = false;
        next.dropOffs = false;
        next.issues = false;
      } else {
        COLS.forEach((c) => (next[c.key] = true));
      }
      (Object.keys(next) as ColKey[]).forEach((k) => { if (guard(k)) next[k] = true; });
      return next;
    });
  }, [sourceFilter]);

  /* Filtering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(r.step.toLowerCase().includes(q) || (r.url ?? "").toLowerCase().includes(q) || r.stage.toLowerCase().includes(q))) return false;

      const dor = computeDropOffRate(r.entrants, r.progressed);
      const meets = dor === null ? false : dor >= rateThreshold;

      if (preset === "top" && !meets) return false;
      if (preset === "checkout" && !["Cart", "Checkout", "Payment", "Review"].includes(r.stage)) return false;

      return true;
    });
  }, [rows, query, preset, rateThreshold]);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getVal = (r: LeakRow): any => {
      switch (sortBy) {
        case "step": return r.step;
        case "entrants": return r.entrants;
        case "progressed": return r.progressed;
        case "advanceRate": return computeAdvanceRate(r.entrants, r.progressed) ?? -Infinity;
        case "dropOffs": return computeDropOffs(r.entrants, r.progressed) ?? -Infinity;
        case "dropOffRate": return computeDropOffRate(r.entrants, r.progressed) ?? -Infinity;
        case "avgTimeToNext": return r.avgTimeToNextSec;
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Window (infinite or pagination) */
  const windowedRows = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* Infinite observer */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("dropoffs-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount(v => Math.min(sorted.length, v + 40));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* Column visibility helpers */
  const VISIBLE = useMemo(() => COLS.filter(c => visibleCols[c.key] !== false), [visibleCols]);

  const stickyHeaderStyle = (c: ColDef) =>
    c.sticky
      ? { position: "sticky" as const, left: c.key === "select" ? 0 : c.key === "expander" ? 44 : 88, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : undefined;

  const stickyBodyStyle = (c: ColDef, bg: string) =>
    c.sticky
      ? { position: "sticky" as const, left: c.key === "select" ? 0 : c.key === "expander" ? 44 : 88, zIndex: 10, background: bg, boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : undefined;

  /* Page-scope selection */
  const pageIds = windowedRows.map(r => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected(prev => {
      const next = { ...prev };
      pageIds.forEach(id => { next[id] = checked; });
      return next;
    });
  };

  /* Top-5 leaks highlight */
  const topLeakIds = useMemo(() => {
    const eligible = sorted
      .filter((r) => r.entrants >= 500)
      .map((r) => ({ id: r.id, rate: computeDropOffRate(r.entrants, r.progressed) ?? -Infinity }))
      .sort((a, b) => (b.rate - a.rate))
      .slice(0, 5)
      .map((o) => o.id);
    return new Set(eligible);
  }, [sorted]);

  /* Exports */
  const visibleKeys = useMemo(() => VISIBLE.map(c => c.key), [VISIBLE]);
  const exportCSV = (onlySelected = false) => {
    const src = onlySelected ? sorted.filter(r => selected[r.id]) : sorted;
    exportRowsToCSV("dropoffs-before-conversion.csv", visibleKeys, src);
  };
  const exportPNG = (onlySelected = false) => {
    const src = onlySelected ? sorted.filter(r => selected[r.id]) : sorted;
    exportRowsToPNG("dropoffs-before-conversion.png", visibleKeys, src);
  };

  /* Locked export tooltip control (freemium) */
  const [lockOpen, setLockOpen] = useState(false);
  const lockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!lockRef.current) return;
      if (!lockRef.current.contains(e.target as Node)) setLockOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

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


  /* Expanded content */
  const renderExpanded = (r: LeakRow, dor: number | null, adv: number | null) => {
    const tt = timeTone(r.avgTimeToNextSec);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md border"
           style={{ borderColor: TK.borderLight, background: TK.appBg }}>
        <div className="space-y-2">
          <div className="text-sm font-medium">Step Summary</div>
          <div className="text-sm">
            <div className="font-semibold">{r.step}</div>
            <div className="text-xs" style={{ color: TK.muted }}>
              {r.url ?? "—"} • <span className="uppercase tracking-wide">{r.stage}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <MetricBox label="Entrants (GA4)" value={nf(r.entrants)} />
            <MetricBox label="Progressed (GA4)" value={nf(r.progressed)} />
            <MetricBox label="Avg Time → Next" value={secsToMmss(r.avgTimeToNextSec)} badge={<TonePill text={tt.label} bg={tt.bg} fg={tt.fg} />} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Performance</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <MetricBox label="Advance %" value={adv === null ? "—" : pf(adv, 1)} tone={adv !== null && adv < 40 ? "warn" : "muted"} />
            <MetricBox label="Drop‑off %" value={dor === null ? "—" : pf(dor, 1)} tone={dor !== null && dor >= 80 ? "critical" : dor !== null && dor >= 60 ? "warn" : "muted"} />
            <MetricBox label="Drop‑offs" value={(() => { const d = computeDropOffs(r.entrants, r.progressed); return d === null ? "—" : nf(d); })()} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: TK.muted }}>Issues / Hints</div>
            <div className="flex flex-wrap gap-1">
              {(r.issueHints && r.issueHints.length ? r.issueHints : ["—"]).map((h, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded border" style={{ borderColor: TK.borderLight }}>{h}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" style={{ background: TK.brand, color: "#fff" }} onClick={() => setDrawerRow(r)}>Open Step Analyzer</Button>
            <Button size="sm" variant="outline" onClick={() => setDrawerRow(r)}>Create Task</Button>
            <Button size="sm" variant="outline" onClick={() => alert("Open Optimizer (stub)")}>Optimize Step</Button>
          </div>
        </div>
      </div>
    );
  };

  /* Header action: Reset */
  const resetFilters = () => {
    setQuery("");
    setPreset("top");
    setRateThreshold(55);
    setSourceFilter("All");
    setSortBy("dropOffRate");
    setSortDir("desc");
    setPage(1);
    setVisibleCount(40);
    setVisibleCols(COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as any));
    setSelected({});
    setExpanded({});
  };

  return (
    <section className="space-y-3">
      <Card className="border" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header bar ─ */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Drop‑offs Before Conversion</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Find the steps where users exit before reaching conversion and prioritize fixes.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Infinite toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--wr-brand,#008CCD)]"
                checked={infinite}
                onChange={(e) => { setInfinite(e.target.checked); if (e.target.checked) setVisibleCount(40); }}
              />
            </div>

            {/* Expand-many toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expand multiple</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--wr-brand,#008CCD)]"
                checked={multiExpand}
                onChange={(e) => setMultiExpand(e.target.checked)}
              />
            </div>

            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {COLS.map(c => {
                    const disabled = ["select", "expander", "step", "dropOffRate", "actions"].includes(c.key);
                    return (
                      <label key={c.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          disabled={disabled}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: disabled ? true : Boolean(v) }))}
                        />
                        <span>{c.label || c.key}</span>
                        {c.source && <SourceChip src={c.source} />}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm"
                          onClick={() => setVisibleCols(COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as any))}>
                    Reset
                  </Button>
                  <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export (CSV/PNG free, XLSX/PDF locked) */}
            <div className="relative" ref={lockRef}>
              <Button variant="outline" className="h-8 px-3" onClick={() => exportCSV(false)}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button variant="outline" className="h-8 px-3" onClick={() => exportPNG(false)}>
                <Download className="h-4 w-4 mr-2" /> PNG
              </Button>
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
                onClick={() => setLockOpen(o => !o)}
                aria-haspopup="dialog"
              >
                <FileSpreadsheet className="h-4 w-4" />
                XLSX/PDF
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {lockOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded border bg-white p-3 text-sm shadow"
                     style={{ borderColor: TK.border }}>
                  <div className="font-medium mb-1">Upgrade to Pro</div>
                  <p className="text-muted-foreground mb-2">Export XLSX and PDF are available on Pro plans.</p>
                  <div className="flex gap-2">
                    <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>View Plans</Button>
                    <Button size="sm" variant="outline" onClick={() => setLockOpen(false)}>Close</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh demo data */}
            <Button variant="outline" className="h-8 px-3" onClick={() => setRows(mockLeakRows())}>Refresh Demo</Button>
            {/* Reset filters */}
            <Button variant="outline" className="h-8 px-3" onClick={resetFilters}>Reset</Button>
          </div>
        </CardHeader>

        {/* ─ Filter row ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[280px] pl-7" placeholder="Search by step, stage, or URL…"
                     value={query} onChange={(e) => { setQuery(e.target.value); if (!infinite) setPage(1); }} />
            </div>

            {/* Preset chips */}
            {([
              ["top","Top (≥ threshold)"],
              ["checkout","Checkout‑only"],
              ["all","All steps"],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setPreset(val as Preset); if (!infinite) setPage(1); }}
                className={`h-8 px-3 rounded-full border text-sm ${preset === val ? "font-semibold" : ""}`}
                style={{ borderColor: TK.borderLight, background: preset === val ? TK.pastelBlue : "#fff" }}
              >
                {label}
              </button>
            ))}

            {/* Drop‑off threshold */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">Drop‑off ≥</span>
              <div className="w-[160px]">
                <Slider value={[rateThreshold]} min={0} max={100} step={1}
                        onValueChange={(v) => { setRateThreshold((v as number[])[0]); if (!infinite) setPage(1); }} />
              </div>
              <span className="text-sm w-12 text-right">{rateThreshold}%</span>
            </div>

            {/* Source toggle */}
            <div className="flex items-center gap-1 ml-2">
              {(["All","GA4"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSourceFilter(t)}
                  className={`h-8 px-3 rounded-full border text-sm ${sourceFilter === t ? "font-semibold" : ""}`}
                  style={{ borderColor: TK.borderLight, background: sourceFilter === t ? TK.pastelBlue : "#fff" }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Pagination controls (right) when infinite OFF */}
            {!infinite && (
              <div className="ml-auto flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                  <SelectContent>{[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(1)}>First</Button>
                <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
                <div className="text-sm w-16 text-center">{page}</div>
                <Button variant="outline" className="h-8 px-3" disabled={(page*pageSize)>=sorted.length} onClick={()=>setPage(p=>p+1)}>Next</Button>
                <Button variant="outline" className="h-8 px-3" disabled={(page*pageSize)>=sorted.length} onClick={()=>setPage(Math.ceil(sorted.length / pageSize))}>Last</Button>
              </div>
            )}

            {/* Bulk bar */}
            {selectedIds.length > 0 && (
              <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
                <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
                <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                <Button size="sm" variant="outline" onClick={()=>alert("Bulk task creation — wire to Task module")}>Create Tasks</Button>
                <Button size="sm" variant="outline" onClick={()=>exportCSV(true)}>Export Selection (CSV)</Button>
                <Button size="sm" variant="outline" onClick={()=>exportPNG(true)}>Export Selection (PNG)</Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={()=>setSelected({})}>Clear</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* ─ Table ─ */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-40">
                <TableRow>
                  {VISIBLE.map(c => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyHeaderStyle(c) }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.key === "select" ? (
                        <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                      ) : c.key === "expander" ? (
                        <span />
                      ) : c.sortable ? (
                        <span className="relative group cursor-help">
                          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={()=>toggleSort(c.key)}>
                            <span>{c.label}</span>
                            {c.source && <SourceChip src={c.source} />}
                            {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      ) : (
                        <span className="relative group cursor-help inline-flex items-center gap-1">
                          {c.label}
                          {c.source && <SourceChip src={c.source} />}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.map(r => {
                  const adv = computeAdvanceRate(r.entrants, r.progressed);
                  const dor = computeDropOffRate(r.entrants, r.progressed);
                  const drops = computeDropOffs(r.entrants, r.progressed);
                  const isTop = topLeakIds.has(r.id) && (dor ?? -Infinity) >= rateThreshold;

                  const rowBgClass = isTop ? (dor! > 80 ? "bg-red-50" : "bg-amber-50") : "bg-white";
                  const rowBgColor = isTop ? (dor! > 80 ? "#FEF2F2" : "#FFFBEB") : "#FFFFFF";
                  const t = timeTone(r.avgTimeToNextSec);
                  return (
                    <React.Fragment key={r.id}>
                      <TableRow className={`hover:bg-[#F8FAFC] ${rowBgClass}`}>
                        {/* select */}
                        {visibleCols.select !== false && (
                          <TableCell style={stickyBodyStyle(COLS[0], rowBgColor) as any}>
                            <Checkbox checked={!!selected[r.id]} onCheckedChange={(v)=>setSelected(s=>({ ...s, [r.id]: Boolean(v) }))} />
                          </TableCell>
                        )}
                        {/* expander */}
                        {visibleCols.expander !== false && (
                          <TableCell style={stickyBodyStyle(COLS[1], rowBgColor) as any}>
                            <button onClick={()=>toggleExpand(r.id)} aria-label={expanded[r.id] ? "Collapse" : "Expand"} className="rounded border p-1 hover:bg-muted" title={expanded[r.id] ? "Collapse" : "Expand"}>
                              {expanded[r.id] ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                            </button>
                          </TableCell>
                        )}
                        {/* step */}
                        {visibleCols.step !== false && (
                          <TableCell style={stickyBodyStyle(COLS[2], rowBgColor) as any}>
                            <div className="max-w-[440px]">
                              <a className="font-medium underline cursor-pointer" style={{ color: TK.valueBlue }}  onClick={openDrawer}>
                                {r.step}
                              </a>
                              <div className="truncate text-xs" style={{ color: TK.muted }}>
                                {r.url ?? "—"} • <span className="uppercase tracking-wide">{r.stage}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {dor !== null && dor >= rateThreshold && <TonePill text="Leak" bg="rgba(244,63,94,0.12)" fg="#BE123C" />}
                                {adv !== null && adv < 40 && <TonePill text="Low advance" bg="rgba(99,102,241,0.12)" fg="#4F46E5" />}
                                <TonePill text={t.label} bg={t.bg} fg={t.fg} />
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {/* entrants */}
                        {visibleCols.entrants !== false && (
                          <TableCell className="text-right">
                            <div className="inline-flex items-center">
                              <span>{nf(r.entrants)}</span>
                              <SourceChip src="GA4" />
                            </div>
                          </TableCell>
                        )}
                        {/* progressed */}
                        {visibleCols.progressed !== false && (
                          <TableCell className="text-right">
                            <div className="inline-flex items-center">
                              <span className="font-medium">{nf(r.progressed)}</span>
                              <SourceChip src="GA4" />
                            </div>
                          </TableCell>
                        )}
                        {/* advanceRate */}
                        {visibleCols.advanceRate !== false && (
                          <TableCell className="text-right">
                            {adv === null ? (
                              <span className="text-xs" style={{ color: TK.muted }}>—</span>
                            ) : (
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                                    style={{ background: adv < 40 ? "rgba(245,158,11,0.15)" : "#F8FAFC", color: adv < 40 ? TK.warn : "#334155", border: `1px solid ${TK.borderLight}` }}>
                                {pf(adv, 1)}
                              </span>
                            )}
                          </TableCell>
                        )}
                        {/* dropOffs */}
                        {visibleCols.dropOffs !== false && (
                          <TableCell className="text-right">{drops === null ? "—" : nf(drops)}</TableCell>
                        )}
                        {/* dropOffRate */}
                        {visibleCols.dropOffRate !== false && (
                          <TableCell className="text-right">
                            {dor === null ? (
                              <span className="text-xs" style={{ color: TK.muted }}>—</span>
                            ) : (
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
                                    style={{
                                      background: dor >= 80 ? "rgba(239,68,68,0.15)" : dor >= 60 ? "rgba(245,158,11,0.15)" : "#F8FAFC",
                                      color: dor >= 80 ? TK.critical : dor >= 60 ? TK.warn : "#334155",
                                      border: `1px solid ${TK.borderLight}`,
                                    }}>
                                {pf(dor, 1)}
                              </span>
                            )}
                          </TableCell>
                        )}
                        {/* avgTimeToNext */}
                        {visibleCols.avgTimeToNext !== false && (
                          <TableCell className="text-center">
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                                  style={{ background: t.bg, color: t.fg, border: `1px solid ${TK.borderLight}` }}>
                              {secsToMmss(r.avgTimeToNextSec)}
                            </span>
                          </TableCell>
                        )}
                        {/* issues */}
                        {visibleCols.issues !== false && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(r.issueHints && r.issueHints.length ? r.issueHints : ["—"]).map((h, i) => (
                                <span key={i} className="px-2 py-0.5 text-xs rounded border" style={{ borderColor: TK.borderLight }}>{h}</span>
                              ))}
                            </div>
                          </TableCell>
                        )}
                        {/* actions */}
                        {visibleCols.actions !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5 opacity-60 hover:opacity-100 transition">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="text-[#4286F5]" aria-label="View Analyzer" 
                                    // onClick={() => setDrawerRow(r)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Analyzer</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="text-[#4286F5]" aria-label="Create Task"
                                    //  onClick={() => setDrawerRow(r)}
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
                                    <Button size="icon" variant="ghost" aria-label="Optimize Step" onClick={() => alert("Open Optimizer (stub)")}>
                                      <Wrench className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Optimize Step</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {expanded[r.id] && (
                        <TableRow>
                          <TableCell colSpan={VISIBLE.length}>{renderExpanded(r, dor, adv)}</TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            {infinite && <div id="dropoffs-sentinel" className="h-8" />}
          </div>
        </CardContent>

        {/* Footer (when infinite ON show simple count; when OFF controls above) */}
        {infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
            <div className="text-sm text-muted-foreground">Loaded {windowedRows.length} of {sorted.length}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 px-3" onClick={()=>setVisibleCount(v => Math.min(sorted.length, v + 60))}>Load more</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Drawer (Step Analyzer / Task) */}
      {drawerRow && (
        <Drawer title="Step Analyzer" onClose={() => setDrawerRow(null)}>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">{drawerRow.step}</div>
              <div className="text-[13px]" style={{ color: TK.muted }}>{drawerRow.url ?? "—"} • {drawerRow.stage}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricBox label="Entrants (GA4)" value={nf(drawerRow.entrants)} />
              <MetricBox label="Progressed (GA4)" value={nf(drawerRow.progressed)} />
              <MetricBox label="Advance %" value={(() => { const a = computeAdvanceRate(drawerRow.entrants, drawerRow.progressed); return a === null ? "—" : pf(a, 1); })()} />
              <MetricBox label="Drop‑offs" value={(() => { const d = computeDropOffs(drawerRow.entrants, drawerRow.progressed); return d === null ? "—" : nf(d); })()} />
              <MetricBox label="Drop‑off %" value={(() => { const d = computeDropOffRate(drawerRow.entrants, drawerRow.progressed); return d === null ? "—" : pf(d, 1); })()} />
              <MetricBox label="Avg Time → Next" value={secsToMmss(drawerRow.avgTimeToNextSec)} />
            </div>

            <InfoPanel title="Why this is flagged">
              <ul className="list-disc pl-4 text-xs" style={{ color: TK.muted }}>
                <li>High drop‑off vs peers given current threshold and stage.</li>
                <li>Investigate form length / validation friction if time is slow (&gt; 60s).</li>
                <li>Review copy and trust signals on Checkout/Payment steps.</li>
              </ul>
            </InfoPanel>

            <div className="pt-2">
              <div className="mb-2 font-medium">Create Task</div>
              <TaskForm
                defaultTitle={`Reduce drop‑off: ${drawerRow.step}`}
                defaultUrl={drawerRow.url ?? ""}
                onSubmit={() => {
                  alert("Task created (stub) — wire to backend.");
                  setDrawerRow(null);
                }}
              />
            </div>
          </div>
        </Drawer>
      )}
    </section>
  );
}

/* ───────────────────────── Sub‑components ───────────────────────── */

function MetricBox({ label, value, tone, badge }: { label: string; value: React.ReactNode; tone?: "muted" | "warn" | "critical"; badge?: React.ReactNode }) {
  const toneColor = tone === "critical" ? TK.critical : tone === "warn" ? TK.warn : TK.muted;
  return (
    <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
      <div className="text-xs flex items-center gap-2" style={{ color: toneColor }}>
        {label} {badge}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-white p-3" style={{ borderColor: TK.border }}>
      <div className="mb-1 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[420px] max-w-[90vw] overflow-auto bg-white p-4 shadow-xl border-l"
             style={{ borderColor: TK.borderLight }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function TaskForm({
  defaultTitle,
  defaultUrl,
  onSubmit,
}: {
  defaultTitle: string;
  defaultUrl: string;
  onSubmit: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Task Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Project Name <span className="text-red-500">*</span></label>
        <Input value={project} required onChange={(e) => setProject(e.target.value)} placeholder="Select or type project…" />
      </div>

      <div>
        <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Step URL</label>
        <Input value={defaultUrl} readOnly className="bg-gray-50" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Priority</label>
          <Select value={priority} onValueChange={(v:any)=>setPriority(v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Due</label>
          <Input type="date" value={due} onChange={(e)=>setDue(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: TK.border }}
          placeholder="Context, hypothesis, acceptance criteria…"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs" style={{ color: TK.muted }}>Internal Notes (Private)</label>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: TK.border }}
          placeholder="Private instructions for your team…"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => alert("Draft saved (stub)")}>Save Draft</Button>
        <Button type="submit" style={{ background: TK.brand, color: "#fff" }}>
          Create Task
        </Button>
      </div>
    </form>
  );
}
