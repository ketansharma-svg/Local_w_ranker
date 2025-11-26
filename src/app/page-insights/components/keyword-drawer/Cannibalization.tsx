"use client";

/* =============================================================================
   Section 6 — Cannibalization (Redesigned)
   -----------------------------------------------------------------------------
   • Inter / Inter Fallback fonts; no emoji
   • Latest tokens aligned with recent designs
   • Branded #008CCD icons for section title & action types
   • Modern chips/filters; Export button in header
   • KPI Cards:
       - Total Impressions (trend with smart popover breakdown by page)
       - Total Clicks (trend with smart popover breakdown by page)
       - Cannibalized Queries (stacked donut with hover animation + portal popover)
   • Main table with row expansion:
       - Expansion shows a single table of top 5 keywords with: Position, Δ7d, Clicks,
         Impressions, CTR, SERP
   • Actions column uses branded icons with titles on hover
   • Recharts for charts; portal tooltips to avoid clipping
   • Donut slices have NO stroke borders and are placed directly in card (no clipping)
   ============================================================================ */

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { createPortal } from "react-dom";
import {
  GitMerge,
  Target,
  Search as SearchIcon,
  SlidersHorizontal,
  Download,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS (latest)
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  action: "#0077FF",
  pastelBlue: "#D9EEF8",

  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",

  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const fmtInt = (n: number) => new Intl.NumberFormat().format(n);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const toDateLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "2-digit" });

/* -----------------------------------------------------------------------------
 * COLOR HELPERS
 * ---------------------------------------------------------------------------*/
function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  const v = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const h = x.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}
function mixWithWhite(hex: string, w01: number) {
  const { r, g, b } = hexToRgb(hex);
  const W = 255;
  const w = Math.max(0, Math.min(1, w01));
  return rgbToHex(
    Math.round(r * (1 - w) + W * w),
    Math.round(g * (1 - w) + W * w),
    Math.round(b * (1 - w) + W * w)
  );
}

/* -----------------------------------------------------------------------------
 * TYPES
 * ---------------------------------------------------------------------------*/
type QueryHit = {
  query: string;
  position: number; // current
  prev7dPosition: number; // previous 7d (for delta)
  impressions: number;
  clicks: number;
};
type UrlRow = {
  url: string;
  canonicalDeclared?: string | null;
  indexable?: boolean;
  hits: QueryHit[];
};
type ClusterData = {
  primaryKeyword: string;
  locale?: string;
  device?: "desktop" | "mobile";
  rows: UrlRow[];
};

/* -----------------------------------------------------------------------------
 * DEMO DATA
 * ---------------------------------------------------------------------------*/
function lastNDates(n: number) {
  const a: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    a.push(toISO(d));
  }
  return a;
}
function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}
function domainOf(url: string) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function makeDemoCluster(primary = "best seo tools"): ClusterData {
  const pages = [
    "/blog/best-seo-tools-2025",
    "/compare/ahrefs-vs-semrush",
    "/features/keyword-research",
    "/blog/seo-checklist",
    "/pricing",
  ];
  const queries = [
    "best seo tools",
    "seo tools list",
    "semrush vs ahrefs",
    "ahrefs vs semrush pricing",
    "keyword research tool",
    "seo checklist",
    "seo tool pricing",
    "compare seo platforms",
    "top seo tool 2025",
    "wranker seo tool",
  ];
  const rows: UrlRow[] = pages.map((p, idx) => {
    const hits: QueryHit[] = queries
      .map((q, i) => {
        const baseImpr = Math.floor(300 + Math.random() * 3400);
        const pos = clamp(Math.round(4 + Math.random() * 35 + idx * 3 + i * 0.4), 1, 50);
        const prev = clamp(pos + Math.round((Math.random() - 0.5) * 8), 1, 50);
        const ctr =
          pos <= 3 ? 0.25 + Math.random() * 0.25 : pos <= 10 ? 0.07 + Math.random() * 0.1 : 0.01 + Math.random() * 0.03;
        const impressions = Math.floor((Math.random() * 0.7 + 0.3) * baseImpr * (1.15 - pos / 120));
        const clicks = Math.floor(impressions * ctr * (0.7 + Math.random() * 0.6));
        return { query: q, position: pos, prev7dPosition: prev, impressions, clicks };
      })
      .filter((h) => h.impressions > 30 && h.position <= 50);
    return {
      url: p,
      canonicalDeclared: idx === 0 ? p : null,
      indexable: idx !== 4,
      hits,
    };
  });
  return { primaryKeyword: primary, locale: "en-US", device: "desktop", rows };
}

