"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  ShieldAlert,
  GitBranch,
  SearchCheck,
  CopyCheck,
  Info,
  ChevronRight,
  ExternalLink,
  Download,
  LayoutGrid,
  Table as TableIcon,
  PieChart as PieIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  YAxis,
} from "recharts";

/* =============================================================================
 * TOKENS / STYLES (global, reused)
 * ========================================================================== */
const TOKENS = {
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chip: "#F5F7FA",
  brand: "#008CCD", // branded icon color
  mainBlue: "#0077FF", // primary numerals / informational charts
  pastelBlue: "#D9EEF8",

  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
} as const;

const fontFamily =
  'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"';

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const fmtInt = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : intFmt.format(n);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toneColor(tone: "good" | "warn" | "danger") {
  return tone === "good" ? TOKENS.good : tone === "warn" ? TOKENS.warn : TOKENS.danger;
}

/* =============================================================================
 * TYPES — portfolio scope
 * ========================================================================== */
export type Id = string;
export type TrendPoint = { t: string; v: number }; // ISO date
export type Delta = { abs?: number; pct?: number; direction: "up" | "down" | "flat" };

export type ProjectRow = {
  id: Id;
  name: string;
  favicon?: string;
  pagesCrawled?: number;
};

export type PageHealthByProject = {
  project: ProjectRow;
  avgHealth: number; // 0..100
  delta?: Delta; // vs previous
  affectedPct?: number; // pages with health<80 / crawled
  trend?: TrendPoint[]; // last N crawls
};

export type CwvSummary = {
  failingCount: number;
  pass: number;
  ni: number;
  fail: number;
  device: "mobile" | "desktop";
  source: "field" | "lab";
  trendFail?: TrendPoint[];
  delta?: Delta;
  topProjects?: Array<{ project: ProjectRow; failing: number }>;
};

export type HttpsSsl = {
  httpsPct: number; // 0..100
  deltaPct?: Delta;
  mixedCount: number;
  sslIssues: number;
};

export type RedirectChains = {
  chainRatePct: number; // 0..100
  avgChainLen: number; // >= 1.0
  trendRate?: TrendPoint[]; // (kept for future)
};

export type Indexability = {
  indexablePct: number; // 0..100
  indexableCount: number;
  blockers: Record<"noindex" | "robots" | "xrobots" | "non200" | "canonicalized" | "soft404", number>;
  deltaPct?: Delta;
};

export type CrawlPageExperienceSummaryData = {
  projects: ProjectRow[];
  lowestPageHealth: PageHealthByProject[];
  cwv: CwvSummary;
  https: HttpsSsl;
  redirects: RedirectChains;
  indexability: Indexability;
};

export type AuditDeepLink = {
  tab: "page-experience" | "issues" | "link-analyzer";
  params: Record<string, string | number | boolean | undefined>;
};

export type SourceConnections = { crawler?: boolean; psi?: boolean; gsc?: boolean };

/* =============================================================================
 * DEMO MOCK DATA — safe defaults (≤ 12 buckets for perf)
 * ========================================================================== */
const PROJECT_PALETTE = [
  "#0077FF",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#22C55E",
  "#F97316",
  "#EC4899",
  "#14B8A6",
  "#7C3AED",
  "#94A3B8",
];

const demoProjects: ProjectRow[] = [
  { id: "p1", name: "Wranker", favicon: "https://www.google.com/s2/favicons?domain=wranker.com&sz=32", pagesCrawled: 4100 },
  { id: "p2", name: "W3era", favicon: "https://www.google.com/s2/favicons?domain=w3era.com&sz=32", pagesCrawled: 3200 },
  { id: "p3", name: "Vefogix", favicon: "https://www.google.com/s2/favicons?domain=vefogix.com&sz=32", pagesCrawled: 2800 },
  { id: "p4", name: "Acme Co", favicon: "https://www.google.com/s2/favicons?domain=acme.com&sz=32", pagesCrawled: 1900 },
  { id: "p5", name: "Beta Inc", favicon: "https://www.google.com/s2/favicons?domain=beta.io&sz=32", pagesCrawled: 1300 },
];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function mkTrend(n = 10, base = 50, jitter = 0.15): TrendPoint[] {
  let v = base;
  const out: TrendPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    v = clamp(v + (Math.random() - 0.5) * base * jitter, 5, 95);
    out.push({ t: isoDaysAgo(i), v: Math.round(v) });
  }
  return out;
}
function mkFailTrend(n = 10, base = 120, jitter = 0.3): TrendPoint[] {
  let v = base;
  const out: TrendPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    v = Math.max(0, v + Math.round((Math.random() - 0.5) * base * jitter));
    out.push({ t: isoDaysAgo(i), v });
  }
  return out;
}
function mkRateTrend(n = 10, base = 12, jitter = 0.35): TrendPoint[] {
  let v = base;
  const out: TrendPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    v = clamp(v + (Math.random() - 0.5) * base * jitter, 1, 40);
    out.push({ t: isoDaysAgo(i), v: Math.round(v) });
  }
  return out;
}

function toneForHealth(score: number): "good" | "warn" | "danger" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "danger";
}
function toneForHttps(httpsPct: number, sslIssues: number): "good" | "warn" | "danger" {
  if (sslIssues > 0) return "danger";
  if (httpsPct >= 98) return "good";
  if (httpsPct >= 95) return "warn";
  return "danger";
}
function toneForIndex(indexablePct: number): "good" | "warn" | "danger" {
  if (indexablePct >= 90) return "good";
  if (indexablePct >= 80) return "warn";
  return "danger";
}
function toneForRedirect(chainRatePct: number, avgLen: number): "good" | "warn" | "danger" {
  if (avgLen >= 3) return "danger";
  if (chainRatePct > 10) return "warn";
  return "good";
}
function deltaUp(abs = 0, pct?: number): Delta {
  return { abs, pct, direction: abs > 0 ? "up" : abs < 0 ? "down" : "flat" };
}

/** device-specific mock for CWV */
function mockCwv(device: "mobile" | "desktop"): CwvSummary {
  const mobile = device === "mobile";
  const pass = mobile ? 540 : 720;
  const ni = mobile ? 240 : 180;
  const fail = mobile ? 160 : 100;
  const failingCount = fail + Math.round(ni * 0.3);
  const tops = demoProjects.map((p, i) => ({
    project: p,
    failing: Math.round((failingCount / (i + 2.75)) * (mobile ? 1.05 : 0.9)),
  }));
  return {
    failingCount,
    pass,
    ni,
    fail,
    device,
    source: "field",
    trendFail: mkFailTrend(10, failingCount, mobile ? 0.35 : 0.25),
    delta: deltaUp(Math.round((Math.random() - 0.5) * 20), Math.round((Math.random() - 0.5) * 4)),
    topProjects: tops.slice(0, 5),
  };
}

