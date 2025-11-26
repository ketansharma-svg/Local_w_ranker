import * as React from "react";

/**
 * SECTION 2 — Why this opportunity is suggested
 * Drop‑in React + Tailwind TSX
 * - Inter / Inter Fallback font
 * - Branded (#008CCD) inline SVG icons
 * - Collapsible sub‑cards by clicking the header (pointer cursor)
 * - Hover animations on all cards
 * - SmartPopover on:
 *    • Trending Domain → 6‑month sparkline points
 *    • Best Value → scatter/bubble points
 * - No external chart libs, no emoji
 */

type CompetitorRow = {
  competitor: string;
  linkType: "Guest Post" | "Link Insertion" | "PR Feature";
  linkUrl: string;
  wrOfLinkingPage: number;
  firstSeen: string; // "Jan 2024"
};

type MonthTraffic = {
  month: string; // "Apr"
  total: number;
  geo: { code: string; name: string; visits: number }[]; // top 3
};

type Comparable = { domain: string; wr: number; price: number };

type DemoOpportunity = {
  domain: string;
  wrScore: number;
  priceUsd: number;
  spamScore: number;
  category: string[];
  competitorLinks?: CompetitorRow[];
  trendingTraffic?: MonthTraffic[];
  bestValue?: {
    priceBandAvg: number;
    comparables: Comparable[];
  };
  lowRisk?: {
    referringDomains: number;
    toxicPct: number; // 0..100
    anchorExactPct: number;
    categoryAvgSpam: number;
  };
  prPlacement?: {
    networkName: string;
    monthlyReach: number; // visits
    acceptanceRatePct: number;
    avgTurnaroundDays: number;
  };
};

/* ─────────────────────────────────────────────────────────────
   Demo data (kept as in the original snippet)
───────────────────────────────────────────────────────────── */
const demo: DemoOpportunity = {
  domain: "techinsiderhub.com",
  wrScore: 84,
  priceUsd: 120,
  spamScore: 12,
  category: ["Technology", "SaaS", "SEO Tools"],
  competitorLinks: [
    {
      competitor: "seotoolsdaily.com",
      linkType: "Guest Post",
      linkUrl: "/seo-best-practices",
      wrOfLinkingPage: 72,
      firstSeen: "Feb 2024",
    },
    {
      competitor: "marketinginsights.net",
      linkType: "Link Insertion",
      linkUrl: "/blog/ga4-setup",
      wrOfLinkingPage: 69,
      firstSeen: "Mar 2024",
    },
    {
      competitor: "growthhackspro.io",
      linkType: "PR Feature",
      linkUrl: "/digital-marketing-trends",
      wrOfLinkingPage: 79,
      firstSeen: "Jan 2024",
    },
  ],
  trendingTraffic: [
    {
      month: "Apr",
      total: 51500,
      geo: [
        { code: "US", name: "United States", visits: 27900 },
        { code: "GB", name: "United Kingdom", visits: 10300 },
        { code: "CA", name: "Canada", visits: 4300 },
      ],
    },
    {
      month: "May",
      total: 54700,
      geo: [
        { code: "US", name: "United States", visits: 29200 },
        { code: "GB", name: "United Kingdom", visits: 9900 },
        { code: "IN", name: "India", visits: 5200 },
      ],
    },
    {
      month: "Jun",
      total: 57200,
      geo: [
        { code: "US", name: "United States", visits: 30500 },
        { code: "GB", name: "United Kingdom", visits: 10300 },
        { code: "CA", name: "Canada", visits: 5100 },
      ],
    },
    {
      month: "Jul",
      total: 59100,
      geo: [
        { code: "US", name: "United States", visits: 31600 },
        { code: "GB", name: "United Kingdom", visits: 10400 },
        { code: "AU", name: "Australia", visits: 4800 },
      ],
    },
    {
      month: "Aug",
      total: 60400,
      geo: [
        { code: "US", name: "United States", visits: 32300 },
        { code: "GB", name: "United Kingdom", visits: 10900 },
        { code: "CA", name: "Canada", visits: 5200 },
      ],
    },
    {
      month: "Sep",
      total: 58300,
      geo: [
        { code: "US", name: "United States", visits: 30800 },
        { code: "GB", name: "United Kingdom", visits: 10500 },
        { code: "DE", name: "Germany", visits: 4600 },
      ],
    },
  ],
  bestValue: {
    priceBandAvg: 150,
    comparables: [
      { domain: "example-a.com", wr: 63, price: 160 },
      { domain: "example-b.com", wr: 76, price: 210 },
      { domain: "example-c.com", wr: 51, price: 110 },
      { domain: "example-d.com", wr: 72, price: 180 },
      { domain: "example-e.com", wr: 83, price: 260 },
      { domain: "example-f.com", wr: 67, price: 145 },
      { domain: "example-g.com", wr: 58, price: 100 },
      { domain: "example-h.com", wr: 79, price: 195 },
      { domain: "example-i.com", wr: 69, price: 170 },
      { domain: "example-j.com", wr: 60, price: 130 },
      { domain: "example-k.com", wr: 82, price: 240 },
      { domain: "example-l.com", wr: 55, price: 120 },
      { domain: "example-m.com", wr: 65, price: 152 },
      { domain: "example-n.com", wr: 75, price: 205 },
    ],
  },
  lowRisk: {
    referringDomains: 760,
    toxicPct: 6,
    anchorExactPct: 12,
    categoryAvgSpam: 21,
  },
  prPlacement: {
    networkName: "Vefogix News & Media",
    monthlyReach: 4100000,
    acceptanceRatePct: 68,
    avgTurnaroundDays: 2,
  },
};

