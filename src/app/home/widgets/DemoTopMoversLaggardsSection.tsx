// components/TopMoversLaggardsSection.tsx
"use client";

import * as React from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ClipboardPlus,
  BarChart2,
  PlugZap,
  BarChart3,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

/* -----------------------------------------------------------
 * TOKENS — keep consistent with your panel style
 * --------------------------------------------------------- */
const TOKENS = {
  surface: "#FFFFFF",
  border: "#EFF0F6",
  chip: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  blue: "#0077FF",
  bluePastel: "rgba(0,119,255,0.18)",
  green: "#10B981",
  greenPastel: "rgba(16,185,129,0.18)",
  red: "#EF4444",
  redPastel: "rgba(239,68,68,0.18)",
  brand: "#008CCD",
} as const;

const RADIUS = 8;

/* -----------------------------------------------------------
 * TYPES
 * --------------------------------------------------------- */
export type MetricKey =
  | "clicks"
  | "sessions"
  | "conversions"
  | "wrScore"
  | "kwTop3";

export type SourceKey = "gsc" | "ga4" | "backlinks" | "rank";

export interface SparkPoint {
  t: string; // ISO date (or label)
  v: number;
}

export interface MoversRow {
  id: string;
  projectName: string;
  domain?: string;
  deltaPct: number; // positive for Up, negative for Down (we still color by list side)
  spark?: SparkPoint[]; // tiny sparkline points
  lastSyncISO?: string; // source last sync for this row
  faviconUrl?: string;
}

export interface MoversBucket {
  up: MoversRow[];   // top 10 up
  down: MoversRow[]; // top 10 down
}

export type MoversData = Partial<Record<MetricKey, MoversBucket>>;

export interface TopMoversLaggardsProps {
  data?: MoversData;
  sourcesConnected?: Partial<{ gsc: boolean; ga4: boolean; backlinks: boolean; rank: boolean }>;
  onConnectSource?: (src: SourceKey) => void;

  onOpenProjectOverview?: (row: MoversRow, metric: MetricKey) => void;
  onAddToReport?: (rows: MoversRow[], metric: MetricKey, direction: "up" | "down") => void;
  onCreateTask?: (row: MoversRow, metric: MetricKey) => void;

  /** Optional — header Export button. If omitted, a CSV export will be generated on click. */
  onExport?: (arg: { metric: MetricKey; bucket: MoversBucket }) => void;

  className?: string;
  title?: string;
}

/* -----------------------------------------------------------
 * CONSTANTS & HELPERS
 * --------------------------------------------------------- */
const TAB_LABEL: Record<MetricKey, string> = {
  clicks: "Clicks",
  sessions: "Sessions",
  conversions: "Conversions",
  wrScore: "WR Score",
  kwTop3: "Top 3 KWs Count",
};

const TAB_SOURCE: Record<MetricKey, SourceKey> = {
  clicks: "gsc",
  sessions: "ga4",
  conversions: "ga4",
  wrScore: "backlinks",
  kwTop3: "rank",
};

// Only the four specified toggles should appear in the UI
const VISIBLE_METRICS: MetricKey[] = ["clicks", "sessions", "conversions", "wrScore"];

