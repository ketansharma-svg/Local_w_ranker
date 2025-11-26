"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  // Drawer + section icons
  Search,
  Globe,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  X,
  Info,
  Download,
  BarChart3,
  Link as LinkIcon,
  // KPI title icons
  ShieldCheck,
  Link2,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Tags,
  // Table icons
  ChevronsUpDown,
  Tag,
  CheckCircle2,
  Filter,
  Wrench,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Sector,
} from "recharts";

/* =========================================================================
   Latest Design Tokens (aligned with recent designs)
   ========================================================================= */
const TOKENS = {
  // Brand & semantic
  brand: "#008CCD", // branded icons & accents
  metricBlue: "#0077ff", // KPI main value
  text: "#0F172A",
  textMuted: "#6B7280",
  headerBg: "#F5F7FA",
  border: "#E5E7EB",
  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  chipBg: "#F5F7FA",

  // Status
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  darkRed: "#D92D20",
  blue: "#3B82F6",
  purple: "#8B5CF6",

  // rel= palette
  relDofollow: "#2563EB",
  relNofollow: "#6B7280",
  relSponsored: "#F59E0B",
  relUGC: "#9333EA",
};

type SeriesPoint = {
  x: number;
  y: number;
  label?: string;
  date?: string | number | Date;
  t?: string | number | Date;
  ts?: number;
};
type TrendSeries = Array<number | SeriesPoint>;
type DonutSlice = { name: string; value: number; color?: string; tooltip?: string };
type RiskLevel = "High" | "Medium" | "Low";

/* =========================================================================
   Utilities
   ========================================================================= */
const fmtInt = (n: number | undefined) =>
  typeof n === "number" && !Number.isNaN(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "—";

const alpha = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

function coerceDate(raw?: unknown): Date | null {
  if (!raw && raw !== 0) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number") {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === "string") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function toSeries(points?: TrendSeries, opts?: { endDate?: Date; stepDays?: number }): SeriesPoint[] {
  const base: SeriesPoint[] =
    points && points.length
    /* { x: p.x ?? i, ...p } */
      ? points.map((p, i) => (typeof p === "number" ? { x: i, y: p } : { ...p })) 
      : [12, 13, 12, 15, 18, 16, 19, 21, 20, 22, 24, 28].map((y, i) => ({ x: i, y }));

  const hasAnyDate = base.some((p) => p.date !== undefined || p.t !== undefined || p.ts !== undefined);
  if (hasAnyDate) return base.map((p, i) => ({ ...p, x: p.x ?? i }));

  const stepDays = Math.max(1, opts?.stepDays ?? 1);
  const end = opts?.endDate ?? new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startTime = end.getTime() - (base.length - 1) * stepDays * dayMs;

  return base.map((p, i) => ({ ...p, x: p.x ?? i, date: startTime + i * stepDays * dayMs }));
}

/* =========================================================================
   Smart tooltips (with colored dot annotation)
   ========================================================================= */
function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const dp: SeriesPoint = p?.payload ?? {};
  const val = p?.value ?? (dp as any)?.y ?? 0;
  const d = coerceDate(dp.date) || coerceDate(dp.t) || coerceDate(dp.ts) || null;
  const header = d ? fmtDate(d) : typeof dp.label === "string" ? dp.label : "Value";
  const color = p?.color || p?.stroke || TOKENS.brand;

  return (
    <div
      className="rounded-md border bg-white px-2 py-1 text-[12px] shadow"
      style={{ borderColor: TOKENS.border }}
      role="status"
      aria-live="polite"
    >
      <div className="font-medium flex items-center gap-1.5" style={{ color: TOKENS.text }}>
        <Dot color={color} /> {header}
      </div>
      <div className="mt-0.5" style={{ color: TOKENS.textMuted }}>
        {fmtInt(Number(val))}
      </div>
    </div>
  );
}
function DonutTooltip({ active, payload, total, percentMode }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = p?.payload?.name ?? p?.name ?? "Item";
  const rawVal = Number(p?.payload?.value ?? p?.value ?? 0);
  const isPercent =
    typeof percentMode === "boolean" ? percentMode : typeof total === "number" && Math.abs(total - 100) < 0.5;
  const valueLabel = isPercent && total && total > 0 ? `${Math.round((rawVal / total) * 100)}%` : fmtInt(rawVal);
  const color = p?.payload?.color || p?.color || TOKENS.brand;

  return (
    <div className="rounded-md border bg-white px-2 py-1 text-[12px] shadow" style={{ borderColor: TOKENS.border }}>
      <div className="font-medium flex items-center gap-1.5" style={{ color: TOKENS.text }}>
        <Dot color={color} /> {name}
      </div>
      <div className="mt-0.5" style={{ color: TOKENS.textMuted }}>{valueLabel}</div>
    </div>
  );
}

/* =========================================================================
   Drawer Header (sticky)
   ========================================================================= */