export const DEMO_CRAWL_PAGE_EXPERIENCE: CrawlPageExperienceSummaryData = {
  projects: demoProjects,
  lowestPageHealth: [
    { project: demoProjects[2], avgHealth: 61, delta: deltaUp(+2.1), affectedPct: 31, trend: mkTrend(8, 58, 0.18) },
    { project: demoProjects[1], avgHealth: 67, delta: deltaUp(-1.5), affectedPct: 24, trend: mkTrend(8, 65, 0.16) },
    { project: demoProjects[4], avgHealth: 72, delta: deltaUp(+0.8), affectedPct: 18, trend: mkTrend(8, 70, 0.14) },
    { project: demoProjects[3], avgHealth: 75, delta: deltaUp(+1.2), affectedPct: 12, trend: mkTrend(8, 72, 0.12) },
    { project: demoProjects[0], avgHealth: 79, delta: deltaUp(+0.6), affectedPct: 9, trend: mkTrend(8, 77, 0.1) },
  ],
  cwv: mockCwv("mobile"),
  https: { httpsPct: 96.4, deltaPct: deltaUp(+0.7), mixedCount: 23, sslIssues: 1 },
  redirects: { chainRatePct: 11.8, avgChainLen: 2.6, trendRate: mkRateTrend(10, 12, 0.35) },
  indexability: {
    indexablePct: 85.6,
    indexableCount: 8620,
    deltaPct: deltaUp(+1.4),
    blockers: { noindex: 210, robots: 120, xrobots: 45, non200: 96, canonicalized: 140, soft404: 62 },
  },
};

/* =============================================================================
 * Small atoms
 * ========================================================================== */
function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
  title?: string;
}) {
  const bg =
    tone === "good" ? "#ECFDF5" : tone === "warn" ? "#FFFBEB" : tone === "danger" ? "#FEF2F2" : TOKENS.chip;
  const fg =
    tone === "good" ? TOKENS.good : tone === "warn" ? TOKENS.warn : tone === "danger" ? TOKENS.danger : TOKENS.muted;
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
      style={{ background: bg, color: fg, border: `1px solid ${TOKENS.border}` }}
    >
      {children}
    </span>
  );
}

function MiniDelta({ delta, unit = "" }: { delta?: Delta; unit?: string }) {
  if (!delta || (typeof delta.abs !== "number" && typeof delta.pct !== "number"))
    return (
      <span className="text-xs" style={{ color: TOKENS.muted }}>
        —
      </span>
    );
  const up = delta.direction === "up";
  const down = delta.direction === "down";
  const color = up ? TOKENS.good : down ? TOKENS.danger : TOKENS.muted;
  const arrow = up ? "▲" : down ? "▼" : "—";
  const content = typeof delta.pct === "number" ? `${Math.abs(delta.pct).toFixed(1)}%` : `${Math.abs(delta.abs ?? 0)}`;
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {arrow} {content}
      {unit}
    </span>
  );
}

function Favicon({ url, alt, size = 16 }: { url?: string; alt: string; size?: number }) {
  const [err, setErr] = React.useState(false);
  const letter = (alt?.[0] ?? "•").toUpperCase();
  return err || !url ? (
    <div
      className="grid place-items-center rounded"
      style={{
        width: size,
        height: size,
        background: "#F3F4F6",
        color: "#6B7280",
        fontSize: size * 0.6,
        lineHeight: 1,
      }}
    >
      {letter}
    </div>
  ) : (
    <img src={url} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} className="rounded" />
  );
}

/* mini spark bars with hover index + pointer position callback */
function SparkBars({
  data,
  color,
  onActiveIndex,
  onPointerMove,
  onPointerLeave,
}: {
  data?: TrendPoint[];
  color: string;
  onActiveIndex?: (i: number | null) => void;
  onPointerMove?: (pt: { x: number; y: number }) => void;
  onPointerLeave?: () => void;
}) {
const [active, setActive] = React.useState<number | null>(null);
  if (!data || !data.length) return <div className="h-6 w-28 rounded bg-gray-100" />;
  return (
    <div className="h-6 w-28">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
          onMouseMove={(s: any) => {
            const idx = typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : null;
            setActive(idx);
            onActiveIndex?.(idx);
            if (typeof s?.chartX === "number" && typeof s?.chartY === "number") {
              onPointerMove?.({ x: s.chartX, y: s.chartY });
            }
          }}
          onMouseLeave={() => {
            setActive(null);
            onActiveIndex?.(null);
            onPointerLeave?.();
          }}
        >
          <RTooltip wrapperStyle={{ display: "none" }} />
          <XAxis dataKey="t" hide />
          <Bar dataKey="v" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} opacity={active === i ? 1 : 0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =============================================================================
 * Card shell (forwardRef to expose the card container for popover layout)
 * ========================================================================== */
type CardShellProps = {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};
const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(function CardShell(
  { icon, title, onClick, children, className, ariaLabel },
  ref
) {
  return (
    <div
      ref={ref}
      role="button"
      aria-label={ariaLabel || `Open Site Audit — ${title}`}
      onClick={onClick}
      className={cx(
        "relative flex h-full cursor-pointer flex-col rounded-md border p-4 shadow-sm transition hover:shadow",
        className
      )}
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex" style={{ color: TOKENS.brand }}>
          {icon}
        </span>
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
});

/* =============================================================================
 * Fixed-position popover helpers — (reference pattern)
 * ========================================================================== */
function useBoundingRect<T extends HTMLElement>(): [React.RefObject<T | null>, DOMRect | null] {
  const ref = React.useRef<T>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      try {
        const r = el.getBoundingClientRect?.();
        if (r) setRect(r);
      } catch {}
    };
    update();
    const ro = (typeof ResizeObserver !== "undefined" && new ResizeObserver(update)) as ResizeObserver | null;
    ro?.observe(el);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true } as any);
    };
  }, []);

  return [ref, rect];
}

function PopoverPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* Helper: stable project color */
function projectColor(projectId: string, projects: ProjectRow[]) {
  const idx = projects.findIndex((p) => p.id === projectId);
  const i = idx >= 0 ? idx : 0;
  return PROJECT_PALETTE[i % PROJECT_PALETTE.length];
}

/* Distribute a total across items by weight */
function distributeAcross<T extends { id: string }>(
  total: number,
  items: T[],
  weight: (it: T) => number
): Record<string, number> {
  const ws = items.map(weight);
  const sumW = ws.reduce((s, x) => s + (x || 0), 0) || 1;
  const raw = items.map((it, i) => ({ id: it.id, v: ((ws[i] || 0) / sumW) * total }));
  let acc = 0;
  const out: Record<string, number> = {};
  raw.forEach((r, i) => {
    const v = i === raw.length - 1 ? Math.max(0, Math.round(total - acc)) : Math.round(r.v);
    out[r.id] = v;
    acc += v;
  });
  return out;
}

