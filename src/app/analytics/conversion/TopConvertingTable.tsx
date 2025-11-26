"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  Columns as ColumnsIcon,
  Search as SearchIcon,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Laptop,
  Smartphone,
  Tablet,
  X,
  RotateCcw,
  Download,
  Lock,
  Eye,
  ClipboardPlus,
  GitCompare,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import DemoDrawerHeaderPage from "../landing/drawer/DemoDrawerHeaderPage";

/**
 * Wranker · Analytics · Tab 3 → Section 3: Top Converting Landing Pages
 * - Updated per refinement brief: Inter fonts, branded icons, modular chips/toggles,
 *   single export button w/ dropdown, pointer cursors, bulk bar above selected rows,
 *   action icons (brand color) without borders, table layout parity.
 * - Place at: app/(analytics)/tab-3/sections/TopConvertingTable.tsx
 */

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */

export type TopLandingRow = {
  id: string;
  url: string;
  title?: string;

  sessions: number;
  conversions: number;
  bounceRate: number; // 0–100
  avgEngagementTimeSec: number;

  deviceSplit?: {
    desktop: number;
    mobile: number;
    tablet?: number;
  };

  prev?: {
    sessions: number;
    conversions: number;
    bounceRate?: number;
    avgEngagementTimeSec?: number;
  };
};

type WithDerived = TopLandingRow & {
  __cr: number;
  __prevCr?: number;
};

type ColumnKey =
  | "select"
  | "url"
  | "sessions"
  | "conversions"
  | "conversionRate"
  | "bounceRate"
  | "avgEngagementTimeSec"
  | "deviceSplit"
  | "actions";

type SortDir = "asc" | "desc";

/* ────────────────────────────────────────────────────────────────────────────
   Tokens
   ──────────────────────────────────────────────────────────────────────────── */

const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
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
   Column config
   ──────────────────────────────────────────────────────────────────────────── */

const HEADER_META: Record<
  ColumnKey,
  { label: string; tooltip?: string; source?: "GA4" | "Internal" }
> = {
  select: { label: "" },
  url: {
    label: "Page URL / Title",
    tooltip: "Full path (click to open Page Detail View).",
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
  bounceRate: {
    label: "Bounce Rate",
    tooltip: "% sessions with no engagement (GA4).",
    source: "GA4",
  },
  avgEngagementTimeSec: {
    label: "Avg. Engagement Time",
    tooltip: "Average active time on page (GA4).",
    source: "GA4",
  },
  deviceSplit: {
    label: "Device Split",
    tooltip: "Conversions by device.",
    source: "GA4",
  },
  actions: {
    label: "Actions",
    tooltip: "Open Analyzer / Create Task / Compare.",
    source: "Internal",
  },
};

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  select: true,
  url: true,
  sessions: true,
  conversions: true,
  conversionRate: true,
  bounceRate: true,
  avgEngagementTimeSec: true,
  deviceSplit: true,
  actions: true,
};

const TOGGLABLE_COLUMNS: ColumnKey[] = [
  "sessions",
  "conversions",
  "conversionRate",
  "bounceRate",
  "avgEngagementTimeSec",
  "deviceSplit",
];

/* ────────────────────────────────────────────────────────────────────────────
   Utils
   ──────────────────────────────────────────────────────────────────────────── */