type ViewSourcePageHeaderProps = {
  url: string;
  onClose: () => void;
  title?: string;
  className?: string;
  onCopy?: (url: string) => void;
  getFaviconUrl?: (u: URL) => string;
};
function ViewSourcePageHeader({
  url,
  onClose,
  title = "View Source Page",
  className,
  onCopy,
  getFaviconUrl,
}: ViewSourcePageHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showFavicon, setShowFavicon] = useState(true);
  const liveRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => {
    try {
      const u = new URL(url);
      const domain = u.hostname;
      const tail = (u.pathname || "/") + (u.search || "") + (u.hash || "");
      const favicon = (getFaviconUrl ?? ((uu: URL) => `${uu.origin}/favicon.ico`))(u);
      return { full: u.toString(), domain, tail, favicon };
    } catch {
      return { full: url, domain: url, tail: "", favicon: "" };
    }
  }, [url, getFaviconUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(parsed.full);
      } else {
        const ta = document.createElement("textarea");
        ta.value = parsed.full;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      onCopy?.(parsed.full);
      if (liveRef.current) liveRef.current.textContent = "Copied URL to clipboard";
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      if (liveRef.current) liveRef.current.textContent = "Unable to copy URL";
    }
  };

  return (
    <header
      role="region"
      aria-label="View Source Page drawer header"
      className={[
        "top-0 z-[1200] w-full border-b px-4 py-3 md:px-5 md:py-4 bg-[var(--hdr-bg)] border-[var(--hdr-border)] relative",
        className ?? "",
      ].join(" ")}
      style={
        {
          ["--hdr-bg" as any]: TOKENS.headerBg,
          ["--hdr-border" as any]: TOKENS.border,
        } as React.CSSProperties
      }
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close drawer"
        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] cursor-pointer md:right-4 md:top-4"
        title="Close"
        style={{ ["--brand" as any]: TOKENS.brand } as React.CSSProperties}
      >
        <X size={22} strokeWidth={2} className="text-slate-600" />
      </button>

      {/* Title row */}
      <div className="flex items-center gap-2 pr-12">
        <Search size={20} className="shrink-0" style={{ color: TOKENS.brand }} />
        <h2 className="text-xl font-semibold leading-7" style={{ color: TOKENS.text }}>
          {title}
        </h2>
      </div>

      {/* URL row */}
      <div className="mt-2 flex items-center justify-between gap-3 pr-12">
        <div className="group flex min-w-0 items-center gap-2" title={parsed.full} aria-describedby="drawer-url-help">
          <div className="relative inline-flex h-4 w-4 items-center justify-center">
            {showFavicon && parsed.favicon ? (
              <img
                src={parsed.favicon}
                alt=""
                className="h-4 w-4 rounded"
                onError={() => setShowFavicon(false)}
              />
            ) : (
              <Globe size={14} style={{ color: TOKENS.brand }} aria-hidden className="shrink-0" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-5 max-w-[96ch]">
              <span className="font-medium" style={{ color: TOKENS.text }}>
                {parsed.domain}
              </span>
              <span className="ml-0.5" style={{ color: TOKENS.textMuted }}>
                {parsed.tail || ""}
              </span>
            </p>
            <span id="drawer-url-help" className="sr-only">
              Full URL shown on tooltip. Copy button available to copy the URL.
            </span>
          </div>
        </div>

        {/* Header actions (required) */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open(parsed.full, "_blank", "noopener,noreferrer")}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-white focus:outline-none focus:ring-2 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
            title="Open source page in a new tab"
            aria-label="Open source page"
          >
            <ExternalLink size={16} />
            <span className="hidden sm:inline">Open</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-white focus:outline-none focus:ring-2 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
            title={copied ? "Copied!" : "Copy URL to clipboard"}
            aria-label="Copy URL to clipboard"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-white focus:outline-none focus:ring-2 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </header>
  );
}

/* =========================================================================
   KPI Cards (Metadata / KPI Summary)
   ========================================================================= */
type SourcePageMetadataInput = {
  wrScore?: { value: number; trend?: number; series?: TrendSeries };
  backlinksFromPage?: { value: number; trend?: number; series?: TrendSeries };
  anchorRisk?: { highest: RiskLevel; donut?: DonutSlice[]; examples?: string[] };
  toxicity?: { markers: Array<"Mirror Site" | "Malware" | "Spam" | "Link Farm" | "Suspicious TLD">; series?: TrendSeries };
  referralTraffic?: { sessions?: number; series?: TrendSeries; ga4Connected?: boolean };
  relAttributes?: {
    donut: DonutSlice[];
    topLabel?: "dofollow" | "nofollow" | "sponsored" | "ugc";
    counts?: Partial<Record<"dofollow" | "nofollow" | "sponsored" | "ugc", number>>;
  };
};
type NavigateArgs = { key: string; route: string; title: string };

const WR_BADGE = (score: number) => {
  if (score >= 70) return { label: "Good", color: TOKENS.green };
  if (score >= 40) return { label: "Average", color: TOKENS.amber };
  return { label: "Risky", color: TOKENS.red };
};
const RISK_COLOR = (level: RiskLevel) =>
  level === "High" ? TOKENS.red : level === "Medium" ? TOKENS.amber : TOKENS.green;

