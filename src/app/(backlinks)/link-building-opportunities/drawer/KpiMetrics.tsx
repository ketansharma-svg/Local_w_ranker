// src/components/LinkOpportunityKpiMetrics.tsx
// Drop‑in React + Tailwind TSX component (no external chart libs)
//
// Refinements implemented (this update):
// - Card 4 (Competitors Linked): bars use #0077ff; flat bottom + 6px rounded top
//   (no x‑axis labels; details shown on hover). Up to 7 competitors + "All others" if needed.
// - All cards: tooltip info icon placed right next to the card title.
//
// Previous refinements retained:
// - Card 1 (WR Score): mini *area* trend (last 6 months) with smart popover showing WR value
// - Title icons: relevant icons per section/card
//
// Notes:
// - Keep passing your own data; demo shows examples (wrTrend now 6 values)
// - Accessible: hover + keyboard focus
// - Brand: icons #008CCD, metric/bars #0077ff

import * as React from "react";

/* ------------------------------ Theme ------------------------------ */

const BRAND = {
  blue: "#008CCD", // for icons/brand strokes
  metric: "#0077ff", // main metric values + competitor bars
};

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/* ------------------------------ Types ------------------------------ */

type TrafficMonth = {
  month: string; // e.g., "Apr"
  total: number; // total visits
};

type CompetitorLink = {
  name: string;
  wr: number; // use NaN if "All others"
  links: number;
};

type DemoData = {
  wrScore: number;
  wrDeltaLabel: string;
  wrTrend: number[]; // exactly 6 points (last 6 months)
  matchScore: number; // 0..100
  matchBreakdown: { label: string; pct: number; color?: string }[];
  monthlyTraffic: TrafficMonth[]; // last 6 months
  competitorsLinkedCount: number;
  competitorsTop: CompetitorLink[]; // full list; component handles "All others"
};

/* ------------------------------ Demo Data ------------------------------ */

const demo: DemoData = {
  wrScore: 84,
  wrDeltaLabel: "Healthy profile",
  wrTrend: [79, 81, 83, 82, 85, 84], // last 6 months
  matchScore: 91,
  matchBreakdown: [
    { label: "WR Score", pct: 28, color: "#3B82F6" },
    { label: "Spam Score (inverse)", pct: 22, color: "#F59E0B" },
    { label: "Traffic Quality", pct: 18, color: "#10B981" },
    { label: "Price / WR Ratio", pct: 17, color: "#8B5CF6" },
    { label: "Competitor Match", pct: 15, color: "#EF4444" },
  ],
  monthlyTraffic: [
    { month: "Apr", total: 51500 },
    { month: "May", total: 54700 },
    { month: "Jun", total: 57200 },
    { month: "Jul", total: 59100 },
    { month: "Aug", total: 60400 },
    { month: "Sep", total: 58300 },
  ],
  competitorsLinkedCount: 10,
  competitorsTop: [
    { name: "seotoolsdaily.com", wr: 78, links: 18 },
    { name: "growthhackspro.io", wr: 81, links: 14 },
    { name: "rankmasterlab.net", wr: 73, links: 12 },
    { name: "marketinginsights.net", wr: 76, links: 10 },
    { name: "serpscout.ai", wr: 84, links: 9 },
    { name: "contentforge.app", wr: 69, links: 7 },
    { name: "startupdigestpro.com", wr: 71, links: 6 },
    { name: "backlinkbuddy.org", wr: 75, links: 5 },
    { name: "keywordpilot.dev", wr: 67, links: 3 },
  ],
};

/* ------------------------------ Icons (relevant per card) ------------------------------ */

