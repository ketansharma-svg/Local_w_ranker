import React, { useMemo, useState, useId } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Download, ChevronDown, Info } from "lucide-react";

/* ------------------------------------------------------------------
 * Tokens & helpers
 * -----------------------------------------------------------------*/

const TOKENS = {
  brandBlue: "#0077ff", // graphical blue (You)
  brandBlueSoft: "#cfe3ff",
  compGray: "#8A8F98", // competitor neutral
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  cardBg: "#ffffff",
};

// number formatter
const kFormat = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) < 1000) return `${n}`;
  const units = ["k", "M", "B"];
  let u = -1;
  let val = n;
  while (Math.abs(val) >= 1000 && u < units.length - 1) {
    val /= 1000;
    u++;
  }
  const str =
    Math.abs(val) >= 100 || Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1);
  return `${str}${units[u]}`;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

/* ------------------------------------------------------------------
 * Mock data (demo-ready)
 * -----------------------------------------------------------------*/

type Series1 = { date: string; value: number };
type Series2 = { date: string; you: number; comp: number };

type SharedKeywordsKpi = {
  projectDomain: string;
  competitors: string[];
  device: string;
  country: string;
  dateRange: string;

  // Card 1: Shared Keywords
  totalShared: number;
  youOutrank: number;
  competitorsOutrank: number;
  seriesShared: Series1[]; // daily shared keyword count

  // Card 2: Avg Rank Difference
  yourAvgRank: number;
  compAvgRank: number; // average of selected comps
  seriesAvgRank: Series2[]; // you vs comp over time

  // Card 3: SERP Feature coverage
  yourFeatureCount: number;
  compFeatureCount: number;
  featureBreakdown: { label: string; you: number; comp: number };
  seriesFeatureYou: Series1[];
  seriesFeatureComp: Series1[];

  // Card 4: Intent
  intents: {
    Informational: number;
    Commercial: number;
    Navigational: number;
    Transactional: number;
  };
};

function createMockSharedKpi(): SharedKeywordsKpi {
  const today = new Date();
  const days = 10;
  const mkDate = (i: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  };

  const seriesShared: Series1[] = Array.from({ length: days }).map((_, i) => ({
    date: mkDate(i),
    value: 1200 + Math.round(Math.sin(i / 2) * 80) + i * 6,
  }));

  const seriesAvgRank: Series2[] = Array.from({ length: days }).map((_, i) => ({
    date: mkDate(i),
    you: 12.3 - Math.sin(i / 2.8) * 0.7,
    comp: 9.1 + Math.cos(i / 2.6) * 0.6,
  }));

  const seriesFeatureYou: Series1[] = Array.from({ length: days }).map((_, i) => ({
    date: mkDate(i),
    value: 30 + Math.round(Math.sin(i / 1.6) * 4),
  }));

  const seriesFeatureComp: Series1[] = Array.from({ length: days }).map((_, i) => ({
    date: mkDate(i),
    value: 80 + Math.round(Math.cos(i / 1.9) * 6),
  }));

  const intents = {
    Informational: 58,
    Commercial: 24,
    Navigational: 10,
    Transactional: 8,
  };

  return {
    projectDomain: "wranker.com",
    competitors: ["competitor1.com", "competitor2.com"],
    device: "Desktop",
    country: "US",
    dateRange: "Last 30 days",

    totalShared: 1346,
    youOutrank: 312,
    competitorsOutrank: 789,
    seriesShared,

    yourAvgRank: 12.3,
    compAvgRank: 9.1,
    seriesAvgRank,

    yourFeatureCount: 38,
    compFeatureCount: 97,
    featureBreakdown: { label: "Snippets & Videos", you: 8 + 12, comp: 15 + 10 },
    seriesFeatureYou,
    seriesFeatureComp,

    intents,
  };
}

/* ------------------------------------------------------------------
 * Section Header with Export
 * -----------------------------------------------------------------*/