/* =============================================================================
 * Tile 1 — Lowest Page Health projects (popover BELOW spark, fixed via portal)
 * ========================================================================== */
function LPHRow({
  row,
  onOpenProject,
}: {
  row: PageHealthByProject;
  onOpenProject: (projectId: string) => void;
}) {
  const [sparkIdx, setSparkIdx] = React.useState<number | null>(null);
  const [hovering, setHovering] = React.useState(false);
  const [sparkRef, sparkRect] = useBoundingRect<HTMLDivElement>();
  const tone = toneForHealth(row.avgHealth);
  const color = toneColor(tone);

  return (
    <div
      className="relative rounded px-1 py-1 hover:bg-gray-50"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setSparkIdx(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpenProject(row.project.id);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Favicon url={row.project.favicon} alt={row.project.name} />
          <div className="truncate text-sm" style={{ color: TOKENS.text }}>
            {row.project.name}
          </div>
          <div className="ml-2 inline-flex items-baseline gap-2">
            <span className="text-[15px] font-semibold" style={{ color: TOKENS.mainBlue }}>
              {Math.round(row.avgHealth)}
            </span>
            <MiniDelta delta={row.delta} />
          </div>
          {row.affectedPct != null && row.avgHealth < 80 && (
            <span className="ml-2">
              <Chip tone="warn" title="Share of affected pages">
                {row.affectedPct}% affected
              </Chip>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div ref={sparkRef} className="relative">
            <SparkBars
              data={row.trend}
              color={color}
              onActiveIndex={(i) => setSparkIdx(i)}
            />
          </div>
        </div>
      </div>

      {/* Fixed popover BELOW the spark area; never covers the chart/pointer */}
      {hovering && sparkIdx != null && row.trend && sparkRect && (
        <PopoverPortal>
          <div
            className="rounded-md border bg-white p-3 text-xs shadow"
            style={{
              position: "fixed",
              left: sparkRect.left + sparkRect.width / 2,
              top: sparkRect.bottom + 8,
              transform: "translateX(-50%)",
              zIndex: 60,
              borderColor: TOKENS.border,
              width: Math.min(360, Math.max(260, sparkRect.width + 80)),
              fontFamily,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                {row.project.name}
              </div>
              <div className="ml-auto text-sm" style={{ color: TOKENS.mainBlue }}>
                {row.trend[sparkIdx].v}
              </div>
            </div>
            <div className="mt-1 text-[12px]" style={{ color: TOKENS.muted }}>
              {new Date(row.trend[sparkIdx].t).toLocaleDateString()}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

function TileLowestPageHealth({
  rows,
  onOpenProject,
}: {
  rows: PageHealthByProject[];
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <CardShell title="Lowest Page Health projects" icon={<SearchCheck size={18} />}>
      <div className="grid gap-2">
        {rows.slice(0, 5).map((r) => (
          <LPHRow key={r.project.id} row={r} onOpenProject={onOpenProject} />
        ))}
      </div>
    </CardShell>
  );
}

/* =============================================================================
 * Tile 2 — Most Failing CWV Projects’ Pages
 *  - Donut popover (auto-placed outside, fixed)
 *  - Trend popover (below chart, fixed)
 * ========================================================================== */
function TileCWV({
  projects,
  cwv,
  onOpen,
  device,
}: {
  projects: ProjectRow[];
  cwv: CwvSummary;
  onOpen: () => void;
  device: "mobile" | "desktop";
}) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  const baseWeights: Record<string, number> = {};
  (cwv.topProjects || []).forEach((tp) => (baseWeights[tp.project.id] = tp.failing));
  projects.forEach((p, i) => {
    if (baseWeights[p.id] == null) baseWeights[p.id] = Math.max(1, Math.round(cwv.failingCount / (i + 6)));
  });
  const failByProject = distributeAcross(cwv.failingCount, projects, (p) => baseWeights[p.id] || 1);

  const donutData = projects.map((p) => ({
    key: p.id,
    name: p.name,
    favicon: p.favicon,
    value: failByProject[p.id] ?? 0,
    color: projectColor(p.id, projects),
  }));

  const [donutRef, donutRect] = useBoundingRect<HTMLDivElement>();
  const [mouse, setMouse] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [donutHover, setDonutHover] = React.useState(false);

  const donutSorted = [...donutData].sort((a, b) => b.value - a.value);
  const donutTop = donutSorted.slice(0, 9);
  const donutOthers = donutSorted.slice(9).reduce((s, r) => s + r.value, 0);

  const series = cwv.trendFail ?? [];
  const [trendIdx, setTrendIdx] = React.useState<number | null>(null);
  const [trendRef, trendRect] = useBoundingRect<HTMLDivElement>();

  // auto placement for donut popover (outside donut)
  const donutPlacement: "left" | "right" | "top" | "bottom" = React.useMemo(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (x < 0.35) return "right";
    if (x > 0.65) return "left";
    return y < 0.5 ? "bottom" : "top";
  }, [mouse]);

  function donutPopoverStyle(): React.CSSProperties | undefined {
    if (!donutRect) return undefined;
    const base: React.CSSProperties = {
      position: "fixed",
      zIndex: 60,
      borderColor: TOKENS.border,
      minWidth: 300,
      fontFamily,
    };
    if (donutPlacement === "left") {
      return { ...base, left: donutRect.left - 8, top: donutRect.top + donutRect.height / 2, transform: "translate(-100%, -50%)" };
    }
    if (donutPlacement === "right") {
      return { ...base, left: donutRect.right + 8, top: donutRect.top + donutRect.height / 2, transform: "translate(0, -50%)" };
    }
    if (donutPlacement === "top") {
      return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.top - 8, transform: "translate(-50%, -100%)" };
    }
    return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.bottom + 8, transform: "translate(-50%, 0)" };
  }

  return (
    <CardShell title="Most Failing CWV Projects’ Pages" icon={<BarChart3 size={18} />} onClick={onOpen}>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <div className="text-[28px] font-bold" style={{ color: TOKENS.mainBlue }}>
            {fmtInt(cwv.failingCount)}
          </div>
          <MiniDelta delta={cwv.delta} />
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="neutral">{cwv.source === "field" ? "CrUX field" : "Lab estimate"}</Chip>
          <Chip tone="neutral">{device === "mobile" ? "Mobile" : "Desktop"}</Chip>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-12 gap-3">
        {/* Donut with fixed-position smart popover (outside) */}
        <div
          ref={donutRef}
          className="relative col-span-12 h-[130px] md:col-span-5"
          onMouseEnter={() => setDonutHover(true)}
          onMouseLeave={() => {
            setDonutHover(false);
            setActiveIdx(null);
          }}
          onMouseMove={(e) => {
            const r = donutRef.current?.getBoundingClientRect();
            if (!r) return;
            setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
          }}
        >
          <ResponsiveContainer>
            <PieChart>
              <RTooltip wrapperStyle={{ display: "none" }} />
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={52}
                paddingAngle={2}
                onMouseEnter={(_, i) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className="cursor-pointer"
              >
                {donutData.map((s, i) => (
                  <Cell
                    key={s.key}
                    fill={s.color}
                    style={{
                      transition: "transform 120ms ease-out",
                      transform: activeIdx === i ? "scale(1.05)" : "scale(1)",
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Donut popover (outside — portal, fixed) */}
        {donutHover && donutRect && (
          <PopoverPortal>
            <div className="rounded-md border bg-white p-3 text-xs shadow" style={donutPopoverStyle()}>
              <div className="mb-2 flex items-center gap-2">
                <PieIcon size={14} color={TOKENS.brand} />
                <div className="font-semibold" style={{ color: TOKENS.text }}>
                  Failing CWV — by project
                </div>
              </div>
              {donutTop.map((d) => (
                <div key={d.key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color }} />
                    <Favicon url={d.favicon} alt={d.name} />
                    <div className="truncate">{d.name}</div>
                  </div>
                  <div className="font-semibold">{fmtInt(d.value)}</div>
                </div>
              ))}
              {donutOthers > 0 && (
                <div className="mt-2 border-t pt-2" style={{ borderColor: TOKENS.border }}>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="grid place-items-center rounded text-[11px]"
                        style={{ width: 16, height: 16, background: "#F3F4F6", color: TOKENS.muted }}
                      >
                        …
                      </div>
                      <div>Others</div>
                    </div>
                    <div className="font-semibold">{fmtInt(donutOthers)}</div>
                  </div>
                </div>
              )}
            </div>
          </PopoverPortal>
        )}

        {/* Bar trend with fixed popover BELOW chart (outside) */}
        <div className="col-span-12 md:col-span-7">
          <div
            ref={trendRef}
            className="relative h-[130px] w-full"
            onMouseLeave={() => {
              setTrendIdx(null);
            }}
          >
            <ResponsiveContainer>
              <BarChart
                data={series.map((d) => ({ t: d.t, Fail: d.v }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                onMouseMove={(s: any) => {
                  const idx = typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : null;
                  setTrendIdx(idx);
                }}
              >
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <RTooltip wrapperStyle={{ display: "none" }} />
                <Bar dataKey="Fail" radius={[6, 6, 0, 0]}>
                  {series.map((_, i) => (
                    <Cell key={i} fill={TOKENS.mainBlue} opacity={trendIdx === i ? 1 : 0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {trendIdx != null && trendRect && (
          <PopoverPortal>
            <div
              className="rounded-md border bg-white p-3 text-xs shadow"
              style={{
                position: "fixed",
                left: trendRect.left + trendRect.width / 2,
                top: trendRect.bottom + 8,
                transform: "translateX(-50%)",
                zIndex: 60,
                borderColor: TOKENS.border,
                width: Math.min(520, Math.max(320, trendRect.width)),
                maxWidth: Math.min(560, window.innerWidth - 16),
                fontFamily,
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.mainBlue }} />
                <div className="font-semibold" style={{ color: TOKENS.text }}>
                  {new Date(series[trendIdx].t).toLocaleDateString()}
                </div>
                <div className="ml-auto font-semibold" style={{ color: TOKENS.mainBlue }}>
                  {fmtInt(series[trendIdx].v)}
                </div>
              </div>
              {/* Per-day breakdown by project (weighted) */}
              <div className="max-h-[240px] pr-1">
                {projects
                  .map((p) => ({ p, v: Math.round(((baseWeights[p.id] || 1) / Object.values(baseWeights).reduce((s, x) => s + x, 0)) * series[trendIdx].v) }))
                  .sort((a, b) => b.v - a.v)
                  .slice(0, 9)
                  .map((r) => (
                    <div key={r.p.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Favicon url={r.p.favicon} alt={r.p.name} />
                        <div className="truncate">{r.p.name}</div>
                      </div>
                      <div className="font-semibold">{fmtInt(r.v)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </PopoverPortal>
        )}
      </div>

      {/* Mini table: Top failing projects — Mobile/Desktop */}
      <div className="mt-3 border-t pt-2" style={{ borderColor: TOKENS.border }}>
        <div className="mb-1 flex items-center gap-2">
          <LayoutGrid size={14} color={TOKENS.brand} />
          <div className="text-xs font-semibold" style={{ color: TOKENS.text }}>
            Top failing projects — {device === "mobile" ? "Mobile" : "Desktop"}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {(cwv.topProjects || []).slice(0, 5).map((r) => (
            <div key={r.project.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Favicon url={r.project.favicon} alt={r.project.name} />
                <div className="truncate">{r.project.name}</div>
              </div>
              <div className="font-semibold" style={{ color: TOKENS.mainBlue }}>
                {fmtInt(r.failing)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

/* =============================================================================
 * Tile 3 — HTTPS / SSL (single donut) + fixed smart popover (outside) + hover animation
 * ========================================================================== */
function TileHTTPS({
  data,
  projects,
  onOpen,
}: {
  data: HttpsSsl;
  projects: ProjectRow[];
  onOpen: () => void;
}) {
  const httpsPct = clamp(data.httpsPct, 0, 100);
  const totalPages = (projects || []).reduce((s, p) => s + (p.pagesCrawled || 0), 0) || 10000;
  const httpsPages = Math.round((httpsPct / 100) * totalPages);
  const httpPages = Math.max(0, totalPages - httpsPages);
  const donut = [
    { key: "HTTPS", value: httpsPages, color: TOKENS.good },
    { key: "HTTP", value: httpPages, color: TOKENS.danger },
  ];

  const [donutRef, donutRect] = useBoundingRect<HTMLDivElement>();
  const [hover, setHover] = React.useState(false);
  const [hoverSlice, setHoverSlice] = React.useState<number | null>(null);
  const [mouse, setMouse] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const placement: "left" | "right" | "top" | "bottom" = React.useMemo(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (x < 0.35) return "right";
    if (x > 0.65) return "left";
    return y < 0.5 ? "bottom" : "top";
  }, [mouse]);

  function styleForPopover(): React.CSSProperties | undefined {
    if (!donutRect) return undefined;
    const base: React.CSSProperties = { position: "fixed", zIndex: 60, borderColor: TOKENS.border, minWidth: 300, fontFamily };
    if (placement === "left") return { ...base, left: donutRect.left - 8, top: donutRect.top + donutRect.height / 2, transform: "translate(-100%, -50%)" };
    if (placement === "right") return { ...base, left: donutRect.right + 8, top: donutRect.top + donutRect.height / 2, transform: "translate(0, -50%)" };
    if (placement === "top") return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.top - 8, transform: "translate(-50%, -100%)" };
    return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.bottom + 8, transform: "translate(-50%, 0)" };
  }

  return (
    <CardShell title="HTTPS / SSL" icon={<ShieldAlert size={18} />} onClick={onOpen}>
      <div className="mb-1 flex items-baseline gap-2">
        <div className="text-[28px] font-bold" style={{ color: TOKENS.mainBlue }}>
          {pctFmt(httpsPct)}
        </div>
        <MiniDelta delta={data.deltaPct} />
      </div>

      <div className="mt-1 grid grid-cols-12 items-center gap-3">
        <div
          ref={donutRef}
          className="relative col-span-6 h-[120px]"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => {
            setHover(false);
            setHoverSlice(null);
          }}
          onMouseMove={(e) => {
            const r = donutRef.current?.getBoundingClientRect();
            if (!r) return;
            setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
          }}
        >
          <ResponsiveContainer>
            <PieChart>
              <RTooltip wrapperStyle={{ display: "none" }} />
              <Pie
                data={donut}
                dataKey="value"
                nameKey="key"
                innerRadius={34}
                outerRadius={48}
                paddingAngle={2}
                onMouseEnter={(_, i) => setHoverSlice(i)}
                onMouseLeave={() => setHoverSlice(null)}
              >
                {donut.map((s, i) => (
                  <Cell
                    key={s.key}
                    fill={s.color}
                    style={{
                      transition: "transform 120ms ease-out",
                      transform: hoverSlice === i ? "scale(1.05)" : "scale(1)",
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {hover && donutRect && (
          <PopoverPortal>
            <div className="rounded-md border bg-white p-3 text-xs shadow" style={styleForPopover()}>
              <div className="mb-2 flex items-center gap-2">
                <PieIcon size={14} color={TOKENS.brand} />
                <div className="font-semibold" style={{ color: TOKENS.text }}>
                  HTTPS status — portfolio
                </div>
              </div>
              {donut.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: row.color }} />
                    <div>{row.key}</div>
                  </div>
                  <div className="font-semibold">
                    {fmtInt(row.value)} ({pctFmt((row.value / totalPages) * 100)})
                  </div>
                </div>
              ))}
              <div className="mt-2 border-t pt-2 text-xs" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                Mixed content:&nbsp;<b style={{ color: TOKENS.warn }}>{fmtInt(data.mixedCount)}</b> · SSL issues:&nbsp;
                <b style={{ color: TOKENS.danger }}>{fmtInt(data.sslIssues)}</b>
              </div>
            </div>
          </PopoverPortal>
        )}

        <div className="col-span-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Mixed content</span>
            <span className="font-semibold" style={{ color: TOKENS.warn }}>
              {fmtInt(data.mixedCount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">SSL issues</span>
            <span className="font-semibold" style={{ color: TOKENS.danger }}>
              {fmtInt(data.sslIssues)}
            </span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

/* =============================================================================
 * Tile 4 — Redirect chains (donut) + fixed smart popover (outside)
 * ========================================================================== */
function TileRedirects({
  data,
  projects,
  onOpen,
}: {
  data: RedirectChains;
  projects: ProjectRow[];
  onOpen: () => void;
}) {
  const totalPages = projects.reduce((s, p) => s + (p.pagesCrawled || 0), 0) || 1;
  const totalChainUrls = Math.round((data.chainRatePct / 100) * totalPages);
  const byProj = distributeAcross(totalChainUrls, projects, (p) => p.pagesCrawled || 1);

  const donutData = projects.map((p) => ({
    key: p.id,
    name: p.name,
    favicon: p.favicon,
    value: byProj[p.id] ?? 0,
    color: projectColor(p.id, projects),
  }));

  const [donutRef, donutRect] = useBoundingRect<HTMLDivElement>();
  const [hover, setHover] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const [mouse, setMouse] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const placement: "left" | "right" | "top" | "bottom" = React.useMemo(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (x < 0.35) return "right";
    if (x > 0.65) return "left";
    return y < 0.5 ? "bottom" : "top";
  }, [mouse]);

  function styleForPopover(): React.CSSProperties | undefined {
    if (!donutRect) return undefined;
    const base: React.CSSProperties = { position: "fixed", zIndex: 60, borderColor: TOKENS.border, minWidth: 300, fontFamily };
    if (placement === "left") return { ...base, left: donutRect.left - 8, top: donutRect.top + donutRect.height / 2, transform: "translate(-100%, -50%)" };
    if (placement === "right") return { ...base, left: donutRect.right + 8, top: donutRect.top + donutRect.height / 2, transform: "translate(0, -50%)" };
    if (placement === "top") return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.top - 8, transform: "translate(-50%, -100%)" };
    return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.bottom + 8, transform: "translate(-50%, 0)" };
  }

  const sorted = [...donutData].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 9);
  const others = sorted.slice(9).reduce((s, r) => s + r.value, 0);

  return (
    <CardShell title="Redirect chains" icon={<GitBranch size={18} />} onClick={onOpen}>
      <div className="mb-1 flex items-baseline gap-3">
        <div className="text-[28px] font-bold" style={{ color: TOKENS.mainBlue }}>
          {pctFmt(data.chainRatePct)}
        </div>
        <div className="text-sm" style={{ color: TOKENS.muted }}>
          Avg len:&nbsp;
          <span className="font-semibold" style={{ color: TOKENS.text }}>
            {data.avgChainLen.toFixed(1)}
          </span>
        </div>
      </div>

      <div
        ref={donutRef}
        className="relative h-[130px]"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setActiveIdx(null);
        }}
        onMouseMove={(e) => {
          const r = donutRef.current?.getBoundingClientRect();
          if (!r) return;
          setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
        }}
      >
        <ResponsiveContainer>
          <PieChart>
            <RTooltip wrapperStyle={{ display: "none" }} />
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              innerRadius={38}
              outerRadius={52}
              paddingAngle={2}
              onMouseEnter={(_, i) => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              className="cursor-pointer"
            >
              {donutData.map((s, i) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  style={{
                    transition: "transform 120ms ease-out",
                    transform: activeIdx === i ? "scale(1.05)" : "scale(1)",
                    transformOrigin: "center",
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {hover && donutRect && (
        <PopoverPortal>
          <div className="rounded-md border bg-white p-3 text-xs shadow" style={styleForPopover()}>
            <div className="mb-2 flex items-center gap-2">
              <PieIcon size={14} color={TOKENS.brand} />
              <div className="font-semibold" style={{ color: TOKENS.text }}>
                Redirect chain URLs — by project
              </div>
            </div>
            {top.map((d) => (
              <div key={d.key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color }} />
                  <Favicon url={d.favicon} alt={d.name} />
                  <div className="truncate">{d.name}</div>
                </div>
                <div className="font-semibold">
                  {fmtInt(d.value)} ({pctFmt((d.value / Math.max(1, totalChainUrls)) * 100)})
                </div>
              </div>
            ))}
            {others > 0 && (
              <div className="mt-2 border-t pt-2" style={{ borderColor: TOKENS.border }}>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="grid place-items-center rounded text-[11px]"
                      style={{ width: 16, height: 16, background: "#F3F4F6", color: TOKENS.muted }}
                    >
                      …
                    </div>
                    <div>Others</div>
                  </div>
                  <div className="font-semibold">
                    {fmtInt(others)} ({pctFmt((others / Math.max(1, totalChainUrls)) * 100)})
                  </div>
                </div>
              </div>
            )}
          </div>
        </PopoverPortal>
      )}
    </CardShell>
  );
}

/* =============================================================================
 * Tile 5 — Indexability (single donut) + fixed smart popover (outside)
 * ========================================================================== */
function TileIndexability({
  data,
  projects,
  onOpen,
}: {
  data: Indexability;
  projects: ProjectRow[];
  onOpen: () => void;
}) {
  const totalIndexed = data.indexableCount;
  const totalNonIdx = Object.values(data.blockers || {}).reduce((s, v) => s + (v || 0), 0);

  const donutData = [
    { key: "Indexable", value: totalIndexed, color: TOKENS.good },
    { key: "Non-indexable", value: totalNonIdx, color: TOKENS.warn },
  ];

  const indexableByProj = distributeAcross(totalIndexed, projects, (p) => p.pagesCrawled || 1);
  const nonIdxByProj = distributeAcross(totalNonIdx, projects, (p) => p.pagesCrawled || 1);

  const rows = projects
    .map((p) => ({
      p,
      idx: indexableByProj[p.id] ?? 0,
      non: nonIdxByProj[p.id] ?? 0,
    }))
    .sort((a, b) => b.non + b.idx - (a.non + a.idx));

  const [donutRef, donutRect] = useBoundingRect<HTMLDivElement>();
  const [hover, setHover] = React.useState(false);
  const [hoverSlice, setHoverSlice] = React.useState<number | null>(null);
  const [mouse, setMouse] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const placement: "left" | "right" | "top" | "bottom" = React.useMemo(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (x < 0.35) return "right";
    if (x > 0.65) return "left";
    return y < 0.5 ? "bottom" : "top";
  }, [mouse]);

  function styleForPopover(): React.CSSProperties | undefined {
    if (!donutRect) return undefined;
    const base: React.CSSProperties = { position: "fixed", zIndex: 60, borderColor: TOKENS.border, minWidth: 300, fontFamily };
    if (placement === "left") return { ...base, left: donutRect.left - 8, top: donutRect.top + donutRect.height / 2, transform: "translate(-100%, -50%)" };
    if (placement === "right") return { ...base, left: donutRect.right + 8, top: donutRect.top + donutRect.height / 2, transform: "translate(0, -50%)" };
    if (placement === "top") return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.top - 8, transform: "translate(-50%, -100%)" };
    return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.bottom + 8, transform: "translate(-50%, 0)" };
  }

  return (
    <CardShell title="Indexability" icon={<CopyCheck size={18} />} onClick={onOpen}>
      <div className="mb-1 flex items-baseline gap-3">
        <div className="text-[28px] font-bold" style={{ color: TOKENS.mainBlue }}>
          {pctFmt(data.indexablePct)}{" "}
          <span className="text-sm font-medium" style={{ color: TOKENS.muted }}>
            ({fmtInt(data.indexableCount)})
          </span>
        </div>
        <MiniDelta delta={data.deltaPct} />
      </div>

      <div
        ref={donutRef}
        className="relative h-[140px]"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setHoverSlice(null);
        }}
        onMouseMove={(e) => {
          const r = donutRef.current?.getBoundingClientRect();
          if (!r) return;
          setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
        }}
      >
        <ResponsiveContainer>
          <PieChart>
            <RTooltip wrapperStyle={{ display: "none" }} />
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="key"
              innerRadius={36}
              outerRadius={52}
              paddingAngle={2}
              onMouseEnter={(_, i) => setHoverSlice(i)}
              onMouseLeave={() => setHoverSlice(null)}
            >
              {donutData.map((s, i) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  style={{
                    transition: "transform 120ms ease-out",
                    transform: hoverSlice === i ? "scale(1.05)" : "scale(1)",
                    transformOrigin: "center",
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {hover && donutRect && (
        <PopoverPortal>
          <div className="rounded-md border bg-white p-3 text-xs shadow" style={styleForPopover()}>
            <div className="mb-2 flex items-center gap-2">
              <PieIcon size={14} color={TOKENS.brand} />
              <div className="font-semibold" style={{ color: TOKENS.text }}>
                Indexable / Non‑indexable — by project
              </div>
            </div>
            {rows.slice(0, 9).map((r) => (
              <div key={r.p.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Favicon url={r.p.favicon} alt={r.p.name} />
                  <div className="truncate">{r.p.name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs">
                    <span className="mr-1 inline-block h-2 w-2 rounded-[3px]" style={{ background: TOKENS.good }} />
                    <b>{fmtInt(r.idx)}</b>
                  </span>
                  <span className="text-xs">
                    <span className="mr-1 inline-block h-2 w-2 rounded-[3px]" style={{ background: TOKENS.warn }} />
                    <b>{fmtInt(r.non)}</b>
                  </span>
                </div>
              </div>
            ))}
            {rows.length > 9 && (
              <div className="mt-2 border-t pt-2" style={{ borderColor: TOKENS.border }}>
                <div className="text-xs" style={{ color: TOKENS.muted }}>
                  +{rows.length - 9} more projects
                </div>
              </div>
            )}
          </div>
        </PopoverPortal>
      )}
    </CardShell>
  );
}

/* =============================================================================
 * TABLE VIEW — default view with modular filter chips
 * ========================================================================== */
type TableRow = {
  p: ProjectRow;
  health: number;
  healthDelta?: Delta;
  affectedPct?: number;
  cwvFail: number;
  httpsPct: number;
  mixed: number;
  ssl: number;
  chainRate: number;
  chainLen: number;
  indexablePct: number;
  indexableCount: number;
  nonIndexableCount: number;
};

function buildTableRows(data: CrawlPageExperienceSummaryData, device: "mobile" | "desktop"): TableRow[] {
  const cwv = device === "mobile" ? mockCwv("mobile") : mockCwv("desktop");
  const cwvByProj = distributeAcross(cwv.failingCount, data.projects, (p) => p.pagesCrawled || 1);

  const healthMap: Record<string, PageHealthByProject> = {};
  data.lowestPageHealth.forEach((r) => (healthMap[r.project.id] = r));

  const totalPages = data.projects.reduce((s, p) => s + (p.pagesCrawled || 0), 0) || 1;
  const httpsPages = Math.round((data.https.httpsPct / 100) * totalPages);
  const httpPages = totalPages - httpsPages;
  const httpsByProj = distributeAcross(httpsPages, data.projects, (p) => p.pagesCrawled || 1);
  const httpByProj = distributeAcross(httpPages, data.projects, (p) => p.pagesCrawled || 1);
  const chainUrlsTotal = Math.round((data.redirects.chainRatePct / 100) * totalPages);
  const chainByProj = distributeAcross(chainUrlsTotal, data.projects, (p) => p.pagesCrawled || 1);

  const idxByProj = distributeAcross(data.indexability.indexableCount, data.projects, (p) => p.pagesCrawled || 1);
  const nonIdxTotal = Object.values(data.indexability.blockers).reduce((s, v) => s + (v || 0), 0);
  const nonIdxByProj = distributeAcross(nonIdxTotal, data.projects, (p) => p.pagesCrawled || 1);

  return data.projects.map((p) => {
    const h = healthMap[p.id];
    const pages = p.pagesCrawled || 1;
    const httpsPctProj =
      ((httpsByProj[p.id] || 0) / Math.max(1, (httpsByProj[p.id] || 0) + (httpByProj[p.id] || 0))) * 100;
    return {
      p,
      health: h?.avgHealth ?? Math.round(70 + (Math.random() * 10 - 5)),
      healthDelta: h?.delta,
      affectedPct: h?.affectedPct,
      cwvFail: cwvByProj[p.id] || 0,
      httpsPct: Math.max(0, Math.min(100, httpsPctProj)),
      mixed: Math.round((data.https.mixedCount / totalPages) * pages),
      ssl: Math.min(data.https.sslIssues, 3),
      chainRate: data.redirects.chainRatePct,
      chainLen: data.redirects.avgChainLen,
      indexablePct: data.indexability.indexablePct,
      indexableCount: idxByProj[p.id] || 0,
      nonIndexableCount: nonIdxByProj[p.id] || 0,
    };
  });
}

function TableView({ data, device }: { data: CrawlPageExperienceSummaryData; device: "mobile" | "desktop" }) {
  const [severity, setSeverity] = React.useState<"all" | "warn" | "critical">("all");
  const [sort, setSort] = React.useState<"health" | "cwv" | "https" | "index">("health");

  let rows = buildTableRows(data, device);
  rows = rows.filter((r) => {
    const tone = toneForHealth(r.health);
    if (severity === "warn") return tone === "warn";
    if (severity === "critical") return tone === "danger";
    return true;
  });

  rows.sort((a, b) => {
    if (sort === "health") return a.health - b.health; // lowest first
    if (sort === "cwv") return b.cwvFail - a.cwvFail;
    if (sort === "https") return b.httpsPct - a.httpsPct;
    if (sort === "index") return b.indexablePct - a.indexablePct;
    return 0;
  });

  return (
    <div className="w-full overflow-x-auto rounded-md border" style={{ borderColor: TOKENS.border }}>
      {/* Filters bar (modular chips) */}
      <div className="flex flex-wrap items-center gap-2 border-b p-2 text-xs" style={{ borderColor: TOKENS.border }}>
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5" style={{ borderColor: TOKENS.border }}>
          <Info size={12} /> Filters
        </span>
        <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.border }}>
          {(["all", "warn", "critical"] as const).map((s) => (
            <button
              key={s}
              className={cx("h-7 px-2", severity === s ? "bg-blue-50 font-semibold" : "bg-white")}
              style={{ color: severity === s ? TOKENS.mainBlue : TOKENS.text }}
              onClick={() => setSeverity(s)}
            >
              {s === "all" ? "All" : s === "warn" ? "Warnings" : "Critical"}
            </button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.border }}>
          {(["health", "cwv", "https", "index"] as const).map((s) => (
            <button
              key={s}
              className={cx("h-7 px-2", sort === s ? "bg-blue-50 font-semibold" : "bg-white")}
              style={{ color: sort === s ? TOKENS.mainBlue : TOKENS.text }}
              onClick={() => setSort(s)}
              title="Sort"
            >
              Sort: {s}
            </button>
          ))}
        </div>
        <Chip tone="neutral">Device: {device === "mobile" ? "Mobile" : "Desktop"}</Chip>
      </div>

      <table className="min-w-[980px] w-full">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Page Health</th>
            <th className="px-3 py-2 font-medium">Affected %</th>
            <th className="px-3 py-2 font-medium">CWV Fail</th>
            <th className="px-3 py-2 font-medium">HTTPS %</th>
            <th className="px-3 py-2 font-medium">Mixed</th>
            <th className="px-3 py-2 font-medium">SSL</th>
            <th className="px-3 py-2 font-medium">Chain %</th>
            <th className="px-3 py-2 font-medium">Avg Len</th>
            <th className="px-3 py-2 font-medium">Indexable % (Count)</th>
            <th className="px-3 py-2 font-medium">Non‑Indexable</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: TOKENS.border }}>
          {rows.map((r) => (
            <tr key={r.p.id} className="text-sm transition-all hover:bg-slate-50">
              <td className="px-3 py-2">
                <div className="inline-flex items-center gap-2">
                  <Favicon url={r.p.favicon} alt={r.p.name} />
                  <span className="text-gray-800">{r.p.name}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="font-semibold" style={{ color: TOKENS.mainBlue }}>
                  {Math.round(r.health)}
                </span>
                <span className="ml-2">
                  <MiniDelta delta={r.healthDelta} />
                </span>
              </td>
              <td className="px-3 py-2">{r.affectedPct != null ? `${r.affectedPct}%` : "—"}</td>
              <td className="px-3 py-2">{fmtInt(r.cwvFail)}</td>
              <td className="px-3 py-2">{pctFmt(r.httpsPct)}</td>
              <td className="px-3 py-2">{fmtInt(r.mixed)}</td>
              <td className="px-3 py-2">{fmtInt(r.ssl)}</td>
              <td className="px-3 py-2">{pctFmt(r.chainRate)}</td>
              <td className="px-3 py-2">{r.chainLen.toFixed(1)}</td>
              <td className="px-3 py-2">
                <span className="font-semibold" style={{ color: TOKENS.mainBlue }}>
                  {pctFmt(r.indexablePct)}
                </span>{" "}
                <span className="text-xs text-gray-500">({fmtInt(r.indexableCount)})</span>
              </td>
              <td className="px-3 py-2">{fmtInt(r.nonIndexableCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =============================================================================
 * SECTION — Crawl & Page Experience Summary (Charts + Table toggle)
 * ========================================================================== */
export default function CrawlPageExperienceSummary({
  data = DEMO_CRAWL_PAGE_EXPERIENCE,
  sources = { crawler: true, psi: true, gsc: true },
  className,
  onOpenAudit,
  onExport,
}: {
  data?: CrawlPageExperienceSummaryData;
  sources?: SourceConnections;
  className?: string;
  onOpenAudit?: (link: AuditDeepLink) => void;
  onExport?: (data: CrawlPageExperienceSummaryData, device: "mobile" | "desktop") => void;
}) {
  const [device, setDevice] = React.useState<"mobile" | "desktop">("mobile");
  const [projectId, setProjectId] = React.useState<string>("all");
  const [windowLabel] = React.useState<string>("Last 28 days vs previous");
  const [view, setView] = React.useState<"table" | "charts">("table"); // default: TABLE

  const cwvForDevice = React.useMemo(() => (device === "mobile" ? mockCwv("mobile") : mockCwv("desktop")), [device]);

  const handleOpenAudit = (link: AuditDeepLink) => {
    if (onOpenAudit) onOpenAudit(link);
    else alert(`Open Site Audit → ${link.tab}\n${JSON.stringify(link.params, null, 2)}`);
  };

  const exportDefault = () => {
    if (onExport) return onExport(data!, device);
    const blob = new Blob([JSON.stringify({ ...data, device }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crawl_page_experience_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-md border px-2.5 py-1.5 bg-white mt-4" style={{ fontFamily }}>
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SearchCheck size={18} color={TOKENS.brand} />
          <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
            Crawl & Page Experience Summary
          </h3>
          <div
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
            title="About this section"
          >
            <Info size={12} /> Portfolio snapshot
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Table/Charts toggle */}
          <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.border }}>
            {(["table", "charts"] as const).map((mode) => (
              <button
                key={mode}
                className={cx("h-8 px-2 text-sm cursor-pointer transition", view === mode ? "bg-blue-50 font-semibold" : "bg-white")}
                style={{ color: view === mode ? TOKENS.mainBlue : TOKENS.text }}
                onClick={() => setView(mode)}
                title={mode === "table" ? "Table" : "Charts"}
              >
                {mode === "table" ? <TableIcon size={14} className="inline -mt-0.5 mr-1" /> : <PieIcon size={14} className="inline -mt-0.5 mr-1" />}
                {mode === "table" ? "Table" : "Charts"}
              </button>
            ))}
          </div>

          {/* Project filter */}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-8 cursor-pointer rounded-md border px-2 text-sm"
            style={{ borderColor: TOKENS.border }}
            title="Project filter"
          >
            <option value="all">All projects</option>
            {data?.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Date window (display only in demo) */}
          <button
            className="h-8 cursor-pointer rounded-md border px-2 text-sm"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
            title="Date window"
            onClick={() => alert(windowLabel)}
          >
            {windowLabel}
          </button>

          {/* Device toggle (CWV) */}
          <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.border }} role="group" aria-label="Device">
            {(["mobile", "desktop"] as const).map((d) => (
              <button
                key={d}
                className={cx("h-8 px-2 text-sm", "cursor-pointer transition", device === d ? "bg-blue-50 font-semibold" : "bg-white")}
                style={{ color: device === d ? TOKENS.mainBlue : TOKENS.text }}
                onClick={() => setDevice(d)}
                title={`CWV device: ${d}`}
              >
                {d === "mobile" ? "Mobile" : "Desktop"}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={exportDefault}
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
            title="Export (JSON in demo)"
          >
            <Download size={16} />
            Export
          </button>

          {/* CTA */}
          <button
            type="button"
            onClick={() =>
              handleOpenAudit({
                tab: view === "table" ? "issues" : "page-experience",
                params: { device, status: "fail", source: cwvForDevice.source, projectId: projectId !== "all" ? projectId : undefined },
              })
            }
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-white"
            style={{ background: TOKENS.brand }}
            title="Open Site Audit"
          >
            Open Site Audit
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {view === "table" ? (
        <TableView data={data!} device={device} />
      ) : (
        <>
          {/* Charts grid with widened Card 1; Card 2 side by side; second row 3-up */}
          <div className="grid grid-cols-12 gap-4">
            {/* Card 1 widened */}
            <div className="col-span-12 xl:col-span-6">
              <TileLowestPageHealth
                rows={data!.lowestPageHealth}
                onOpenProject={(id) => handleOpenAudit({ tab: "issues", params: { projectId: id, category: "overview" } })}
              />
            </div>

            {/* Card 2 next to it */}
            <div className="col-span-12 xl:col-span-6">
              <TileCWV
                projects={data!.projects}
                cwv={device === "mobile" ? mockCwv("mobile") : mockCwv("desktop")}
                device={device}
                onOpen={() =>
                  handleOpenAudit({
                    tab: "page-experience",
                    params: { status: "fail", device, source: cwvForDevice.source, projectId: projectId !== "all" ? projectId : undefined },
                  })
                }
              />
            </div>

            {/* Second row: 3-up */}
            <div className="col-span-12 md:col-span-6 xl:col-span-4">
              <TileHTTPS
                data={data!.https}
                projects={data!.projects}
                onOpen={() =>
                  handleOpenAudit({
                    tab: "issues",
                    params: { category: "security", sub: "ssl,https,mixed-content", projectId: projectId !== "all" ? projectId : undefined },
                  })
                }
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-4">
              <TileRedirects
                data={data!.redirects}
                projects={data!.projects}
                onOpen={() =>
                  handleOpenAudit({
                    tab: "issues",
                    params: { category: "security", sub: "redirect-chains", projectId: projectId !== "all" ? projectId : undefined },
                  })
                }
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-4">
              <TileIndexability
                data={data!.indexability}
                projects={data!.projects}
                onOpen={() =>
                  handleOpenAudit({
                    tab: "issues",
                    params: {
                      category: "indexability",
                      sub: "noindex,robots,x-robots,canonicals,soft-404,non-200",
                      projectId: projectId !== "all" ? projectId : undefined,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
            <ChevronRight size={14} />
            Cards are clickable; smart popovers are fixed-positioned outside the charts, following the reference pattern.
          </div>
        </>
      )}
    </section>
  );
}

/* =============================================================================
 * DEMO USAGE — render this in a page to see the mock data
 * ========================================================================== */
export function Example() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <CrawlPageExperienceSummary />
    </div>
  );
}