const IconSectionMetrics: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="none" aria-hidden="true">
    <path d="M4 14v6m6-10v10m6-6v6m4-18H4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h16" stroke={BRAND.blue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconWR: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="none" aria-hidden="true">
    <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4Z" stroke={BRAND.blue} strokeWidth="1.6" />
    <path d="M8.5 12.5l2 2 5-5" stroke={BRAND.blue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMatch: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke={BRAND.blue} strokeWidth="1.6" />
    <circle cx="12" cy="12" r="4" stroke={BRAND.blue} strokeWidth="1.6" />
    <path d="M12 4V2m0 20v-2M20 12h2M2 12h2" stroke={BRAND.blue} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconTraffic: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="none" aria-hidden="true">
    <path d="M3 17l6-6 5 5 7-7" stroke={BRAND.blue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 9h6v6" stroke={BRAND.blue} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconCompetitors: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="none" aria-hidden="true">
    <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke={BRAND.blue} strokeWidth="1.6" />
    <path d="M10 10l4 4M10 6h4" stroke={BRAND.blue} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ------------------------------ Card Shell (tooltip next to title) ------------------------------ */

const Card: React.FC<{
  title: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleIcon?: React.ReactNode;
}> = ({ title, tooltip, children, className, titleIcon }) => {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {titleIcon}
          <span>{title}</span>
          {tooltip && (
            <div className="group relative inline-block">
              <button
                aria-label="More info"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                tabIndex={0}
                type="button"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <circle cx="12" cy="12" r="10" stroke={BRAND.blue} strokeWidth="1.5" />
                  <path d="M12 11v5" stroke={BRAND.blue} strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="8" r="1" fill={BRAND.blue} />
                </svg>
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-8 z-20 hidden w-[300px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-relaxed text-slate-600 shadow-lg group-focus-within:block group-hover:block"
              >
                {tooltip}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
};

/* ------------------------------ Card 1: WR Score ------------------------------ */

const SmallGauge: React.FC<{ value: number }> = ({ value }) => {
  const size = 44;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * C;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`WR score gauge ${value}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E7EEF6" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={BRAND.blue}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

/** Mini area trend specifically for WR (last 6 months) with smart popover */
const WRTrendArea: React.FC<{ values: number[] }> = ({ values }) => {
  const width = 136;
  const height = 72;
  const pad = 4;

  const series = values.slice(-6);
  const max = Math.max(...series, 100);
  const min = Math.min(...series, 0);
  const span = Math.max(1, max - min);
  const dx = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;

  const points = series.map((v, i) => {
    const x = pad + i * dx;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const areaPath =
    `M ${pad} ${height - pad} ` +
    points.map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
    ` L ${width - pad} ${height - pad} Z`;

  const [active, setActive] = React.useState<number | null>(null);

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="WR trend last 6 months">
        <defs>
          <linearGradient id="wrTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#wrTrendFill)" />
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={active === i ? 3 : 2} fill={active === i ? "#2563EB" : "#60A5FA"} />
            {/* Hover/focus hit area */}
            <rect
              x={i === 0 ? 0 : (points[i - 1][0] + x) / 2}
              y={0}
              width={
                i === 0
                  ? (x + (points[i + 1]?.[0] ?? width)) / 2
                  : i === points.length - 1
                  ? width - (points[i - 1][0] + x) / 2
                  : (points[i + 1][0] - points[i - 1][0]) / 2
              }
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              aria-label={`WR ${series[i]}`}
            />
          </g>
        ))}
      </svg>

      {/* Smart popover anchored to the active point */}
      {active != null && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-700 shadow-lg"
          style={{ left: points[active][0], top: points[active][1] - 6 }}
        >
          <span className="font-semibold text-slate-900">WR</span> {series[active]}
        </div>
      )}
    </div>
  );
};

const WRScoreCard: React.FC<{ score: number; deltaLabel: string; trend: number[] }> = ({
  score,
  deltaLabel,
  trend,
}) => {
  return (
    <Card
      title="WR Score"
      titleIcon={<IconWR />}
      tooltip={
        <div>
          <div className="mb-1 font-semibold text-slate-800">Wranker Reputation Score</div>
          <p>(0–100) based on trust, authority & anchor quality.</p>
        </div>
      }
      className="h-full"
    >
      <div className="flex items-start justify-between">
        {/* Left: gauge + value */}
        <div className="flex flex-1 items-center gap-3">
          <SmallGauge value={score} />
          <div>
            <div className="mt-[2px] leading-tight text-3xl font-semibold" style={{ color: BRAND.metric }}>
              {score}
            </div>
            <div className="mt-1 text-xs text-slate-500">{deltaLabel}</div>
          </div>
        </div>

        {/* Right: 6‑month mini area trend with popover */}
        <WRTrendArea values={trend} />
      </div>
    </Card>
  );
};

/* ------------------------------ Card 2: Match Score (Stacked Donut) ------------------------------ */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    startOuter.x,
    startOuter.y,
    "A",
    rOuter,
    rOuter,
    0,
    largeArc,
    0,
    endOuter.x,
    endOuter.y,
    "L",
    endInner.x,
    endInner.y,
    "A",
    rInner,
    rInner,
    0,
    largeArc,
    1,
    startInner.x,
    startInner.y,
    "Z",
  ].join(" ");
}

const MatchScoreCard: React.FC<{
  score: number;
  breakdown: { label: string; pct: number; color?: string }[];
}> = ({ score, breakdown }) => {
  const total = breakdown.reduce((s, d) => s + d.pct, 0) || 1;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 54;
  const rInner = 34;
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  let angle = 0;
  const slices = breakdown.map((d, i) => {
    const sweep = (d.pct / total) * 360;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle += sweep;
    return { startAngle, endAngle, d, i };
  });

  return (
    <Card
      title="Match Score"
      titleIcon={<IconMatch />}
      tooltip={
        <div>
          <div className="mb-1 font-semibold text-slate-800">Opportunity Match Score</div>
          <p className="mb-2 text-[13px]">Weighted by the following components.</p>
          <ul className="space-y-1 text-[13px]">
            {breakdown.map((b, i) => (
              <li
                key={b.label}
                className={cn(
                  "flex items-center justify-between rounded px-1",
                  hoverIdx === i ? "bg-slate-50" : ""
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: b.color || "#CBD5E1" }}
                  />
                  <span className="text-slate-600">{b.label}</span>
                </span>
                <span className="font-medium text-slate-800">{b.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      }
      className="h-full"
    >
      <div className="flex items-start justify-between">
        {/* Left metric copy */}
        <div className="flex-1">
          <div className="mt-1 leading-tight text-3xl font-semibold" style={{ color: BRAND.metric }}>
            {score}
          </div>
          <div className="mt-2 text-xs text-slate-500">Score out of 100</div>
        </div>

        {/* Right stacked donut with animation + smart popover */}
        <div className="relative mt-1 h-[120px] w-[160px]">
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <svg width={size} height={size} role="img" aria-label="Match score breakdown donut">
              {/* Track */}
              <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} stroke="#EEF2F8" strokeWidth={rOuter - rInner} fill="none" />
              {/* Slices */}
              {slices.map(({ startAngle, endAngle, d, i }) => {
                const active = hoverIdx === i;
                const path = donutSlicePath(
                  cx,
                  cy,
                  active ? rOuter + 3 : rOuter,
                  rInner,
                  startAngle,
                  endAngle
                );
                return (
                  <path
                    key={i}
                    d={path}
                    fill={d.color || "#A5B4FC"}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      active ? "drop-shadow-sm" : ""
                    )}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                    tabIndex={0}
                  />
                );
              })}
              {/* Center label */}
              <g>
                <text x={cx} y={cy - 2} textAnchor="middle" className="fill-slate-900 text-[14px] font-semibold">
                  {score}
                </text>
                <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500 text-[11px]">
                  Match
                </text>
              </g>
            </svg>
          </div>

          {/* Smart popover anchored within donut area */}
          {hoverIdx != null && (
            <div className="absolute right-[132px] top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-3 text-[12.5px] text-slate-700 shadow-lg">
              <div className="mb-1 text-[13px] font-semibold text-slate-900">Breakdown</div>
              <ul className="space-y-1">
                {breakdown.map((b, i) => (
                  <li
                    key={b.label}
                    className={cn(
                      "flex items-center justify-between rounded px-1",
                      hoverIdx === i ? "bg-slate-50" : ""
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: b.color || "#CBD5E1" }}
                      />
                      <span className={cn("text-slate-600", hoverIdx === i && "font-medium text-slate-800")}>
                        {b.label}
                      </span>
                    </span>
                    <span className={cn("text-slate-800", hoverIdx === i && "font-semibold")}>{b.pct}%</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-[11.5px] text-slate-500">Hover slices to highlight & animate.</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------ Card 3: Monthly Traffic (Mini Area) ------------------------------ */

const AreaSparkline: React.FC<{
  data: number[];
  width: number;
  height: number;
  onHover: (idx: number | null) => void;
  activeIdx: number | null;
}> = ({ data, width, height, onHover, activeIdx }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pad = 4;
  const w = width;
  const h = height;
  const dx = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = pad + i * dx;
    const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y] as const;
  });

  const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");

  const areaPath =
    `M ${pad} ${h - pad} ` +
    points.map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
    ` L ${w - pad} ${h - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label="Traffic trend last 6 months"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="trafficFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trafficFill)" />
      <path d={path} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={activeIdx === i ? 3 : 2} fill={activeIdx === i ? "#2563EB" : "#60A5FA"} />
          {/* Hover/focus hit area */}
          <rect
            x={i === 0 ? 0 : (points[i - 1][0] + x) / 2}
            y={0}
            width={
              i === 0
                ? (x + (points[i + 1]?.[0] ?? w)) / 2
                : i === points.length - 1
                ? w - (points[i - 1][0] + x) / 2
                : (points[i + 1][0] - points[i - 1][0]) / 2
            }
            height={h}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(i)}
            onBlur={() => onHover(null)}
            tabIndex={0}
          />
        </g>
      ))}
    </svg>
  );
};

const TrafficCard: React.FC<{ months: TrafficMonth[] }> = ({ months }) => {
  const latest = months[months.length - 1]?.total ?? 0;
  const series = months.map((m) => m.total);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  return (
    <Card
      title="Monthly Traffic"
      titleIcon={<IconTraffic />}
      tooltip={<p className="text-[13px]">Estimated visits over the last 6 months. Hover the sparkline for exact values.</p>}
      className="h-full"
    >
      <div className="flex items-start justify-between">
        {/* Left metric */}
        <div className="flex-1">
          <div className="mt-1 leading-tight text-3xl font-semibold" style={{ color: BRAND.metric }}>
            {formatCompact(latest)}
          </div>
          <div className="mt-2 text-xs text-slate-500">Last 6 months</div>
        </div>

        {/* Right mini area sparkline with smart popover */}
        <div className="relative mt-6">
          <AreaSparkline data={series} width={136} height={68} onHover={setActiveIdx} activeIdx={activeIdx} />
          {activeIdx != null && (
            <div className="absolute right-0 top-0 -translate-y-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-700 shadow-lg">
              <div className="text-[12px] font-semibold text-slate-900">
                {months[activeIdx].month}: {formatCompact(months[activeIdx].total)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------ Card 4: Competitors Linked (Bars + All others) ------------------------------ */

const CompetitorsLinkedCard: React.FC<{ count: number; top: CompetitorLink[] }> = ({ count, top }) => {
  // Sort by links desc
  const sorted = [...top].sort((a, b) => b.links - a.links);

  // Up to 7 competitors; if more, add an extra "All others" bar (8th)
  type Bar = CompetitorLink & { isOthers?: boolean };
  let bars: Bar[] = sorted.slice(0, 7);
  if (sorted.length > 7) {
    const remaining = sorted.slice(7);
    const othersLinks = remaining.reduce((s, r) => s + r.links, 0);
    bars = [...bars, { name: "All others", wr: Number.NaN, links: othersLinks, isOthers: true }];
  }

  const maxLinks = Math.max(...bars.map((t) => t.links), 1);
  const [hover, setHover] = React.useState<number | null>(null);

  return (
    <Card
      title="Competitors Linked"
      titleIcon={<IconCompetitors />}
      tooltip={
        <div className="text-[13px]">
          <p className="mb-2">
            Vertical bars show the number of links to each competitor <em>from the suggested domain</em>. If there are
            more than 7 competitors, the remainder is represented by <strong>All others</strong>. Hover any bar for the
            domain name, links, and WR.
          </p>
        </div>
      }
      className="h-full"
    >
      <div className="flex items-start justify-between">
        {/* Left metric */}
        <div className="flex-1">
          <div className="mt-1 leading-tight text-3xl font-semibold" style={{ color: BRAND.metric }}>
            {count}
          </div>
          <div className="mt-2 text-xs text-slate-500">Linked competitors</div>
        </div>

        {/* Right: vertical bars (brand blue, flat bottom + rounded 6px top) */}
        <div className="mt-2 h-[90px] w-[120px]">
          <div className="relative flex h-full items-end justify-between gap-2">
            {bars.map((c, i) => {
              const hPercent = Math.max(14, (c.links / maxLinks) * 100); // ensure visibility
              const active = hover === i;
              const isOthers = !!c.isOthers;

              return (
                <div
                  key={`${c.name}-${i}`}
                  className="group relative flex h-full w-[32px] cursor-pointer items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${isOthers ? "All others" : c.name}: ${c.links} links`}
                >
                  <div
                    className="w-full min-h-[8px] rounded-t-md rounded-b-none transition-[height,filter] duration-200 hover:brightness-110"
                    style={{ height: `${hPercent}%`, backgroundColor: BRAND.metric }}
                    aria-hidden="true"
                  />
                  {/* Smart popover: links + WR (— for All others) */}
                  {active && (
                    <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white p-3 text-[12px] text-slate-700 shadow-lg">
                      <div className="mb-1 text-[12px] font-semibold text-slate-900">
                        {isOthers ? "All others (aggregated)" : c.name}
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="text-slate-600">Links</span>
                        <span className="font-medium text-slate-800">{c.links}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-6">
                        <span className="text-slate-600">WR</span>
                        <span className="font-medium text-slate-800">{Number.isFinite(c.wr) ? c.wr : "—"}</span>
                      </div>
                    </div>
                  )}
                  {/* No x‑axis labels by design */}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------ Root Section ------------------------------ */

export default function LinkOpportunityKpiMetrics() {
  const data = demo;

  return (
    <section
      aria-labelledby="key-metrics"
      className="w-full mt-4"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-2">
        <h3 id="key-metrics" className="flex items-center gap-2 text-[18px] font-semibold text-slate-800">
          <IconSectionMetrics />
          <span>Key Metrics</span>
        </h3>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WRScoreCard score={data.wrScore} deltaLabel={data.wrDeltaLabel} trend={data.wrTrend} />
        <MatchScoreCard score={data.matchScore} breakdown={data.matchBreakdown} />
        <TrafficCard months={data.monthlyTraffic} />
        <CompetitorsLinkedCard count={data.competitorsLinkedCount} top={data.competitorsTop} />
      </div>
    </section>
  );
}