function ExportMenu({ onExport }: { onExport?: (t: "csv" | "pdf" | "link") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
        style={{ borderColor: TOKENS.border, color: TOKENS.text, background: "#fff" }}
      >
        <Download size={16} />
        Export
        <ChevronDown size={14} className="ml-0.5" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          {(["csv", "pdf", "link"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onExport?.(k);
              }}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  onExport,
}: {
  title: string;
  onExport?: (t: "csv" | "pdf" | "link") => void;
}) {
  return (
    <div
      className="mb-3 flex items-center justify-between border-b pb-2"
      style={{ borderColor: TOKENS.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: TOKENS.text }}>
        {title}
      </h2>
      <ExportMenu onExport={onExport} />
    </div>
  );
}

/* ------------------------------------------------------------------
 * Tooltips & Micro charts
 * -----------------------------------------------------------------*/

function SmartTooltip({
  active,
  payload,
  label,
  labelPrefix = "Date",
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  labelPrefix?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded border bg-white px-2 py-1 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      {typeof label === "string" && <div className="mb-1 font-medium">{`${labelPrefix}: ${fmtDate(label)}`}</div>}
      {payload.map((p, i) => {
        const color = p.color || TOKENS.brandBlue;
        const name = p.name || "Value";
        const val =
          typeof p.value === "number"
            ? p.value % 1 === 0
              ? p.value
              : Number(p.value).toFixed(1)
            : p.value;
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            <span>{name}: </span>
            <span className="font-medium">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniArea({
  data,
  dataKey = "value",
  stroke = TOKENS.brandBlue,
  ariaLabel,
  grid = false,
  name = "You",
}: {
  data: any[];
  dataKey?: string;
  stroke?: string;
  ariaLabel: string;
  grid?: boolean;
  name?: string;
}) {
  const gid = useId().replace(/:/g, "_");
  return (
    <div className="h-16 w-full pr-0.5" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad_${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
              <stop offset="100%" stopColor={TOKENS.brandBlueSoft} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          {grid && <CartesianGrid vertical={false} stroke={TOKENS.border} />}
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            cursor={{ fill: "transparent" }}
            content={<SmartTooltip labelPrefix="Date" />}
          />
          <Area
            type="monotone"
            name={name}
            dataKey={dataKey}
            stroke={stroke}
            fill={`url(#grad_${gid})`}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBars({
  data,
  dataKey = "value",
  barColor = TOKENS.brandBlue,
  name = "You",
}: {
  data: any[];
  dataKey?: string;
  barColor?: string;
  name?: string;
}) {
  return (
    <div className="h-16 w-full pr-0.5" role="img" aria-label={`${name} small bars`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip cursor={{ fill: "transparent" }} content={<SmartTooltip />} />
          <Bar dataKey={dataKey} name={name} fill={barColor} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  data,
}: {
  active?: boolean;
  payload?: any[];
  data: { name: string; value: number }[];
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const pct = ((p.value / total) * 100).toFixed(1);
  return (
    <div
      className="rounded border bg-white px-2 py-1 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      <div className="font-medium">{p.name}</div>
      <div>
        {p.value} • {pct}%
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * KPI Card shell (value/delta left, chart right)
 * -----------------------------------------------------------------*/

function Tip({ text }: { text: string }) {
  const [o, setO] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setO(true)}
      onMouseLeave={() => setO(false)}
      onFocus={() => setO(true)}
      onBlur={() => setO(false)}
      tabIndex={0}
    >
      <Info size={16} color={TOKENS.muted} />
      {o && (
        <div
          className="absolute right-0 z-10 mt-2 max-w-[240px] rounded border bg-white px-2 py-1 text-xs shadow"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  title,
  tooltip,
  valueNode,
  subNode,
  chart,
}: {
  title: string;
  tooltip: string;
  valueNode: React.ReactNode;
  subNode?: React.ReactNode;
  chart: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[10px] border bg-white"
      style={{ borderColor: TOKENS.border }}
    >
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <div
            className="text-[13px] uppercase tracking-wide"
            style={{ color: TOKENS.muted }}
          >
            {title}
          </div>
          <Tip text={tooltip} />
        </div>

        <div className="mt-1 flex items-end gap-3">
          <div className="flex min-w-[150px] flex-col">
            <div className="text-[22px] font-semibold leading-6" style={{ color: TOKENS.text }}>
              {valueNode}
            </div>
            {subNode && (
              <div className="mt-1 text-[13px]" style={{ color: TOKENS.muted }}>
                {subNode}
              </div>
            )}
          </div>
          <div className="ml-auto w-[58%] sm:w-[62%] md:w-[66%] lg:w-[70%]">
            {chart}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Dominant Intent Card (legend left, donut right)
 * -----------------------------------------------------------------*/

const INTENT_COLORS: Record<string, string> = {
  Informational: "#2E90FA", // blue
  Commercial: "#12B76A", // green
  Navigational: "#F79009", // orange
  Transactional: "#7A5AF8", // purple
};

function DominantIntentCard({
  intents,
}: {
  intents: SharedKeywordsKpi["intents"];
}) {
  const data = Object.entries(intents).map(([name, value]) => ({ name, value }));
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div
      className="rounded-[10px] border bg-white"
      style={{ borderColor: TOKENS.border }}
    >
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <div
            className="text-[13px] uppercase tracking-wide"
            style={{ color: TOKENS.muted }}
          >
            Dominant Intent
          </div>
          <Tip text="Top intent split across shared keywords. Hover the donut to see exact values." />
        </div>

        <div className="mt-1 flex items-stretch gap-3">
          {/* Legend (left) */}
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: INTENT_COLORS[d.name] }}
                  />
                  <span className="text-sm" style={{ color: TOKENS.text }}>
                    {d.name}
                  </span>
                </div>
                <span className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  {d.value}%{/* show percentage value */}
                </span>
              </div>
            ))}
          </div>

          {/* Donut (right) */}
          <div className="ml-auto flex w-[56%] items-center justify-center">
            <div className="relative h-24 w-24">
              <ResponsiveContainer>
                <PieChart>
                  <RTooltip content={<DonutTooltip data={data} />} />
                  <Pie
                    data={data}
                    innerRadius={34}
                    outerRadius={48}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={INTENT_COLORS[entry.name]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {(() => {
                  const max = data.reduce((a, b) => (b.value > a.value ? b : a));
                  return `${max.name}`;
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Main: Shared Keywords KPI Cards
 * -----------------------------------------------------------------*/

export default function SharedKeywordsKpiCards({
  onExport,
}: {
  onExport?: (t: "csv" | "pdf" | "link") => void;
}) {
  const d = useMemo(() => createMockSharedKpi(), []);
  const compLabel =
    d.competitors && d.competitors.length ? d.competitors.join(", ") : "—";

  return (
    <section className="w-full rounded-[10px] border bg-white p-4" style={{ borderColor: TOKENS.border }}>
      {/* Section header (title left, export right) */}
      <SectionHeader title="Shared Keywords – KPI Summary" onExport={onExport} />

      {/* Context line (optional) */}
      <div className="mb-3 text-sm" style={{ color: TOKENS.muted }}>
        Project: <span className="font-medium text-[#282829]">{d.projectDomain}</span> •
        {" "}Comparing: <span className="font-medium text-[#282829]">{compLabel}</span> •{" "}
        {d.country} • {d.device}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Shared Keywords */}
        <KpiCard
          title="Shared Keywords"
          tooltip="Keywords where your project and ≥1 selected competitor both rank."
          valueNode={
            <span>
              Total: <span style={{ color: TOKENS.brandBlue }}>{kFormat(d.totalShared)}</span>
            </span>
          }
          subNode={
            <div className="space-x-3">
              <span>
                You outrank:{" "}
                <span style={{ color: TOKENS.brandBlue }}>{kFormat(d.youOutrank)}</span>
              </span>
              <span>Competitors outrank: {kFormat(d.competitorsOutrank)}</span>
            </div>
          }
          chart={<MiniBars data={d.seriesShared} name="Shared keywords/day" />}
        />

        {/* Card 2: Avg. Rank Difference */}
        <KpiCard
          title="Avg. Rank Position"
          tooltip="Average Google rank across shared keywords (lower is better)."
          valueNode={
            <span>
              You: <span style={{ color: TOKENS.brandBlue }}>#{d.yourAvgRank.toFixed(1)}</span>
            </span>
          }
          subNode={
            <>
              <div>Competitors: #{d.compAvgRank.toFixed(1)}</div>
              <div>
                Gap:{" "}
                <span style={{ color: d.yourAvgRank - d.compAvgRank <= 0 ? "#12B76A" : "#E94134" }}>
                  {(d.yourAvgRank - d.compAvgRank).toFixed(1)} positions
                </span>
              </div>
            </>
          }
          chart={
            <div className="h-16 w-full pr-0.5" role="img" aria-label="Avg rank trend">
              <ResponsiveContainer>
                <AreaChart data={d.seriesAvgRank} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="youAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TOKENS.brandBlue} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={TOKENS.brandBlueSoft} stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <RTooltip content={<SmartTooltip labelPrefix="Date" />} />
                  <Area
                    type="monotone"
                    name="You"
                    dataKey="you"
                    stroke={TOKENS.brandBlue}
                    fill="url(#youAvg)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  {/* Competitor line (neutral color), no fill */}
                  <Area
                    type="monotone"
                    name="Competitors"
                    dataKey="comp"
                    stroke={TOKENS.compGray}
                    fillOpacity={0}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          }
        />

        {/* Card 3: SERP Feature Coverage */}
        <KpiCard
          title="SERP Feature Coverage"
          tooltip="# of shared keywords where SERP features appear (snippets, images, video, sitelinks, etc.)."
          valueNode={
            <span>
              You: <span style={{ color: TOKENS.brandBlue }}>{d.yourFeatureCount}</span>
            </span>
          }
          subNode={
            <>
              <div>Competitors: {d.compFeatureCount}</div>
              <div>
                {d.featureBreakdown.label}:{" "}
                <span style={{ color: TOKENS.brandBlue }}>{d.featureBreakdown.you}</span> you •{" "}
                {d.featureBreakdown.comp} comp
              </div>
            </>
          }
          chart={
            <div className="h-16 w-full pr-0.5">
              <ResponsiveContainer>
                <BarChart data={mergeSeries2Bars(d.seriesFeatureYou, d.seriesFeatureComp)}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <RTooltip content={<SmartTooltip />} />
                  <Bar dataKey="you" name="You" fill={TOKENS.brandBlue} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="comp" name="Competitors" fill={TOKENS.compGray} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        />

        {/* Card 4: Dominant Intent */}
        <DominantIntentCard intents={d.intents} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------*/

function mergeSeries2Bars(a: Series1[], b: Series1[]) {
  // merge by date for grouped bars
  const map = new Map<string, { date: string; you: number; comp: number }>();
  a.forEach((x) => map.set(x.date, { date: x.date, you: x.value, comp: 0 }));
  b.forEach((x) => {
    const m = map.get(x.date);
    if (m) m.comp = x.value;
    else map.set(x.date, { date: x.date, you: 0, comp: x.value });
  });
  return Array.from(map.values()).sort((x, y) =>
    x.date < y.date ? -1 : x.date > y.date ? 1 : 0
  );
}