function fmtPct(p: number) {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}
function timeAgo(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const dd = Math.floor(ms / 86400000);
  if (dd > 0) return `${dd}d ago`;
  const hh = Math.floor(ms / 3600000);
  if (hh > 0) return `${hh}h ago`;
  const mm = Math.max(1, Math.floor(ms / 60000));
  return `${mm}m ago`;
}
function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function pastel(hex: string, alpha = 0.22) {
  const raw = hex.replace("#", "");
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Prefer explicit faviconUrl, else build a domain favicon. */
function projectFavicon(row: MoversRow): string | undefined {
  if (row.faviconUrl) return row.faviconUrl;
  if (row.domain) return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(row.domain)}&sz=64`;
  return undefined;
}

/* -----------------------------------------------------------
 * Sparkline
 * --------------------------------------------------------- */
function Sparkline({ points, color = TOKENS.blue, aria }: { points?: SparkPoint[]; color?: string; aria: string }) {
  const data = (points ?? []).map(p => ({ x: p.t, y: p.v }));
  return (
    <div className="h-8 w-[90px]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <RTooltip
            content={({ active, label, payload }) => {
              if (!active || !payload?.length) return null;
              const v = payload[0]?.value as number;
              return (
                <div
                  className="rounded border bg-white px-2 py-1 text-[11px] shadow"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                >
                  <div style={{ color: TOKENS.muted }}>{label}</div>
                  <div className="font-semibold">{typeof v === "number" ? v.toFixed(0) : v}</div>
                </div>
              );
            }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={6}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          <Area type="monotone" dataKey="y" stroke={color} fill={pastel(color, 0.22)} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -----------------------------------------------------------
 * Small brand-tinted icon action with hover label
 * --------------------------------------------------------- */
function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-50"
    >
      <span
        className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "#111827", color: "white", border: "1px solid rgba(0,0,0,0.12)" }}
      >
        {label}
      </span>
      <span className="inline-flex" style={{ color: TOKENS.brand }}>
        {children}
      </span>
    </button>
  );
}

/* -----------------------------------------------------------
 * Row (single mover)
 * --------------------------------------------------------- */
function MoversRowItem({
  row,
  side,
  onOpen,
  onAddToReportOne,
  onCreateTask,
  metric,
}: {
  row: MoversRow;
  side: "up" | "down";
  metric: MetricKey;
  onOpen?: (row: MoversRow) => void;
  onAddToReportOne?: (row: MoversRow) => void;
  onCreateTask?: (row: MoversRow) => void;
}) {
  const good = side === "up";
  const tone = good ? TOKENS.green : TOKENS.red;
  const bg = good ? TOKENS.greenPastel : TOKENS.redPastel;
  const fav = projectFavicon(row);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded border p-2"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Project favicon (falls back to domain-based favicon) */}
        {fav ? (
          <img src={fav} alt="" className="h-5 w-5 rounded-sm" />
        ) : (
          <span
            className="inline-grid h-5 w-5 place-items-center rounded-sm"
            style={{ background: TOKENS.chip, border: `1px solid ${TOKENS.border}` }}
          >
            <BarChart3 size={12} className="text-[#6B7280]" />
          </span>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm font-medium" style={{ color: TOKENS.text }}>
            {row.projectName}
            {row.domain ? (
              <span className="ml-1 text-xs" style={{ color: TOKENS.muted }}>
                • {row.domain}
              </span>
            ) : null}
          </div>
          <div className="text-[11px]" style={{ color: TOKENS.muted }}>
            Last sync: {timeAgo(row.lastSyncISO)}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Sparkline points={row.spark} color={tone} aria={`${row.projectName} sparkline`} />

        <div
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-semibold"
          style={{ color: tone, background: bg }}
        >
          {good ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {fmtPct(row.deltaPct)}
        </div>

        {/* Row actions — brand icons with labels on hover */}
        <div className="flex items-center gap-1">
          <IconAction label="Open Project Overview" onClick={() => onOpen?.(row)}>
            <ExternalLink size={16} />
          </IconAction>
          <IconAction label="Add to Report" onClick={() => onAddToReportOne?.(row)}>
            <BarChart2 size={16} />
          </IconAction>
          <IconAction label="Create Task" onClick={() => onCreateTask?.(row)}>
            <ClipboardPlus size={16} />
          </IconAction>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
 * Column (Up or Down)
 * --------------------------------------------------------- */
function MoversColumn({
  title,
  items,
  metric,
  side,
  onOpen,
  onAddToReportBulk,
  onCreateTask,
}: {
  title: string;
  items: MoversRow[];
  metric: MetricKey;
  side: "up" | "down";
  onOpen?: (row: MoversRow) => void;
  onAddToReportBulk?: (rows: MoversRow[]) => void;
  onCreateTask?: (row: MoversRow) => void;
}) {
  const tone = side === "up" ? TOKENS.green : TOKENS.red;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </span>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: tone }} />
        </div>

        <button
          className="text-[12px] underline hover:opacity-80 cursor-pointer"
          onClick={() => onAddToReportBulk?.(items)}
          title="Add these rows to Report"
        >
          Add to Report
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded border p-3 text-sm" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
          No movers in this direction for the selected metric.
        </div>
      ) : (
        items.slice(0, 10).map((row) => (
          <MoversRowItem
            key={row.id}
            row={row}
            side={side}
            metric={metric}
            onOpen={onOpen}
            onAddToReportOne={(r) => onAddToReportBulk?.([r])}
            onCreateTask={onCreateTask}
          />
        ))
      )}
    </div>
  );
}

/* -----------------------------------------------------------
 * CONNECT chips (source gating helper)
 * --------------------------------------------------------- */
function ConnectChip({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px] hover:bg-gray-50 cursor-pointer"
      style={{ borderColor: TOKENS.border }}
      onClick={onClick}
      title={`Connect ${label}`}
    >
      <PlugZap size={14} className="text-[#6B7280]" />
      Connect {label}
    </button>
  );
}

/* -----------------------------------------------------------
 * Modular segmented toggle (brand active)
 * --------------------------------------------------------- */
function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (k: T) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-full border p-1"
      style={{ borderColor: TOKENS.border, background: TOKENS.chip }}
      role="tablist"
      aria-label="Metric toggle"
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cx(
              "relative inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm transition"
            )}
            style={{
              color: active ? "#FFFFFF" : TOKENS.text,
              background: active ? TOKENS.brand : "transparent",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
            title={o.label}
          >
            {o.label}
            <ChevronRight size={14} className={cx(active ? "opacity-80" : "opacity-50")} />
          </button>
        );
      })}
    </div>
  );
}

/* -----------------------------------------------------------
 * Export helper (CSV fallback)
 * --------------------------------------------------------- */
function fallbackExportCSV(metric: MetricKey, bucket: MoversBucket) {
  const rows = [
    ...bucket.up.map((r) => ({ direction: "up", ...r })),
    ...bucket.down.map((r) => ({ direction: "down", ...r })),
  ];
  const headers = [
    "direction",
    "id",
    "projectName",
    "domain",
    "deltaPct",
    "lastSyncISO",
  ];
  const esc = (v: any) =>
    v == null ? "" : String(v).includes(",") || String(v).includes('"') ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const csv =
    headers.join(",") +
    "\n" +
    rows
      .map((r) => headers.map((h) => esc((r as any)[h])).join(","))
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${metric}-movers-laggards.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -----------------------------------------------------------
 * MAIN SECTION
 * --------------------------------------------------------- */
export function TopMoversLaggardsSection({
  data,
  sourcesConnected,
  onConnectSource,
  onOpenProjectOverview,
  onAddToReport,
  onCreateTask,
  onExport,
  className,
  title = "Top Movers & Laggards (Portfolio)",
}: TopMoversLaggardsProps) {
  // Safe defaults to avoid undefined property access
  const sources = React.useMemo(
    () => ({
      gsc: false,
      ga4: false,
      backlinks: false,
      rank: false,
      ...(sourcesConnected ?? {}),
    }),
    [sourcesConnected]
  );

  const tabSourceOk = (k: MetricKey) => {
    const src = TAB_SOURCE[k];
    return sources[src];
  };

  // Visible toggles: only the four specified, gated by connection (not by data presence)
  const visibleTabs = React.useMemo<MetricKey[]>(
    () => VISIBLE_METRICS.filter((k) => tabSourceOk(k)),
    [sources.gsc, sources.ga4, sources.backlinks]
  );

  const [tab, setTab] = React.useState<MetricKey | null>(() => visibleTabs[0] ?? null);

  // Keep tab valid when connections change
  React.useEffect(() => {
    if (!tab || !visibleTabs.includes(tab)) {
      setTab(visibleTabs[0] ?? null);
    }
  }, [visibleTabs, tab]);

  // Inline "Connect" chips for missing sources (even if hidden tabs)
  const missingChips: React.ReactNode[] = [];
  if (!sources.gsc) missingChips.push(<ConnectChip key="gsc" label="GSC" onClick={() => onConnectSource?.("gsc")} />);
  if (!sources.ga4) missingChips.push(<ConnectChip key="ga4" label="GA4" onClick={() => onConnectSource?.("ga4")} />);
  if (!sources.backlinks) missingChips.push(<ConnectChip key="backlinks" label="Backlinks" onClick={() => onConnectSource?.("backlinks")} />);
  if (!sources.rank) missingChips.push(<ConnectChip key="rank" label="Rank Tracker" onClick={() => onConnectSource?.("rank")} />);

  // If no visible tabs, render a graceful “connect sources” state
  if (!tab) {
    return (
      <section className={className}>
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">{missingChips}</div>
        </div>

        <div
          className="rounded border p-6 text-sm"
          style={{ borderColor: TOKENS.border, background: TOKENS.surface, color: TOKENS.muted }}
        >
          No connected sources or no data available for this section yet.
          <div className="mt-2 flex flex-wrap items-center gap-2">{missingChips}</div>
        </div>
      </section>
    );
  }

  // Current bucket always driven by the selected tab (loads on click)
  const bucket = (data?.[tab] ?? { up: [], down: [] }) as MoversBucket;

  // Export handler (header button)
  const handleExport = () => {
    if (!tab) return;
    if (onExport) {
      onExport({ metric: tab, bucket });
    } else {
      fallbackExportCSV(tab, bucket);
    }
  };

  return (
    <section className="rounded-md border px-2.5 py-1.5 bg-white mt-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
          {title}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Brand segmented toggle */}
          <SegmentedToggle
            value={tab}
            onChange={(k) => setTab(k)}
            options={visibleTabs.map((k) => ({ key: k, label: TAB_LABEL[k] }))}
          />

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            title="Export"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
          >
            <Download size={16} />
            Export
          </button>

          {/* Inline Connect chips for disconnected sources */}
          {missingChips}
        </div>
      </div>

      <div className="mt-2 border-t" style={{ borderColor: TOKENS.border }} />

      {/* Content */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MoversColumn
          title={`Top ${Math.min(10, bucket.up.length)} Movers (Up)`}
          items={bucket.up}
          side="up"
          metric={tab}
          onOpen={(row) => onOpenProjectOverview?.(row, tab)}
          onAddToReportBulk={(rows) => onAddToReport?.(rows, tab, "up")}
          onCreateTask={(row) => onCreateTask?.(row, tab)}
        />

        <MoversColumn
          title={`Top ${Math.min(10, bucket.down.length)} Laggards (Down)`}
          items={bucket.down}
          side="down"
          metric={tab}
          onOpen={(row) => onOpenProjectOverview?.(row, tab)}
          onAddToReportBulk={(rows) => onAddToReport?.(rows, tab, "down")}
          onCreateTask={(row) => onCreateTask?.(row, tab)}
        />
      </div>
    </section>
  );
}

/* -----------------------------------------------------------
 * OPTIONAL DEMO WRAPPER (safe, deterministic mock data)
 * Remove when integrating real data.
 * --------------------------------------------------------- */
function makeRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function isoNDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function mockSpark(seed: string, n = 16, base = 100, noise = 0.1): SparkPoint[] {
  const R = makeRng(seed);
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  const out: SparkPoint[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    v = Math.max(0, v + (R() - 0.5) * base * noise);
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(v) });
  }
  return out;
}
function mockRow(i: number, up = true): MoversRow {
  const domain = i % 3 === 0 ? "wranker.com" : i % 3 === 1 ? "w3era.com" : "vefogix.com";
  const name = domain.replace(".com", "");
  const delta = up ? 5 + (i % 6) * 3 + (i % 2 ? 0.6 : 0) : -(5 + (i % 6) * 3 + (i % 2 ? 0.6 : 0));
  return {
    id: `${up ? "U" : "D"}-${i}`,
    projectName: name,
    domain,
    deltaPct: delta,
    spark: mockSpark(`${name}-${up ? "U" : "D"}-${i}`, 18, up ? 100 : 120, 0.16),
    lastSyncISO: isoNDaysAgo((i % 5) + 1),
  };
}
function buildMockBucket(seed: string): MoversBucket {
  return {
    up: Array.from({ length: 10 }).map((_, i) => mockRow(i, true)),
    down: Array.from({ length: 10 }).map((_, i) => mockRow(i, false)),
  };
}
export default function DemoTopMoversLaggardsSection() {
  const demo: MoversData = {
    clicks: buildMockBucket("clicks"),
    sessions: buildMockBucket("sessions"),
    conversions: buildMockBucket("conversions"),
    wrScore: buildMockBucket("wr"),
    kwTop3: buildMockBucket("kwTop3"),
  };

  return (
    <div className="w-full mt-4">
      <TopMoversLaggardsSection
        data={demo}
        sourcesConnected={{ gsc: true, ga4: true, backlinks: true, rank: true }}
        onConnectSource={(src) => alert(`Connect ${src}`)}
        onOpenProjectOverview={(row, metric) => alert(`Open Project Overview → ${row.projectName} • ${TAB_LABEL[metric]}`)}
        onAddToReport={(rows, metric, dir) => alert(`Added ${rows.length} items to report • ${TAB_LABEL[metric]} (${dir})`)}
        onCreateTask={(row, metric) => alert(`Create Task • ${row.projectName} • ${TAB_LABEL[metric]}`)}
        onExport={({ metric, bucket }) =>
          alert(`Export • ${TAB_LABEL[metric]} • ${bucket.up.length + bucket.down.length} rows`)
        }
      />
    </div>
  );
}
