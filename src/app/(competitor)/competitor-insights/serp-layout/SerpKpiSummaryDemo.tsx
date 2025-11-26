"use client"
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type SeriesPoint = { date: string; value: number };

export interface SerpKpiData {
  featureWinRate: { valuePct: number; competitorAvgPct: number; series: SeriesPoint[] };
  avgPositionVisual: { value: number; deltaVsPrev: number; series: SeriesPoint[] };
  lostSnippets: { count: number; topOwnerDomain?: string; breakdownByDomain: Record<string, number> };
  ctrShare: { yourSharePct: number; topCompetitorSharePct: number; series?: SeriesPoint[] };
}

/* Info tip chip */
const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex ml-1">
    <span className="peer inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-[10px] font-semibold text-sky-700">
      i
    </span>
    <span
      role="tooltip"
      className="invisible absolute z-20 mt-2 w-64 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg peer-hover:visible"
    >
      {text}
    </span>
  </span>
);

const CardShell: React.FC<React.PropsWithChildren<{ title: string; info?: string }>> = ({ title, info, children }) => (
  <div className="relative flex min-h-[152px] items-stretch justify-between rounded-xl border border-sky-100 bg-white p-4 shadow-sm hover:shadow-md">
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-1 flex items-center text-xs font-semibold uppercase tracking-wide text-slate-600">
        {title}
        {info && <InfoTip text={info} />}
      </div>
      {children}
    </div>
  </div>
);

export const DEMO_SERP_KPI_DATA: SerpKpiData = {
  featureWinRate: {
    valuePct: 34,
    competitorAvgPct: 51,
    series: [
      { date: "W1", value: 28 },
      { date: "W2", value: 32 },
      { date: "W3", value: 30 },
      { date: "W4", value: 34 },
    ],
  },
  avgPositionVisual: {
    value: 5.8,
    deltaVsPrev: 0.7,
    series: [
      { date: "W1", value: 5.1 },
      { date: "W2", value: 5.3 },
      { date: "W3", value: 5.6 },
      { date: "W4", value: 5.8 },
    ],
  },
  lostSnippets: {
    count: 12,
    topOwnerDomain: "comp1.com",
    breakdownByDomain: { "comp1.com": 7, "comp2.com": 4, "comp3.com": 1 },
  },
  ctrShare: {
    yourSharePct: 27,
    topCompetitorSharePct: 43,
    series: [
      { date: "W1", value: 23 },
      { date: "W2", value: 25 },
      { date: "W3", value: 26 },
      { date: "W4", value: 27 },
    ],
  },
};

/* CSV builder */
function buildSerpKpiCsv(data: SerpKpiData): string {
  const rows: (string | number)[][] = [
    ["Metric", "Value", "Compare/Notes"],
    ["SERP Feature Win Rate", `${data.featureWinRate.valuePct}%`, `vs avg competitor ${data.featureWinRate.competitorAvgPct}%`],
    ["Avg Position (Visual SERPs)", data.avgPositionVisual.value.toFixed(1), `${data.avgPositionVisual.deltaVsPrev > 0 ? "+" : ""}${data.avgPositionVisual.deltaVsPrev.toFixed(1)} vs prev`],
    ["Lost Snippets", data.lostSnippets.count, data.lostSnippets.topOwnerDomain ? `Most owned by ${data.lostSnippets.topOwnerDomain}` : ""],
    ["Visual CTR Share (Est.)", `${data.ctrShare.yourSharePct}%`, `Top competitor ${data.ctrShare.topCompetitorSharePct}%`],
  ];
  return rows.map((r) => r.join(",")).join("\n");
}

