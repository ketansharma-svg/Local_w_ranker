"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useBrokenLinksData,
  BrokenLinksApiResponse,
  BrokenLinksTrendPayload,
  BrokenLinksTrendAuditItem,
} from "../broken-links-tab";
import {
  Info,
  Unlink,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  Download,
} from "lucide-react";

/* -------------------------------- Tokens -------------------------------- */
const TOKENS = {
  brand: "#008CCD",
  coreBlue: "#4286F5",
  valueBlue: "#0077FF",
  grey: "#9CA3AF",
  critical: "#E94134",
  success: "#34A853",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  overlay: "rgba(17,24,39,0.96)",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  radius: 8,
};

const FONT_FAMILY =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

/* ------------------------------- Utilities ------------------------------- */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const niceStep = (maxVal: number) => {
  const raw = maxVal / 4.5;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow10);
  return candidates.reduce((a, b) => (Math.abs(raw - a) < Math.abs(raw - b) ? a : b));
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

/* -------------------------- Small Tooltip Primitive -------------------------- */
function Tip({ text, children }: React.PropsWithChildren<{ text: string }>) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className="absolute z-50 -translate-x-1/2 left-1/2 mt-2 w-72 max-w-sm rounded-md shadow-sm border p-2 text-xs"
          style={{
            background: TOKENS.overlay,
            color: "white",
            borderColor: "rgba(255,255,255,0.08)",
            fontFamily: FONT_FAMILY,
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

/* ------------------------------- Brand Badge ------------------------------- */
/** UPDATED: minimal brand-colored icon, no background. */
function BrandBadge({
  icon: Icon,
  size = 16,
  title,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  size?: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center"
      style={{ lineHeight: 0, color: TOKENS.brand }}
    >
      <Icon size={size} color={TOKENS.brand} strokeWidth={2} />
    </span>
  );
}

const formatTick = (n: number) => {
  const rounded = Math.round(n * 10) / 10; // avoid 0.600000000001, etc.
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
 

function ResponsiveAreaTrend({
  height = 200,
  series = [],
  labels = [],
  ariaLabel,
}: {
  height?: number;
  series: { key: string; label: string; color: string; data: number[] }[];
  labels: string[];
  ariaLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverXY, setHoverXY] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(280, Math.floor(e.contentRect.width)));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const pad = { t: 10, r: 16, b: 28, l: 36 };
  const W = Math.max(1, width - pad.l - pad.r);
  const H = Math.max(1, height - pad.t - pad.b);
  const points = series[0]?.data?.length ?? 0;
  const maxY = Math.max(1, ...series.flatMap((s) => s.data));
  const step = niceStep(maxY);
  const yMax = Math.ceil(maxY / step) * step;
  const yTicks = Array.from({ length: Math.ceil(yMax / step) + 1 }, (_, i) => i * step);
  const stepX = points > 1 ? W / (points - 1) : W;
  const project = (v: number, i: number) => ({ x: pad.l + i * stepX, y: pad.t + (1 - v / yMax) * H });

  const curve = (arr: number[]) => {
    const P = arr.map((v, i) => project(v, i));
    if (P.length === 0) return "";
    if (P.length === 1) return `M${P[0].x},${P[0].y}`;
    let d = `M${P[0].x},${P[0].y}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[i + 2] || p2;
      const t = 0.18;
      const c1x = p1.x + (p2.x - p0.x) * t;
      const c1y = p1.y + (p2.y - p0.y) * t;
      const c2x = p2.x - (p3.x - p1.x) * t;
      const c2y = p2.y - (p3.y - p1.y) * t;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const area = (arr: number[]) => {
    if (!arr.length) return "";
    const top = curve(arr);
    const lastX = pad.l + (arr.length - 1) * stepX;
    const baseY = pad.t + H;
    return `${top} L${lastX},${baseY} L${pad.l},${baseY} Z`;
  };

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - pad.l;
    const idx = clamp(Math.round(x / stepX), 0, points - 1);
    setHoverIdx(Number.isFinite(idx) ? idx : null);
    setHoverXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onLeave = () => setHoverIdx(null);

  const tip =
    hoverIdx != null && points > 0
      ? {
          label: labels[hoverIdx] ?? `Audit ${hoverIdx + 1}`,
          rows: series.map((s) => ({ key: s.key, label: s.label, color: s.color, value: s.data[hoverIdx] })),
        }
      : null;

  return (
    <div ref={wrapRef} className="w-full relative" aria-label={ariaLabel}>
      <svg width={width} height={height} role="img">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.06" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {Array.from({ length: points }, (_, i) => (
          <line key={`vg-${i}`} x1={pad.l + i * stepX} y1={pad.t} x2={pad.l + i * stepX} y2={pad.t + H} stroke="#E5E7EB" strokeDasharray="4 6" />
        ))}
        {yTicks.map((v, i) => (
          <line key={`hg-${i}`} x1={pad.l} y1={pad.t + (1 - v / yMax) * H} x2={pad.l + W} y2={pad.t + (1 - v / yMax) * H} stroke="#E5E7EB" strokeDasharray={i === 0 ? "" : "4 6"} />
        ))}

        {/* Areas & lines */}
        {series.map((s) => (
          <g key={s.key}>
            <path d={area(s.data)} fill={`url(#grad-${s.key})`} />
            <path d={curve(s.data)} fill="none" stroke={s.color} strokeWidth={2.2} />
            {s.data.map((v, i) => {
              const { x, y } = project(v, i);
              return <circle key={`${s.key}-${i}`} cx={x} cy={y} r={2} fill={s.color} opacity={0.6} />;
            })}
          </g>
        ))}

        {/* Axes labels */}
        {labels.map((lb, i) => (
          <text key={`xlb-${i}`} x={pad.l + i * stepX} y={pad.t + H + 16} textAnchor="middle" fontSize={11} fill="#6B7280" style={{ fontFamily: FONT_FAMILY }}>
            {lb}
          </text>
        ))}
{yTicks.map((v, i) => (
  <text
    key={`ylb-${i}`}
    x={8}
    y={pad.t + (1 - v / yMax) * H + 4}
    fontSize={11}
    fill="#6B7280"
    style={{ fontFamily: FONT_FAMILY }}
  >
    {formatTick(v)}
  </text>
))}


        {/* Hover */}
        {hoverIdx != null && (
          <g>
            <line x1={pad.l + hoverIdx * stepX} y1={pad.t} x2={pad.l + hoverIdx * stepX} y2={pad.t + H} stroke="#CBD5E1" strokeDasharray="4 4" />
            {series.map((s) => {
              const { x, y } = project(s.data[hoverIdx], hoverIdx);
              return <circle key={s.key} cx={x} cy={y} r={3.5} fill={s.color} stroke="#FFFFFF" strokeWidth={1} />;
            })}
          </g>
        )}

        <rect x={0} y={0} width={width} height={height} fill="transparent" onMouseMove={onMove} onMouseLeave={onLeave} />
      </svg>

      {/* Floating tooltip */}
      {tip && (
        <div
          className="absolute z-50 pointer-events-none rounded-md border shadow-sm px-2 py-1 text-xs"
          style={{
            left: clamp(hoverXY.x + 12, 8, width - 180),
            top: clamp(hoverXY.y - 4, 8, height - 60),
            borderColor: TOKENS.border,
            background: "#FFFFFF",
            color: TOKENS.text,
            fontFamily: FONT_FAMILY,
          }}
        >
          <div className="font-medium mb-1">{tip.label}</div>
          {tip.rows.map((r) => (
            <div key={r.key} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />
              {r.label}: {formatTick(r.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------ Interactive Stacked Bar ------------------------ */
function StackedBar({
  total,
  internal,
  external,
}: {
  total: number;
  internal: number;
  external: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<"int" | "ext" | null>(null);
  const [xy, setXY] = useState({ x: 0, y: 0 });

  const intPct = total ? Math.round((internal / total) * 100) : 0;
  const extPct = total ? Math.max(0, 100 - intPct) : 0;

  const onEnter = (k: "int" | "ext") => (e: React.MouseEvent<HTMLDivElement>) => {
    setHover(k);
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onLeave = () => setHover(null);

  const tip =
    hover === "int"
      ? { title: "Internal", value: internal, pct: intPct, color: TOKENS.coreBlue }
      : hover === "ext"
      ? { title: "External", value: external, pct: extPct, color: TOKENS.grey }
      : null;

  return (
    <div className="relative">
      {/* flex so External is interactive */}
      <div
        ref={wrapRef}
        className="group w-full h-3 rounded border overflow-hidden bg-gray-100 flex"
        style={{ borderColor: TOKENS.border }}
        onMouseLeave={onLeave}
        aria-label={`Broken links distribution: ${intPct}% internal, ${extPct}% external`}
      >
        {/* Internal segment */}
        <div
          className="h-full cursor-pointer transition-all duration-200 ease-out"
          style={{
            width: `${intPct}%`,
            background: TOKENS.coreBlue,
            transformOrigin: "center",
          }}
          onMouseEnter={onEnter("int")}
          onMouseMove={onMove}
          title={`Internal broken links: ${internal} (${intPct}%)`}
          aria-label={`Internal broken links: ${internal} (${intPct}%)`}
        />
        {/* External segment */}
        <div
          className="h-full cursor-pointer transition-all duration-200 ease-out"
          style={{
            width: `${extPct}%`,
            background: TOKENS.grey,
            transformOrigin: "center",
          }}
          onMouseEnter={onEnter("ext")}
          onMouseMove={onMove}
          title={`External broken links: ${external} (${extPct}%)`}
          aria-label={`External broken links: ${external} (${extPct}%)`}
        />

        {/* Simple shimmer on hover (subtle) */}
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.16) 30%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "wr-shine 1.2s linear infinite",
            }}
          />
        </div>
      </div>

      {/* Popover */}
      {tip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border shadow-sm px-2 py-1 text-xs bg-white"
          style={{
            left: clamp(xy.x + 8, 6, (wrapRef.current?.clientWidth || 200) - 160),
            top: -40,
            borderColor: TOKENS.border,
            color: TOKENS.text,
            fontFamily: FONT_FAMILY,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: tip.color }} />
            <strong>{tip.title}</strong>
          </div>
          <div>
            {tip.value} • {tip.pct}% of total
          </div>
        </div>
      )}

      {/* keyframes (scoped) */}
      <style>{`
        @keyframes wr-shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/* --------------------------------- Toast --------------------------------- */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 1600);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed top-3 right-3 rounded-md shadow-sm px-3 py-2 text-sm"
      style={{ background: TOKENS.text, color: "white", fontFamily: FONT_FAMILY }}
    >
      {message}
    </div>
  );
}

/* ------------------------------ Row Item (RHS) ------------------------------ */
type PageRow = {
  url: string;
  count: number;
  internal: number;
  external: number;
};

function AffectedPageRow({
  row,
  onClick,
}: {
  row: PageRow;
  onClick?: (r: PageRow) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick?.(row);
      }}
      onClick={() => onClick?.(row)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center justify-between px-2 py-1 rounded-md cursor-pointer outline-none relative"
      style={{ background: hover ? "#F5F7FA" : "transparent", fontFamily: FONT_FAMILY }}
      aria-label={`${row.url} — ${row.count} broken links`}
    >
      <div className="min-w-0 mr-2 text-sm text-[#111827] truncate" title={row.url}>
        {row.url}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-[#6B7280]">{row.count}</span>
        <ChevronRight size={14} className="text-[#9CA3AF]" />
      </div>

      {/* Smart Popover: internal / external breakdown with brand-colored minimal icons */}
      {hover && (
        <div
          role="tooltip"
          className="absolute left-0 top-full mt-2 z-50 w-80 rounded-md shadow-sm border p-2 text-xs bg-white"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        >
          <div className="font-medium mb-1">{row.url}</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandBadge icon={LinkIcon} title="Internal" />
                <span className="text-[12px]" style={{ color: TOKENS.muted }}>
                  Internal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: TOKENS.coreBlue }} />
                <span className="font-semibold">{row.internal}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandBadge icon={ExternalLink} title="External" />
                <span className="text-[12px]" style={{ color: TOKENS.muted }}>
                  External
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: TOKENS.grey }} />
                <span className="font-semibold">{row.external}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SummaryData = {
  totalBroken: number;
  internal: number;
  external: number;
  topPagesPct: number;
  updatedAt?: string;
  topPages: PageRow[];
};

type TrendSeries = {
  internal: number[];
  external: number[];
  total: number[];
  labels: string[];
};

// 2) Fix mapSummary(...) to use page_url / broken_count (and keep fallbacks)
const mapSummary = (apiData: BrokenLinksApiResponse | null): SummaryData | null => {
  if (!apiData?.summary) return null;

  const totalBroken = toNumber(apiData.summary.total);
  const internal = toNumber(apiData.summary.internal?.count);
  const external = toNumber(apiData.summary.external?.count);

  const topPagesItems = Array.isArray(apiData.top_pages?.items) ? apiData.top_pages?.items : [];
  const topPages: PageRow[] = topPagesItems.map((item) => ({
    url:
      (item?.page_url ??
        item?.source_page ??
        item?.url ??
        "") || "-",
    count: toNumber(
      item?.broken_count ??
      item?.broken ??
      item?.count
    ),
    internal: toNumber(item?.internal), // may be undefined in this API — safe default 0
    external: toNumber(item?.external), // may be undefined in this API — safe default 0
  }));

  const totalTopBroken = topPages.reduce((acc, item) => acc + item.count, 0);
  const topPagesPct =
    totalBroken > 0 ? Math.min(100, Math.round((totalTopBroken / totalBroken) * 100)) : 0;

  // Prefer backend's latest_audit_at; then source_page_impact; then trend.last_audits last t
  const fromTrend = (apiData.trend as BrokenLinksTrendPayload | undefined)?.last_audits;
  const lastTrendDate = Array.isArray(fromTrend) && fromTrend.length
    ? fromTrend[fromTrend.length - 1]?.t
    : undefined;

  const updatedAt =
    (apiData.summary as any)?.updated_at ||
    apiData.meta?.latest_audit_at ||
    apiData.source_page_impact?.items?.[0]?.last_crawled ||
    lastTrendDate ||
    undefined;

  return {
    totalBroken,
    internal,
    external,
    topPagesPct,
    updatedAt,
    topPages,
  };
};

const mapTrend = (trend?: BrokenLinksTrendPayload): TrendSeries => {
  const audits: BrokenLinksTrendAuditItem[] = Array.isArray(trend?.last_audits)
    ? trend!.last_audits!
    : [];

  if (!audits.length) {
    return { internal: [], external: [], total: [], labels: [] };
  }

  const internal = audits.map((a) => toNumber(a.summary?.internal?.count));
  const external = audits.map((a) => toNumber(a.summary?.external?.count));
  const total = audits.map((a, i) =>
    toNumber(
      a.summary?.total !== undefined
        ? a.summary?.total
        : (internal[i] || 0) + (external[i] || 0),
    ),
  );

  const labels = audits.map((a, idx) => {
    const raw = a.t ?? "";
    const parsed = raw ? new Date(raw) : null;
    return parsed && !Number.isNaN(parsed.valueOf())
      ? parsed.toISOString().slice(0, 10)
      : `Audit ${idx + 1}`;
  });

  return { internal, external, total, labels };
};


/* --------------------------------- Dev test -------------------------------- */
function DevTests({ data, trend }: { data: SummaryData | null; trend: TrendSeries | null }) {
  useEffect(() => {
    if (!data || !trend) return;
    try {
      if (data.totalBroken !== data.internal + data.external) {
        console.warn("[TEST] totalBroken != internal + external", data);
      }
      trend.total.forEach((v, i) => {
        if (v !== trend.internal[i] + trend.external[i]) {
          console.warn("[TEST] Trend mismatch at index", i, trend);
        }
      });
    } catch (e) {
      console.error("DevTests failed:", e);
    }
  }, [data, trend]);
  return null;
}

/* --------------------------------- Main --------------------------------- */
export default function BrokenLinksSummarySection() {
  const { data: apiData, loading, error, refetch } = useBrokenLinksData();
  const summary = useMemo(() => mapSummary(apiData), [apiData]);
const trendSeries = useMemo(() => mapTrend(apiData?.trend), [apiData?.trend]);
  const [compact, setCompact] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fallbackLabels = useMemo(() => {
    const base = summary?.updatedAt ? new Date(summary.updatedAt) : new Date();
    if (Number.isNaN(base.valueOf())) {
      return Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (4 - i));
        return d.toISOString().slice(0, 10);
      });
    }
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (4 - i));
      return d.toISOString().slice(0, 10);
    });
  }, [summary?.updatedAt]);

  const labels = trendSeries.labels.length ? trendSeries.labels : fallbackLabels;
  const trend = trendSeries;

  // Legend toggles (keep at least one on)
  const [active, setActive] = useState({ total: true, internal: true, external: true });
  const toggleLegend = (k: "total" | "internal" | "external") => {
    setActive((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (!next.total && !next.internal && !next.external) return prev; // prevent all off
      return next;
    });
  };

  const applyFilter = (label: string) => setToast(`Filter applied: ${label}`);
  const openGlossary = () => setToast("Opening Glossary: Broken links");
  const openPageDrawer = (row: PageRow) => setToast(`Open Page Drawer → ${row.url}`);
  const exportSummary = () => setToast("Export • Broken Links Summary");

  // Series filtered by legend state
  const chartSeries = [
    active.total && { key: "total", label: "Total", color: TOKENS.critical, data: trend.total },
    active.internal && { key: "internal", label: "Internal", color: TOKENS.coreBlue, data: trend.internal },
    active.external && { key: "external", label: "External", color: TOKENS.grey, data: trend.external },
  ].filter(Boolean) as { key: string; label: string; color: string; data: number[] }[];

  const totalNow = summary?.totalBroken ?? 0;
  const intNow = summary?.internal ?? 0;
  const extNow = summary?.external ?? 0;

  const intPctNow = totalNow ? Math.round((intNow / totalNow) * 100) : 0;
  const extPctNow = totalNow ? 100 - intPctNow : 0;

  // Top 5 (>=5), fallback to top 5
  const top5FivePlus = (summary?.topPages ?? []).filter((p) => p.count >= 5).slice(0, 5);
  const top5Fallback = (summary?.topPages ?? []).slice(0, 5);
  const rowsToShow = top5FivePlus.length > 0 ? top5FivePlus : top5Fallback;
  const minCount = toNumber(apiData?.top_pages?.min_count, 5);


  return (
    <div  style={{ background: "#FFFFFF", fontFamily: FONT_FAMILY }}>
      <div className="border-b" style={{ borderColor: TOKENS.border, background: "#FFFFFF" }}>
        <section className="w-full">
          {/* Header */}
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BrandBadge icon={Unlink} title="Broken Links" />
                <h2
                  className="truncate"
                  style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: 600, color: TOKENS.text }}
                >
                  Broken Links Summary
                </h2>

                {/* Info tooltip (moved description here) */}
                <Tip text="Audit and resolve broken links across internal and external pages to protect SEO and UX. Learn how 404s/410s impact rankings and user experience.">
                  <button
                    aria-label="More info"
                    onClick={openGlossary}
                    className="p-1 rounded-md hover:bg-[#F5F7FA] focus:outline-none cursor-pointer"
                    style={{ borderRadius: TOKENS.radius }}
                  >
                    <Info size={16} className="text-[#6B7280]" />
                  </button>
                </Tip>
              </div>
            </div>

            {/* Modular Export */}
            <button
              onClick={exportSummary}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border shadow-sm hover:shadow-md focus:outline-none cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.chipBg }}
              aria-label="Export summary"
              title="Export"
            >
              <Download size={16} />
              <span className="text-sm font-medium">Export</span>
            </button>
          </div>

          <div className="mt-2 border-t" style={{ borderColor: TOKENS.border }} />

          {error && (
            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: TOKENS.border, background: "#FFF7F7", color: TOKENS.critical }}
            >
              <span>{error}</span>
              <button
                onClick={() => refetch?.()}
                className="rounded-md border px-3 py-1 text-xs uppercase tracking-wide cursor-pointer"
                style={{ borderColor: TOKENS.critical, color: TOKENS.critical, background: "#FFFFFF" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Cards grid */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
            {/* Card 1: Broken Links */}
            <div
              className="col-span-1 md:col-span-2 rounded-md border shadow-sm h-full"
              style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius, background: "#FFFFFF" }}
            >
              <div className="p-3 flex flex-col h-full">
                {/* Title row (with brand icon) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrandBadge icon={Unlink} title="Broken Links" />
                    <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                      Broken Links
                    </div>
                  </div>
                </div>

                {/* Stacked bar row with total on the left */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="shrink-0 text-2xl font-semibold" style={{ color: TOKENS.valueBlue, minWidth: 64 }}>
                    {loading ? "…" : totalNow}
                  </div>

                  <div className="grow">
                    <StackedBar total={totalNow} internal={intNow} external={extNow} />
                    <div className="mt-1 text-[11px] text-[#6B7280]" style={{ fontFamily: FONT_FAMILY }}>
                      <span className="mr-3">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                          style={{ background: TOKENS.coreBlue }}
                        />
                        Internal: {intNow} ({intPctNow}%)
                      </span>
                      <span>
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                          style={{ background: TOKENS.grey }}
                        />
                        External: {extNow} ({extPctNow}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Area trend (unchanged) */}
                <div className="mt-3 overflow-hidden rounded-md border" style={{ borderColor: TOKENS.border }}>
                  <ResponsiveAreaTrend
                    height={208}
                    ariaLabel="Trend of total, internal, and external broken links over last 5 audits"
                    labels={labels}
                    series={chartSeries}
                  />
                </div>

                {/* Legend pills */}
                {!compact && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {[
                      { k: "total" as const, label: "Total", color: TOKENS.critical },
                      { k: "internal" as const, label: "Internal", color: TOKENS.coreBlue },
                      { k: "external" as const, label: "External", color: TOKENS.grey },
                    ].map((it) => {
                      const on = active[it.k];
                      return (
                        <button
                          key={it.k}
                          onClick={() => toggleLegend(it.k)}
                          className="inline-flex items-center gap-2 rounded-full border px-2 py-1 transition cursor-pointer"
                          style={{
                            borderColor: TOKENS.border,
                            background: on ? "#F9FAFB" : "#FFFFFF",
                            color: on ? TOKENS.text : "#9CA3AF",
                            opacity: on ? 1 : 0.55,
                            fontFamily: FONT_FAMILY,
                          }}
                          aria-pressed={on}
                          aria-label={`Toggle series ${it.label}`}
                          title={on ? "Click to hide" : "Click to show"}
                        >
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* CTA moved to bottom-right, blue hyperlink style */}
                {/* <div className="mt-3 pt-2 border-t flex items-center justify-end" style={{ borderColor: TOKENS.border }}>
                  <button
                    className="text-sm font-medium underline cursor-pointer"
                    style={{ color: TOKENS.valueBlue, fontFamily: FONT_FAMILY }}
                    onClick={(e) => {
                      e.stopPropagation();
                      applyFilter("Broken (all)");
                    }}
                    aria-label="View results in table"
                    title="View in Table"
                  >
                    View in Table
                  </button>
                </div> */}
              </div>
            </div>

            {/* Card 2: Top 5 Pages (>=5; fallback) */}
            <div
              className="col-span-1 rounded-md border shadow-sm h-full"
              style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius, background: "#FFFFFF" }}
            >
              <div className="p-3 flex flex-col h-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrandBadge icon={LinkIcon} title="Top Pages" />
                    <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                      Top 5 Pages (With 5+ broken links)
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <div className="text-base font-semibold" style={{ color: TOKENS.text }}>
                    {loading ? "…" : `${rowsToShow.length} pages`}
                  </div>
<div className="text-xs" style={{ color: TOKENS.muted }}>
  {top5FivePlus.length > 0
    ? `with ${minCount}+ broken links`
    : `fallback: top 5 pages (any count)`}
</div>
                </div>
                <div className="mt-0.5 text-xs" style={{ color: TOKENS.muted }}>
                  {loading || !summary
                    ? ""
                    : `${summary.topPagesPct ?? 0}% of all broken links occur on these pages.`}
                </div>

                {!compact && (
                  <div className="mt-2 space-y-1 flex-1">
                    {rowsToShow.map((row) => (
                      <AffectedPageRow key={row.url} row={row} onClick={openPageDrawer} />
                    ))}
                  </div>
                )}

                {/* <div className="mt-2 pt-2 border-t text-right" style={{ borderColor: TOKENS.border }}>
                  <button
                    onClick={() => setToast("Open Source Page Impact View")}
                    className="text-sm font-medium cursor-pointer inline-flex items-center gap-1"
                    style={{ color: TOKENS.brand, fontFamily: FONT_FAMILY }}
                    aria-label="View all affected pages"
                  >
                    View All Affected Pages
                    <ExternalLink size={14} className="inline-block align-text-bottom" />
                  </button>
                </div> */}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Filler (context in real panel) */}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <DevTests data={summary} trend={trend} />
    </div>
  );
}