const nf = new Intl.NumberFormat("en-US");
const pf = (n: number, dp = 2) => `${n.toFixed(dp)}%`;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function toTime(mmss: number) {
  const m = Math.floor(mmss / 60);
  const s = Math.floor(mmss % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeMetric(n: unknown, fallback = 0) {
  const v = typeof n === "number" && isFinite(n) && n >= 0 ? n : fallback;
  return v;
}

function computeCR(sessions: number, conversions: number) {
  if (sessions <= 0) return 0;
  return (conversions / sessions) * 100;
}

function signed(n: number, dp = 2) {
  const s = n >= 0 ? "+" : "−";
  const v = Math.abs(n).toFixed(dp);
  return `${s}${v}`;
}

function percentile75(values: number[]) {
  if (values.length === 0) return 0;
  const arr = [...values].sort((a, b) => a - b);
  const idx = (arr.length - 1) * 0.75;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  const w = idx - lo;
  return arr[lo] * (1 - w) + arr[hi] * w;
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
  const detail = { section: "top_converting_landing_pages", event, ...props };
  window.dispatchEvent(new CustomEvent("wranker-analytics", { detail }));
  // eslint-disable-next-line no-console
  console.log("[track]", detail);
}

/* CSV export */
function exportRowsToCSV(filename: string, cols: ColumnKey[], rows: WithDerived[]) {
  const visibleCols = cols.filter((c) => c !== "select" && c !== "actions");
  const cap = Math.min(rows.length, 1000);
  const headers = visibleCols.map((c) => HEADER_META[c].label);
  const mapCell = (r: WithDerived, c: ColumnKey) => {
    switch (c) {
      case "url":
        return r.title ? `${r.url} (${r.title})` : r.url;
      case "sessions":
        return r.sessions;
      case "conversions":
        return r.conversions;
      case "conversionRate":
        return `${r.__cr.toFixed(2)}%`;
      case "bounceRate":
        return `${normalizeMetric(r.bounceRate, 0).toFixed(0)}%`;
      case "avgEngagementTimeSec":
        return toTime(normalizeMetric(r.avgEngagementTimeSec, 0));
      case "deviceSplit": {
        const d = r.deviceSplit;
        if (!d) return "";
        const parts = [
          `Desktop: ${(d.desktop * 100).toFixed(0)}%`,
          `Mobile: ${(d.mobile * 100).toFixed(0)}%`,
          ...(d.tablet != null ? [`Tablet: ${(d.tablet * 100).toFixed(0)}%`] : []),
        ];
        return parts.join(" • ");
      }
      default:
        return "";
    }
  };
  const body = rows
    .slice(0, cap)
    .map((r) =>
      visibleCols
        .map((c) => String(mapCell(r, c)).replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(","),
    )
    .join("\n");
  const footer = `\n"Exported ${cap} of ${rows.length} rows · Wranker"`;
  const csv = [headers.join(","), body, footer].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  track("tlp_export", { format: "csv", rows: cap });
}

/* PNG export (flat draw; Inter / Inter Fallback) */
async function exportRowsToPNG(filename: string, cols: ColumnKey[], rows: WithDerived[]) {
  const visibleCols = cols.filter((c) => c !== "select" && c !== "actions");
  const padX = 16;
  const rowH = 28;
  const headerH = 40;
  const footerH = 24;
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

  // Header
  ctx.fillStyle = "#111827";
  ctx.font = 'bold 14px Inter, "Inter Fallback", ui-sans-serif, system-ui';
  let x = padX;
  visibleCols.forEach((c, i) => {
    ctx.fillText(HEADER_META[c].label, x, 22);
    x += widths[i];
  });

  // Rows
  ctx.font = '12px Inter, "Inter Fallback", ui-sans-serif, system-ui';
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

  // Footer
  ctx.fillStyle = "#6B7280";
  ctx.font = '12px Inter, "Inter Fallback", ui-sans-serif, system-ui';
  ctx.fillText(`Exported ${cap} of ${rows.length} rows · Wranker`, padX, totalH - 8);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    track("tlp_export", { format: "png", rows: cap });
  }, "image/png");
}

function cellText(r: WithDerived, c: ColumnKey) {
  switch (c) {
    case "url":
      return (r.title ?? r.url) + " — " + slugOf(r.url);
    case "sessions":
      return nf.format(normalizeMetric(r.sessions, 0));
    case "conversions":
      return nf.format(normalizeMetric(r.conversions, 0));
    case "conversionRate":
      return `${r.__cr.toFixed(2)}%`;
    case "bounceRate":
      return `${normalizeMetric(r.bounceRate, 0).toFixed(0)}%`;
    case "avgEngagementTimeSec":
      return toTime(normalizeMetric(r.avgEngagementTimeSec, 0));
    case "deviceSplit": {
      const d = r.deviceSplit;
      if (!d) return "";
      const parts = [
        `Desktop: ${(d.desktop * 100).toFixed(0)}%`,
        `Mobile: ${(d.mobile * 100).toFixed(0)}%`,
        ...(d.tablet != null ? [`Tablet: ${(d.tablet * 100).toFixed(0)}%`] : []),
      ];
      return parts.join(" • ");
    }
    default:
      return "";
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   UI atoms (brand + no emoji)
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

function InfoBadge({ title }: { title: string }) {
  return (
    <span
      tabIndex={0}
      aria-label={title}
      title={title}
      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[12px] text-[var(--wr-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--wr-brand)]"
    >
      <Info size={12} />
    </span>
  );
}

/* Modular pill (active: brand pastel) */
function Pill({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      className={`h-8 cursor-pointer rounded-full border px-3 text-sm ${active ? "font-semibold" : ""}`}
      style={{
        borderColor: "var(--wr-borderLight)",
        background: active ? "var(--wr-pastel-blue)" : "#fff",
        color: active ? "var(--wr-value-blue)" : "inherit",
      }}
    >
      {label}
    </button>
  );
}

/* Segmented control (2 options used here) */
function Segmented({
  left,
  right,
  value,
  onChange,
  ariaLabel,
}: {
  left: { key: string; label: string };
  right: { key: string; label: string };
  value: string;
  onChange: (k: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-md border"
      style={{ borderColor: "var(--wr-border)" }}
    >
      {[left, right].map((opt, i) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`cursor-pointer px-3 py-2 text-sm transition ${i > 0 ? "border-l" : ""}`}
            style={{
              borderColor: "var(--wr-border)",
              background: active ? "var(--wr-pastel-blue)" : "#fff",
              color: active ? "var(--wr-value-blue)" : "inherit",
              fontWeight: active ? 600 : 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* Column header (sortable) */
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
  const icon = !isActive ? (
    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-gray-400" />
  ) : props.sortDir === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5 text-[var(--wr-brand)]" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5 text-[var(--wr-brand)]" />
  );
  return (
    <th
      className={`px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)] ${props.widthClass ?? ""} ${
        props.stickyLeft ? "sticky bg-white z-20" : ""
      }`}
      style={props.stickyLeft ? { left: `${props.leftPx ?? 0}px` } : undefined}
    >
      <button
        onClick={() => props.onSort(props.colKey)}
        className="flex cursor-pointer items-center whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--wr-brand)]"
        title={props.tooltip}
        aria-label={`Sort by ${props.label}`}
      >
        <span>{props.label}</span>
        {props.source && <SourceChip src={props.source} />}
        {icon}
      </button>
    </th>
  );
}

/* Drawer & small bits (icons only; no emoji) */

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[420px] max-w-[90vw] overflow-auto bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50"
            title="Close"
          >
            <X className="h-4 w-4" />
            Close
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
  onSubmit: (payload: { title: string; priority: string; due?: string; notes: string }) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, priority, due: due || undefined, notes });
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs text-[var(--wr-muted)]">Task Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-[var(--wr-border)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--wr-muted)]">Page URL</label>
        <input
          value={defaultUrl}
          readOnly
          className="w-full rounded-md border border-[var(--wr-border)] bg-gray-50 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--wr-muted)]">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full rounded-md border border-[var(--wr-border)] px-2 py-2 text-sm"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--wr-muted)]">Due</label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full rounded-md border border-[var(--wr-border)] px-2 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--wr-muted)]">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[var(--wr-border)] px-3 py-2 text-sm"
          placeholder="Context, hypothesis, acceptance criteria…"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--wr-brand)] px-3 py-2 text-sm text-white hover:brightness-105"
        >
          <ClipboardPlus className="h-4 w-4" />
          Create Task
        </button>
      </div>
    </form>
  );
}