function exportSerpKpiCsv(filename: string, data: SerpKpiData) {
  const csv = buildSerpKpiCsv(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* Smart tooltip used across all charts */
const SmartTooltip: React.FC<any> = ({ active, label, payload, coordinate, viewBox }) => {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value as number;
  const containerWidth = viewBox?.width ?? 0;
  const isRightSide = (coordinate?.x ?? 0) < containerWidth / 2;
  const offsetX = isRightSide ? 12 : -12;
  const align = isRightSide ? "left" : "right";
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        transform: `translate(${(coordinate?.x ?? 0) + offsetX}px, ${(coordinate?.y ?? 0) - 24}px)`,
        whiteSpace: "nowrap",
      }}
    >
      <div
        className={`rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <div className="font-medium">Date: {label}</div>
        <div>Value: {typeof value === "number" ? value.toFixed(1) : value}</div>
      </div>
    </div>
  );
};

export const SerpKpiSummaryDemo: React.FC = () => {
  const data = DEMO_SERP_KPI_DATA;
  const barData = useMemo(() => Object.entries(data.lostSnippets.breakdownByDomain).map(([domain, value]) => ({ domain, value })), [data]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-slate-800">SERP Feature Performance Snapshot</div>
          <div className="text-xs text-slate-500">KPI Summary Cards</div>
        </div>
        <button
          onClick={() => exportSerpKpiCsv("serp-kpis.csv", data)}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export
          <svg className="ml-1 h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1 */}
        <CardShell title="⭐ SERP Feature Win Rate" info="Keywords where your domain appears with a rich feature.">
          <div className="flex justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{data.featureWinRate.valuePct}%</div>
              <div className="mt-1 text-xs text-slate-600">vs avg competitor ({data.featureWinRate.competitorAvgPct}%)</div>
            </div>
            <ResponsiveContainer width={100} height={72}>
              <AreaChart data={data.featureWinRate.series}>
                <defs>
                  <linearGradient id="kpiBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip content={<SmartTooltip />} cursor={false} />
                <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="url(#kpiBlue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Card 2 */}
        <CardShell title="📊 Avg. Position (Visual SERPs)" info="Average organic rank across keywords that trigger visual features.">
          <div className="flex justify-between">
            <div>
              <div className="text-2xl font-semibold text-rose-600">{data.avgPositionVisual.value.toFixed(1)}</div>
              <div className="mt-1 text-xs text-slate-600">vs last period</div>
            </div>
            <ResponsiveContainer width={100} height={72}>
              <BarChart data={data.avgPositionVisual.series}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip content={<SmartTooltip />} cursor={false} />
                <Bar dataKey="value" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Card 3 */}
        <CardShell title="🔥 Lost Snippet Opportunities" info="Keywords where a Featured Snippet exists but your domain does not own it.">
          <div className="flex justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{data.lostSnippets.count}</div>
              <div className="mt-1 text-xs text-slate-600">Most owned by {data.lostSnippets.topOwnerDomain}</div>
            </div>
            <ResponsiveContainer width={100} height={72}>
              <BarChart data={barData}>
                <XAxis dataKey="domain" hide />
                <YAxis hide />
                <Tooltip content={<SmartTooltip />} cursor={false} />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Card 4 */}
        <CardShell title="🎯 Visual CTR Share (Est.)" info="Estimated click share driven by visual features.">
          <div className="flex min-w-0 flex-1 items-start justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-semibold text-slate-900">{data.ctrShare.yourSharePct}%</div>
              <div className="mt-1 text-xs text-slate-600">vs top competitor {data.ctrShare.topCompetitorSharePct}%</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative h-2 w-36 overflow-hidden rounded bg-slate-100">
                  <div className="absolute left-0 top-0 h-2 bg-sky-500" style={{ width: `${Math.min(100, data.ctrShare.yourSharePct)}%` }} />
                </div>
                <div className="relative h-2 w-24 overflow-hidden rounded bg-slate-100">
                  <div className="absolute left-0 top-0 h-2 bg-slate-400" style={{ width: `${Math.min(100, data.ctrShare.topCompetitorSharePct)}%` }} />
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">You (left) • Top competitor (right)</div>
            </div>
            <div className="ml-3 w-36">
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart data={data.ctrShare.series ?? []}>
                  <defs>
                    <linearGradient id="kpiGray" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip content={<SmartTooltip />} cursor={false} />
                  <Area type="monotone" dataKey="value" stroke="#64748b" fill="url(#kpiGray)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardShell>
      </div>
    </div>
  );
};

export default SerpKpiSummaryDemo;