/* -----------------------------------------------------------------------------
 * AGGREGATION + INSIGHTS
 * ---------------------------------------------------------------------------*/
type RowAgg = {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number; // %
  avgPos: number | null;
  queries: number;
  top20Queries: number;
  conflictQueries: number;
  conflictPct: number;
  indexable: boolean;
  canonicalDeclared?: string | null;
};
type Suggestion = "merge" | "redirect" | "keep";
type RowView = RowAgg & {
  role: "canonical" | "competing";
  suggestion: Suggestion;
  reason: string;
  hits: QueryHit[];
};

function avgRankWeightedByImpr(hits: QueryHit[]) {
  const totalImpr = hits.reduce((s, h) => s + h.impressions, 0);
  if (!totalImpr) return null;
  const w = hits.reduce((s, h) => s + h.position * h.impressions, 0);
  return +(w / totalImpr).toFixed(1);
}

function computeAgg(data: ClusterData, selectedCanonical?: string) {
  // query → [{ url, hit }]
  const qMap = new Map<string, { url: string; hit: QueryHit }[]>();
  data.rows.forEach((r) =>
    r.hits.forEach((h) => {
      const arr = qMap.get(h.query) || [];
      arr.push({ url: r.url, hit: h });
      qMap.set(h.query, arr);
    })
  );

  // overlaps (top20)
  const overlapByUrl = new Map<string, number>();
  const top20ByUrl = new Map<string, number>();
  qMap.forEach((arr) => {
    const top20 = arr.filter((x) => x.hit.position <= 20);
    if (top20.length >= 2) top20.forEach((x) => overlapByUrl.set(x.url, (overlapByUrl.get(x.url) || 0) + 1));
    top20.forEach((x) => top20ByUrl.set(x.url, (top20ByUrl.get(x.url) || 0) + 1));
  });

  const aRows: RowAgg[] = data.rows.map((r) => {
    const impressions = r.hits.reduce((s, h) => s + h.impressions, 0);
    const clicks = r.hits.reduce((s, h) => s + h.clicks, 0);
    const ctr = impressions ? +(((clicks / impressions) * 100).toFixed(1)) : 0;
    const avgPos = avgRankWeightedByImpr(r.hits);
    const queries = r.hits.length;
    const top20Queries = top20ByUrl.get(r.url) || 0;
    const conflictQueries = overlapByUrl.get(r.url) || 0;
    const conflictPct = top20Queries ? +(((conflictQueries / top20Queries) * 100).toFixed(0)) : 0;
    return {
      url: r.url,
      clicks,
      impressions,
      ctr,
      avgPos,
      queries,
      top20Queries,
      conflictQueries,
      conflictPct,
      indexable: r.indexable !== false,
      canonicalDeclared: r.canonicalDeclared ?? null,
    };
  });

  // canonical
  const canon =
    selectedCanonical ||
    aRows
      .slice()
      .sort((a, b) => {
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        const ap = a.avgPos ?? 999,
          bp = b.avgPos ?? 999;
        return ap - bp;
      })[0]?.url;

  const totalClicks = aRows.reduce((s, r) => s + r.clicks, 0);
  const views: RowView[] = aRows.map((r) => {
    const role: "canonical" | "competing" = r.url === canon ? "canonical" : "competing";
    const clickShare = totalClicks ? (r.clicks / totalClicks) * 100 : 0;
    let suggestion: Suggestion = "keep";
    let reason = "Looks healthy.";
    if (role === "competing") {
      if (!r.indexable) {
        suggestion = "redirect";
        reason = "Page is non‑indexable; consolidate equity to canonical.";
      } else if (r.conflictPct >= 60 && clickShare <= 30) {
        suggestion = "merge";
        reason = `High overlap (${r.conflictPct}% of top‑20), lower engagement. Consider merge into canonical.`;
      } else if ((clickShare < 5 && (r.avgPos ?? 100) > 25) || r.queries <= 2) {
        suggestion = "redirect";
        reason = "Low share and weak rankings; redirect likely safe.";
      }
    } else {
      reason = r.canonicalDeclared && r.canonicalDeclared !== r.url ? "Declared canonical mismatch." : "Selected canonical.";
    }
    return { ...r, role, suggestion, reason, hits: data.rows.find((x) => x.url === r.url)?.hits || [] };
  });

  views.sort((a, b) => {
    if (a.role !== b.role) return a.role === "canonical" ? -1 : 1;
    if (b.conflictQueries !== a.conflictQueries) return b.conflictQueries - a.conflictQueries;
    if (b.clicks !== a.clicks) return b.clicks - a.clicks;
    return (a.avgPos ?? 999) - (b.avgPos ?? 999);
  });

  // Cannibalized queries (≥2 URLs in top‑20)
  const cannibalized: { query: string; urls: { url: string; pos: number; impr: number; clk: number }[] }[] = [];
  qMap.forEach((arr, q) => {
    const top = arr
      .filter((x) => x.hit.position <= 20)
      .map((x) => ({ url: x.url, pos: x.hit.position, impr: x.hit.impressions, clk: x.hit.clicks }))
      .sort((a, b) => a.pos - b.pos);
    if (top.length >= 2) cannibalized.push({ query: q, urls: top });
  });
  cannibalized.sort((a, b) => {
    const sa = a.urls.reduce((s, u) => s + u.clk, 0);
    const sb = b.urls.reduce((s, u) => s + u.clk, 0);
    return sb - sa;
  });

  return {
    rows: views,
    canonicalUrl: canon,
    totalClicks: aRows.reduce((s, r) => s + r.clicks, 0),
    totalImpr: aRows.reduce((s, r) => s + r.impressions, 0),
    cannibalized,
  };
}

