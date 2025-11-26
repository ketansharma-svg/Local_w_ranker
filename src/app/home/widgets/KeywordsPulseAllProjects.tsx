"use client";

import React, { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Plus,
  ClipboardPlus,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Star,
  Images,
  Video,
  MessageCircleQuestion,
  BookOpen,
  LayoutGrid,
  Newspaper,
  HelpCircle,
  Link2,
  BarChart4,
  PieChart as PieIcon,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

/* ---------------------------- Types ---------------------------- */

export type SeriesPoint = { t: string; v: number };

export type SerpFeatureKey =
  | "featured_snippet"
  | "paa"
  | "sitelinks"
  | "top_stories"
  | "faq"
  | "reviews"
  | "images"
  | "video";

export interface ProjectStat {
  id: string;
  name: string;
  domain: string;
  faviconUrl?: string;
  color?: string; // optional override
  trackedKeywords: number;
  top3: number;
  top10: number;
  top50: number;
  serpFeatureCoverage: {
    total: number;
    features: { key: SerpFeatureKey; label: string; count: number }[];
  };
  cannibalizedKeywords: number;
  cannibalizedList?: { keyword: string; position?: number; pagesCount: number }[];
  trackedTrend?: SeriesPoint[];
}

export interface KeywordRow {
  keyword: string;
  projectId?: string;
  position: number;
  positionDelta?: number;
  clicks?: number;
  impressions?: number;
  url?: string;
  features?: SerpFeatureKey[];
  cannibalized?: boolean;
  viewTag?: "top" | "emerging" | "declining" | "lost" | "new" | "cannibalized";
  intent?: "Informational" | "Navigational" | "Commercial" | "Transactional";
}

export interface KeywordsPulseProps {
  projects?: ProjectStat[];
  trackedTrendAll?: SeriesPoint[];
  keywords?: KeywordRow[];
  className?: string;
  onAddToTracking?: (keyword: string) => void;
  onCreateTask?: (keyword: string) => void;
  onOpenSerpSnapshot?: (keyword: string) => void;
  onExportCsv?: (rows: KeywordRow[]) => void;
}

/* ---------------------------- Tokens & helpers ---------------------------- */

const TOKENS = {
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chip: "#F5F7FA",
  brand: "#008CCD",
  warn: "#F59E0B",
  danger: "#EF4444",
  good: "#10B981",
} as const;

const PROJECT_PALETTE = [
  "#0077FF",
  "#E11D48",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#0EA5E9",
  "#EF4444",
  "#22C55E",
  "#7C3AED",
  "#F97316",
  "#14B8A6",
  "#EC4899",
];

const FEATURE_COLORS: Record<SerpFeatureKey, string> = {
  featured_snippet: "#8B5CF6",
  paa: "#0EA5E9",
  sitelinks: "#10B981",
  top_stories: "#F59E0B",
  faq: "#06B6D4",
  reviews: "#F43F5E",
  images: "#64748B",
  video: "#F97316",
};

const INTENT_COLORS: Record<NonNullable<KeywordRow["intent"]>, string> = {
  Informational: "#0EA5E9",
  Navigational: "#10B981",
  Commercial: "#8B5CF6",
  Transactional: "#F59E0B",
};

function fmtInt(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Intl.NumberFormat().format(n);
}
function pct(a?: number, b?: number) {
  if (!a || !b) return "—";
  if (b === 0) return "—";
  const v = ((a - b) / b) * 100;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}
function shortUrl(u?: string) {
  if (!u) return "—";
  try {
    const { pathname, host } = new URL(u, "https://example.com");
    const clean = pathname.length > 28 ? pathname.slice(0, 25) + "…" : pathname || "/";
    return host ? `${host}${clean}` : clean;
  } catch {
    return u.length > 32 ? u.slice(0, 29) + "…" : u;
  }
}
function sum<T>(arr: T[], map: (t: T) => number) {
  return arr.reduce((s, x) => s + (map(x) || 0), 0);
}
function projectColor(i: number, override?: string) {
  return override || PROJECT_PALETTE[i % PROJECT_PALETTE.length];
}
function projectFavicon(p: ProjectStat) {
  return (
    p.faviconUrl ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(p.domain)}&sz=64`
  );
}
function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => JSON.stringify(c ?? "")).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------------------- Feature icons map ---------------------------- */
const FEATURE_ICON: Record<SerpFeatureKey, { icon: React.ComponentType<any>; label: string }> = {
  featured_snippet: { icon: HelpCircle, label: "Featured Snippet" },
  paa: { icon: MessageCircleQuestion, label: "People Also Ask" },
  sitelinks: { icon: Link2, label: "Sitelinks" },
  top_stories: { icon: Newspaper, label: "Top Stories" },
  faq: { icon: BookOpen, label: "FAQ" },
  reviews: { icon: Star, label: "Reviews" },
  images: { icon: Images, label: "Images" },
  video: { icon: Video, label: "Video" },
};

/* ---------------------------- Mock demo data ---------------------------- */

function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function mkSeries(base: number, points = 16, jitter = 0.12): SeriesPoint[] {
  let v = base;
  return Array.from({ length: points }).map((_, i) => {
    v = Math.max(0, v + (Math.random() - 0.5) * base * jitter);
    return { t: daysAgoIso(points - 1 - i), v: Math.round(v) };
  });
}

const DEMO_PROJECTS: ProjectStat[] = [
  {
    id: "p1",
    name: "Wranker",
    domain: "wranker.com",
    trackedKeywords: 1820,
    top3: 118,
    top10: 540,
    top50: 1510,
    serpFeatureCoverage: {
      total: 260,
      features: [
        { key: "featured_snippet", label: "Featured Snippet", count: 12 },
        { key: "paa", label: "People Also Ask", count: 64 },
        { key: "sitelinks", label: "Sitelinks", count: 104 },
        { key: "reviews", label: "Reviews", count: 20 },
        { key: "images", label: "Images", count: 28 },
        { key: "video", label: "Video", count: 8 },
      ],
    },
    cannibalizedKeywords: 8,
    cannibalizedList: [
      { keyword: "rank tracker", position: 7, pagesCount: 3 },
      { keyword: "seo audit", position: 11, pagesCount: 2 },
      { keyword: "serp features", position: 13, pagesCount: 3 },
    ],
    trackedTrend: mkSeries(1800),
  },
  {
    id: "p2",
    name: "W3era",
    domain: "w3era.com",
    trackedKeywords: 1320,
    top3: 86,
    top10: 420,
    top50: 990,
    serpFeatureCoverage: {
      total: 180,
      features: [
        { key: "featured_snippet", label: "Featured Snippet", count: 6 },
        { key: "paa", label: "People Also Ask", count: 44 },
        { key: "sitelinks", label: "Sitelinks", count: 72 },
        { key: "faq", label: "FAQ", count: 12 },
        { key: "images", label: "Images", count: 22 },
        { key: "video", label: "Video", count: 7 },
      ],
    },
    cannibalizedKeywords: 12,
    cannibalizedList: [
      { keyword: "technical seo", position: 14, pagesCount: 4 },
      { keyword: "link building", position: 18, pagesCount: 3 },
      { keyword: "content audit", position: 22, pagesCount: 3 },
    ],
    trackedTrend: mkSeries(1200),
  },
  {
    id: "p3",
    name: "Vefogix",
    domain: "vefogix.com",
    trackedKeywords: 920,
    top3: 52,
    top10: 286,
    top50: 710,
    serpFeatureCoverage: {
      total: 124,
      features: [
        { key: "featured_snippet", label: "Featured Snippet", count: 4 },
        { key: "paa", label: "People Also Ask", count: 36 },
        { key: "sitelinks", label: "Sitelinks", count: 44 },
        { key: "top_stories", label: "Top Stories", count: 6 },
        { key: "images", label: "Images", count: 24 },
        { key: "video", label: "Video", count: 10 },
      ],
    },
    cannibalizedKeywords: 5,
    cannibalizedList: [
      { keyword: "seo score", position: 16, pagesCount: 2 },
      { keyword: "internal linking", position: 19, pagesCount: 3 },
    ],
    trackedTrend: mkSeries(900),
  },
  {
    id: "p4",
    name: "Acme Co",
    domain: "acme.com",
    trackedKeywords: 540,
    top3: 24,
    top10: 164,
    top50: 420,
    serpFeatureCoverage: {
      total: 60,
      features: [
        { key: "featured_snippet", label: "Featured Snippet", count: 1 },
        { key: "paa", label: "People Also Ask", count: 10 },
        { key: "sitelinks", label: "Sitelinks", count: 20 },
        { key: "reviews", label: "Reviews", count: 6 },
        { key: "images", label: "Images", count: 14 },
        { key: "video", label: "Video", count: 9 },
      ],
    },
    cannibalizedKeywords: 2,
    cannibalizedList: [{ keyword: "content optimizer", position: 21, pagesCount: 2 }],
    trackedTrend: mkSeries(520),
  },
  {
    id: "p5",
    name: "Beta Inc",
    domain: "beta.io",
    trackedKeywords: 410,
    top3: 12,
    top10: 108,
    top50: 330,
    serpFeatureCoverage: {
      total: 52,
      features: [
        { key: "featured_snippet", label: "Featured Snippet", count: 3 },
        { key: "paa", label: "People Also Ask", count: 10 },
        { key: "sitelinks", label: "Sitelinks", count: 16 },
        { key: "faq", label: "FAQ", count: 4 },
        { key: "images", label: "Images", count: 12 },
        { key: "video", label: "Video", count: 7 },
      ],
    },
    cannibalizedKeywords: 4,
    cannibalizedList: [{ keyword: "schema markup", position: 28, pagesCount: 3 }],
    trackedTrend: mkSeries(400),
  },
];

const DEMO_KEYWORDS: KeywordRow[] = [
  { keyword: "rank tracker", projectId: "p1", position: 3, positionDelta: -1, clicks: 3800, impressions: 52000, url: "/rank-tracker", features: ["featured_snippet", "sitelinks"], intent: "Commercial", viewTag: "top" },
  { keyword: "technical seo checklist", projectId: "p2", position: 6, positionDelta: -3, clicks: 2100, impressions: 29000, url: "/blog/technical-seo-checklist", features: ["paa"], intent: "Informational", viewTag: "declining" },
  { keyword: "what is serp feature", projectId: "p3", position: 9, positionDelta: +7, clicks: 900, impressions: 15000, url: "/blog/serp-features", features: ["images", "paa"], intent: "Informational", viewTag: "emerging" },
  { keyword: "seo audit tool", projectId: "p1", position: 2, positionDelta: 0, clicks: 4500, impressions: 60000, url: "/seo-audit", features: ["reviews", "sitelinks"], intent: "Commercial", viewTag: "top" },
  { keyword: "internal linking", projectId: "p3", position: 18, positionDelta: +10, clicks: 320, impressions: 8400, url: "/blog/internal-linking-guide", features: ["paa"], intent: "Informational", viewTag: "emerging", cannibalized: true },
  { keyword: "content optimizer", projectId: "p4", position: 33, positionDelta: -9, clicks: 150, impressions: 4300, url: "/content-optimizer", features: [], intent: "Commercial", viewTag: "declining" },
  { keyword: "schema markup", projectId: "p5", position: 60, positionDelta: +20, clicks: 80, impressions: 1300, url: "/blog/schema-markup", features: ["faq"], intent: "Informational", viewTag: "emerging", cannibalized: true },
  { keyword: "best seo tool 2025", projectId: "p2", position: 100, positionDelta: +100, clicks: 0, impressions: 0, url: "", features: [], intent: "Commercial", viewTag: "new" },
  { keyword: "lost keyword example", projectId: "p1", position: 999, positionDelta: -80, clicks: 0, impressions: 0, url: "", features: [], intent: "Informational", viewTag: "lost" },
  { keyword: "serp features explained", projectId: "p1", position: 4, positionDelta: +1, clicks: 1200, impressions: 23000, url: "/blog/serp-features-explained", features: ["images", "video"], intent: "Informational", viewTag: "top" },
];

/* ---------------------------- Small UI bits ---------------------------- */

function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-[3px]"
      style={{ width: size, height: size, background: color }}
    />
  );
}

function Pill({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const ring =
    tone === "warn"
      ? TOKENS.warn
      : tone === "danger"
      ? TOKENS.danger
      : tone === "good"
      ? TOKENS.good
      : "#9CA3AF";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-full border px-3 text-sm transition-colors ${active ? "font-semibold" : ""} cursor-pointer`}
      style={{
        borderColor: active ? ring : TOKENS.border,
        background: "#FFF",
        color: active ? ring : TOKENS.text,
      }}
    >
      {label}
    </button>
  );
}