/* ─────────────────────────────────────────────────────────────
   Tokens, help, primitives
───────────────────────────────────────────────────────────── */

const BrandTokens = () => (
  <style>{`
    :root { --wr-brand:#008CCD; }
    .wr-font{ font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; }
  `}</style>
);

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
function usd(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Small branded popover (no portal) */
function SmartPopover({
  label,
  placement = "top",
  children,
  className,
}: {
  label: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const pos =
    placement === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -translate-y-2"
      : placement === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 translate-y-2"
      : placement === "left"
      ? "right-full top-1/2 -translate-y-1/2 -translate-x-2"
      : "left-full top-1/2 -translate-y-1/2 translate-x-2";

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={id} className="inline-flex">{children}</span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-pre rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 shadow-lg ring-1 ring-black/5 transition-all duration-150",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95",
          pos
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Icons — brand colored
───────────────────────────────────────────────────────────── */

const IconSection = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm6 8h-6v6h6v-6z" />
  </svg>
);
const IconUsers = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4" strokeWidth="2"/>
    <path strokeWidth="2" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M20.59 13.41L11 3H3v8l9.59 9.59a2 2 0 0 0 2.82 0l5.18-5.18a2 2 0 0 0 0-2.82z"/>
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
const IconArea = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M3 3h2v16h16v2H3z"/><path d="M5 17l6-8 4 5 4-6 2 3v6H5z"/>
  </svg>
);
const IconPriceTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M3 7l7-4 11 6v6l-7 4L3 13V7z"/><path strokeWidth="2" d="M14 7l-5 3 5 3 5-3-5-3z"/>
  </svg>
);
const IconShield = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M12 3l7 4v5a9 9 0 0 1-7 9 9 9 0 0 1-7-9V7l7-4z"/>
  </svg>
);
const IconNews = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M4 6h13v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/>
    <path strokeWidth="2" d="M17 6h3v10a2 2 0 0 1-2 2h-1"/>
    <path strokeWidth="2" d="M8 10h7M8 14h7M8 18h4"/>
  </svg>
);
const IconChevron = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Color tints for cards
───────────────────────────────────────────────────────────── */
const COLORS = {
  blue: { tint: "bg-sky-50", border: "border-sky-200" },
  violet: { tint: "bg-violet-50", border: "border-violet-200" },
  emerald: { tint: "bg-emerald-50", border: "border-emerald-200" },
  amber: { tint: "bg-amber-50", border: "border-amber-200" },
};

/* ─────────────────────────────────────────────────────────────
   Charts
───────────────────────────────────────────────────────────── */