function Pill({ label, color, muted }: { label: string; color?: string; muted?: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-[2px] text-[12px] font-medium"
      style={{
        background: muted ? TOKENS.chipBg : alpha(color ?? TOKENS.textMuted, 0.12),
        color: color ?? TOKENS.textMuted,
        border: `1px solid ${alpha(color ?? TOKENS.textMuted, 0.18)}`,
      }}
    >
      {label}
    </span>
  );
}

/* ActiveShape for animated donut hover */
function ActiveSliceShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
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
}

function KpiCard({
  title,
  titleIcon,
  tooltip,
  value,
  valueLabel,
  color,
  chartType,
  series,
  donut,
  subtext,
  pills,
  onClick,
  cta,
}: {
  title: string;
  titleIcon?: React.ReactNode;
  tooltip?: string;
  value?: number;
  valueLabel?: string;
  color: string;
  chartType: "area" | "bar" | "donut" | "none";
  series?: SeriesPoint[];
  donut?: DonutSlice[];
  subtext?: string | React.ReactNode;
  pills?: Array<{ label: string; color?: string; muted?: boolean }>;
  cta?: React.ReactNode;
  onClick?: () => void;
}) {
  const donutTotal = donut?.length ? donut.reduce((a, b) => a + (b.value || 0), 0) : 0;
  const donutIsPercent = donutTotal > 0 && Math.abs(donutTotal - 100) < 0.5;
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip ?? title}
      className="group relative flex h-[132px] w-full flex-col rounded-xl border p-4 text-left transition-transform hover:-translate-y-[1px] hover:shadow cursor-pointer"
      style={{ borderColor: TOKENS.border, background: TOKENS.cardBg }}
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: TOKENS.text }}>
          <span className="inline-flex items-center" style={{ color: TOKENS.brand }}>
            {titleIcon}
          </span>
          {title}
        </div>
        <Info
          size={16}
          className="opacity-80 cursor-help"
          style={{ color: TOKENS.brand }}
        //   title={tooltip ?? title}
        />
      </div>

      {/* value + micro chart */}
      <div className="mt-2 flex items-end justify-between">
        <div className="leading-none">
          <div className="text-[28px] font-bold tracking-tight" style={{ color: TOKENS.metricBlue }}>
            {typeof valueLabel === "string" ? valueLabel : fmtInt(value)}
          </div>
        </div>

        {chartType !== "none" && (
          <div className="ml-3 h-[48px] w-[44%]">
            <ResponsiveContainer width="100%" height="100%">
        <ResponsiveContainer width="100%" height="100%">
  {chartType === "area" && series ? (
    <AreaChart data={series}>
      <RTooltip content={<TrendTooltip />} wrapperStyle={{ outline: "none" }} />
      <Area
        type="monotone"
        dataKey="y"
        stroke={color}
        fill={alpha(color, 0.2)}
        strokeWidth={2}
        isAnimationActive
      />
    </AreaChart>
  ) : chartType === "bar" && series ? (
    <BarChart data={series}>
      <RTooltip content={<TrendTooltip />} wrapperStyle={{ outline: "none" }} />
      <Bar dataKey="y" fill={color} radius={[4, 4, 0, 0]} isAnimationActive />
    </BarChart>
  ) : chartType === "donut" && donut ? (
    <PieChart>
      <RTooltip
        content={<DonutTooltip total={donutTotal} percentMode={donutIsPercent} />}
        wrapperStyle={{ outline: "none" }}
      />
      <Pie
        data={donut}
        dataKey="value"
        innerRadius={14}
        outerRadius={22}
        stroke="none"
        activeIndex={activeSlice}
        activeShape={ActiveSliceShape}
        onMouseEnter={(_, i) => setActiveSlice(i)}
        onMouseLeave={() => setActiveSlice(undefined)}
        isAnimationActive
      >
        {donut.map((d, i) => (
          <Cell key={i} fill={d.color ?? TOKENS.brand} className="cursor-pointer" />
        ))}
      </Pie>
    </PieChart>
  ) : (
    <></> // ✅ React fragment instead of null
  )}
</ResponsiveContainer>

            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* subtext / CTA / pills */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {subtext && (
          <div className="text-[12.5px]" style={{ color: TOKENS.textMuted }}>
            {subtext}
          </div>
        )}
        {cta}
      </div>
      {!!pills?.length && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {pills.map((p, i) => (
            <Pill key={i} label={p.label} color={p.color} muted={p.muted} />
          ))}
        </div>
      )}
    </button>
  );
}