/* ---------------------------- Derived helpers ---------------------------- */

function asPortfolioTrend(projects: ProjectStat[], fallbackPoints = 16): SeriesPoint[] {
  const series = projects.filter((p) => p.trackedTrend && p.trackedTrend.length);
  if (!series.length) {
    const v = sum(projects, (p) => p.trackedKeywords);
    return mkSeries(v, fallbackPoints, 0.08);
  }
  const len = Math.min(...series.map((p) => p.trackedTrend!.length));
  return Array.from({ length: len }).map((_, i) => ({
    t: series[0].trackedTrend![i].t,
    v: Math.max(0, series.reduce((s, p) => s + (p.trackedTrend![i]?.v || 0), 0)),
  }));
}

function topNWithOther<T>(
  rows: T[],
  getValue: (r: T) => number,
  getKey: (r: T) => string,
  getLabel: (r: T) => string,
  n = 9
) {
  const sorted = [...rows].sort((a, b) => getValue(b) - getValue(a));
  const top = sorted.slice(0, n);
  const other = sorted.slice(n);
  const otherValue = sum(other, getValue);

  const result = top.map((r) => ({
    key: getKey(r),
    label: getLabel(r),
    value: getValue(r),
    raw: r,
  }));
  if (other.length) {
    result.push({
      key: "__other__",
      label: "Other",
      value: otherValue,
      raw: null as any,
    });
  }
  return result;
}