/* Column manager (url/actions fixed) */
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
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50"
        title="Choose columns"
      >
        <ColumnsIcon className="h-4 w-4" />
        Columns
        <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-64 rounded-md border border-[var(--wr-border)] bg-white p-2 shadow-lg">
          <div className="mb-1 text-xs font-semibold text-[var(--wr-muted)]">Toggle columns</div>
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {TOGGLABLE_COLUMNS.map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 hover:bg-gray-50"
              >
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
            <button
              className="cursor-pointer rounded-md border border-[var(--wr-border)] bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
              onClick={() => {
                const next = { ...DEFAULT_VISIBLE };
                onChange(next);
              }}
            >
              Reset
            </button>
            <button
              className="cursor-pointer rounded-md bg-[var(--wr-brand)] px-3 py-1.5 text-xs text-white hover:brightness-105"
              onClick={() => setOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Mock data
   ──────────────────────────────────────────────────────────────────────────── */

function mockRows(count = 60): TopLandingRow[] {
  const urls = [
    "/contact-form",
    "/checkout",
    "/seo-audit-tool",
    "/pricing",
    "/blog/seo-checklist-2025",
    "/features/optimizer",
    "/landing/ebook-seo",
    "/trial-signup",
    "/demo-request",
  ];
  const titles = [
    "Contact Form",
    "Checkout",
    "SEO Audit Tool",
    "Pricing",
    "SEO Checklist 2025",
    "Optimizer",
    "SEO eBook Landing",
    "Free Trial Signup",
    "Request a Demo",
  ];
  const arr: TopLandingRow[] = [];
  for (let i = 0; i < count; i++) {
    const k = i % urls.length;
    const sessions = Math.floor(50 + Math.random() * 6000);
    const conversions = Math.floor(Math.random() * Math.max(1, sessions * 0.12));
    const bounceRate = Math.max(0, Math.min(100, Math.round(15 + Math.random() * 80)));
    const avgEngagementTimeSec = 30 + Math.floor(Math.random() * 240);

    const prevSessions = Math.floor(30 + Math.random() * 5000);
    const prevConversions = Math.floor(Math.random() * Math.max(1, prevSessions * 0.12));

    const hasDevice = Math.random() < 0.8;
    const d = hasDevice
      ? {
          desktop: Math.random() * 0.7 + 0.2,
          mobile: Math.random() * 0.7 + 0.2,
          tablet: Math.random() < 0.6 ? Math.random() * 0.2 : undefined,
        }
      : undefined;
    if (d) {
      const sum = d.desktop + d.mobile + (d.tablet || 0);
      d.desktop /= sum;
      d.mobile /= sum;
      if (d.tablet != null) d.tablet /= sum;
    }

    arr.push({
      id: `tlp_${i}`,
      url: urls[k],
      title: titles[k],
      sessions,
      conversions,
      bounceRate,
      avgEngagementTimeSec,
      deviceSplit: d,
      prev: Math.random() < 0.85 ? { sessions: prevSessions, conversions: prevConversions } : undefined,
    });
  }
  return arr;
}

/* ────────────────────────────────────────────────────────────────────────────
   Main export
   ──────────────────────────────────────────────────────────────────────────── */

export default function TopConvertingTable({ rows: propRows }: { rows?: TopLandingRow[] }) {
  return (
    <div
      className="w-full mt-4"
      style={
        {
          fontFamily:
            'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
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
        } as React.CSSProperties
      }
    >
      <TopConvertingTableInner rows={propRows ?? mockRows(120)} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Inner section
   ──────────────────────────────────────────────────────────────────────────── */

function TopConvertingTableInner({ rows }: { rows: TopLandingRow[] }) {
  const baseRows: WithDerived[] = useMemo(
    () =>
      rows.map((r) => {
        const sessions = normalizeMetric(r.sessions, 0);
        const conversions = normalizeMetric(r.conversions, 0);
        const bounceRate = normalizeMetric(r.bounceRate, 0);
        const avgEngagementTimeSec = normalizeMetric(r.avgEngagementTimeSec, 0);
        const prevSessions = normalizeMetric(r.prev?.sessions, 0);
        const prevConversions = normalizeMetric(r.prev?.conversions, 0);

        return {
          ...r,
          sessions,
          conversions,
          bounceRate,
          avgEngagementTimeSec,
          __cr: computeCR(sessions, conversions),
          __prevCr:
            r.prev && prevSessions > 0 ? computeCR(prevSessions, prevConversions) : undefined,
        };
      }),
    [rows],
  );

  const initialMode: "pagination" | "infinite" = baseRows.length > 1000 ? "infinite" : "pagination";
  const [mode, setMode] = useState<"pagination" | "infinite">(initialMode);

  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(structuredClone(DEFAULT_VISIBLE));

  const [sortKey, setSortKey] = useState<ColumnKey>("conversions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [queryInput]);

  const [preset, setPreset] = useState<"all" | "top" | "high-bounce" | "low-traffic">("all");

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
      if (nearBottom) {
        setInfiniteCount((n) => Math.min(n + 20, filteredSorted.length));
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [drawer, setDrawer] = useState<{
    mode: "analyzer" | "task";
    row: WithDerived;
  } | null>(null);

  // Export dropdown (single Export button)
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Filters: search + presets
  const filtered: WithDerived[] = useMemo(() => {
    const q = query;
    let out = baseRows.filter(
      (r) => !q || r.url.toLowerCase().includes(q) || (r.title ?? "").toLowerCase().includes(q),
    );
    switch (preset) {
      case "top":
        out = [...out]
          .sort((a, b) => {
            if (b.conversions !== a.conversions) return b.conversions - a.conversions;
            return b.sessions - a.sessions;
          })
          .slice(0, 30);
        break;
      case "high-bounce":
        out = out.filter((r) => r.bounceRate >= 60);
        break;
      case "low-traffic":
        out = out.filter((r) => r.sessions < 200);
        break;
      default:
        break;
    }
    return out;
  }, [baseRows, preset, query]);

  // Sorting
  const filteredSorted: WithDerived[] = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: WithDerived, b: WithDerived): number => {
      switch (sortKey) {
        case "url": {
          const A = (a.title ?? a.url).toLocaleLowerCase("en-US");
          const B = (b.title ?? b.url).toLocaleLowerCase("en-US");
          return dir * A.localeCompare(B);
        }
        case "sessions":
          return dir * ((a.sessions - b.sessions) || (a.conversions - b.conversions) || (a.__cr - b.__cr));
        case "conversions":
          return dir * ((a.conversions - b.conversions) || (a.sessions - b.sessions) || (a.__cr - b.__cr));
        case "conversionRate":
          return dir * ((a.__cr - b.__cr) || (a.conversions - b.conversions) || (a.sessions - b.sessions));
        case "bounceRate":
          return dir * ((a.bounceRate - b.bounceRate) || (a.__cr - b.__cr));
        case "avgEngagementTimeSec":
          return dir * ((a.avgEngagementTimeSec - b.avgEngagementTimeSec) || (a.__cr - b.__cr));
        case "deviceSplit": {
          const aDesk = a.deviceSplit?.desktop ?? 0;
          const bDesk = b.deviceSplit?.desktop ?? 0;
          return dir * ((aDesk - bDesk) || (a.__cr - b.__cr));
        }
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Percentiles for badges
  const thresholds = useMemo(() => {
    const convs = filteredSorted.map((r) => r.conversions);
    const crs = filteredSorted.map((r) => r.__cr);
    return {
      p75Conv: percentile75(convs),
      p75Cr: percentile75(crs),
    };
  }, [filteredSorted]);

  // Pagination / window
  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const windowed: WithDerived[] = useMemo(() => {
    if (mode === "infinite") return filteredSorted.slice(0, infiniteCount);
    const start = page * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, mode, infiniteCount, page, pageSize]);

  const allOnPageSelected = windowed.length > 0 && windowed.every((r) => selected.has(r.id));
  const someOnPageSelected = windowed.some((r) => selected.has(r.id)) && !allOnPageSelected;

  function resetAll() {
    setQueryInput("");
    setQuery("");
    setPreset("all");
    setSortKey("conversions");
    setSortDir("desc");
    setPage(0);
    setInfiniteCount(20);
    setVisible(structuredClone(DEFAULT_VISIBLE));
    track("tlp_filter_changed", { query: "", preset: "All" });
  }

  function renderCRWithTrend(r: WithDerived) {
    const showTrend = r.__prevCr != null && r.sessions > 0 && (r.prev?.sessions ?? 0) > 0;
    if (!showTrend) {
      const tip = r.sessions <= 0 ? "No sessions this period." : "No previous period for comparison.";
      return (
        <Tooltip label={tip}>
          <span>{pf(r.__cr, 2)}</span>
        </Tooltip>
      );
    }
    const delta = r.__cr - (r.__prevCr as number); // pp
    const isUp = delta >= 0.2;
    const isDown = delta <= -0.2;
    const color = isUp ? "text-[var(--wr-success)]" : isDown ? "text-[var(--wr-danger)]" : "text-gray-400";
    const label = `Conversion rate ${isUp ? "up" : isDown ? "down" : "flat"} by ${signed(delta, 2)} percentage points vs previous period`;
    const tip = `vs previous period: ${signed(delta, 2)}pp`;
    return (
      <Tooltip label={tip}>
        <span className="inline-flex items-center gap-1" aria-label={label}>
          <span>{pf(r.__cr, 2)}</span>
          <span className={`text-xs ${color}`}>{isUp ? "▲" : isDown ? "▼" : "↔︎"}</span>
        </span>
      </Tooltip>
    );
  }

  function DeviceSplitCell({ row }: { row: WithDerived }) {
    const d = row.deviceSplit;
    if (!d) return <span className="text-gray-400">—</span>;
    const parts = [
      `Desktop: ${((d.desktop ?? 0) * 100).toFixed(0)}%`,
      `Mobile: ${((d.mobile ?? 0) * 100).toFixed(0)}%`,
      ...(d.tablet != null ? [`Tablet: ${((d.tablet ?? 0) * 100).toFixed(0)}%`] : []),
    ];
    const tip = parts.join(" • ");
    return (
      <Tooltip label={tip}>
        <span className="inline-flex items-center gap-1 text-[var(--wr-brand)]" aria-label={tip} title={tip}>
          {d.desktop > 0 && <Laptop className="h-4 w-4" />}
          {d.mobile > 0 && <Smartphone className="h-4 w-4" />}
          {d.tablet != null && d.tablet > 0 && <Tablet className="h-4 w-4" />}
        </span>
      </Tooltip>
    );
  }

  const visibleColumns = (Object.keys(visible) as ColumnKey[]).filter((k) => visible[k]);

  function toggleSort(k: ColumnKey) {
    if (k === "select" || k === "actions") return;
    let nextDir: SortDir;
    if (sortKey !== k) {
      nextDir = k === "bounceRate" ? "asc" : "desc";
    } else {
      nextDir = sortDir === "desc" ? "asc" : "desc";
    }
    setSortKey(k);
    setSortDir(nextDir);
    track("tlp_sort_changed", { key: k, dir: nextDir });
  }

  // Bulk bar injection point (just above first selected row on current window)
  const bulkBarIndex = windowed.findIndex((r) => selected.has(r.id));
  const colSpanFull = (Object.keys(visible) as ColumnKey[]).reduce((acc, k) => acc + (visible[k] ? 1 : 0), 0);
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
  function BulkBarRow() {
    if (selected.size === 0 || bulkBarIndex < 0) return null;
    const selectedRows = filteredSorted.filter((r) => selected.has(r.id));
    return (
      <tr> 
        <td colSpan={colSpanFull} className="bg-white px-3 py-2">
          <div className="mx-0 flex items-center justify-between rounded-md border border-[var(--wr-border)] bg-[#FAFCFE] px-3 py-2">
            <div className="text-sm">
              <span className="font-medium">{selected.size}</span> selected
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[var(--wr-brand)] px-3 py-1.5 text-xs text-white hover:brightness-105"
                onClick={() => alert("Create Task for selected — wire to backend")}
                title="Create Task"
              >
                <ClipboardPlus className="h-4 w-4" />
                Create Task
              </button>

              {/* Export (selected) dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen((s) => !s)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
                  title="Export selected"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {exportOpen && (
                  <div
                    className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 shadow-lg"
                    style={{ borderColor: "var(--wr-borderLight)" }}
                  >
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        exportRowsToCSV(
                          "top-converting-selected.csv",
                          visibleColumns,
                          selectedRows,
                        );
                      }}
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      CSV (Selected)
                    </button>
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        exportRowsToPNG(
                          "top-converting-selected.png",
                          visibleColumns,
                          selectedRows,
                        );
                      }}
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      PNG (Selected)
                    </button>
                    <button
                      disabled
                      className="block w-full cursor-not-allowed rounded px-3 py-2 text-left text-sm text-gray-400"
                      title="Pro feature"
                    >
                      XLSX <Lock className="ml-1 inline h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled
                      className="block w-full cursor-not-allowed rounded px-3 py-2 text-left text-sm text-gray-400"
                      title="Pro feature"
                    >
                      PDF <Lock className="ml-1 inline h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>
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
      <div
        className="rounded-[var(--wr-radius)] border bg-[var(--wr-card-bg)]"
        style={{ borderColor: "var(--wr-border)" }}
      >
        {/* Header Bar */}
        <div
          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b"
          style={{ borderColor: "var(--wr-borderLight)" }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--wr-brand)]" />
            <div className="text-lg font-semibold">Top Converting Landing Pages</div>
            <InfoBadge title="Reveal which landing pages convert best so teams can replicate what works and fix low performers." />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode segmented */}
            <Segmented
              ariaLabel="Paging mode"
              value={mode}
              onChange={(k) => setMode(k as any)}
              left={{ key: "pagination", label: "Pages" }}
              right={{ key: "infinite", label: "Infinite" }}
            />

            {/* Column manager */}
            <ColumnManager visible={visible} onChange={setVisible} />

            {/* Export dropdown (single header button) */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((s) => !s)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50"
                title="Export options"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 shadow-lg"
                  style={{ borderColor: "var(--wr-borderLight)" }}
                >
                  <button
                    onClick={() => {
                      setExportOpen(false);
                      exportRowsToCSV("top-converting-landing-pages.csv", visibleColumns, filteredSorted);
                    }}
                    className="block w-full cursor-pointer rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    CSV (All)
                  </button>
                  <button
                    onClick={() => {
                      setExportOpen(false);
                      exportRowsToPNG("top-converting-landing-pages.png", visibleColumns, filteredSorted);
                    }}
                    className="block w-full cursor-pointer rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    PNG (All)
                  </button>
                  <button
                    disabled
                    className="block w-full cursor-not-allowed rounded px-3 py-2 text-left text-sm text-gray-400"
                    title="Pro feature"
                  >
                    XLSX <Lock className="ml-1 inline h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled
                    className="block w-full cursor-not-allowed rounded px-3 py-2 text-left text-sm text-gray-400"
                    title="Pro feature"
                  >
                    PDF <Lock className="ml-1 inline h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              onClick={resetAll}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50"
              title="Reset filters & columns"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Filters Row (chips + search + pagination controls) */}
        <div
          className="flex flex-wrap items-center gap-2 p-3 border-b"
          style={{ borderColor: "var(--wr-borderLight)" }}
        >
          {/* Search */}
          <div className="relative">
            <input
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
                setPage(0);
              }}
              placeholder="Search by URL or title…"
              className="w-[280px] rounded-md border border-[var(--wr-border)] bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--wr-brand)]"
            />
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Preset chips (modular) */}
          {([
            ["all", "All Pages"],
            ["top", "Top Converters"],
            ["high-bounce", "High Bounce"],
            ["low-traffic", "Low Traffic"],
          ] as const).map(([val, label]) => (
            <Pill
              key={val}
              label={label}
              active={preset === val}
              onClick={() => {
                setPreset(val as any);
                setPage(0);
                track("tlp_filter_changed", { query, preset: label });
              }}
              title={`Filter: ${label}`}
            />
          ))}

          {/* Pagination controls (when pagination) */}
          {mode === "pagination" && (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                className="h-8 cursor-pointer rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm"
                title="Rows per page"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40"
                title="First"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40"
                title="Prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm">
                {page + 1} / {Math.max(1, pageCount)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.max(0, pageCount - 1))}
                disabled={page >= pageCount - 1}
                className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-2 text-sm disabled:opacity-40"
                title="Last"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div ref={scrollRef} className="relative hidden max-h-[64vh] overflow-auto sm:block">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_var(--wr-border)]">
              <tr className="text-left">
                {visible["select"] && (
                  <th className="sticky left-0 z-30 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      className="cursor-pointer"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) (el as any).indeterminate = someOnPageSelected;
                      }}
                      onChange={(e) => {
                        const copy = new Set(selected);
                        windowed.forEach((r) => {
                          if (e.target.checked) copy.add(r.id);
                          else copy.delete(r.id);
                        });
                        setSelected(copy);
                      }}
                    />
                  </th>
                )}
                {visible["url"] && (
                  <Th
                    colKey="url"
                    label={HEADER_META.url.label}
                    tooltip={HEADER_META.url.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    stickyLeft
                    leftPx={visible["select"] ? 44 : 0}
                    widthClass="min-w-[300px]"
                  />
                )}
                {visible["sessions"] && (
                  <Th
                    colKey="sessions"
                    label={HEADER_META.sessions.label}
                    tooltip={HEADER_META.sessions.tooltip}
                    source="GA4"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["conversions"] && (
                  <Th
                    colKey="conversions"
                    label={HEADER_META.conversions.label}
                    tooltip={HEADER_META.conversions.tooltip}
                    source="GA4"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["conversionRate"] && (
                  <Th
                    colKey="conversionRate"
                    label={HEADER_META.conversionRate.label}
                    tooltip={HEADER_META.conversionRate.tooltip}
                    source="GA4"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["bounceRate"] && (
                  <Th
                    colKey="bounceRate"
                    label={HEADER_META.bounceRate.label}
                    tooltip={HEADER_META.bounceRate.tooltip}
                    source="GA4"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["avgEngagementTimeSec"] && (
                  <Th
                    colKey="avgEngagementTimeSec"
                    label={HEADER_META.avgEngagementTimeSec.label}
                    tooltip={HEADER_META.avgEngagementTimeSec.tooltip}
                    source="GA4"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["deviceSplit"] && (
                  <Th
                    colKey="deviceSplit"
                    label={HEADER_META.deviceSplit.label}
                    tooltip={HEADER_META.deviceSplit.tooltip}
                    source="GA4"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["actions"] && (
                  <th className="px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)]" title={HEADER_META.actions.tooltip}>
                    {HEADER_META.actions.label}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
              {windowed.length === 0 && (
                <tr>
                  <td
                    colSpan={(visibleColumns.length || 1) + (visible.select ? 1 : 0)}
                    className="p-6"
                  >
                    <div className="mx-auto max-w-md rounded-md border border-[var(--wr-border)] bg-white p-6 text-center">
                      <div className="text-sm font-semibold">No pages match your filters</div>
                      <div className="mt-1 text-xs text-[var(--wr-muted)]">
                        Try clearing filters or expanding the date range.
                      </div>
                      <button
                        onClick={resetAll}
                        className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Bulk bar inserted just above first selected row */}
              {bulkBarIndex >= 0 && <BulkBarRow />}

              {windowed.map((r, idx) => {
                const highBounce = r.bounceRate >= 60;
                const highConversions = r.conversions >= thresholds.p75Conv || r.__cr >= thresholds.p75Cr;

                return (
                  <tr key={r.id} className="bg-white hover:bg-[#F9FAFB]">
                    {visible["select"] && (
                      <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.url}`}
                          className="cursor-pointer"
                          checked={selected.has(r.id)}
                          onChange={(e) => {
                            const copy = new Set(selected);
                            if (e.target.checked) copy.add(r.id);
                            else copy.delete(r.id);
                            setSelected(copy);
                          }}
                        />
                      </td>
                    )}

                    {visible["url"] && (
                      <td
                        className={`sticky ${visible["select"] ? "left-[44px]" : "left-0"} z-10 bg-white px-3 py-3 align-top`}
                      >
                        <div className="max-w-[400px]">
                          <a
                            className="line-clamp-1 cursor-pointer font-medium text-[var(--wr-brand)] hover:underline"
                            href="#"
                            onClick={openDrawer}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setDrawer({ mode: "analyzer", row: r });
                                track("tlp_view_opened", { rowId: r.id, url: r.url });
                              }
                            }}
                            title="Open Analyzer"
                          >
                            {r.title ?? r.url}
                          </a>
                          <Tooltip label={r.url}>
                            <div className="truncate text-xs text-[var(--wr-muted)]">{slugOf(r.url)}</div>
                          </Tooltip>
                          <div className="mt-1 flex items-center gap-1">
                            {highBounce && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                High Bounce
                              </span>
                            )}
                            {highConversions && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                High Conversions
                              </span>
                            )}
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
                        <span
                          className={`rounded px-2 py-0.5 ${
                            highConversions ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          {nf.format(r.conversions)}
                        </span>
                      </td>
                    )}

                    {visible["conversionRate"] && (
                      <td className="px-3 py-3 align-top">{renderCRWithTrend(r)}</td>
                    )}

                    {visible["bounceRate"] && (
                      <td
                        className={`px-3 py-3 align-top ${
                          highBounce ? "text-[var(--wr-danger)] font-medium" : ""
                        }`}
                      >
                        <Tooltip label="GA4: % sessions with no engagement">
                          <span>{r.bounceRate.toFixed(0)}%</span>
                        </Tooltip>
                      </td>
                    )}

                    {visible["avgEngagementTimeSec"] && (
                      <td className="px-3 py-3 align-top">
                        <Tooltip label="GA4: Average active time on page">
                          <span>{toTime(r.avgEngagementTimeSec)}</span>
                        </Tooltip>
                      </td>
                    )}

                    {visible["deviceSplit"] && (
                      <td className="px-3 py-3 align-top">
                        <DeviceSplitCell row={r} />
                      </td>
                    )}

                    {visible["actions"] && (
                      <td className="px-3 py-3 align-top">
                        <div className="flex gap-3">
                          <Tooltip label="View Analyzer">
                            <button
                              className="cursor-pointer text-[var(--wr-brand)] hover:opacity-80"
                              title="View Analyzer"
                              onClick={() => {
                                setDrawer({ mode: "analyzer", row: r });
                                track("tlp_view_opened", { rowId: r.id, url: r.url });
                              }}
                              aria-label="View Analyzer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Create Task">
                            <button
                              className="cursor-pointer text-[var(--wr-brand)] hover:opacity-80"
                              title="Create Task"
                              onClick={() => setDrawer({ mode: "task", row: r })}
                              aria-label="Create Task"
                            >
                              <ClipboardPlus className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Compare (Phase 1.1)">
                            <button
                              className="cursor-pointer text-[var(--wr-brand)] hover:opacity-80"
                              title="Compare"
                              onClick={() => {
                                setToast("Comparison coming soon (Phase 1.1).");
                                track("tlp_compare_clicked", { rowId: r.id, compareMode: "worst" });
                              }}
                              aria-label="Compare"
                            >
                              <GitCompare className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Infinite mode: sticky Load more footer */}
          {mode === "infinite" && infiniteCount < filteredSorted.length && (
            <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent p-3 text-center">
              <button
                onClick={() => setInfiniteCount((n) => clamp(n + 20, 0, filteredSorted.length))}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-4 py-2 text-sm hover:bg-gray-50"
              >
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Mobile stacked list */}
        <div className="sm:hidden">
          {windowed.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--wr-muted)]">No pages match your filters.</div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
              {windowed.map((r) => {
                const highBounce = r.bounceRate >= 60;
                const highConversions = r.conversions >= thresholds.p75Conv || r.__cr >= thresholds.p75Cr;
                return (
                  <li key={r.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <button
                        className="cursor-pointer text-left font-medium text-[var(--wr-brand)] hover:underline"
                        onClick={() => {
                          setDrawer({ mode: "analyzer", row: r });
                          track("tlp_view_opened", { rowId: r.id, url: r.url });
                        }}
                      >
                        {r.title ?? r.url}
                      </button>
                      <div className="ml-2 flex items-center gap-2">
                        <button
                          className="cursor-pointer text-[var(--wr-brand)]"
                          onClick={() => setDrawer({ mode: "analyzer", row: r })}
                          title="View Analyzer"
                          aria-label="View Analyzer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="cursor-pointer text-[var(--wr-brand)]"
                          onClick={() => setDrawer({ mode: "task", row: r })}
                          title="Create Task"
                          aria-label="Create Task"
                        >
                          <ClipboardPlus className="h-4 w-4" />
                        </button>
                        <button
                          className="cursor-pointer text-[var(--wr-brand)]"
                          onClick={() => {
                            setToast("Comparison coming soon (Phase 1.1).");
                            track("tlp_compare_clicked", { rowId: r.id, compareMode: "worst" });
                          }}
                          title="Compare"
                          aria-label="Compare"
                        >
                          <GitCompare className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="truncate text-xs text-[var(--wr-muted)]">{slugOf(r.url)}</div>
                    <div className="mt-2 text-sm">
                      Sessions <b>{nf.format(r.sessions)}</b> • Conversions <b>{nf.format(r.conversions)}</b> • Conv. Rate{" "}
                      <b>{pf(r.__cr, 2)}</b>
                    </div>
                    <div className="text-sm">
                      Bounce{" "}
                      <b className={r.bounceRate >= 60 ? "text-[var(--wr-danger)] font-medium" : ""}>
                        {r.bounceRate.toFixed(0)}%
                      </b>{" "}
                      • Avg. Time <b>{toTime(r.avgEngagementTimeSec)}</b>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {highBounce && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          High Bounce
                        </span>
                      )}
                      {highConversions && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          High Conversions
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer (range summary when pagination) */}
        {mode === "pagination" && (
          <div
            className="flex items-center justify-between p-3 border-t text-xs text-[var(--wr-muted)]"
            style={{ borderColor: "var(--wr-borderLight)" }}
          >
            <div>
              Showing <b>{filteredSorted.length === 0 ? 0 : page * pageSize + 1}</b>–<b>{Math.min(filteredSorted.length, (page + 1) * pageSize)}</b> of{" "}
              <b>{filteredSorted.length}</b>
            </div>
            <div />
          </div>
        )}
      </div>

      {/* Drawer content */}
      {drawer && (
        <Drawer
          title={drawer.mode === "analyzer" ? "Page Analyzer" : "Create Task"}
          onClose={() => setDrawer(null)}
        >
          {drawer.mode === "analyzer" ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold">{drawer.row.title ?? drawer.row.url}</div>
                <div className="text-[var(--wr-muted)]">{drawer.row.url}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi label="Sessions (GA4)" value={nf.format(drawer.row.sessions)} />
                <Kpi label="Conversions (GA4)" value={nf.format(drawer.row.conversions)} />
                <Kpi
                  label="Conv. Rate"
                  value={pf(drawer.row.__cr, 2)}
                  sub={
                    drawer.row.__prevCr != null
                      ? `Δ ${signed(drawer.row.__cr - drawer.row.__prevCr, 2)}pp vs previous`
                      : "—"
                  }
                />
                <Kpi label="Bounce Rate" value={`${drawer.row.bounceRate.toFixed(0)}%`} sub="GA4: % sessions without engagement" />
                <Kpi label="Avg. Engagement Time" value={toTime(drawer.row.avgEngagementTimeSec)} />
                {drawer.row.deviceSplit && (
                  <Kpi
                    label="Device Split (by conversions)"
                    value=""
                    sub={[
                      `Desktop ${(drawer.row.deviceSplit.desktop * 100).toFixed(0)}%`,
                      `Mobile ${(drawer.row.deviceSplit.mobile * 100).toFixed(0)}%`,
                      ...(drawer.row.deviceSplit.tablet != null
                        ? [`Tablet ${(drawer.row.deviceSplit.tablet * 100).toFixed(0)}%`]
                        : []),
                    ].join(" • ")}
                  />
                )}
              </div>

              <div className="pt-2">
                <div className="mb-2 font-medium">Primary actions</div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    title="Deep link (future)"
                  >
                    <Eye className="h-4 w-4" />
                    Open Page in Analyzer
                  </a>
                  <a
                    href={drawer.row.url.startsWith("http") ? drawer.row.url : `https://example.com${drawer.row.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Open Live Page
                  </a>
                </div>
              </div>

              <div className="pt-3">
                <div className="mb-2 font-medium">Create Task</div>
                <TaskForm
                  defaultTitle={`Optimize: ${drawer.row.title ?? drawer.row.url}`}
                  defaultUrl={drawer.row.url}
                  onSubmit={(payload) => {
                    alert("Task created (stub) — wire to your backend.");
                    track("tlp_task_created", {
                      rowId: drawer.row.id,
                      url: drawer.row.url,
                      priority: payload.priority,
                    });
                    setDrawer(null);
                  }}
                />
              </div>
            </div>
          ) : (
            <TaskForm
              defaultTitle={`Optimize: ${drawer.row.title ?? drawer.row.url}`}
              defaultUrl={drawer.row.url}
              onSubmit={(payload) => {
                alert("Task created (stub) — wire to your backend.");
                track("tlp_task_created", {
                  rowId: drawer.row.id,
                  url: drawer.row.url,
                  priority: payload.priority,
                });
                setDrawer(null);
              }}
            />
          )}
        </Drawer>
      )}

      {/* Toast (compare stub) */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-40 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm shadow">
          {toast}
        </div>
      )}
    </section>
  );
}

/* Basic tooltip */
function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span tabIndex={0} className="focus:outline-none">
        {children}
      </span>
      {open && (
        <span className="absolute left-1/2 z-30 mt-8 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--wr-borderLight)] bg-white px-2 py-1 text-[11px] text-[var(--wr-text)] shadow">
          {label}
        </span>
      )}
    </span>
  );
}
