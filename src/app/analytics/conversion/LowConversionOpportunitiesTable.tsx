"use client";

/**
 * Low Conversion Opportunity Pages — Drop‑in Table (Updated)
 * - Fonts: Inter + Inter Fallback
 * - No emoji anywhere in UI
 * - Branded icons (#008CCD) for section title + actions
 * - Pointer cursor on all clickable elements
 * - Modular chips & segmented toggles (aligned to recent designs)
 * - Single Export button in header with dropdown for all formats
 * - Bulk bar is injected just ABOVE the first selected row in the table
 * - Actions column: brand‑tinted icon buttons (no borders)
 *
 * Spec alignment: header/table patterns follow our shared section layout. :contentReference[oaicite:0]{index=0}
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  Columns3,
  FileDown,
  ImageDown,
  FileSpreadsheet,
  FileText,
  Lock,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardPlus,
  Lightbulb,
  ScanSearch,
  TrendingDown,
  LogOut,
  ScrollText,
  History,
  SlidersHorizontal,
  ExternalLink,
  Gauge,
} from "lucide-react";
import DemoDrawerHeaderPage from "../landing/drawer/DemoDrawerHeaderPage";

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */

export type OpportunityRow = {
  id: string;
  url: string;
  title?: string;

  // GA4 metrics: current period
  sessions: number;
  conversions: number;
  exitRate: number; // 0–100
  avgEngagementTimeSec: number;

  // Comparison period (optional)
  prev?: {
    sessions: number;
    conversions: number;
    exitRate?: number;
    avgEngagementTimeSec?: number;
  };

  // Internal/Wranker (optional; used for flags/filters)
  scrollDepth75Share?: number;     // 0–1
  ctaClicks?: number;              // absolute clicks (fallback)
  ctaClickSessions?: number;       // sessions with ≥1 CTA click
  lastContentUpdatedDays?: number; // days since update
  sessionsByDevice?: { desktop?: number; mobile?: number; tablet?: number };
};

type WithDerived = OpportunityRow & {
  __cr: number;                 // %
  __prevCr?: number;            // %
  __ctaClickRate?: number;      // %
  __dominantDevice?: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  __flags: Flag[];
};

type FlagType = "LOW_CVR" | "HIGH_EXIT" | "SCROLL_GAP" | "STALE";
type Flag = {
  type: FlagType;
  label: string;
  colorClass: string;
  tip: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type ColumnKey =
  | "select"
  | "url"
  | "sessions"
  | "conversions"
  | "conversionRate"
  | "exitRate"
  | "avgEngagementTimeSec"
  | "optimizationFlags"
  | "actions";

type SortDir = "asc" | "desc";

/* ────────────────────────────────────────────────────────────────────────────
   Tokens
   ──────────────────────────────────────────────────────────────────────────── */

const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBg: "#FFFFFF",
  radius: "10px",
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   Column meta
   ──────────────────────────────────────────────────────────────────────────── */

const HEADER_META: Record<
  ColumnKey,
  { label: string; tooltip?: string; source?: "GA4" | "Internal" }
> = {
  select: { label: "" },
  url: {
    label: "Page URL / Title",
    tooltip: "Full path (click to open Page Analyzer).",
  },
  sessions: {
    label: "Sessions",
    tooltip: "GA4 sessions for this landing page (selected period).",
    source: "GA4",
  },
  conversions: {
    label: "Conversions",
    tooltip: "Number of GA4 conversion events (selected period).",
    source: "GA4",
  },
  conversionRate: {
    label: "Conv. Rate",
    tooltip: "Conversions ÷ Sessions (GA4).",
    source: "GA4",
  },
  exitRate: {
    label: "Exit Rate",
    tooltip: "GA4: % sessions that exited on this page.",
    source: "GA4",
  },
  avgEngagementTimeSec: {
    label: "Avg. Engagement Time",
    tooltip: "GA4: Average active time on page.",
    source: "GA4",
  },
  optimizationFlags: {
    label: "Optimization Flags",
    tooltip: "Wranker: Low CVR / High Exit / Scroll‑CVR Gap / Stale.",
    source: "Internal",
  },
  actions: {
    label: "",
    tooltip: "View Analyzer / Create Task / Suggestions",
    source: "Internal",
  },
};

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  select: true,
  url: true,
  sessions: true,
  conversions: true,
  conversionRate: true,
  exitRate: true,
  avgEngagementTimeSec: true,
  optimizationFlags: true,
  actions: true,
};

const TOGGLABLE_COLUMNS: ColumnKey[] = [
  "sessions",
  "conversions",
  "conversionRate",
  "exitRate",
  "avgEngagementTimeSec",
  "optimizationFlags",
];

/* ────────────────────────────────────────────────────────────────────────────
   Heuristics / thresholds
   ──────────────────────────────────────────────────────────────────────────── */

const RULES = {
  minSessionFilterDefault: 300,  // UI filter default
  lowCvrTrafficMin: 500,         // Low CVR flag requires >500 sessions
  lowCvrPct: 0.5,                // %
  highExitPct: 75,               // %
  lowEngagementSec: 60,          // s
  scroll75Min: 0.75,             // share
  lowCtaClickRatePct: 1,         // %
  staleDays: 90,                 // days
};

/* ────────────────────────────────────────────────────────────────────────────
   Utils
   ──────────────────────────────────────────────────────────────────────────── */

const nf = new Intl.NumberFormat("en-US");
const pf = (n: number, dp = 2) => `${n.toFixed(dp)}%`;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const toTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const normalize = (n: unknown, fb = 0) =>
  typeof n === "number" && isFinite(n) && n >= 0 ? n : fb;

function computeCR(sessions: number, conversions: number) {
  if (sessions <= 0) return 0;
  return (conversions / sessions) * 100;
}
function slugOf(url: string) {
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL("https://x" + url);
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}
function track(event: string, props: Record<string, any>) {
  const detail = { section: "low_conversion_opportunities", event, ...props };
  window.dispatchEvent(new CustomEvent("wranker-analytics", { detail }));
  // eslint-disable-next-line no-console
  console.log("[track]", detail);
}