/** FavIcon tick for XAxis (Card 2 & 3 bars) */
function FaviconTick({
  x,
  y,
  payload,
  projectMap,
}: any & { projectMap: Record<string, ProjectStat> }) {
  const id = payload.value as string;
  const p = projectMap[id];
  return (
    <g transform={`translate(${x},${y})`} cursor="default">
      <image href={projectFavicon(p)} x={-8} y={4} width={16} height={16}>
        <title>{p?.name || id}</title>
      </image>
    </g>
  );
}

/* ---------- Rounded-top-only bar shape (flat bottom, 6px top radius) ---------- */

function roundedTopRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 6
) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  if (w <= 0 || h <= 0) return "";
  const r = Math.max(0, Math.min(radius, w / 2, h));
  const right = x + w;
  const bottom = y + h;
  return [
    `M ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${right - r} ${y}`,
    `Q ${right} ${y} ${right} ${y + r}`,
    `L ${right} ${bottom}`,
    `L ${x} ${bottom}`,
    "Z",
  ].join(" ");
}

function RoundedTopBar({
  x,
  y,
  width,
  height,
  fill,
  index,
  activeIndex,
}: any & { index: number; activeIndex: number | null }) {
  if (width <= 0 || height <= 0) return null;
  const isActive = activeIndex === index;
  const ty = isActive ? -4 : 0;
  return (
    <g transform={`translate(0, ${ty})`} style={{ transition: "transform 160ms ease" }}>
      <path d={roundedTopRectPath(x, y, width, height, 6)} fill={fill} />
    </g>
  );
}

/* ---------------------------- Donut (stacked by project + smart popover) ---------------------------- */
/* NOTE: Center values are intentionally removed per spec. Active slice has animated halo. */

function ActiveSliceShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={Math.max(0, innerRadius - 2)}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Halo ring */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
}