/* -----------------------------------------------------------------------------
 * PORTALED POPOVERS
 * ---------------------------------------------------------------------------*/
function PortalShell({ x, y, width = 280, children }: { x: number; y: number; width?: number; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ background: "#fff", border: `1px solid ${TK.border}`, color: TK.text, width }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function TrendPopover({
  active,
  coordinate,
  containerRect,
  title,
  rows,
}: any & {
  containerRect?: DOMRect | null;
  title: string;
  rows: { name: string; value: number; color?: string }[];
}) {
  if (!active || !coordinate || !containerRect) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <PortalShell x={x} y={y} width={300}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {title} — by page
      </div>
      <div className="flex max-h-[240px] flex-col gap-1 overflow-auto">
        {sorted.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color || TK.action }} />
              <span className="truncate" style={{ color: TK.muted }}>
                {r.name}
              </span>
            </div>
            <div className="ml-2 shrink-0 font-semibold">{fmtInt(Math.round(r.value))}</div>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}

function DonutPopover({
  active,
  coordinate,
  containerRect,
  page,
  items,
}: any & {
  containerRect?: DOMRect | null;
  page?: string;
  items: { query: string; impr: number; clk: number; pos: number }[];
}) {
  if (!active || !coordinate || !containerRect) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  return (
    <PortalShell x={x} y={y} width={340}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Cannibalized on <span className="font-semibold" style={{ color: TK.text }}>{page}</span>
      </div>
      {items.length ? (
        <div className="flex max-h-[260px] flex-col gap-1 overflow-auto">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate" style={{ color: TK.text }}>
                  {it.query}
                </div>
                <div className="text-[11px]" style={{ color: TK.muted }}>
                  pos {it.pos} • {fmtInt(it.impr)} impr • {fmtInt(it.clk)} clicks
                </div>
              </div>
              <a
                className="shrink-0 rounded border px-2 py-[2px] text-[12px]"
                style={{ borderColor: TK.border, color: TK.action, background: "#fff", cursor: "pointer" }}
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/search?q=${encodeURIComponent(it.query)}&num=10`}
                title="Open SERP"
              >
                SERP <ExternalLink className="mb-[2px] inline h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px]" style={{ color: TK.muted }}>
          No shared queries for this page.
        </div>
      )}
    </PortalShell>
  );
}

/* -----------------------------------------------------------------------------
 * SMALL ATOMS — Chips / Segmented / MiniBar
 * ---------------------------------------------------------------------------*/
function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn" | "danger";
  title?: string;
}) {
  const map = {
    neutral: { bg: "#F3F4F6", fg: "#374151", bd: "#E5E7EB" },
    brand: { bg: TK.pastelBlue, fg: TK.brand, bd: "#B6E3FF" },
    success: { bg: "#ECFDF3", fg: "#166534", bd: "#BBF7D0" },
    warn: { bg: "#FFFBEB", fg: "#92400E", bd: "#FDE68A" },
    danger: { bg: "#FEF2F2", fg: "#991B1B", bd: "#FECACA" },
  }[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs"
      style={{ background: map.bg, color: map.fg, borderColor: map.bd }}
    >
      {children}
    </span>
  );
}

function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-8 rounded-full px-3 text-sm transition",
            value === it.value ? "bg-[#D9EEF8] font-medium" : "hover:bg-gray-100"
          )}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function MiniBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = value >= 70 ? TK.success : value >= 40 ? TK.warn : TK.danger;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-[88px] rounded" style={{ background: "#E5E7EB" }}>
        <div className="h-2 rounded" style={{ width: `${pct}%`, background: bg }} />
      </div>
      <span className="text-[12px]" style={{ color: "#374151" }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * KPI CARDS — trend + donut
 * ---------------------------------------------------------------------------*/
function TrendKpiCard({
  label,
  value,
  series,
  breakdown,
  mode = "area",
}: {
  label: string;
  value: number;
  series: { d: string; v: number }[];
  breakdown: { name: string; value: number; color?: string }[];
  mode?: "area" | "bar";
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const gradId = React.useId();
  return (
    <div
      className="rounded-[10px] border p-3"
      style={{ borderColor: TK.borderLight, background: "#fff", overflow: "visible" }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[13px]" style={{ color: TK.muted }}>
          {label}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <div className="min-w-[120px]">
          <div className="text-[22px] font-semibold" style={{ color: TK.text }}>
            {fmtInt(value)}
          </div>
        </div>
        <div className="h-16 w-full" ref={ref} role="img" aria-label={`${label} trend`}>
          <ResponsiveContainer>
            {mode === "area" ? (
              <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TK.action} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={TK.pastelBlue} stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide />
                <Area type="monotone" dataKey="v" stroke={TK.action} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
                <RTooltip
                  wrapperStyle={{ visibility: "hidden" }}
                  cursor={{ stroke: TK.action, strokeOpacity: 0.15 }}
                  content={(tp: any) => (
                    <TrendPopover
                      {...tp}
                      containerRect={ref.current?.getBoundingClientRect() ?? null}
                      title={label}
                      rows={breakdown}
                    />
                  )}
                />
              </AreaChart>
            ) : (
              <BarChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="d" hide />
                <YAxis hide />
                <Bar dataKey="v" fill={TK.action} radius={[3, 3, 0, 0]} />
                <RTooltip
                  wrapperStyle={{ visibility: "hidden" }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={(tp: any) => (
                    <TrendPopover
                      {...tp}
                      containerRect={ref.current?.getBoundingClientRect() ?? null}
                      title={label}
                      rows={breakdown}
                    />
                  )}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StackedDonutCard({
  label,
  parts,
  popoverForKey,
}: {
  label: string;
  parts: { key: string; name: string; value: number; color: string }[];
  popoverForKey: (key: string) => { query: string; impr: number; clk: number; pos: number }[];
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [active, setActive] = React.useState<number | undefined>(undefined);
  const total = Math.max(1, parts.reduce((s, p) => s + (p.value || 0), 0));
  return (
    <div className="rounded-[10px] border p-3" style={{ borderColor: TK.borderLight, background: "#fff", overflow: "visible" }}>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[13px]" style={{ color: TK.muted }}>
          {label}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div ref={ref} className="relative h-[88px] w-[88px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <RTooltip
                wrapperStyle={{ visibility: "hidden" }}
                allowEscapeViewBox={{ x: true, y: true }}
                content={(tp: any) => {
                  const key = tp?.payload?.[0]?.payload?.key as string | undefined;
                  return (
                    <DonutPopover
                      {...tp}
                      page={parts.find((p) => p.key === key)?.name}
                      items={key ? popoverForKey(key) : []}
                      containerRect={ref.current?.getBoundingClientRect() ?? null}
                    />
                  );
                }}
              />
              <Pie
                data={parts}
                dataKey="value"
                nameKey="name"
                innerRadius={32}
                outerRadius={42}
                startAngle={90}
                endAngle={-270}
                paddingAngle={1}
                isAnimationActive
                activeIndex={active}
                activeShape={(props: any) => {
                  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                  return (
                    <g
                      style={{
                        transform: `translate(${cx}px,${cy}px) scale(1.06) translate(${-cx}px,${-cy}px)`,
                        transition: "transform 160ms ease",
                        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
                      }}
                    >
                      <Sector
                        cx={cx}
                        cy={cy}
                        innerRadius={innerRadius}
                        outerRadius={outerRadius + 3}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        fill={fill}
                      />
                    </g>
                  );
                }}
                onMouseEnter={(_d, idx) => setActive(idx)}
                onMouseLeave={() => setActive(undefined)}
              >
                {parts.map((p, i) => (
                  <Cell key={i} fill={p.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center value */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-[14px] font-semibold" style={{ color: TK.text }}>
              {fmtInt(total)}
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              queries
            </div>
          </div>
        </div>
        {/* Legend (inline, compact) */}
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {parts
              .slice()
              .sort((a, b) => b.value - a.value)
              .slice(0, 6)
              .map((p, i) => (
                <div key={i} className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                    <span className="truncate text-[12px]" style={{ color: TK.muted }} title={p.name}>
                      {p.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-[12px]" style={{ color: TK.text }}>
                    {fmtInt(p.value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * MAIN COMPONENT
 * ---------------------------------------------------------------------------*/
type KPIWindow = "7d" | "30d" | "90d";

export default function CannibalizationRedesigned({
  data,
  primaryKeyword,
  onCreateTask,
}: {
  data?: ClusterData;
  primaryKeyword?: string;
  onCreateTask?: (type: "merge" | "redirect" | "audit", payload: any) => void;
}) {
  const [cluster, setCluster] = React.useState<ClusterData>(() => data || makeDemoCluster(primaryKeyword));
  const [range, setRange] = React.useState<KPIWindow>("30d");
  const [search, setSearch] = React.useState("");
  const [onlyCannibalized, setOnlyCannibalized] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [canonicalUrl, setCanonicalUrl] = React.useState<string | undefined>(undefined);

  const { rows, canonicalUrl: computedCanonical, totalClicks, totalImpr, cannibalized } = React.useMemo(
    () => computeAgg(cluster, canonicalUrl),
    [cluster, canonicalUrl]
  );

  React.useEffect(() => {
    setCanonicalUrl((c) => c || computedCanonical);
  }, [computedCanonical]);

  // Filters
  const filteredRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (onlyCannibalized && r.conflictQueries === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.url.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, onlyCannibalized]);

  // KPI series (mock per-day totals for visual trend)
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const dates = React.useMemo(() => lastNDates(days), [days]);
  const imprSeries = React.useMemo(
    () => dates.map((d, i) => ({ d, v: Math.max(0, Math.round(totalImpr / days * (0.9 + Math.sin(i / 4) * 0.08 + (Math.random() - 0.5) * 0.08))) })),
    [dates, totalImpr, days]
  );
  const clickSeries = React.useMemo(
    () => dates.map((d, i) => ({ d, v: Math.max(0, Math.round(totalClicks / days * (0.9 + Math.cos(i / 3.5) * 0.1 + (Math.random() - 0.5) * 0.1))) })),
    [dates, totalClicks, days]
  );

  // KPI breakdown by page (overall period)
  const pageBreakdownImpr = React.useMemo(
    () => rows.map((r, i) => ({ name: r.url, value: r.impressions, color: mixWithWhite(TK.brand, 0.18 + (i % 6) * 0.11) })),
    [rows]
  );
  const pageBreakdownClicks = React.useMemo(
    () => rows.map((r, i) => ({ name: r.url, value: r.clicks, color: mixWithWhite(TK.brand, 0.18 + (i % 6) * 0.11) })),
    [rows]
  );

  // Cannibalized donut parts: per-page count of cannibalized queries involved
  const cannibalParts = React.useMemo(() => {
    const counts = new Map<string, number>();
    cannibalized.forEach((c) => c.urls.forEach((u) => counts.set(u.url, (counts.get(u.url) || 0) + 1)));
    const entries = rows
      .map((r, i) => ({ key: r.url, name: r.url, value: counts.get(r.url) || 0, color: mixWithWhite(TK.brand, 0.18 + (i % 6) * 0.11) }))
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);
    return entries;
  }, [cannibalized, rows]);

  function popoverForDonutKey(key: string) {
    // For the hovered page, list its cannibalized queries with impressions/clicks
    const list: { query: string; impr: number; clk: number; pos: number }[] = [];
    cannibalized.forEach((c) => {
      const hit = c.urls.find((u) => u.url === key);
      if (hit) list.push({ query: c.query, impr: hit.impr, clk: hit.clk, pos: hit.pos });
    });
    return list
      .sort((a, b) => b.clk - a.clk)
      .slice(0, 10);
  }

  // Export CSV
  const exportCSV = () => {
    const header = [
      "url",
      "role",
      "queries_all",
      "queries_top20",
      "conflicts_top20",
      "avg_pos",
      "impressions",
      "clicks",
      "ctr_pct",
    ].join(",");
    const lines = rows
      .map((r) =>
        [
          r.url,
          r.role,
          r.queries,
          r.top20Queries,
          r.conflictQueries,
          r.avgPos ?? "",
          r.impressions,
          r.clicks,
          r.ctr,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + "\n" + lines], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cannibalization_${(primaryKeyword || cluster.primaryKeyword).replace(/\s+/g, "_")}_${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const regenerate = () => {
    if (data) return;
    setExpanded({});
    setCluster(makeDemoCluster(primaryKeyword || cluster.primaryKeyword));
  };

  return (
    <section
      className="rounded-[12px] border bg-white p-4 mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Cannibalization"
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex min-w-0 items-center gap-2">
          <GitMerge size={20} color={TK.brand} />
          <h2 className="truncate text-[18px] font-semibold" style={{ color: TK.text }}>
            Cannibalization
          </h2>
          <Chip tone="brand" title="Primary keyword">
            {(primaryKeyword || cluster.primaryKeyword) ?? "—"}
          </Chip>
          <button
            type="button"
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            title="Your site URLs competing across a query cluster. Use canonical + merge/redirect to consolidate."
            aria-label="About"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as KPIWindow)}
            aria="Range"
            items={[
              { label: "7d", value: "7d" },
              { label: "30d", value: "30d" },
              { label: "90d", value: "90d" },
            ]}
          />
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by URL…"
              className="h-8 w-[220px] rounded-full border pl-7 pr-3 text-sm outline-none"
              style={{ borderColor: TK.border, color: TK.text }}
            />
          </div>
          <label className="ml-1 inline-flex cursor-pointer select-none items-center gap-2 text-sm" style={{ color: TK.text }}>
            <input type="checkbox" checked={onlyCannibalized} onChange={(e) => setOnlyCannibalized(e.target.checked)} />
            Only cannibalized
          </label>
          <button
            type="button"
            onClick={regenerate}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            title={data ? "Data provided by props" : "Refresh demo data"}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.action, cursor: "pointer" }}
            aria-label="Export CSV"
            title="Export CSV"
          >
            <Download size={16} />
            Export
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            aria-label="Filters"
            title="Filters"
          >
            <SlidersHorizontal size={16} color={TK.brand} />
            Filters
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 pb-3 md:grid-cols-3" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
        <TrendKpiCard label="Total impressions" value={totalImpr} series={imprSeries} breakdown={pageBreakdownImpr} mode="area" />
        <TrendKpiCard label="Total clicks" value={totalClicks} series={clickSeries} breakdown={pageBreakdownClicks} mode="bar" />
        <StackedDonutCard label="Cannibalized queries (by page)" parts={cannibalParts} popoverForKey={popoverForDonutKey} />
      </div>

      {/* Table */}
      <div className="mt-3 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white" style={{ boxShadow: "inset 0 -1px 0 " + TK.borderLight }}>
            <tr>
              <Th style={{ width: 36 }} />
              <Th style={{ width: 36 }} />
              <Th>URL</Th>
              <Th>Role</Th>
              <Th className="text-right">Queries (top‑20)</Th>
              <Th className="text-right">Avg rank</Th>
              <Th className="text-right">Impr.</Th>
              <Th className="text-right">Clicks</Th>
              <Th>CTR</Th>
              <Th>Click share</Th>
              <Th>Suggestion</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-6 text-center text-sm" style={{ color: TK.muted }}>
                  No URLs match current filters.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => {
              const isExpanded = !!expanded[r.url];
              const isCanonical = r.role === "canonical";
              const share = rows.length ? Math.round(((r.clicks / Math.max(1, totalClicks)) * 100) * 10) / 10 : 0;
              return (
                <React.Fragment key={r.url}>
                  <tr className="hover:bg-[#F9FBFD]" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
                    <td className="px-2 py-2 align-top">
                      <button
                        onClick={() => setExpanded((ex) => ({ ...ex, [r.url]: !ex[r.url] }))}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        className="rounded border p-1"
                        style={{ borderColor: TK.border, background: "#fff", cursor: "pointer" }}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="radio"
                        name="canonical"
                        checked={isCanonical}
                        onChange={() => setCanonicalUrl(r.url)}
                        title="Set as canonical"
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td className="max-w-[360px] px-2 py-2 align-top">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={r.url}
                          className="truncate underline"
                          style={{ color: TK.action, maxWidth: 280, cursor: "pointer" }}
                          title={r.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {domainOf(r.url)} {r.url}
                        </a>
                        <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {r.canonicalDeclared && r.canonicalDeclared !== r.url && <Chip tone="warn">canonical mismatch</Chip>}
                        {!r.indexable && <Chip tone="danger">noindex</Chip>}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">{isCanonical ? <Chip tone="brand">Canonical</Chip> : <Chip>Competing</Chip>}</td>
                    <td className="px-2 py-2 text-right align-top">
                      <div className="leading-tight">
                        <div>{r.queries}</div>
                        <div className="text-[12px]" style={{ color: TK.muted }}>
                          top‑20: {r.top20Queries}
                          {r.conflictQueries ? ` • shared: ${r.conflictQueries}` : ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right align-top">{r.avgPos ?? "—"}</td>
                    <td className="px-2 py-2 text-right align-top">{fmtInt(r.impressions)}</td>
                    <td className="px-2 py-2 text-right align-top">{fmtInt(r.clicks)}</td>
                    <td className="px-2 py-2 align-top">
                      <MiniBar value={r.ctr} max={30} />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <MiniBar value={share} max={100} />
                    </td>
                    <td className="px-2 py-2 align-top">
                      {r.suggestion === "merge" ? (
                        <Chip tone="warn">Merge suggested</Chip>
                      ) : r.suggestion === "redirect" ? (
                        <Chip tone="danger">Redirect suggested</Chip>
                      ) : (
                        <Chip tone="success">Keep</Chip>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex items-center gap-2">
                        {/* Action icons with branded color and full name on hover */}
                        <button
                          className="rounded p-1 hover:bg-gray-50"
                          style={{ cursor: "pointer" }}
                          title="Create audit task"
                          onClick={() =>
                            onCreateTask
                              ? onCreateTask("audit", { url: r.url })
                              : alert(`[demo] Create AUDIT task for ${r.url}`)
                          }
                        >
                          <Target size={16} color={TK.brand} />
                        </button>
                        <button
                          className="rounded p-1 hover:bg-gray-50"
                          style={{ cursor: "pointer" }}
                          title="Open SERP"
                          onClick={() =>
                            window.open(
                              `https://www.google.com/search?q=${encodeURIComponent(cluster.primaryKeyword)}&num=10`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          <SearchIcon size={16} color={TK.brand} />
                        </button>
                        <button
                          className="rounded p-1 hover:bg-gray-50"
                          style={{ cursor: "pointer" }}
                          title="Open page"
                          onClick={() => window.open(r.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink size={16} color={TK.brand} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Row expansion: single table with Top 5 keywords + metrics */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={12} className="px-4 pb-4 pt-0">
                        <div className="mt-2 rounded-md border" style={{ borderColor: TK.borderLight, background: TK.subtle }}>
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="text-sm font-medium" style={{ color: TK.text }}>
                              Top 5 keywords for this page
                            </div>
                            <div className="text-[12px]" style={{ color: TK.muted }}>
                              Click a SERP link to open results
                            </div>
                          </div>
                          <div className="overflow-auto">
                            <table className="min-w-full border-t text-sm" style={{ borderColor: TK.borderLight }}>
                              <thead className="bg-white">
                                <tr style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
                                  <Th>Keyword</Th>
                                  <Th className="text-right">Current Pos</Th>
                                  <Th className="text-right">Rank Change (7d)</Th>
                                  <Th className="text-right">Clicks</Th>
                                  <Th className="text-right">Impressions</Th>
                                  <Th className="text-right">CTR</Th>
                                  <Th className="text-right">SERP</Th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {r.hits
                                  .slice()
                                  .sort((a, b) => b.impressions - a.impressions)
                                  .slice(0, 5)
                                  .map((h) => {
                                    const delta = h.prev7dPosition - h.position; // + means improved
                                    const ctr = h.impressions ? +(((h.clicks / h.impressions) * 100).toFixed(1)) : 0;
                                    const tone = delta > 0 ? TK.success : delta < 0 ? TK.danger : TK.gray;
                                    return (
                                      <tr key={r.url + h.query} style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
                                        <td className="px-3 py-2">{h.query}</td>
                                        <td className="px-3 py-2 text-right">{h.position}</td>
                                        <td className="px-3 py-2 text-right" style={{ color: tone }}>
                                          {delta === 0 ? "—" : delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                                        </td>
                                        <td className="px-3 py-2 text-right">{fmtInt(h.clicks)}</td>
                                        <td className="px-3 py-2 text-right">{fmtInt(h.impressions)}</td>
                                        <td className="px-3 py-2 text-right">{ctr}%</td>
                                        <td className="px-3 py-2 text-right">
                                          <a
                                            className="inline-flex items-center gap-1 rounded border px-2 py-[2px] text-xs hover:bg-[#F7FAFC]"
                                            style={{ borderColor: TK.border, color: TK.action, cursor: "pointer" }}
                                            href={`https://www.google.com/search?q=${encodeURIComponent(h.query)}&num=10`}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Open SERP"
                                          >
                                            SERP <ExternalLink className="h-3.5 w-3.5" />
                                          </a>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer helper note */}
      <div className="mt-2 text-[12px]" style={{ color: TK.muted }}>
        Tip: choose a single canonical page, then merge/redirect overlapping pages to concentrate CTR and improve stability.
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Table header cell
 * ---------------------------------------------------------------------------*/
function Th({
  children,
  className,
  style,
}: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <th className={cn("px-2 py-2 text-left text-[13px] font-semibold", className)} style={{ ...style, color: TK.muted }}>
      {children}
    </th>
  );
}