function Sparkline({
  labels, // months
  values,
  width = 280,
  height = 80,
  stroke = "var(--wr-brand)",
}: {
  labels: string[];
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = (width - pad * 2) / (values.length - 1);

  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  const area =
    `M ${pts[0][0]} ${height - pad} ` +
    pts.map(([x, y]) => `L ${x} ${y}`).join(" ") +
    ` L ${pts[pts.length - 1][0]} ${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full">
      <path d={area} fill="#D9EEF8" />
      <path d={d} stroke={stroke} strokeWidth={2.4} fill="none" />
      {pts.map(([x, y], i) => (
        <SmartPopover
          key={i}
          label={
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: stroke }} />
              <span className="font-medium text-slate-900">{labels[i]}</span>
              <span className="text-slate-700">{compact(values[i])}</span>
            </span>
          }
        >
          <circle
            cx={x}
            cy={y}
            r={2.8}
            fill={stroke}
            className="cursor-pointer transition-transform duration-150 hover:scale-110"
          />
        </SmartPopover>
      ))}
    </svg>
  );
}

function ScatterMini({
  current,
  peers,
  width = 320,
  height = 160,
  medianPrice,
}: {
  current: { wr: number; price: number; domain: string };
  peers: Comparable[];
  width?: number;
  height?: number;
  medianPrice: number;
}) {
  const pad = 24;
  const maxWr = 100;
  const minPrice = Math.min(current.price, ...peers.map((p) => p.price), 60);
  const maxPrice = Math.max(current.price, ...peers.map((p) => p.price), 280);

  const xScale = (wr: number) => pad + (wr / maxWr) * (width - pad * 2);
  const yScale = (price: number) =>
    pad + (1 - (price - minPrice) / (maxPrice - minPrice)) * (height - pad * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
      {/* axes */}
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#e5e7eb" />
      {/* median line */}
      <line
        x1={pad}
        x2={width - pad}
        y1={yScale(medianPrice)}
        y2={yScale(medianPrice)}
        stroke="#cbd5e1"
        strokeDasharray="4 4"
      />
      {/* peers */}
      {peers.map((p) => (
        <SmartPopover
          key={p.domain}
          label={
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-400" />
              <span className="font-medium text-slate-900">{p.domain}</span>
              <span className="text-slate-700">WR {p.wr} · {usd(p.price)}</span>
            </span>
          }
        >
          <circle
            cx={xScale(p.wr)}
            cy={yScale(p.price)}
            r={4}
            fill="#a5b4fc"
            className="cursor-pointer transition-transform duration-150 hover:scale-110"
          />
        </SmartPopover>
      ))}
      {/* current */}
      <SmartPopover
        label={
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--wr-brand)" }} />
            <span className="font-medium text-slate-900">{current.domain}</span>
            <span className="text-slate-700">WR {current.wr} · {usd(current.price)}</span>
          </span>
        }
      >
        <circle
          cx={xScale(current.wr)}
          cy={yScale(current.price)}
          r={6.5}
          fill="var(--wr-brand)"
          className="cursor-pointer transition-transform duration-150 hover:scale-110"
        />
      </SmartPopover>

      {/* labels */}
      <text x={width - pad} y={height - 4} textAnchor="end" fontSize="10" fill="#64748b">
        WR →
      </text>
      <text x={2} y={pad - 6} fontSize="10" fill="#64748b">
        Price
      </text>
      <text
        x={width - pad}
        y={yScale(medianPrice) - 4}
        textAnchor="end"
        fontSize="10"
        fill="#94a3b8"
      >
        Median {usd(medianPrice)}
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Card shell (collapsible by clicking header)
───────────────────────────────────────────────────────────── */

function ReasonCard({
  color,
  icon,
  title,
  detail,
  tooltip,
  children,
  defaultOpen = false,
}: {
  color: keyof typeof COLORS;
  icon: React.ReactNode;
  title: string;
  detail: string;
  tooltip?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const palette = COLORS[color];

  const toggle = () => setOpen((v) => !v);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        palette.border
      )}
    >
      {/* Clickable header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onKey}
        className={cn(
          "flex cursor-pointer items-start gap-3 p-4"
        )}
        title={tooltip}
      >
        {/* Icon circle */}
        <div className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-slate-200 bg-[var(--wr-brand)]/5 text-[var(--wr-brand)]">
          {icon}
        </div>

        {/* Title + detail */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-[15px] font-semibold text-slate-800">
                  {title}
                </h4>
              </div>
              <p className="mt-1 text-[13px] text-slate-600">{detail}</p>
            </div>
            <IconChevron
              className={cn(
                "mt-0.5 h-4 w-4 text-slate-500 transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden px-4 pb-4">
          {open && (
            <div className={cn("rounded-lg border border-slate-200 bg-white p-3", palette.tint)}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Small UI bits (unchanged behaviors)
───────────────────────────────────────────────────────────── */

function BarPct({
  label,
  pct,
  good,
  warn,
}: {
  label: string;
  pct: number;
  good?: boolean;
  warn?: boolean;
}) {
  const bar = good ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px] text-slate-600">
        <span>{label}</span>
        <span className="font-medium text-slate-800">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={cn("h-2 rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN SECTION COMPONENT (drop‑in)
───────────────────────────────────────────────────────────── */

export default function LinkOpportunityWhySuggested({
  data = demo,
}: {
  data?: DemoOpportunity;
}) {
  const showCompetitor = (data.competitorLinks?.length ?? 0) > 0;
  const showNiche = data.category.length > 0;
  const showTrending = (data.trendingTraffic?.length ?? 0) >= 6;
  const showBestValue = !!data.bestValue;
  const showLowRisk = !!data.lowRisk;
  const showPR = !!data.prPlacement;

  // Trending % (last 3 vs previous 3)
  let trendPct = 0;
  if (showTrending && data.trendingTraffic) {
    const last3 = data.trendingTraffic.slice(-3).reduce((a, b) => a + b.total, 0) / 3;
    const prev3 = data.trendingTraffic.slice(-6, -3).reduce((a, b) => a + b.total, 0) / 3;
    trendPct = prev3 ? ((last3 - prev3) / prev3) * 100 : 0;
  }

  // GEO share shift
  const geoShift: { code: string; diffPct: number }[] = [];
  if (showTrending && data.trendingTraffic) {
    const months = data.trendingTraffic;
    const agg = (slice: MonthTraffic[]) => {
      const totals = slice.reduce((acc, m) => acc + m.total, 0);
      const map = new Map<string, number>();
      slice.forEach((m) =>
        m.geo.forEach((g) => map.set(g.code, (map.get(g.code) ?? 0) + g.visits))
      );
      return Array.from(map, ([code, visits]) => ({
        code,
        share: totals ? (visits / totals) * 100 : 0,
      }));
    };
    const first = agg(months.slice(0, 3));
    const last = agg(months.slice(-3));
    const set = new Set([...first.map((x) => x.code), ...last.map((x) => x.code)]);
    set.forEach((code) => {
      const a = first.find((x) => x.code === code)?.share ?? 0;
      const b = last.find((x) => x.code === code)?.share ?? 0;
      geoShift.push({ code, diffPct: +(b - a).toFixed(1) });
    });
    geoShift.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
  }

  // Best value median & percentile
  let medianPrice = data.bestValue?.priceBandAvg ?? 0;
  let percentile = 0;
  if (showBestValue && data.bestValue) {
    const prices = [...data.bestValue.comparables.map((c) => c.price), data.priceUsd].sort(
      (a, b) => a - b
    );
    medianPrice =
      prices.length % 2
        ? prices[(prices.length - 1) / 2]
        : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;

    const better = data.bestValue.comparables.filter(
      (c) => c.price / Math.max(1, c.wr) < data.priceUsd / Math.max(1, data.wrScore)
    ).length;
    const total = data.bestValue.comparables.length;
    percentile = Math.round(((total - better) / total) * 100); // top X%
  }

  return (
    <section aria-labelledby="why-suggested" className="wr-font w-full mt-4">
      <BrandTokens />
      <div className="mb-3 flex items-center gap-2 px-2">
        <IconSection className="h-5 w-5 text-[var(--wr-brand)]" />
        <h3 id="why-suggested" className="text-[18px] font-semibold text-slate-800">
          Why this opportunity is suggested
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {/* Competitor Match — (no content changes requested) */}
        {showCompetitor && (
          <ReasonCard
            color="blue"
            icon={<IconUsers className="h-5 w-5" />}
            title="Competitor Match"
            detail={`Linked by ${data.competitorLinks!.length} tracked competitors: ${data
              .competitorLinks!.map((c) => c.competitor)
              .slice(0, 3)
              .join(", ")}.`}
            defaultOpen
          >
            <div className="mb-2 text-[13px] font-medium text-slate-700">
              Competitor Links (sample)
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[560px] w-full text-left">
                <thead className="sticky top-0 bg-slate-50 text-[12px] text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Competitor</th>
                    <th className="px-2 py-1.5">Link Type</th>
                    <th className="px-2 py-1.5">WR (link page)</th>
                    <th className="px-2 py-1.5">Link URL</th>
                    <th className="px-2 py-1.5">First Seen</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {data.competitorLinks!.map((r) => (
                    <tr key={r.competitor} className="border-t">
                      <td className="px-2 py-2 font-medium text-slate-800">{r.competitor}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-800">
                          {r.linkType}
                        </span>
                      </td>
                      <td className="px-2 py-2">{r.wrOfLinkingPage}</td>
                      <td className="px-2 py-2">
                        <a
                          href={`https://${r.competitor}${r.linkUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-[220px] truncate text-[var(--wr-brand)] underline hover:opacity-90 cursor-pointer"
                          title={r.linkUrl}
                        >
                          {r.linkUrl}
                        </a>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{r.firstSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReasonCard>
        )}

        {/* Niche Match — (no content changes requested) */}
        {showNiche && (
          <ReasonCard
            color="violet"
            icon={<IconTag className="h-5 w-5" />}
            title="Niche Match"
            detail={`Matches project category: ${data.category.join(" → ")}`}
          >
            <div className="text-[13px]">
              <div className="mb-2 font-medium text-slate-700">Category</div>
              <div className="flex flex-wrap gap-2">
                {data.category.map((c, i) => (
                  <button
                    key={c}
                    className="cursor-pointer rounded-full border border-violet-200 bg-white px-3 py-1 text-xs text-violet-700 hover:bg-violet-50"
                    title={`Filter by ${c}`}
                    onClick={(e) => e.preventDefault()}
                  >
                    {c}
                    {i < data.category.length - 1 ? " →" : ""}
                  </button>
                ))}
              </div>
            </div>
          </ReasonCard>
        )}

        {/* Trending Domain — add SmartPopover on sparkline points */}
        {showTrending && (
          <ReasonCard
            color="emerald"
            icon={<IconArea className="h-5 w-5 text-[var(--wr-brand)]" />}
            title="Trending Domain"
            detail={`~${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}% traffic growth over the last 3 months.`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[13px] font-medium text-slate-700">
                  6‑month sparkline
                </div>
                <Sparkline
                  labels={data.trendingTraffic!.map((m) => m.month)}
                  values={data.trendingTraffic!.map((m) => m.total)}
                />
                <div className="mt-1 flex gap-3 text-[11px] text-slate-500">
                  {data.trendingTraffic!.map((m) => (
                    <span key={m.month}>{m.month}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[13px] font-medium text-slate-700">
                  Top GEO share shift
                </div>
                <ul className="space-y-1 text-[13px]">
                  {geoShift.slice(0, 4).map((g, i) => (
                    <li key={g.code} className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5 rounded-full",
                            ["bg-emerald-400","bg-sky-400","bg-indigo-400","bg-amber-400"][i % 4]
                          )}
                        />
                        <span>{g.code}</span>
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          g.diffPct >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {g.diffPct >= 0 ? "+" : ""}
                        {g.diffPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ReasonCard>
        )}

        {/* Best Value — add SmartPopover on bubbles */}
        {showBestValue && (
          <ReasonCard
            color="emerald"
            icon={<IconPriceTag className="h-5 w-5" />}
            title="Best Value"
            detail={`Price‑to‑WR ratio in top ${Math.max(1, percentile)}% of similar listings. Price ${usd(
              data.priceUsd
            )}, WR ${data.wrScore}.`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[13px] font-medium text-slate-700">
                  Price vs. WR scatter (current highlighted)
                </div>
                <ScatterMini
                  current={{ wr: data.wrScore, price: data.priceUsd, domain: data.domain }}
                  peers={data.bestValue!.comparables}
                  medianPrice={medianPrice}
                />
              </div>
              <div className="text-[13px]">
                <div className="mb-2 font-medium text-slate-700">Quick stats</div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-slate-500">Your price</dt>
                  <dd className="font-medium text-slate-800">{usd(data.priceUsd)}</dd>

                  <dt className="text-slate-500">Median (band)</dt>
                  <dd className="font-medium text-slate-800">{usd(medianPrice)}</dd>

                  <dt className="text-slate-500">WR Score</dt>
                  <dd className="font-medium text-slate-800">{data.wrScore}</dd>

                  <dt className="text-slate-500">Peers compared</dt>
                  <dd className="font-medium text-slate-800">
                    {data.bestValue!.comparables.length}
                  </dd>
                </dl>
                <p className="mt-2 text-[12px] text-slate-500">
                  Lower is better for Price/WR. Your ratio is competitive vs. peers.
                </p>
              </div>
            </div>
          </ReasonCard>
        )}

        {/* Low Risk — (no content changes requested) */}
        {showLowRisk && (
          <ReasonCard
            color="emerald"
            icon={<IconShield className="h-5 w-5" />}
            title="Low Risk"
            detail={`Spam score: ${data.spamScore} (category average ${data.lowRisk!.categoryAvgSpam}).`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="text-[13px]">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt className="text-slate-500">Referring domains</dt>
                  <dd className="font-medium text-slate-800">
                    {compact(data.lowRisk!.referringDomains)}
                  </dd>
                  <dt className="text-slate-500">% toxic</dt>
                  <dd className="font-medium text-slate-800">{data.lowRisk!.toxicPct}%</dd>
                  <dt className="text-slate-500">Anchor exact‑match</dt>
                  <dd className="font-medium text-slate-800">{data.lowRisk!.anchorExactPct}%</dd>
                </dl>
                <p className="mt-2 text-[12px] text-slate-500">
                  Healthy anchor diversity & low toxicity vs. category average.
                </p>
              </div>
              <div className="text-[13px]">
                <div className="mb-2 font-medium text-slate-700">Risk composition</div>
                <div className="space-y-2">
                  <BarPct label="Clean links" pct={100 - data.lowRisk!.toxicPct} good />
                  <BarPct label="Toxic links" pct={data.lowRisk!.toxicPct} />
                  <BarPct label="Exact‑match anchors" pct={data.lowRisk!.anchorExactPct} warn />
                </div>
              </div>
            </div>
          </ReasonCard>
        )}

        {/* Top PR Placement — (no content changes requested) */}
        {showPR && (
          <ReasonCard
            color="amber"
            icon={<IconNews className="h-5 w-5" />}
            title="Top PR Placement"
            detail="Domain is a media/publisher listing in Vefogix."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="text-[13px]">
                <div className="mb-1 font-medium text-slate-700">Publisher</div>
                <p className="text-slate-800">{data.prPlacement!.networkName}</p>
                <p className="text-[12px] text-slate-500">
                  Editorial acceptance rate & turnaround based on marketplace data.
                </p>
              </div>
              <div className="text-[13px]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <div className="text-slate-500">Monthly reach</div>
                    <div className="font-medium text-slate-800">
                      {compact(data.prPlacement!.monthlyReach)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Acceptance rate</div>
                    <div className="font-medium text-slate-800">
                      {data.prPlacement!.acceptanceRatePct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Avg. turnaround</div>
                    <div className="font-medium text-slate-800">
                      {data.prPlacement!.avgTurnaroundDays} days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ReasonCard>
        )}
      </div>
    </section>
  );
}