function ProjectsStackedDonut({
  projects,
  getValue,
  renderPopover, // (hoveredProject) => ReactNode
}: {
  projects: ProjectStat[];
  getValue: (p: ProjectStat) => number;
  renderPopover: (hovered?: ProjectStat | null) => React.ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<ProjectStat | null>(null);

  const data = projects.map((p, i) => ({
    name: p.name,
    id: p.id,
    value: getValue(p),
    color: projectColor(i, p.color),
    p,
  }));

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setActiveIndex(null);
        setHoveredProject(null);
        setIsHovering(false);
      }}
    >
      <div className="h-[170px] w-[220px] cursor-pointer">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
              paddingAngle={1}
              cornerRadius={3}
              isAnimationActive
              activeIndex={activeIndex ?? undefined}
              activeShape={ActiveSliceShape}
              onMouseEnter={(_, idx) => {
                setActiveIndex(idx);
                setHoveredProject(data[idx]?.p || null);
              }}
              onMouseMove={(_, idx) => {
                if (idx != null) {
                  setActiveIndex(idx);
                  setHoveredProject(data[idx]?.p || null);
                }
              }}
              onMouseLeave={() => {
                setActiveIndex(null);
                setHoveredProject(null);
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.id}
                  fill={d.color}
                  stroke="#ffffff"
                  strokeWidth={1}
                  className="transition-[filter] duration-200"
                  style={{
                    filter:
                      activeIndex === i
                        ? "drop-shadow(0 0 8px rgba(0,140,205,.35))"
                        : "none",
                  }}
                />
              ))}
            </Pie>
            {/* Center labels intentionally removed per spec */}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Smart popover — same placement pattern as KPI/Portfolio cards */}
      {isHovering && (
        <>
          <div
            className="hidden md:block absolute top-0 left-full ml-2 rounded-md border bg-white p-2 text-xs shadow-sm z-10 pointer-events-none"
            style={{ width: 260, borderColor: TOKENS.border, overflow: "hidden" }}
          >
            {renderPopover(hoveredProject)}
          </div>
          <div
            className="md:hidden mt-2 rounded-md border bg-white p-2 text-xs shadow-sm"
            style={{ borderColor: TOKENS.border, overflow: "hidden" }}
          >
            {renderPopover(hoveredProject)}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------- Card shell (with Export icon) ---------------------------- */

function CardShell({
  title,
  icon,
  onExport,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex w-full flex-col rounded-md border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex text-[inherit]" style={{ color: TOKENS.brand }}>
            {icon}
          </span>
          <div className="text-[14px] font-semibold">{title}</div>
        </div>
        <button
          title="Export"
          onClick={onExport}
          className="rounded p-1 hover:bg-gray-50 cursor-pointer"
          aria-label={`Export ${title}`}
        >
          <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ---------------------------- KPI Cards ---------------------------- */

/* ---- Card 1: Tracked Keywords ---- */

function CardTrackedKeywords({
  projects,
  portfolioTrend,
}: {
  projects: ProjectStat[];
  portfolioTrend: SeriesPoint[];
}) {
  const totalTracked = sum(projects, (p) => p.trackedKeywords);
  const last = portfolioTrend[portfolioTrend.length - 1]?.v ?? 0;
  const prev = portfolioTrend[portfolioTrend.length - 2]?.v ?? 0;
  const first = portfolioTrend[0]?.v ?? 0;

  // Export: project + tracked total
  const exportCard = () => {
    const rows: (string | number)[][] = [["Project", "Tracked Keywords"]];
    projects.forEach((p) => rows.push([p.name, p.trackedKeywords]));
    downloadCsv("tracked_keywords.csv", rows);
  };

  // Donut popover: list ALL projects; highlight hovered
  const renderDonutPopover = (hovered?: ProjectStat | null) => (
    <div className="space-y-1">
      <div className="font-semibold mb-1">Tracked keywords • by project</div>
      {projects.map((p) => {
        const active = hovered?.id === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 ${active ? "bg-[#F0F9FF]" : ""}`}
          >
            <span className="inline-flex items-center gap-2">
              <img src={projectFavicon(p)} alt="" className="h-4 w-4 rounded-sm" />
              <span className="truncate">{p.name}</span>
            </span>
            <b>{fmtInt(p.trackedKeywords)}</b>
          </div>
        );
      })}
    </div>
  );

  // Trend bars: show per-date total; popover = per-project breakdown for that date
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const barData = portfolioTrend.map((pt, idx) => ({ date: pt.t, Total: pt.v, _i: idx }));

  const projectValueAtIndex = (p: ProjectStat, i: number) =>
    Math.max(0, p.trackedTrend?.[i]?.v ?? 0);

  const barPopover =
    activeBar != null ? (
      <div className="space-y-2">
        <div className="font-semibold">Tracked keywords • {barData[activeBar].date}</div>
        <div className="max-h-56 overflow-auto pr-1">
          {projects
            .map((p) => ({ p, v: projectValueAtIndex(p, activeBar) }))
            .sort((a, b) => b.v - a.v)
            .map(({ p, v }) => (
              <div key={p.id} className="flex items-center justify-between gap-2 px-1 py-0.5">
                <span className="inline-flex items-center gap-2">
                  <img src={projectFavicon(p)} alt="" className="h-4 w-4 rounded-sm" />
                  <span className="truncate">{p.name}</span>
                </span>
                <b>{fmtInt(v)}</b>
              </div>
            ))}
        </div>
      </div>
    ) : null;

  return (
    <CardShell title="Tracked Keywords" icon={<BarChart4 className="h-4 w-4" />} onExport={exportCard}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Donut + smart popover (no center value) */}
        <ProjectsStackedDonut
          projects={projects}
          getValue={(p) => p.trackedKeywords}
          renderPopover={renderDonutPopover}
        />

        {/* KPI center (value + deltas) */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-2xl font-bold" style={{ color: TOKENS.brand }}>
            {fmtInt(totalTracked)}
          </div>
          <div className="flex flex-col items-center gap-1 text-xs">
            <div className="inline-flex items-center gap-1">
              {last - prev >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              )}
              <span className={last - prev >= 0 ? "text-green-600" : "text-red-600"}>
                {pct(last, prev)} vs prev
              </span>
            </div>
            <div className="inline-flex items-center gap-1">
              {last - first >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              )}
              <span className={last - first >= 0 ? "text-green-600" : "text-red-600"}>
                {pct(last, first)} vs start
              </span>
            </div>
          </div>
        </div>

        {/* Trend bars + smart popover (per-project breakdown at hovered date) */}
        <div className="relative inline-flex" onMouseLeave={() => setActiveBar(null)}>
          <div className="h-[170px] w-full cursor-pointer">
            <ResponsiveContainer>
              <BarChart
                data={barData}
                margin={{ top: 8, right: 8, left: 0, bottom: 18 }}
                onMouseLeave={() => setActiveBar(null)}
              >
                <CartesianGrid stroke={TOKENS.border} vertical={false} />
                <XAxis
                  dataKey="date"
                  height={18}
                  axisLine={{ stroke: "#E5E7EB" }} // visible x-axis line
                  tick={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Bar
                  dataKey="Total"
                  shape={(props: any) => <RoundedTopBar {...props} activeIndex={activeBar} />}
                  onMouseMove={(_, idx) => setActiveBar(typeof idx === "number" ? idx : null)}
                  onMouseOver={(_, idx) => setActiveBar(typeof idx === "number" ? idx : null)}
                >
                  {barData.map((_, i) => (
                    <Cell key={i} fill={TOKENS.brand} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {activeBar != null && (
            <>
              <div
                className="hidden md:block absolute top-0 left-full ml-2 rounded-md border bg-white p-2 text-xs shadow-sm z-10 pointer-events-none"
                style={{ width: 260, borderColor: TOKENS.border, overflow: "hidden" }}
              >
                {barPopover}
              </div>
              <div
                className="md:hidden mt-2 rounded-md border bg-white p-2 text-xs shadow-sm"
                style={{ borderColor: TOKENS.border, overflow: "hidden" }}
              >
                {barPopover}
              </div>
            </>
          )}
        </div>
      </div>
    </CardShell>
  );
}

/* ---- Card 2: SERP Feature Coverage ---- */

function CardSerpCoverage({ projects }: { projects: ProjectStat[] }) {
  const total = sum(projects, (p) => p.serpFeatureCoverage?.total || 0);

  const exportCard = () => {
    const rows: (string | number)[][] = [["Project", "SERP Features (Total)"]];
    projects.forEach((p) => rows.push([p.name, p.serpFeatureCoverage?.total || 0]));
    downloadCsv("serp_feature_coverage.csv", rows);
  };

  // One bar PER PROJECT (no "Other")
  const bars = projects.map((p, i) => ({
    key: p.id,
    label: p.name,
    value: p.serpFeatureCoverage?.total || 0,
    color: projectColor(i, p.color),
    project: p,
  }));
  const projectMap: Record<string, ProjectStat> = Object.fromEntries(projects.map((p) => [p.id, p]));

  // Donut popover: totals list + highlight hovered (no details)
  const renderDonutPopover = (hovered?: ProjectStat | null) => (
    <div className="space-y-1">
      <div className="font-semibold mb-1">SERP features • totals</div>
      {projects.map((p) => {
        const active = hovered?.id === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 ${active ? "bg-[#F0F9FF]" : ""}`}
          >
            <span className="inline-flex items-center gap-2">
              <img src={projectFavicon(p)} alt="" className="h-4 w-4 rounded-sm" />
              <span className="truncate">{p.name}</span>
            </span>
            <b>{fmtInt(p.serpFeatureCoverage?.total || 0)}</b>
          </div>
        );
      })}
    </div>
  );

  // Bars popover: full feature breakdown for hovered project
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const currentBar = activeBar != null ? bars[activeBar] : null;

  const SerpFeatureRow = ({ k, cnt }: { k: SerpFeatureKey; cnt: number }) => {
    const Icon = FEATURE_ICON[k]?.icon || LayoutGrid;
    const color = FEATURE_COLORS[k] || "#334155";
    const label = FEATURE_ICON[k]?.label || k;
    return (
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: `${color}14`, color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{label}</span>
        </span>
        <b>{fmtInt(cnt)}</b>
      </div>
    );
  };

  const barPopover = currentBar ? (
    <div className="space-y-2">
      <div className="font-semibold">SERP features • {currentBar.label}</div>
      <div className="max-h-56 overflow-auto pr-1">
        {(currentBar.project?.serpFeatureCoverage?.features || [])
          .slice()
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .map((f) => (
            <SerpFeatureRow key={f.key} k={f.key} cnt={f.count} />
          ))}
      </div>
    </div>
  ) : null;

  return (
    <CardShell title="SERP Feature Coverage" icon={<PieIcon className="h-4 w-4" />} onExport={exportCard}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Donut + smart popover (totals only, no center value) */}
        <ProjectsStackedDonut
          projects={projects}
          getValue={(p) => p.serpFeatureCoverage?.total || 0}
          renderPopover={renderDonutPopover}
        />

        {/* KPI center */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-2xl font-bold" style={{ color: TOKENS.brand }}>
            {fmtInt(total)}
          </div>
          <div className="flex flex-col items-center gap-1 text-xs text-gray-500">
            <div className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
              <span>Δ not available</span>
            </div>
            <div className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
              <span>Provide time-series to compute</span>
            </div>
          </div>
        </div>

        {/* Bars per project + smart popover (breakdown for hovered project) */}
        <div className="relative inline-flex" onMouseLeave={() => setActiveBar(null)}>
          <div className="h-[170px] w-full cursor-pointer">
            <ResponsiveContainer>
              <BarChart
                data={bars.map((b) => ({ id: b.key, value: b.value, color: b.color }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 28 }}
                onMouseLeave={() => setActiveBar(null)}
              >
                <CartesianGrid stroke={TOKENS.border} vertical={false} />
                <XAxis
                  dataKey="id"
                  height={28}
                  tickLine={false}
                  tick={(props: any) => <FaviconTick {...props} projectMap={projectMap} />}
                />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Bar
                  dataKey="value"
                  onMouseMove={(_, idx) => setActiveBar(typeof idx === "number" ? idx : null)}
                  onMouseOver={(_, idx) => setActiveBar(typeof idx === "number" ? idx : null)}
                  shape={(props: any) => <RoundedTopBar {...props} activeIndex={activeBar} />}
                >
                  {bars.map((b) => (
                    <Cell key={b.key} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {activeBar != null && (
            <>
              <div
                className="hidden md:block absolute top-0 left-full ml-2 rounded-md border bg-white p-2 text-xs shadow-sm z-10 pointer-events-none"
                style={{ width: 260, borderColor: TOKENS.border, overflow: "hidden" }}
              >
                {barPopover}
              </div>
              <div
                className="md:hidden mt-2 rounded-md border bg-white p-2 text-xs shadow-sm"
                style={{ borderColor: TOKENS.border, overflow: "hidden" }}
              >
                {barPopover}
              </div>
            </>
          )}
        </div>
      </div>
    </CardShell>
  );
}

/* ---- Card 3: Cannibalization Flags ---- */

function CardCannibalization({ projects }: { projects: ProjectStat[] }) {
  const total = sum(projects, (p) => p.cannibalizedKeywords || 0);

  const exportCard = () => {
    const rows: (string | number)[][] = [["Project", "Cannibalized Keywords"]];
    projects.forEach((p) => rows.push([p.name, p.cannibalizedKeywords || 0]));
    downloadCsv("cannibalization_flags.csv", rows);
  };

  // One bar PER PROJECT (no "Other")
  const bars = projects.map((p, i) => ({
    key: p.id,
    label: p.name,
    value: p.cannibalizedKeywords || 0,
    color: projectColor(i, p.color),
    project: p,
  }));
  const projectMap: Record<string, ProjectStat> = Object.fromEntries(projects.map((p) => [p.id, p]));

  // Donut popover: totals list (no details)
  const renderDonutPopover = (hovered?: ProjectStat | null) => (
    <div className="space-y-1">
      <div className="font-semibold mb-1">Cannibalization • totals</div>
      {projects.map((p) => {
        const active = hovered?.id === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 ${active ? "bg-[#FFF1F2]" : ""}`}
          >
            <span className="inline-flex items-center gap-2">
              <img src={projectFavicon(p)} alt="" className="h-4 w-4 rounded-sm" />
              <span className="truncate">{p.name}</span>
            </span>
            <b>{fmtInt(p.cannibalizedKeywords || 0)}</b>
          </div>
        );
      })}
    </div>
  );

  // Bars popover: keyword breakdown (max 10 rows: 9 keywords + 10th "Other")
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const currentBar = activeBar != null ? bars[activeBar] : null;

  const barPopover = currentBar ? (
    <div className="space-y-2">
      <div className="font-semibold">Cannibalized keywords • {currentBar.label}</div>
      <div className="max-h-56 overflow-auto pr-1">
        {(() => {
          const list = currentBar.project?.cannibalizedList || [];
          if (!list.length) {
            return <div className="px-1 py-0.5 text-gray-500">No cannibalization recorded.</div>;
          }
          const sorted = [...list].sort((a, b) => (b.pagesCount || 0) - (a.pagesCount || 0));
          const top = sorted.slice(0, 9);
          const otherCount = Math.max(0, sorted.length - top.length);
          return (
            <>
              {top.map((row, i) => (
                <div key={row.keyword + i} className="flex items-center justify-between gap-2 px-1 py-0.5">
                  <span className="truncate">{row.keyword}</span>
                  <b>{fmtInt(row.pagesCount)} pages</b>
                </div>
              ))}
              {otherCount > 0 && (
                <div className="flex items-center justify-between gap-2 px-1 py-0.5 text-gray-700">
                  <span className="truncate">Other keywords</span>
                  <b>{fmtInt(otherCount)}</b>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  ) : null;

  return (
    <CardShell title="Cannibalization Flags" icon={<AlertTriangle className="h-4 w-4" />} onExport={exportCard}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Donut + smart popover (no center value) */}
        <ProjectsStackedDonut
          projects={projects}
          getValue={(p) => p.cannibalizedKeywords || 0}
          renderPopover={renderDonutPopover}
        />

        {/* KPI center */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-2xl font-bold" style={{ color: TOKENS.danger }}>
            {fmtInt(total)}
          </div>
          <div className="flex flex-col items-center gap-1 text-xs text-gray-500">
            <div className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
              <span>Δ not available</span>
            </div>
            <div className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
              <span>Provide time-series to compute</span>
            </div>
          </div>
        </div>

        {/* Bars + smart popover (keyword breakdown for hovered project) */}
        <div className="relative inline-flex" onMouseLeave={() => setActiveBar(null)}>
          <div className="h-[170px] w-full cursor-pointer">
            <ResponsiveContainer>
              <BarChart
                data={bars.map((b) => ({ id: b.key, value: b.value, color: b.color }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 28 }}
                onMouseLeave={() => setActiveBar(null)}
              >
                <CartesianGrid stroke={TOKENS.border} vertical={false} />
                <XAxis
                  dataKey="id"
                  height={28}
                  tickLine={false}
                  tick={(props: any) => <FaviconTick {...props} projectMap={projectMap} />}
                />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Bar
                  dataKey="value"
                  onMouseMove={(_, idx) => setActiveBar(typeof idx === "number" ? idx : null)}
                  onMouseOver={(_, idx) => setActiveBar(typeof idx === "number" ? idx : null)}
                  shape={(props: any) => <RoundedTopBar {...props} activeIndex={activeBar} />}
                >
                  {bars.map((b) => (
                    <Cell key={b.key} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {activeBar != null && (
            <>
              <div
                className="hidden md:block absolute top-0 left-full ml-2 rounded-md border bg-white p-2 text-xs shadow-sm z-10 pointer-events-none"
                style={{ width: 260, borderColor: TOKENS.border, overflow: "hidden" }}
              >
                {barPopover}
              </div>
              <div
                className="md:hidden mt-2 rounded-md border bg-white p-2 text-xs shadow-sm"
                style={{ borderColor: TOKENS.border, overflow: "hidden" }}
              >
                {barPopover}
              </div>
            </>
          )}
        </div>
      </div>
    </CardShell>
  );
}

/* ---------------------------- Keywords Table ---------------------------- */

type ViewKey = "all" | "top" | "emerging" | "declining" | "lost" | "new" | "cannibalized";

const VIEW_LABEL: Record<ViewKey, string> = {
  all: "All",
  top: "Top Ranking",
  emerging: "Emerging",
  declining: "Declining",
  lost: "Lost",
  new: "New",
  cannibalized: "Cannibalized",
};

function pickView(rows: KeywordRow[], view: ViewKey) {
  const limit = 20;
  if (view === "all") {
    const groups = [
      rows.filter((r) => r.viewTag === "top"),
      rows.filter((r) => r.viewTag === "emerging"),
      rows.filter((r) => r.viewTag === "declining"),
      rows.filter((r) => r.viewTag === "new"),
      rows.filter((r) => r.viewTag === "lost"),
      rows.filter((r) => r.viewTag === "cannibalized"),
    ];
    const out: KeywordRow[] = [];
    for (const g of groups) {
      for (const r of g) {
        if (out.length >= limit) break;
        out.push(r);
      }
      if (out.length >= limit) break;
    }
    if (out.length < limit) {
      for (const r of rows) {
        if (out.length >= limit) break;
        if (!out.includes(r)) out.push(r);
      }
    }
    return out.slice(0, limit);
  }
  const map: Record<ViewKey, (r: KeywordRow) => boolean> = {
    all: () => true,
    top: (r) => r.viewTag === "top" || r.position <= 3,
    emerging: (r) =>
      r.viewTag === "emerging" ||
      (typeof r.positionDelta === "number" && r.positionDelta < 0 && Math.abs(r.positionDelta) >= 5),
    declining: (r) =>
      r.viewTag === "declining" ||
      (typeof r.positionDelta === "number" && r.positionDelta > 0 && Math.abs(r.positionDelta) >= 5),
    lost: (r) => r.viewTag === "lost" || r.position >= 999,
    new: (r) => r.viewTag === "new",
    cannibalized: (r) => r.cannibalized || r.viewTag === "cannibalized",
  };
  return rows.filter(map[view]).slice(0, limit);
}

function SerpFeatureBadges({ list }: { list?: SerpFeatureKey[] }) {
  if (!list?.length) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {list.slice(0, 6).map((k, i) => {
        const Icon = FEATURE_ICON[k]?.icon || LayoutGrid;
        const c = FEATURE_COLORS[k] || "#334155";
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
            style={{
              borderColor: TOKENS.border,
              background: TOKENS.chip,
              color: c,
            }}
            title={FEATURE_ICON[k]?.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
      {list.length > 6 && (
        <span className="text-[11px] text-gray-500">+{list.length - 6}</span>
      )}
    </div>
  );
}

function PositionDelta({ v }: { v?: number }) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0)
    return <span className="text-xs text-gray-400">—</span>;
  const up = v > 0; // positive = worse
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${up ? "text-red-600" : "text-green-600"}`}>
      {up ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
      {up ? "+" : "−"}
      {Math.abs(v)}
    </span>
  );
}

type SortKey = "keyword" | "project" | "intent" | "position" | "delta" | "clicks" | "url";
function sortRows(rows: KeywordRow[], key: SortKey, asc: boolean, projectMap: Record<string, ProjectStat>): KeywordRow[] {
  const dir = asc ? 1 : -1;
  const val = (r: KeywordRow): any => {
    switch (key) {
      case "keyword": return r.keyword.toLowerCase();
      case "project": return (projectMap[r.projectId || ""]?.name || "").toLowerCase();
      case "intent": return (r.intent || "").toLowerCase();
      case "position": return r.position >= 999 ? Infinity : r.position;
      case "delta": return r.positionDelta ?? 0;
      case "clicks": return r.clicks ?? 0;
      case "url": return r.url || "";
    }
  };
  return [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function KeywordsTable({
  rows,
  projects,
  sortKey,
  sortAsc,
  onSort,
  onAdd,
  onTask,
  onSerp,
}: {
  rows: KeywordRow[];
  projects: ProjectStat[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  onAdd?: (kw: string) => void;
  onTask?: (kw: string) => void;
  onSerp?: (kw: string) => void;
}) {
  const projectMap: Record<string, ProjectStat> = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );
  const sorted = useMemo(() => sortRows(rows, sortKey, sortAsc, projectMap), [rows, sortKey, sortAsc, projectMap]);

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="px-3 py-2 font-medium cursor-pointer select-none"
      onClick={() => onSort(k)}
      title="Click to sort"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === k ? (
          <span className="text-xs text-gray-500">{sortAsc ? "▲" : "▼"}</span>
        ) : (
          <span className="text-xs text-gray-300">↕</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="w-full overflow-x-auto rounded-md border" style={{ borderColor: TOKENS.border }}>
      <table className="min-w-[980px] w-full">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs text-gray-500">
            <Th k="keyword">Keyword</Th>
            <Th k="project">Project</Th>
            <Th k="intent">Intent</Th>
            <Th k="position">Pos</Th>
            <Th k="delta">Δ</Th>
            <Th k="clicks">Clicks</Th>
            <Th k="url">URL</Th>
            <th className="px-3 py-2 font-medium">SERP</th>
            <th className="px-3 py-2 font-medium">Flags</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: TOKENS.border }}>
          {sorted.map((r, i) => {
            const p = projectMap[r.projectId || ""];
            return (
              <tr
                key={r.keyword + i}
                className="text-sm transition-all duration-150 hover:bg-slate-50 motion-safe:hover:-translate-y-[1px]"
              >
                <td className="px-3 py-2 font-medium text-gray-900">{r.keyword}</td>
                <td className="px-3 py-2">
                  {p ? (
                    <span className="inline-flex items-center gap-2">
                      <img src={projectFavicon(p)} alt="" className="h-4 w-4 rounded-sm" />
                      <span className="text-gray-700">{p.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {r.intent ? (
                    <span className="inline-flex items-center gap-1">
                      <Dot color={INTENT_COLORS[r.intent]} size={8} />
                      {r.intent}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">{r.position >= 999 ? "—" : r.position}</td>
                <td className="px-3 py-2">
                  <PositionDelta v={r.positionDelta} />
                </td>
                <td className="px-3 py-2">{fmtInt(r.clicks)}</td>
                <td className="px-3 py-2 text-gray-600">{shortUrl(r.url)}</td>
                <td className="px-3 py-2">
                  <SerpFeatureBadges list={r.features} />
                </td>
                <td className="px-3 py-2">
                  {r.cannibalized ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Cannibalized
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      title="Add to Tracking"
                      className="rounded p-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => onAdd?.(r.keyword)}
                    >
                      <Plus className="h-4 w-4" style={{ color: TOKENS.brand }} />
                    </button>
                    <button
                      title="Create Task"
                      className="rounded p-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => onTask?.(r.keyword)}
                    >
                      <ClipboardPlus className="h-4 w-4" style={{ color: TOKENS.brand }} />
                    </button>
                    <button
                      title="View SERP Snapshot"
                      className="rounded p-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => onSerp?.(r.keyword)}
                    >
                      <ExternalLink className="h-4 w-4" style={{ color: TOKENS.brand }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-500">
                No keywords match this view.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------- Main Section ---------------------------- */

export default function KeywordsPulseAllProjects({
  projects = DEMO_PROJECTS,
  trackedTrendAll,
  keywords = DEMO_KEYWORDS,
  className,
  onAddToTracking,
  onCreateTask,
  onOpenSerpSnapshot,
  onExportCsv,
}: KeywordsPulseProps) {
  // Assign palette colors deterministically
  const projectsSafe: ProjectStat[] = projects.map((p, i) => ({
    ...p,
    color: projectColor(i, p.color),
  }));
  const projectMap: Record<string, ProjectStat> = useMemo(
    () => Object.fromEntries(projectsSafe.map((p) => [p.id, p])),
    [projectsSafe]
  );

  // Portfolio trend
  const trend = useMemo(
    () => (trackedTrendAll?.length ? trackedTrendAll : asPortfolioTrend(projectsSafe)),
    [trackedTrendAll, projectsSafe]
  );

  // Table view & sorting
  const [view, setView] = useState<ViewKey>("all");
  const viewRows = useMemo(() => pickView(keywords, view), [keywords, view]);

  const [sortKey, setSortKey] = useState<SortKey>("keyword");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc((s) => !s);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  };

  // Export (table)
  const doExport = () => {
    const rows = sortRows(viewRows, sortKey, sortAsc, projectMap);
    if (onExportCsv) {
      onExportCsv(rows);
      return;
    }
    const cols = ["keyword", "project", "position", "delta", "clicks", "impressions", "url", "features", "cannibalized", "viewTag", "intent"];
    const data: (string | number)[][] = [cols];
    rows.forEach((r) => {
      data.push([
        r.keyword,
        projectMap[r.projectId || ""]?.name || "",
        r.position >= 999 ? "" : r.position,
        r.positionDelta ?? "",
        r.clicks ?? "",
        r.impressions ?? "",
        r.url ?? "",
        (r.features || []).join("|"),
        r.cannibalized ? 1 : "",
        r.viewTag ?? "",
        r.intent ?? "",
      ] as (string | number)[]);
    });
    downloadCsv(`keywords_${view}.csv`, data);
  };

  return (
    <section
      className="rounded-md border px-2.5 py-1.5 bg-white mt-4"
      style={{ fontFamily: `'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial` }}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <BarChart4 className="h-4 w-4" style={{ color: TOKENS.brand }} />
          <h3 className="text-base font-semibold text-gray-900">Keywords Pulse (All Projects)</h3>
        </div>
      </div>

      {/* KPI 3-up */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CardTrackedKeywords projects={projectsSafe} portfolioTrend={trend} />
        <CardSerpCoverage projects={projectsSafe} />
        <CardCannibalization projects={projectsSafe} />
      </div>

      {/* Table sub-header */}
      <div className="mt-8 mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" style={{ color: TOKENS.brand }} />
          <h4 className="text-sm font-semibold text-gray-900">Important keywords</h4>
        </div>
        <button
          type="button"
          onClick={doExport}
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: TOKENS.border, background: TOKENS.surface, color: TOKENS.text }}
          title="Export table CSV"
        >
          <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
          Export
        </button>
      </div>

      {/* Table filter chips */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {(["all", "top", "emerging", "declining", "lost", "new", "cannibalized"] as ViewKey[]).map((k) => (
          <Pill key={k} label={VIEW_LABEL[k]} active={view === k} onClick={() => setView(k)} />
        ))}
      </div>

      {/* Keywords table */}
      <KeywordsTable
        rows={viewRows}
        projects={projectsSafe}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={onSort}
        onAdd={onAddToTracking}
        onTask={onCreateTask}
        onSerp={onOpenSerpSnapshot}
      />
    </section>
  );
}