/* CSV/PNG export helpers (free) */
function exportRowsToCSV(filename: string, cols: ColumnKey[], rows: WithDerived[]) {
  const visibleCols = cols.filter((c) => c !== "select" && c !== "actions");
  const cap = Math.min(rows.length, 1000);
  const headers = visibleCols.map((c) => HEADER_META[c].label);
  const cell = (r: WithDerived, c: ColumnKey) => {
    switch (c) {
      case "url": return r.title ? `${r.url} (${r.title})` : r.url;
      case "sessions": return r.sessions;
      case "conversions": return r.conversions;
      case "conversionRate": return `${r.__cr.toFixed(2)}%`;
      case "exitRate": return `${normalize(r.exitRate, 0).toFixed(0)}%`;
      case "avgEngagementTimeSec": return toTime(normalize(r.avgEngagementTimeSec, 0));
      case "optimizationFlags": return r.__flags.map(f => f.label).join(" | ");
      default: return "";
    }
  };
  const body = rows.slice(0, cap)
    .map(r => visibleCols
      .map(c => String(cell(r, c)).replace(/"/g, '""'))
      .map(v => `"${v}"`).join(","))
    .join("\n");
  const csv = [headers.join(","), body, `\n"Exported ${cap} of ${rows.length} rows · Wranker"`].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  track("lco_export", { format: "csv", rows: cap });
}

async function exportRowsToPNG(filename: string, cols: ColumnKey[], rows: WithDerived[]) {
  const visibleCols = cols.filter((c) => c !== "select" && c !== "actions");
  const padX = 16, rowH = 28, headerH = 40, footerH = 24;
  const widths = visibleCols.map(() => 180);
  if (visibleCols[0] === "url") widths[0] = 320;

  const cap = Math.min(rows.length, 1000);
  const totalW = widths.reduce((a, b) => a + b, 0) + padX * 2;
  const totalH = headerH + cap * rowH + footerH;

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
  ctx.font = "bold 14px Inter, Inter Fallback, ui-sans-serif, system-ui";
  let x = padX;
  visibleCols.forEach((c, i) => { ctx.fillText(HEADER_META[c].label, x, 22); x += widths[i]; });

  ctx.font = "12px Inter, Inter Fallback, ui-sans-serif, system-ui";
  rows.slice(0, cap).forEach((r, idx) => {
    const y = headerH + idx * rowH;
    ctx.fillStyle = idx % 2 ? "#FAFAFA" : "#FFFFFF";
    ctx.fillRect(0, y, totalW, rowH);

    x = padX;
    visibleCols.forEach((c, i) => {
      ctx.fillStyle = "#111827";
      ctx.fillText(cellText(r, c), x, y + 18);
      x += widths[i];
    });

    ctx.strokeStyle = "#E5E7EB";
    ctx.beginPath();
    ctx.moveTo(0, y + rowH + 0.5);
    ctx.lineTo(totalW, y + rowH + 0.5);
    ctx.stroke();
  });

  ctx.fillStyle = "#6B7280";
  ctx.font = "12px Inter, Inter Fallback, ui-sans-serif, system-ui";
  ctx.fillText(`Exported ${cap} of ${rows.length} rows · Wranker`, padX, totalH - 8);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    track("lco_export", { format: "png", rows: cap });
  }, "image/png");
}