function MetadataKpiSection({
  data,
  onNavigate,
  onConnectGA4,
}: {
  data?: SourcePageMetadataInput;
  onNavigate?: (target: NavigateArgs) => void;
  onConnectGA4?: () => void;
}) {
  const d = data ?? {};
  const wr = d.wrScore?.value ?? 62;
  const wrBadge = WR_BADGE(wr);

  const cards = useMemo(() => {
    return [
      {
        key: "wrScore",
        title: "WR Score (Domain)",
        icon: <ShieldCheck size={16} />,
        color: wrBadge.color,
        value: wr,
        chartType: "area" as const,
        series: toSeries(d.wrScore?.series),
        subtext:
          typeof d.wrScore?.trend === "number"
            ? `${d.wrScore?.trend >= 0 ? "+" : ""}${fmtInt(d.wrScore.trend)} in 30d · ${wrBadge.label}`
            : `${wrBadge.label}`,
        tooltip: "Domain-level reputation of the referring site.",
        route: "audit/ref-domains",
      },
      {
        key: "backlinksFromPage",
        title: "Backlinks from This Page",
        icon: <Link2 size={16} />,
        color: TOKENS.blue,
        value: d.backlinksFromPage?.value ?? 5,
        chartType: "bar" as const,
        series: toSeries(d.backlinksFromPage?.series ?? [1, 0, 2, 1, 3, 1, 2, 5, 2, 1, 2, 3]),
        subtext:
          typeof d.backlinksFromPage?.trend === "number"
            ? `${d.backlinksFromPage.trend >= 0 ? "+" : ""}${fmtInt(d.backlinksFromPage.trend)} vs prev. crawl`
            : "Per last crawl",
        tooltip: "Number of links from this source URL to your pages.",
        route: "audit/backlinks?scope=source-url",
      },
      {
        key: "anchorRisk",
        title: "Anchor Risk Level",
        icon: <AlertTriangle size={16} />,
        color: RISK_COLOR(d.anchorRisk?.highest ?? "Medium"),
        valueLabel: d.anchorRisk?.highest ?? "—",
        chartType: "donut" as const,
        donut:
          d.anchorRisk?.donut ?? [
            { name: "High", value: 2, color: TOKENS.red },
            { name: "Medium", value: 3, color: TOKENS.amber },
            { name: "Low", value: 4, color: TOKENS.green },
          ],
        subtext: d.anchorRisk?.examples?.length ? `e.g., “${d.anchorRisk.examples[0]}”` : "Highest severity across anchors",
        tooltip: "Highest risk classification for anchors on this page.",
        route: "audit/anchors?scope=source-url",
      },
      {
        key: "toxicity",
        title: "Toxicity Markers",
        icon: <ShieldAlert size={16} />,
        color: TOKENS.darkRed,
        valueLabel: (d.toxicity?.markers?.length ?? 0) > 0 ? `${d.toxicity?.markers?.length} flag(s)` : "Clean",
        chartType: (d.toxicity?.markers?.length ?? 0) > 0 ? ("bar" as const) : ("donut" as const),
        series:
          (d.toxicity?.markers?.length ?? 0) > 0
            ? toSeries(d.toxicity?.series ?? [0, 1, 2, 1, 3, 2, 2, 1])
            : undefined,
        donut:
          (d.toxicity?.markers?.length ?? 0) === 0
            ? [
                { name: "Clean", value: 1, color: TOKENS.green },
                { name: "Flags", value: 0, color: TOKENS.red },
              ]
            : undefined,
        subtext: (d.toxicity?.markers?.length ?? 0) > 0 ? "Review flags" : "No markers detected",
        tooltip: "Spam/malware/link-farm/TLD risk noted for this page (if any).",
        route: "audit/toxicity?scope=source-url",
        pills:
          (d.toxicity?.markers ?? []).length
            ? (d.toxicity?.markers ?? []).map((m) => ({ label: m, color: TOKENS.darkRed }))
            : [{ label: "Clean", color: TOKENS.green }],
      },
      {
        key: "refTraffic",
        title: "Referral Traffic (30d)",
        icon: <TrendingUp size={16} />,
        color: TOKENS.brand,
        value: d.referralTraffic?.ga4Connected ? d.referralTraffic.sessions ?? 0 : undefined,
        valueLabel: d.referralTraffic?.ga4Connected ? undefined : "—",
        chartType: d.referralTraffic?.ga4Connected ? ("area" as const) : ("none" as const),
        series: d.referralTraffic?.ga4Connected ? toSeries(d.referralTraffic?.series) : undefined,
        subtext: d.referralTraffic?.ga4Connected ? "Sessions via GA4" : undefined,
        tooltip: "Sessions from this source page (last 30 days).",
        route: "analytics/referrals?scope=source-url",
        cta: !d.referralTraffic?.ga4Connected ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConnectGA4?.();
            }}
            className="ml-2 inline-flex items-center rounded-md border px-2 py-[2px] text-[12px] font-medium cursor-pointer"
            style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.brand }}
            title="Connect GA4 to view referral sessions"
          >
            Connect GA4
          </button>
        ) : null,
      },
      {
        key: "rel",
        title: "Link Attribute(s)",
        icon: <Tags size={16} />,
        color: TOKENS.purple,
        valueLabel: d.relAttributes?.topLabel ? d.relAttributes.topLabel : "—",
        chartType: "donut" as const,
        donut:
          d.relAttributes?.donut ?? [
            { name: "dofollow", value: 3, color: TOKENS.relDofollow },
            { name: "nofollow", value: 2, color: TOKENS.relNofollow },
            { name: "sponsored", value: 1, color: TOKENS.relSponsored },
            { name: "ugc", value: 0, color: TOKENS.relUGC },
          ],
        subtext: "Most common rel= on this page",
        tooltip: "Distribution of rel attributes for links on this page.",
        route: "audit/backlinks?scope=source-url&view=rel",
        pills: [
          ...(d.relAttributes?.counts?.dofollow != null
            ? [{ label: `dofollow ${d.relAttributes.counts.dofollow}`, color: TOKENS.relDofollow }]
            : []),
          ...(d.relAttributes?.counts?.nofollow != null
            ? [{ label: `nofollow ${d.relAttributes.counts.nofollow}`, color: TOKENS.relNofollow }]
            : []),
          ...(d.relAttributes?.counts?.sponsored != null
            ? [{ label: `sponsored ${d.relAttributes.counts.sponsored}`, color: TOKENS.relSponsored }]
            : []),
          ...(d.relAttributes?.counts?.ugc != null
            ? [{ label: `ugc ${d.relAttributes.counts.ugc}`, color: TOKENS.relUGC }]
            : []),
        ],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), wrBadge.color, wrBadge.label]);

  const exportCardsCsv = () => {
    const header = ["Metric", "Value/Label"];
    const rows = cards.map((c) => [c.title, c.valueLabel ?? (typeof c.value === "number" ? fmtInt(c.value) : "—")]);
    const csv = [header, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "metadata-kpis.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="w-full">
      {/* Section Header with Export */}
      <div className="container mx-auto max-w-screen-2xl px-4">
        <div className="mb-3 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: TOKENS.brand }} />
            <h3 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
              Metadata / KPI Summary
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
            aria-label="Export Metadata KPI cards"
            onClick={exportCardsCsv}
            title="Export"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="container mx-auto max-w-screen-2xl px-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <KpiCard
              key={c.key}
              title={c.title}
              titleIcon={<span style={{ color: TOKENS.brand }}>{c.icon}</span>}
              tooltip={c.tooltip}
              value={c.value}
              valueLabel={c.valueLabel}
              color={c.color}
              chartType={c.chartType}
              series={c.series}
              donut={c.donut}
              subtext={c.subtext}
              pills={c.pills}
              cta={c.cta}
              onClick={() => onNavigate?.({ key: c.key, route: c.route, title: c.title })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   Anchor Usage Summary (Global table pattern)
   ========================================================================= */
type RiskLevelRow = "low" | "medium" | "high" | "toxic";
type AnchorType = "branded" | "exact" | "partial" | "generic" | "naked" | "spam";
type RelAttr = "dofollow" | "nofollow" | "ugc" | "sponsored";

export type AnchorUsageRow = {
  id: string;
  anchorText: string;
  anchorType: AnchorType;
  targetUrl: string;
  rel: RelAttr[];
  risk: RiskLevelRow;
  firstSeen: string;
  snippet?: string;
};

const TABLE_TOKENS = {
  type: {
    branded: TOKENS.brand,
    exact: TOKENS.red,
    partial: TOKENS.amber,
    generic: "#9CA3AF",
    naked: TOKENS.purple,
    spam: TOKENS.red,
  },
  rel: {
    dofollow: TOKENS.relDofollow,
    nofollow: TOKENS.relNofollow,
    ugc: TOKENS.relUGC,
    sponsored: TOKENS.relSponsored,
  },
  risk: {
    low: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    medium: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
    high: { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
    toxic: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  },
};

function seededRandom(seed: number) {
  let t = seed % 2147483647;
  return () => (t = (t * 16807) % 2147483647) / 2147483647;
}
function makeMockAnchorRows(count = 18): AnchorUsageRow[] {
  const rnd = seededRandom(424242);
  const anchorPool = [
    "wRanker",
    "learn more",
    "click here",
    "best seo tools",
    "buy backlinks",
    "our case study",
    "try the keyword analyzer",
    "https://wranker.ai/tools",
    "contact us",
    "cheap seo packages",
    "read more",
    "seo agency in jaipur",
    "pricing",
    "visit website",
    "https://example.com/",
  ];
  const targetPool = ["/", "/seo-guide", "/services/technical-seo", "/tools/keyword-analyzer", "/blog/top-seo-trends", "/case-studies/abc", "/pricing"];
  const types: AnchorType[] = ["branded", "exact", "partial", "generic", "naked", "spam"];
  const rels: RelAttr[] = ["dofollow", "nofollow", "ugc", "sponsored"];
  const risks: RiskLevelRow[] = ["low", "medium", "high", "toxic"];

  return Array.from({ length: count }).map((_, i) => {
    const anchorText = anchorPool[Math.floor(rnd() * anchorPool.length)];
    const targetUrl = targetPool[Math.floor(rnd() * targetPool.length)];
    let anchorType = types[Math.floor(rnd() * types.length)];
    if (/^https?:\/\//i.test(anchorText)) anchorType = "naked";
    if (/click here|learn more|read more/i.test(anchorText)) anchorType = "generic";
    if (/wRanker/i.test(anchorText)) anchorType = "branded";
    if (/buy|cheap|casino|backlinks/i.test(anchorText)) anchorType = "spam";
    if (/seo( |-|$)|agency|tools/i.test(anchorText) && !/cheap|casino/i.test(anchorText)) {
      if (anchorType !== "branded" && anchorType !== "generic") anchorType = "partial";
    }
    let risk: RiskLevelRow = risks[Math.floor(rnd() * risks.length)];
    if (anchorType === "spam") risk = "toxic";
    if (anchorType === "exact") risk = Math.random() > 0.4 ? "high" : "medium";
    if (anchorType === "branded" || anchorType === "generic") risk = "low";

    const mixCount = 1 + Math.floor(rnd() * 2);
    const rel = Array.from({ length: mixCount })
      .map(() => rels[Math.floor(rnd() * rels.length)])
      .reduce<RelAttr[]>((acc, v) => (acc.includes(v) ? acc : acc.concat(v)), []);

    const daysAgo = Math.floor(rnd() * 120);
    return {
      id: `row-${i + 1}`,
      anchorText,
      anchorType,
      targetUrl,
      rel,
      risk,
      firstSeen: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      snippet: `... context with <a href="#">${anchorText}</a> around the sentence ...`,
    };
  });
}

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}
function riskStyleRow(r: RiskLevelRow) {
  return TABLE_TOKENS.risk[r];
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
function downloadCsv(rows: AnchorUsageRow[], filename = "anchor-usage-summary.csv") {
  const header = ["Anchor Text", "Anchor Type", "Target Page", "rel", "Risk", "First Seen"];
  const lines = rows.map((r) => {
    const cells = [r.anchorText, r.anchorType, r.targetUrl, r.rel.join("|"), r.risk, formatDate(r.firstSeen)];
    return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function AnchorUsageSummarySection({
  title = "Anchor Usage Summary",
  sourcePageLabel,
}: {
  sourcePageLabel?: string;
  title?: string;
}) {
  const [rows, setRows] = useState<AnchorUsageRow[]>([]);
  useEffect(() => {
    setRows(makeMockAnchorRows(22));
  }, []);

  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<Set<AnchorType>>(new Set());
  const [risks, setRisks] = useState<Set<RiskLevelRow>>(new Set());
  const [relFilter, setRelFilter] = useState<Set<RelAttr>>(new Set());
  const [onlyFollow, setOnlyFollow] = useState<boolean>(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  type SortKey = "anchorText" | "anchorType" | "targetUrl" | "risk" | "firstSeen";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "firstSeen", dir: "desc" });

  const filtered = useMemo(() => {
    let list = rows.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.anchorText.toLowerCase().includes(q) || r.targetUrl.toLowerCase().includes(q));
    }
    if (types.size) list = list.filter((r) => types.has(r.anchorType));
    if (risks.size) list = list.filter((r) => risks.has(r.risk));
    if (relFilter.size) list = list.filter((r) => r.rel.some((x) => relFilter.has(x)));
    if (onlyFollow) list = list.filter((r) => r.rel.includes("dofollow"));
    return list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      let av: any = a[sort.key];
      let bv: any = b[sort.key];
      if (sort.key === "firstSeen") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, search, types, risks, relFilter, onlyFollow, sort]);

  const allOnPageSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const bulkDisavow = () => {
    alert(`Queued ${selected.size} link(s) for disavow (mock).`);
    setSelected(new Set());
  };
  const bulkTask = () => {
    alert(`Created a task for ${selected.size} link(s) (mock).`);
    setSelected(new Set());
  };

  const labelize = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

  return (
    <section className="w-full">
      {/* Sticky section header */}
      <div className="container mx-auto max-w-screen-2xl px-4">
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 px-0 py-3 border-b bg-white/95 backdrop-blur"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex items-center gap-2">
            <LinkIcon size={18} style={{ color: TOKENS.brand }} />
            <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </h3>
            <Info
              size={16}
              className="cursor-help"
              style={{ color: TOKENS.brand }}
            //   title="One row per anchor → target page on this source."
            />
            {sourcePageLabel && <span className="text-xs text-gray-600">• {sourcePageLabel}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCsv(filtered)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-white cursor-pointer"
              style={{ color: TOKENS.brand, borderColor: TOKENS.border }}
              title="Export CSV"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </header>
      </div>

      {/* Filters */}
      <div className="container mx-auto max-w-screen-2xl px-4">
        <div
          className="sticky top-[52px] z-10 border-b bg-white/95 backdrop-blur px-0 py-2"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded border" style={{ borderColor: TOKENS.border }}>
              <Search size={16} style={{ color: TOKENS.textMuted }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anchor or target page…"
                className="outline-none text-sm w-64"
              />
            </div>

            {/* Anchor type chips */}
            {(["branded", "exact", "partial", "generic", "naked", "spam"] as AnchorType[]).map((t) => {
              const active = types.has(t);
              const color = (TABLE_TOKENS.type as any)[t];
              return (
                <button
                  key={t}
                  onClick={() =>
                    setTypes((s) => {
                      const n = new Set(s);
                      active ? n.delete(t) : n.add(t);
                      return n;
                    })
                  }
                  className={clsx("px-2 py-1 rounded-full text-[12px] border cursor-pointer", active ? "font-semibold" : "text-gray-600")}
                  style={{
                    backgroundColor: active ? `${color}14` : TOKENS.chipBg,
                    borderColor: active ? `${color}66` : TOKENS.border,
                    color: active ? color : TOKENS.textMuted,
                  }}
                  title={`Filter: ${t}`}
                >
                  {labelize(t)}
                </button>
              );
            })}

            {/* Risk chips */}
            {(["low", "medium", "high", "toxic"] as RiskLevelRow[]).map((r) => {
              const s = riskStyleRow(r);
              const active = risks.has(r);
              return (
                <button
                  key={r}
                  onClick={() =>
                    setRisks((st) => {
                      const n = new Set(st);
                      active ? n.delete(r) : n.add(r);
                      return n;
                    })
                  }
                  className={clsx("px-2 py-1 rounded-full text-[12px] border cursor-pointer", active ? "font-semibold" : "text-gray-600")}
                  style={{
                    backgroundColor: active ? s.bg : TOKENS.chipBg,
                    color: active ? s.text : TOKENS.textMuted,
                    borderColor: active ? s.border : TOKENS.border,
                  }}
                  title={`Filter risk: ${r}`}
                >
                  {labelize(r)} Risk
                </button>
              );
            })}

            {/* rel= chips */}
            {(["dofollow", "nofollow", "ugc", "sponsored"] as RelAttr[]).map((rel) => {
              const active = relFilter.has(rel);
              const color = (TABLE_TOKENS.rel as any)[rel];
              return (
                <button
                  key={rel}
                  onClick={() =>
                    setRelFilter((st) => {
                      const n = new Set(st);
                      active ? n.delete(rel) : n.add(rel);
                      return n;
                    })
                  }
                  className={clsx("px-2 py-1 rounded-full text-[12px] border cursor-pointer", active ? "font-semibold" : "text-gray-600")}
                  style={{
                    backgroundColor: active ? `${color}14` : TOKENS.chipBg,
                    borderColor: active ? `${color}66` : TOKENS.border,
                    color: active ? color : TOKENS.textMuted,
                  }}
                  title={`Filter rel=${rel}`}
                >
                  rel={rel}
                </button>
              );
            })}

            {/* Only dofollow */}
            <label
              className="ml-1 inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border cursor-pointer"
              style={{ borderColor: TOKENS.border, backgroundColor: TOKENS.chipBg }}
              title="Only dofollow"
            >
              <input type="checkbox" checked={onlyFollow} onChange={(e) => setOnlyFollow(e.target.checked)} />
              Only dofollow
            </label>

            <div className="ml-auto flex items-center gap-2 text-sm">
              <Filter size={16} style={{ color: TOKENS.textMuted }} />
              <span className="text-gray-600">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="container mx-auto max-w-screen-2xl px-4">
        {selected.size > 0 && (
          <div className="sticky top-[106px] z-10 bg-blue-50/80 backdrop-blur border-y px-3 py-2 flex items-center gap-3" style={{ borderColor: TOKENS.border }}>
            <span className="text-sm font-medium text-blue-900">{selected.size} selected</span>
            <div className="h-5 w-px bg-blue-300" />
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm hover:bg-white cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
              onClick={bulkDisavow}
              title="Disavow (bulk)"
            >
              <ShieldAlert size={16} />
              Disavow
            </button>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm hover:bg-white cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
              onClick={bulkTask}
              title="Create Task"
            >
              <Wrench size={16} />
              Create Task
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="container mx-auto max-w-screen-2xl px-4">
        <div className="overflow-auto max-h-[56vh]">
          <table className="min-w-[880px] w-full text-sm">
            <thead className="bg-white border-b" style={{ borderColor: TOKENS.border }}>
              <tr className="text-left text-[12px] text-gray-600">
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allOnPageSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(filtered.map((r) => r.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <SortableTh label="Anchor Text" k="anchorText" sort={sort} setSort={setSort} />
                <SortableTh label="Target Page" k="targetUrl" sort={sort} setSort={setSort} />
                <th className="px-3 py-2">rel= Attribute</th>
                <SortableTh label="Anchor Risk" k="risk" sort={sort} setSort={setSort} />
                <SortableTh label="First Seen" k="firstSeen" sort={sort} setSort={setSort} />
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50" style={{ borderColor: TOKENS.border }}>
                  {/* Select */}
                  <td className="w-10 px-4 py-2 align-top">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.anchorText} → ${r.targetUrl}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                    />
                  </td>

                  {/* Anchor Text */}
                  <td className="px-3 py-2 align-top max-w-[320px]">
                    <div className="flex items-start gap-2">
                      <TypeBadge type={r.anchorType} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={clsx("font-medium truncate", r.anchorType === "exact" && "text-red-600", r.anchorType === "spam" && "text-red-700")}
                            title={r.anchorText}
                          >
                            {r.anchorText}
                          </span>
                          <button
                            className="ml-1 p-1 rounded hover:bg-gray-100 cursor-pointer"
                            onClick={() => navigator.clipboard.writeText(r.anchorText)}
                            aria-label="Copy anchor text"
                            title="Copy anchor text"
                          >
                            <Copy size={14} style={{ color: TOKENS.brand }} />
                          </button>
                        </div>
                        <div className="text-[12px] text-gray-600">Hover to preview context</div>
                      </div>
                    </div>
                  </td>

                  {/* Target Page */}
                  <td className="px-3 py-2 align-top">
                    <a
                      className="hover:underline cursor-pointer"
                      style={{ color: TOKENS.brand }}
                      title="Open Target Page (in tool)"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("open_target_pages_tab", { target: r.targetUrl });
                      }}
                      href="#"
                    >
                      {r.targetUrl}
                    </a>
                  </td>

                  {/* rel= */}
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap items-center gap-1">
                      {r.rel.map((rel) => (
                        <RelChip key={rel} rel={rel} />
                      ))}
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="px-3 py-2 align-top">
                    <RiskPill level={r.risk} />
                  </td>

                  {/* First Seen */}
                  <td className="px-3 py-2 align-top">{formatDate(r.firstSeen)}</td>

                  {/* Actions (branded) */}
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        className="hover:opacity-90 cursor-pointer"
                        style={{ color: TOKENS.brand }}
                        title="Disavow this link"
                        onClick={() => {
                          alert("Link queued for disavow (mock).");
                        }}
                      >
                        <ShieldAlert size={16} />
                      </button>
                      <button
                        className="hover:opacity-90 cursor-pointer"
                        style={{ color: TOKENS.brand }}
                        title="Create optimization task"
                        onClick={() => {
                          alert("Task created (mock).");
                        }}
                      >
                        <Wrench size={16} />
                      </button>
                      <button
                        className="hover:opacity-90 cursor-pointer"
                        style={{ color: TOKENS.brand }}
                        title="Open target page"
                        onClick={() => console.log("open_target_page_analyzer", { target: r.targetUrl })}
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No anchor usages match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between px-0 py-3 border-t" style={{ borderColor: TOKENS.border }}>
          <div className="text-sm text-gray-600">Showing {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Info size={14} style={{ color: TOKENS.brand }} /> Click a rel= chip, risk pill, or type badge to filter via the chips above.
          </div>
        </div>
      </div>
    </section>
  );
}

function SortableTh({
  label,
  k,
  sort,
  setSort,
}: {
  label: string;
  k: "anchorText" | "anchorType" | "targetUrl" | "risk" | "firstSeen";
  sort: { key: string; dir: "asc" | "desc" };
  setSort: (s: { key: any; dir: "asc" | "desc" }) => void;
}) {
  const isActive = sort.key === k;
  return (
    <th
      role="button"
      tabIndex={0}
      onClick={() => setSort({ key: k, dir: isActive && sort.dir === "asc" ? "desc" : "asc" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          setSort({ key: k, dir: isActive && sort.dir === "asc" ? "desc" : "asc" });
      }}
      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className="px-3 py-2 select-none cursor-pointer"
    >
      <span className="inline-flex items-center gap-1">
        {label}{" "}
        <ChevronsUpDown size={14} className={clsx("text-gray-400", isActive && "text-gray-700")} />
      </span>
    </th>
  );
}
function TypeBadge({ type }: { type: AnchorType }) {
  const color = (TABLE_TOKENS.type as any)[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium border cursor-pointer"
      style={{ backgroundColor: `${color}14`, color, borderColor: `${color}55` }}
      title={`Anchor type: ${type}`}
    >
      <Tag size={12} />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}
function RelChip({ rel }: { rel: RelAttr }) {
  const color = (TABLE_TOKENS.rel as any)[rel];
  return (
    <button
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium border cursor-pointer"
      style={{ backgroundColor: `${color}14`, color, borderColor: `${color}55` }}
      onClick={(e) => e.preventDefault()}
      title={`rel=${rel}`}
    >
      {`rel=${rel}`}
    </button>
  );
}
function RiskPill({ level }: { level: RiskLevelRow }) {
  const s = riskStyleRow(level);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-semibold border"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
      title={`${level} risk`}
    >
      {level === "low" && <ShieldCheck size={12} />}
      {level === "medium" && <CheckCircle2 size={12} />}
      {level === "high" && <AlertTriangle size={12} />}
      {level === "toxic" && <ShieldAlert size={12} />}
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

/* =========================================================================
   Main drop-in Drawer component (merged)
   ========================================================================= */
export default function ViewSourcePageDrawer({
  url,
  data,
  onClose,
  onNavigate,
  onConnectGA4,
  sourcePageLabel,
  title = "View Source Page",
}: {
  url: string;
  data?: SourcePageMetadataInput;
  onClose: () => void;
  onNavigate?: (target: NavigateArgs) => void;
  onConnectGA4?: () => void;
  sourcePageLabel?: string;
  title?: string;
}) {
  return (
    <div
      className="w-full"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Inter Fallback", sans-serif',
      }}
    >
      {/* Drawer Header */}
      <ViewSourcePageHeader url={url} onClose={onClose} title={title} />

      {/* Section 1: Metadata / KPI Summary (container) */}
      <MetadataKpiSection data={data} onNavigate={onNavigate} onConnectGA4={onConnectGA4} />

      {/* Section 2: Anchor Usage Summary (container + global pattern) */}
      <div className="mt-6">
        <AnchorUsageSummarySection sourcePageLabel={sourcePageLabel} />
      </div>
    </div>
  );
}

/* Optional named export if you want to reuse sections individually */
export { MetadataKpiSection as SourcePageMetadataCards };