function cellText(r: WithDerived, c: ColumnKey) {
  switch (c) {
    case "url": return (r.title ?? r.url) + " — " + slugOf(r.url);
    case "sessions": return nf.format(normalize(r.sessions, 0));
    case "conversions": return nf.format(normalize(r.conversions, 0));
    case "conversionRate": return `${r.__cr.toFixed(2)}%`;
    case "exitRate": return `${normalize(r.exitRate, 0).toFixed(0)}%`;
    case "avgEngagementTimeSec": return toTime(normalize(r.avgEngagementTimeSec, 0));
    case "optimizationFlags": return r.__flags.map(f => f.label).join(" • ");
    default: return "";
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Small UI atoms (brand-aligned)
   ──────────────────────────────────────────────────────────────────────────── */

const SourceChip = ({ src }: { src: "GA4" | "Internal" }) => {
  const map = {
    GA4: "bg-[var(--wr-pastel-blue)] text-[var(--wr-value-blue)]",
    Internal: "bg-gray-100 text-gray-700",
  } as const;
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[src]}`}>
      {src}
    </span>
  );
};

function IconLock() {
  return <Lock className="inline-block size-3.5 align-middle text-gray-400 ml-1" />;
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span tabIndex={0} className="focus:outline-none">{children}</span>
      {open && (
        <span className="absolute left-1/2 z-30 mt-8 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--wr-borderLight)] bg-white px-2 py-1 text-[11px] text-[var(--wr-text)] shadow">
          {label}
        </span>
      )}
    </span>
  );
}

function Badge({
  children,
  color,
  icon: Icon,
}: {
  children: React.ReactNode;
  color: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-md border bg-white"
      style={{ borderColor: "var(--wr-border)" }}
    >
      {options.map((o, idx) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            className={`px-3 py-2 text-sm cursor-pointer ${idx > 0 ? "border-l" : ""} ${active ? "bg-[var(--wr-pastel-blue)] text-[var(--wr-value-blue)] font-semibold" : "text-[var(--wr-text)]"}`}
            style={{ borderColor: "var(--wr-border)" }}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Th(props: {
  colKey: ColumnKey;
  label: string;
  tooltip?: string;
  source?: "GA4" | "Internal";
  sortKey: ColumnKey;
  sortDir: SortDir;
  onSort: (k: ColumnKey) => void;
  stickyLeft?: boolean;
  leftPx?: number;
  widthClass?: string;
}) {
  const isActive = props.sortKey === props.colKey;
  return (
    <th
      className={`px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)] ${props.widthClass ?? ""} ${props.stickyLeft ? "sticky bg-white z-20" : ""}`}
      style={props.stickyLeft ? { left: `${props.leftPx ?? 0}px` } : undefined}
      title={props.tooltip}
    >
      <button
        onClick={() => props.onSort(props.colKey)}
        aria-pressed={isActive ? true : false}
        aria-label={`Sort by ${props.label}`}
        className="flex items-center whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--wr-brand)] cursor-pointer"
      >
        <span>{props.label}</span>
        {props.source && <SourceChip src={props.source} />}
        <span className="ml-1 opacity-70">{isActive ? (props.sortDir === "asc" ? "▲" : "▼") : "▴▾"}</span>
      </button>
    </th>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[420px] max-w-[90vw] overflow-auto bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-[var(--wr-border)] bg-white p-3">
      <div className="text-xs text-[var(--wr-muted)]">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-[var(--wr-muted)]">{sub}</div>}
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
  onSubmit: (payload: { title: string; priority: string; due?: string; notes: string; tag: string }) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit({ title, priority, due: due || undefined, notes, tag: "Conversion Optimization" }); }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs text-[var(--wr-muted)]">Task Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-[var(--wr-border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--wr-muted)]">Page URL</label>
        <input value={defaultUrl} readOnly className="w-full rounded-md border border-[var(--wr-border)] bg-gray-50 px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--wr-muted)]">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full rounded-md border border-[var(--wr-border)] px-2 py-2 text-sm">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--wr-muted)]">Due</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full rounded-md border border-[var(--wr-border)] px-2 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--wr-muted)]">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-[var(--wr-border)] px-3 py-2 text-sm" placeholder="Context, hypothesis, acceptance criteria…" />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-[var(--wr-brand)] px-3 py-2 text-sm text-white hover:brightness-105 cursor-pointer">
          <ClipboardPlus className="size-4" /> Create Task
        </button>
      </div>
    </form>
  );
}

function ColumnManager({
  visible,
  onChange,
}: {
  visible: Record<ColumnKey, boolean>;
  onChange: (v: Record<ColumnKey, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((s) => !s)} className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer" title="Choose columns">
        <Columns3 className="size-4 text-[var(--wr-brand)]" /> Columns
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-64 rounded-md border border-[var(--wr-border)] bg-white p-2 shadow-lg">
          <div className="mb-1 text-xs font-semibold text-[var(--wr-muted)]">Toggle columns</div>
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {TOGGLABLE_COLUMNS.map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer">
                <span className="text-sm">{HEADER_META[k].label}</span>
                <input
                  type="checkbox"
                  checked={visible[k]}
                  onChange={(e) => onChange({ ...visible, [k]: e.target.checked })}
                />
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button className="rounded-md border border-[var(--wr-border)] bg-white px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer" onClick={() => onChange({ ...DEFAULT_VISIBLE })}>
              Reset
            </button>
            <button className="inline-flex items-center gap-1 rounded-md bg-[var(--wr-brand)] px-3 py-1.5 text-xs text-white hover:brightness-105 cursor-pointer" onClick={() => setOpen(false)}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Flags computation (icons + tones)
   ──────────────────────────────────────────────────────────────────────────── */

function computeFlags(r: WithDerived): Flag[] {
  const flags: Flag[] = [];

  if (r.sessions > RULES.lowCvrTrafficMin && r.__cr < RULES.lowCvrPct) {
    flags.push({
      type: "LOW_CVR",
      label: "Low CVR",
      colorClass: "bg-red-100 text-red-700",
      tip: `Sessions > ${RULES.lowCvrTrafficMin} & Conv. Rate < ${RULES.lowCvrPct}%`,
      icon: TrendingDown,
    });
  }
  if (r.exitRate > RULES.highExitPct && r.avgEngagementTimeSec < RULES.lowEngagementSec) {
    flags.push({
      type: "HIGH_EXIT",
      label: "High Exit",
      colorClass: "bg-orange-100 text-orange-700",
      tip: `Exit Rate > ${RULES.highExitPct}% & Avg. Time < ${RULES.lowEngagementSec}s`,
      icon: LogOut,
    });
  }
  const scrollOk = (r.scrollDepth75Share ?? 0) >= RULES.scroll75Min;
  const ctaLow = (r.__ctaClickRate ?? 0) < RULES.lowCtaClickRatePct;
  if (scrollOk && ctaLow) {
    flags.push({
      type: "SCROLL_GAP",
      label: "Scroll‑CVR Gap",
      colorClass: "bg-yellow-50 text-yellow-700",
      tip: `Scroll ≥ ${Math.round(RULES.scroll75Min * 100)}% & CTA click rate < ${RULES.lowCtaClickRatePct}%`,
      icon: ScrollText,
    });
  }
  if ((r.lastContentUpdatedDays ?? -1) >= RULES.staleDays) {
    flags.push({
      type: "STALE",
      label: "Stale",
      colorClass: "bg-gray-100 text-gray-700",
      tip: `No content update in ≥ ${RULES.staleDays} days`,
      icon: History,
    });
  }
  return flags;
}

/* ────────────────────────────────────────────────────────────────────────────
   Mock data (remove when wiring)
   ──────────────────────────────────────────────────────────────────────────── */

function mockRows(count = 60): OpportunityRow[] {
  const urls = [
    "/pricing-plan-comparison",
    "/feature-page",
    "/home",
    "/about",
    "/features/core-vs-lite",
    "/blog/ab-test-ideas",
    "/integrations/ga4",
    "/case-studies/retail",
  ];
  const titles = [
    "Pricing Plan Comparison",
    "Feature Page",
    "Home",
    "About",
    "Core vs Lite",
    "A/B Test Ideas",
    "GA4 Integration",
    "Retail Case Study",
  ];
  const arr: OpportunityRow[] = [];
  for (let i = 0; i < count; i++) {
    const k = i % urls.length;
    const sessions = Math.floor(80 + Math.random() * 5000);
    const conversions = Math.floor(Math.random() * Math.max(1, sessions * 0.02)); // keep lowish
    const exitRate = Math.round(40 + Math.random() * 55);
    const avgEngagementTimeSec = 25 + Math.floor(Math.random() * 120);

    const prevSessions = Math.floor(40 + Math.random() * 4000);
    const prevConversions = Math.floor(Math.random() * Math.max(1, prevSessions * 0.02));

    const sDesktop = Math.floor(sessions * (0.3 + Math.random() * 0.5));
    const sMobile = Math.max(0, sessions - sDesktop - Math.floor(Math.random() * 100));
    const sTablet = Math.max(0, sessions - sDesktop - sMobile);

    arr.push({
      id: `lco_${i}`,
      url: urls[k],
      title: titles[k],
      sessions,
      conversions,
      exitRate,
      avgEngagementTimeSec,
      prev: Math.random() < 0.75 ? { sessions: prevSessions, conversions: prevConversions } : undefined,
      scrollDepth75Share: Math.random(),
      ctaClicks: Math.random() < 0.7 ? Math.floor(Math.random() * Math.max(1, sessions * 0.01)) : undefined,
      ctaClickSessions: Math.random() < 0.5 ? Math.floor(Math.random() * Math.max(1, sessions * 0.008)) : undefined,
      lastContentUpdatedDays: Math.floor(Math.random() * 200),
      sessionsByDevice: { desktop: sDesktop, mobile: sMobile, tablet: sTablet },
    });
  }
  return arr;
}

/* ────────────────────────────────────────────────────────────────────────────
   Top-level export
   ──────────────────────────────────────────────────────────────────────────── */

export default function LowConversionOpportunitiesTable({ rows: propRows }: { rows?: OpportunityRow[] }) {
  return (
    <div
      className="w-full mt-4"
      style={
        {
          ["--wr-brand" as any]: TOKENS.brand,
          ["--wr-value-blue" as any]: TOKENS.valueBlue,
          ["--wr-pastel-blue" as any]: TOKENS.pastelBlue,
          ["--wr-text" as any]: TOKENS.text,
          ["--wr-muted" as any]: TOKENS.muted,
          ["--wr-border" as any]: TOKENS.border,
          ["--wr-borderLight" as any]: TOKENS.borderLight,
          ["--wr-success" as any]: TOKENS.success,
          ["--wr-warning" as any]: TOKENS.warning,
          ["--wr-danger" as any]: TOKENS.danger,
          ["--wr-card-bg" as any]: TOKENS.cardBg,
          ["--wr-radius" as any]: TOKENS.radius,
          fontFamily:
            "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        } as React.CSSProperties
      }
    >
      <Inner rows={propRows ?? mockRows(120)} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Action icons — brand‑tinted, borderless
   ──────────────────────────────────────────────────────────────────────────── */

function BrandIconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--wr-brand)] hover:bg-[var(--wr-pastel-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--wr-brand)]/30 cursor-pointer"
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Inner component
   ──────────────────────────────────────────────────────────────────────────── */

function Inner({ rows }: { rows: OpportunityRow[] }) {
  // Derive metrics and flags
  const baseRows: WithDerived[] = useMemo(() => {
    return rows.map((r) => {
      const sessions = normalize(r.sessions, 0);
      const conversions = normalize(r.conversions, 0);
      const exitRate = normalize(r.exitRate, 0);
      const avgEngagementTimeSec = normalize(r.avgEngagementTimeSec, 0);
      const prevSessions = normalize(r.prev?.sessions, 0);
      const prevConversions = normalize(r.prev?.conversions, 0);
      const __cr = computeCR(sessions, conversions);
      const __prevCr = prevSessions > 0 ? computeCR(prevSessions, prevConversions) : undefined;

      const ctaBase = r.ctaClickSessions ?? r.ctaClicks ?? 0;
      const __ctaClickRate = sessions > 0 ? (ctaBase / sessions) * 100 : undefined;

      const dv = r.sessionsByDevice ?? {};
      const pairs: [keyof typeof dv, number][] = [
        ["desktop", dv.desktop ?? 0],
        ["mobile", dv.mobile ?? 0],
        ["tablet", dv.tablet ?? 0],
      ];
      pairs.sort((a, b) => b[1] - a[1]);
      const top = pairs[0];
      const __dominantDevice =
        (top?.[1] ?? 0) <= 0
          ? "Unknown"
          : top[0] === "desktop"
          ? "Desktop"
          : top[0] === "mobile"
          ? "Mobile"
          : "Tablet";

      const tmp: WithDerived = {
        ...r,
        sessions,
        conversions,
        exitRate,
        avgEngagementTimeSec,
        __cr,
        __prevCr,
        __ctaClickRate,
        __dominantDevice,
        __flags: [],
      };
      tmp.__flags = computeFlags(tmp);
      return tmp;
    });
  }, [rows]);

  // Mode
  const initialMode: "pagination" | "infinite" = baseRows.length > 1000 ? "infinite" : "pagination";
  const [mode, setMode] = useState<"pagination" | "infinite">(initialMode);

  // Columns
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({ ...DEFAULT_VISIBLE });

  // Sort (default: Conv. Rate ascending → low first)
  const [sortKey, setSortKey] = useState<ColumnKey>("conversionRate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Search
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [queryInput]);

  // Filters: presets / min sessions / device
  const [preset, setPreset] = useState<"all" | "low-cvr" | "high-exit" | "scroll-gap" | "stale">("all");
  const [minSessions, setMinSessions] = useState<number>(RULES.minSessionFilterDefault);
  const [device, setDevice] = useState<"All" | "Desktop" | "Mobile" | "Tablet">("All");

  // Pagination / infinite
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [infiniteCount, setInfiniteCount] = useState(20);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "infinite") return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
      if (nearBottom) setInfiniteCount((n) => Math.min(n + 20, filteredSorted.length));
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  });

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drawers
  const [drawer, setDrawer] = useState<{ mode: "analyzer" | "task" | "suggestions"; row: WithDerived } | null>(null);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!exportRef.current) return; if (!exportRef.current.contains(e.target as Node)) setExportOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Filters
  const filtered: WithDerived[] = useMemo(() => {
    let out = baseRows;

    // search
    const q = query;
    if (q) out = out.filter((r) => r.url.toLowerCase().includes(q) || (r.title ?? "").toLowerCase().includes(q));

    // min sessions
    out = out.filter((r) => r.sessions >= minSessions);

    // device
    if (device !== "All") out = out.filter((r) => r.__dominantDevice === device);

    // preset chips
    if (preset !== "all") {
      const want: FlagType =
        preset === "low-cvr" ? "LOW_CVR" :
        preset === "high-exit" ? "HIGH_EXIT" :
        preset === "scroll-gap" ? "SCROLL_GAP" :
        "STALE";
      out = out.filter((r) => r.__flags.some((f) => f.type === want));
    }

    return out;
  }, [baseRows, query, minSessions, device, preset]);

  // Sorting
  const filteredSorted: WithDerived[] = useMemo(() => {
    const arr = [...filtered];
    const dir = (n: number) => (sortDir === "asc" ? n : -n);
    arr.sort((a, b) => {
      switch (sortKey) {
        case "url": return dir((a.title ?? a.url).localeCompare(b.title ?? b.url));
        case "sessions": return dir(a.sessions - b.sessions) || dir(a.__cr - b.__cr);
        case "conversions": return dir(a.conversions - b.conversions) || dir(a.sessions - b.sessions);
        case "conversionRate": return dir(a.__cr - b.__cr) || dir(a.conversions - b.conversions) || dir(a.sessions - b.sessions);
        case "exitRate": return dir(a.exitRate - b.exitRate) || dir(a.__cr - b.__cr);
        case "avgEngagementTimeSec": return dir(a.avgEngagementTimeSec - b.avgEngagementTimeSec) || dir(a.__cr - b.__cr);
        case "optimizationFlags": return dir(a.__flags.length - b.__flags.length) || dir(a.__cr - b.__cr);
        default: return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Window
  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const windowed: WithDerived[] = useMemo(() => {
    if (mode === "infinite") return filteredSorted.slice(0, infiniteCount);
    const start = page * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, mode, infiniteCount, page, pageSize]);

  // Helpers
  const visibleColumns = (Object.keys(visible) as ColumnKey[]).filter((k) => visible[k]);
  const allOnPageSelected = windowed.length > 0 && windowed.every((r) => selected.has(r.id));
  const someOnPageSelected = windowed.some((r) => selected.has(r.id)) && !allOnPageSelected;

  function resetAll() {
    setQueryInput(""); setQuery("");
    setPreset("all");
    setMinSessions(RULES.minSessionFilterDefault);
    setDevice("All");
    setSortKey("conversionRate"); setSortDir("asc");
    setPage(0); setInfiniteCount(20);
    setVisible({ ...DEFAULT_VISIBLE });
    track("lco_filter_changed", { action: "reset" });
  }

  function toggleSort(k: ColumnKey) {
    if (k === "select" || k === "actions") return;
    let next: SortDir;
    if (sortKey !== k) {
      if (k === "conversionRate") next = "asc";
      else if (k === "exitRate") next = "desc";
      else next = "desc";
    } else {
      next = sortDir === "desc" ? "asc" : "desc";
    }
    setSortKey(k); setSortDir(next);
    track("lco_sort_changed", { key: k, dir: next });
  }

  // Insights banner: <1% CR & >500 sessions — now icon (no emoji)
  const insightsCount = useMemo(
    () => baseRows.filter((r) => r.sessions > 500 && r.__cr < 1).length,
    [baseRows],
  );
  const [showInsights, setShowInsights] = useState(true);

  function openAnalyzer(r: WithDerived) {
    setDrawer({ mode: "analyzer", row: r });
    track("lco_view_opened", { rowId: r.id, url: r.url });
  }

  // Bulk bar: compute insertion index (first selected row in current window)
  const firstSelectedIdx = useMemo(
    () => windowed.findIndex((r) => selected.has(r.id)),
    [windowed, selected]
  );
  const anySelectedOnPage = firstSelectedIdx >= 0;

  const colSpanAllVisible = (Object.keys(visible) as ColumnKey[]).reduce(
    (acc, k) => acc + (visible[k] ? 1 : 0),
    0
  );

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

  /* ────────────────────────────────────────────────────────────────────────
     Render
     ──────────────────────────────────────────────────────────────────────── */
  return (
    <section className="space-y-3 text-[var(--wr-text)]">
                        {drawerRoww && (
                        <Drawer title="Drawer" onClose={closeDrawer}>
                           <DemoDrawerHeaderPage   />
                        </Drawer>
                         )}
      <div className="rounded-[var(--wr-radius)] border bg-[var(--wr-card-bg)]" style={{ borderColor: "var(--wr-borderLight)" }}>
        {/* Header */}
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-[var(--wr-brand)]" aria-hidden />
            <div className="text-lg font-semibold">Low Conversion Opportunity Pages</div>
            <Tooltip label="Pages getting views but not converting. Identify high‑traffic, low‑conversion pages for optimization.">
              <Info className="ml-1 size-4 text-[var(--wr-muted)]" />
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Segmented
              ariaLabel="Display mode"
              value={mode}
              onChange={(k) => setMode(k as any)}
              options={[
                { key: "pagination", label: "Pages" },
                { key: "infinite", label: "Infinite" },
              ]}
            />
            <ColumnManager visible={visible} onChange={setVisible} />
            {/* Single Export button with dropdown */}
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen((s) => !s)} className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer" title="Export options">
                <FileDown className="size-4 text-[var(--wr-brand)]" /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-md border bg-white p-1 shadow-lg" style={{ borderColor: "var(--wr-borderLight)" }}>
                  <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setExportOpen(false); exportRowsToCSV("low-conversion-opportunities.csv", (Object.keys(visible) as ColumnKey[]).filter(k=>visible[k]), filteredSorted); }}>
                    <FileDown className="size-4 text-[var(--wr-brand)]" /> CSV (Free)
                  </button>
                  <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setExportOpen(false); exportRowsToPNG("low-conversion-opportunities.png", (Object.keys(visible) as ColumnKey[]).filter(k=>visible[k]), filteredSorted); }}>
                    <ImageDown className="size-4 text-[var(--wr-brand)]" /> PNG (Free)
                  </button>
                  <button disabled className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed" title="Pro feature">
                    <FileSpreadsheet className="size-4" /> XLSX <IconLock />
                  </button>
                  <button disabled className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed" title="Pro feature">
                    <FileText className="size-4" /> PDF <IconLock />
                  </button>
                </div>
              )}
            </div>
            <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer" title="Reset filters & columns">
              <RotateCcw className="size-4 text-[var(--wr-brand)]" /> Reset
            </button>
          </div>
        </div>

        {/* Insights banner (no emoji; brand icon) */}
        {showInsights && insightsCount > 0 && (
          <div className="mx-3 mt-3 rounded-md border border-[var(--wr-borderLight)] bg-[#F8FBFF] p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-[var(--wr-brand)]" />
                <div><b>{insightsCount}</b> pages identified with <b>&lt;1%</b> conversion rate despite <b>&gt;500</b> sessions.</div>
              </div>
              <button onClick={() => setShowInsights(false)} className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer">Dismiss</button>
            </div>
          </div>
        )}

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
          {/* Search */}
          <div className="relative">
            <input
              value={queryInput}
              onChange={(e) => { setQueryInput(e.target.value); setPage(0); }}
              placeholder="Search by URL or title…"
              className="w-[280px] rounded-md border border-[var(--wr-border)] bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--wr-brand)]"
            />
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[var(--wr-brand)]" />
          </div>

          {/* Presets — modular chips */}
          {([
            ["all", "All"],
            ["low-cvr", "Low CVR"],
            ["high-exit", "High Exit"],
            ["scroll-gap", "Scroll‑CVR Gap"],
            ["stale", "Stale"],
          ] as const).map(([val, label]) => (
            <button key={val}
              onClick={() => { setPreset(val as any); setPage(0); track("lco_filter_changed", { preset: label }); }}
              className={`h-8 rounded-full border px-3 text-sm cursor-pointer transition ${preset === val ? "font-semibold" : ""}`}
              style={{
                borderColor: "var(--wr-borderLight)",
                background: preset === val ? "var(--wr-pastel-blue)" : "#fff",
                color: preset === val ? "var(--wr-value-blue)" : "inherit",
              }}
              title={`Filter: ${label}`}
            >
              {label}
            </button>
          ))}

          {/* Min session threshold */}
          <div className="ml-1 flex items-center gap-2">
            <label className="text-xs text-[var(--wr-muted)]">Min sessions</label>
            <input
              type="number"
              min={0}
              value={minSessions}
              onChange={(e) => { const v = Math.max(0, Number(e.target.value || 0)); setMinSessions(v); setPage(0); track("lco_filter_changed", { minSessions: v }); }}
              className="w-24 rounded-md border border-[var(--wr-border)] bg-white px-2 py-1.5 text-sm"
            />
          </div>

          {/* Device filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--wr-muted)]">Device</label>
            <select value={device} onChange={(e) => { setDevice(e.target.value as any); setPage(0); track("lco_filter_changed", { device: e.target.value }); }}
              className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm cursor-pointer">
              <option>All</option><option>Desktop</option><option>Mobile</option><option>Tablet</option>
            </select>
          </div>

          {/* Goal Type (future) */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--wr-muted)]">Goal</label>
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-gray-50 px-2 text-sm text-gray-400">
              <SlidersHorizontal className="size-3.5" /> All Goals <IconLock />
            </span>
          </div>

          {/* Pagination controls */}
          {mode === "pagination" && (
            <div className="ml-auto flex items-center gap-2">
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm cursor-pointer" title="Rows per page">
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button onClick={() => setPage(0)} disabled={page === 0} className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer" title="First">
                <ChevronsLeft className="size-4 text-[var(--wr-brand)]" />
              </button>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer" title="Prev">
                <ChevronLeft className="size-4 text-[var(--wr-brand)]" />
              </button>
              <span className="px-2 text-sm">{page + 1} / {Math.max(1, pageCount)}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer" title="Next">
                <ChevronRight className="size-4 text-[var(--wr-brand)]" />
              </button>
              <button onClick={() => setPage(Math.max(0, pageCount - 1))} disabled={page >= pageCount - 1} className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40 cursor-pointer" title="Last">
                <ChevronsRight className="size-4 text-[var(--wr-brand)]" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div ref={scrollRef} className="relative hidden max-h-[64vh] overflow-auto sm:block">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_var(--wr-border)]">
              <tr className="text-left">
                {visible["select"] && (
                  <th className="sticky left-0 z-30 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allOnPageSelected}
                      ref={(el) => { if (el) (el as any).indeterminate = someOnPageSelected; }}
                      onChange={(e) => {
                        const copy = new Set(selected);
                        windowed.forEach((r) => { if (e.target.checked) copy.add(r.id); else copy.delete(r.id); });
                        setSelected(copy);
                      }}
                    />
                  </th>
                )}
                {visible["url"] && (
                  <Th colKey="url" label={HEADER_META.url.label} tooltip={HEADER_META.url.tooltip}
                      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} stickyLeft leftPx={visible["select"] ? 44 : 0} widthClass="min-w-[300px]" />
                )}
                {visible["sessions"] && (
                  <Th colKey="sessions" label={HEADER_META.sessions.label} tooltip={HEADER_META.sessions.tooltip} source="GA4" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                )}
                {visible["conversions"] && (
                  <Th colKey="conversions" label={HEADER_META.conversions.label} tooltip={HEADER_META.conversions.tooltip} source="GA4" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                )}
                {visible["conversionRate"] && (
                  <Th colKey="conversionRate" label={HEADER_META.conversionRate.label} tooltip={HEADER_META.conversionRate.tooltip} source="GA4" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                )}
                {visible["exitRate"] && (
                  <Th colKey="exitRate" label={HEADER_META.exitRate.label} tooltip={HEADER_META.exitRate.tooltip} source="GA4" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                )}
                {visible["avgEngagementTimeSec"] && (
                  <Th colKey="avgEngagementTimeSec" label={HEADER_META.avgEngagementTimeSec.label} tooltip={HEADER_META.avgEngagementTimeSec.tooltip} source="GA4" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                )}
                {visible["optimizationFlags"] && (
                  <Th colKey="optimizationFlags" label={HEADER_META.optimizationFlags.label} tooltip={HEADER_META.optimizationFlags.tooltip} source="Internal" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                )}
                {visible["actions"] && (
                  <th className="px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)]" title={HEADER_META.actions.tooltip}></th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
              {windowed.length === 0 && (
                <tr>
                  <td colSpan={colSpanAllVisible} className="p-6">
                    <div className="mx-auto max-w-md rounded-md border border-[var(--wr-border)] bg-white p-6 text-center">
                      <div className="text-sm font-semibold">No pages match your filters</div>
                      <div className="mt-1 text-xs text-[var(--wr-muted)]">Try clearing filters or expanding the date range.</div>
                      <button onClick={resetAll} className="mt-3 inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                        <RotateCcw className="size-4 text-[var(--wr-brand)]" /> Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows + inline bulk bar injected above the first selected row */}
              {windowed.map((r, idx) => {
                const lowCRHighlight = r.__cr < RULES.lowCvrPct;
                const highExit = r.exitRate > RULES.highExitPct;
                const injectBulkHere = anySelectedOnPage && idx === firstSelectedIdx;

                return (
                  <React.Fragment key={r.id}>
                    {injectBulkHere && (
                      <tr>
                        <td colSpan={colSpanAllVisible} className="bg-white">
                          <div
                            className="mx-2 mb-2 mt-2 rounded-md border bg-white/95 px-3 py-2 shadow-sm"
                            style={{ borderColor: "var(--wr-border)" }}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-2 text-sm">
                                <TrendingDown className="size-4 text-[var(--wr-brand)]" />
                                <b>{selected.size}</b> selected
                              </span>
                              <span className="text-[var(--wr-muted)]">•</span>
                              <button
                                className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                onClick={() => alert("Create Task for selected — wire to Task service")}
                              >
                                <ClipboardPlus className="size-4" /> Create Task
                              </button>
                              <span className="text-[var(--wr-muted)]">•</span>
                              <button
                                className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                onClick={() =>
                                  exportRowsToCSV(
                                    "low-conversion-selected.csv",
                                    (Object.keys(visible) as ColumnKey[]).filter(k=>visible[k]),
                                    filteredSorted.filter((x) => selected.has(x.id))
                                  )
                                }
                              >
                                <FileDown className="size-4" /> Export CSV
                              </button>
                              <span className="text-[var(--wr-muted)]">•</span>
                              <button
                                className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                onClick={() =>
                                  exportRowsToPNG(
                                    "low-conversion-selected.png",
                                    (Object.keys(visible) as ColumnKey[]).filter(k=>visible[k]),
                                    filteredSorted.filter((x) => selected.has(x.id))
                                  )
                                }
                              >
                                <ImageDown className="size-4" /> Export PNG
                              </button>
                              <span className="text-[var(--wr-muted)]">•</span>
                              <button className="inline-flex items-center gap-1 text-sm text-gray-400 cursor-not-allowed" title="Coming soon">
                                Mark as Optimized <IconLock />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="group bg-white hover:bg-[#F9FAFB]">
                      {visible["select"] && (
                        <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.url}`}
                            checked={selected.has(r.id)}
                            onChange={(e) => { const copy = new Set(selected); if (e.target.checked) copy.add(r.id); else copy.delete(r.id); setSelected(copy); }}
                          />
                        </td>
                      )}

                      {visible["url"] && (
                        <td className={`sticky ${visible["select"] ? "left-[44px]" : "left-0"} z-10 bg-white px-3 py-3 align-top`}>
                          <div className="max-w-[460px]">
                            <a
                              className="line-clamp-1 cursor-pointer font-medium text-[var(--wr-brand)] hover:underline"
                              href="#"
                              onClick={openDrawer}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAnalyzer(r); } }}
                              title="Open Analyzer"
                            >
                              {r.title ?? r.url}
                            </a>
                            <Tooltip label={r.url}>
                              <div className="truncate text-xs text-[var(--wr-muted)]">{slugOf(r.url)}</div>
                            </Tooltip>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {r.__flags.map((f) => (
                                <Tooltip key={f.type} label={f.tip}>
                                  <Badge color={f.colorClass} icon={f.icon}>{f.label}</Badge>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        </td>
                      )}

                      {visible["sessions"] && (
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center">
                            <span className="font-medium">{nf.format(r.sessions)}</span>
                            <SourceChip src="GA4" />
                          </div>
                        </td>
                      )}

                      {visible["conversions"] && (
                        <td className="px-3 py-3 align-top">
                          <span className="rounded px-2 py-0.5 bg-slate-50 text-slate-700">{nf.format(r.conversions)}</span>
                        </td>
                      )}

                      {visible["conversionRate"] && (
                        <td className="px-3 py-3 align-top">
                          <Tooltip label={r.__prevCr != null ? `vs previous period: ${(r.__cr - r.__prevCr).toFixed(2)}pp` : "No previous period for comparison."}>
                            <span className={`rounded px-2 py-0.5 ${lowCRHighlight ? "bg-red-50 text-red-700" : ""}`}>{pf(r.__cr, 2)}</span>
                          </Tooltip>
                        </td>
                      )}

                      {visible["exitRate"] && (
                        <td className={`px-3 py-3 align-top ${highExit ? "text-[var(--wr-danger)] font-medium" : ""}`}>
                          <Tooltip label="GA4: % sessions that exited on this page">
                            <span>{r.exitRate.toFixed(0)}%</span>
                          </Tooltip>
                        </td>
                      )}

                      {visible["avgEngagementTimeSec"] && (
                        <td className="px-3 py-3 align-top">
                          <Tooltip label={`GA4: Avg. active time${r.sessionsByDevice ? " • by device available" : ""}`}>
                            <span>{toTime(r.avgEngagementTimeSec)}</span>
                          </Tooltip>
                        </td>
                      )}

                      {visible["optimizationFlags"] && (
                        <td className="px-3 py-3 align-top">
                          {r.__flags.length === 0 ? <span className="text-gray-400">—</span> : (
                            <div className="flex flex-wrap gap-1">
                              {r.__flags.map((f) => (
                                <Tooltip key={f.type} label={f.tip}><Badge color={f.colorClass} icon={f.icon}>{f.label}</Badge></Tooltip>
                              ))}
                            </div>
                          )}
                        </td>
                      )}

                      {visible["actions"] && (
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <BrandIconBtn label="View Analyzer" onClick={() => openAnalyzer(r)}>
                              <ScanSearch className="size-4" />
                            </BrandIconBtn>
                            <BrandIconBtn label="Create CRO Task" onClick={() => setDrawer({ mode: "task", row: r })}>
                              <ClipboardPlus className="size-4" />
                            </BrandIconBtn>
                            <BrandIconBtn label="CRO Suggestions (beta)" onClick={() => setDrawer({ mode: "suggestions", row: r })}>
                              <Lightbulb className="size-4" />
                            </BrandIconBtn>
                          </div>
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Infinite load more */}
          {mode === "infinite" && infiniteCount < filteredSorted.length && (
            <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent p-3 text-center">
              <button onClick={() => setInfiniteCount((n) => clamp(n + 20, 0, filteredSorted.length))}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Mobile list */}
        <div className="sm:hidden">
          {windowed.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--wr-muted)]">No pages match your filters.</div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
              {windowed.map((r) => (
                <li key={r.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <button className="text-left font-medium text-[var(--wr-brand)] hover:underline cursor-pointer" onClick={() => openAnalyzer(r)}>
                      {r.title ?? r.url}
                    </button>
                    <div className="ml-2 flex items-center gap-1.5">
                      <BrandIconBtn label="View Analyzer" onClick={() => openAnalyzer(r)}><ScanSearch className="size-3.5" /></BrandIconBtn>
                      <BrandIconBtn label="Create Task" onClick={() => setDrawer({ mode: "task", row: r })}><ClipboardPlus className="size-3.5" /></BrandIconBtn>
                      <BrandIconBtn label="Suggestions" onClick={() => setDrawer({ mode: "suggestions", row: r })}><Lightbulb className="size-3.5" /></BrandIconBtn>
                    </div>
                  </div>
                  <div className="truncate text-xs text-[var(--wr-muted)]">{slugOf(r.url)}</div>
                  <div className="mt-2 text-sm">
                    Sessions <b>{nf.format(r.sessions)}</b> • Conversions <b>{nf.format(r.conversions)}</b> • Conv. Rate <b>{pf(r.__cr, 2)}</b>
                  </div>
                  <div className="text-sm">
                    Exit <b className={r.exitRate > RULES.highExitPct ? "text-[var(--wr-danger)] font-medium" : ""}>{r.exitRate.toFixed(0)}%</b> • Avg. Time <b>{toTime(r.avgEngagementTimeSec)}</b>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {r.__flags.map((f) => <Badge key={f.type} color={f.colorClass} icon={f.icon}>{f.label}</Badge>)}
                    {r.__flags.length === 0 && <span className="text-gray-400">—</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer (pagination) */}
        {mode === "pagination" && (
          <div className="flex items-center justify-between p-3 border-t text-xs text-[var(--wr-muted)]" style={{ borderColor: "var(--wr-borderLight)" }}>
            <div>Showing <b>{filteredSorted.length === 0 ? 0 : page * pageSize + 1}</b>–<b>{Math.min(filteredSorted.length, (page + 1) * pageSize)}</b> of <b>{filteredSorted.length}</b></div>
            <div />
          </div>
        )}
      </div>

      {/* Drawers */}
      {drawer && (
        <Drawer title={drawer.mode === "analyzer" ? "Page Analyzer" : drawer.mode === "task" ? "Create Task" : "CRO Suggestions"} onClose={() => setDrawer(null)}>
          {drawer.mode === "analyzer" ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold">{drawer.row.title ?? drawer.row.url}</div>
                <div className="text-[var(--wr-muted)]">{drawer.row.url}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi label="Sessions (GA4)" value={nf.format(drawer.row.sessions)} />
                <Kpi label="Conversions (GA4)" value={nf.format(drawer.row.conversions)} />
                <Kpi label="Conv. Rate" value={pf(drawer.row.__cr, 2)} sub={drawer.row.__prevCr != null ? `Δ ${(drawer.row.__cr - drawer.row.__prevCr).toFixed(2)}pp vs previous` : "—"} />
                <Kpi label="Exit Rate" value={`${drawer.row.exitRate.toFixed(0)}%`} sub="GA4: % sessions that exited" />
                <Kpi label="Avg. Engagement Time" value={toTime(drawer.row.avgEngagementTimeSec)} />
                {drawer.row.__ctaClickRate != null && <Kpi label="CTA Click Rate" value={`${drawer.row.__ctaClickRate.toFixed(2)}%`} sub="Wranker (derived)" />}
              </div>
              <div className="pt-2">
                <div className="mb-2 font-medium">Primary actions</div>
                <div className="flex flex-wrap gap-2">
                  <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer" title="Deep link (future)">
                    <ScanSearch className="size-4 text-[var(--wr-brand)]" /> Open Page in Analyzer
                  </a>
                  <a
                    href={drawer.row.url.startsWith("http") ? drawer.row.url : `https://example.com${drawer.row.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <ExternalLink className="size-4 text-[var(--wr-brand)]" /> Open Live Page
                  </a>
                </div>
              </div>
              <div className="pt-3">
                <div className="mb-2 font-medium">Create CRO Task</div>
                <TaskForm
                  defaultTitle={`Optimize: ${drawer.row.title ?? drawer.row.url}`}
                  defaultUrl={drawer.row.url}
                  onSubmit={(payload) => {
                    alert("Task created (stub) — wire to your backend.");
                    track("lco_task_created", { rowId: drawer.row.id, url: drawer.row.url, priority: payload.priority, tag: payload.tag });
                    setDrawer(null);
                  }}
                />
              </div>
            </div>
          ) : drawer.mode === "task" ? (
            <TaskForm
              defaultTitle={`Optimize: ${drawer.row.title ?? drawer.row.url}`}
              defaultUrl={drawer.row.url}
              onSubmit={(payload) => {
                alert("Task created (stub) — wire to your backend.");
                track("lco_task_created", { rowId: drawer.row.id, url: drawer.row.url, priority: payload.priority, tag: payload.tag });
                setDrawer(null);
              }}
            />
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold">Suggestions (beta)</div>
                <div className="text-[var(--wr-muted)]">Generated from detected flags.</div>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {drawer.row.__flags.find(f => f.type === "LOW_CVR") && (
                  <li>Test a primary CTA in the first viewport (sticky on scroll). Add social proof near CTAs.</li>
                )}
                {drawer.row.__flags.find(f => f.type === "HIGH_EXIT") && (
                  <li>Reduce friction: simplify layout above the fold, add internal links to next steps.</li>
                )}
                {drawer.row.__flags.find(f => f.type === "SCROLL_GAP") && (
                  <li>Insert mid‑page inline CTA or in‑content signup after key benefits; add CTA in TOC jump links.</li>
                )}
                {drawer.row.__flags.find(f => f.type === "STALE") && (
                  <li>Refresh copy, update screenshots, and re‑publish to trigger recrawl; consider schema updates.</li>
                )}
              </ul>
              <div className="pt-2">
                <button className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => { alert("Suggestion saved as Task (stub)."); track("lco_suggestion_opened", { rowId: drawer.row.id }); }}>
                  <ClipboardPlus className="size-4 text-[var(--wr-brand)]" /> Save as Task
                </button>
              </div>
            </div>
          )}
        </Drawer>
      )}
    </section>
  );
}
