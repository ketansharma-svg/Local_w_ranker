"use client";

import React from "react";
import { Info, Download } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { motion } from "framer-motion";
import { Tooltip, Popover, Button } from "antd";

/* ---------- helpers ---------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pct = (n: number, fd = 1) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n) +
  "%";

interface RankingData {
  id: string;
  keyword: string;
  volume: string | number;
  device: string;
  locationISO: string;
  rank: number;
  url: string;
  inTracker: boolean;
  competitors: any[];
  status: string;
}

interface Props {
  rankings: RankingData[];
  isLoading?: boolean;
  onKpiFilter?: (filters: { ranked?: boolean; tracked?: boolean }) => void;
}

/* ---------- card ---------- */
function KpiCard({
  title,
  value,
  info,
  helper,
  chart,
  index = 0,
}: {
  title: string;
  value: React.ReactNode;
  info?: React.ReactNode;
  helper?: React.ReactNode;
  chart: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.06 }}
      className="h-44  rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:-translate-y-px hover:shadow transition"
      role="group"
      aria-label={title}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-sm text-slate-600">{title}</div>
        {info && (
          <Popover content={info} placement="topRight">
            <Info size={16} className="text-slate-500" />
          </Popover>
        )}
      </div>
      <div className="mb-1.5 text-2xl font-bold text-blue-600">{value}</div>
      <div className="h-[60px]">{chart}</div>
      {helper && <div className="mt-1.5 text-xs text-slate-500">{helper}</div>}
    </motion.div>
  );
}

export default function RankCheckerKPIRow({
  rankings,
  isLoading = false,
  onKpiFilter,
}: Props) {
  const calc = () => {
    const rankedKeywords = rankings.filter(
      (r) => r.rank > 0 && r.rank <= 100
    );
    const checked = rankings.length;
    const ranked = rankedKeywords.length;
    const avgCurrent = ranked
      ? +(rankedKeywords.reduce((s, r) => s + r.rank, 0) / ranked).toFixed(1)
      : null;
    const best = ranked ? Math.min(...rankedKeywords.map((r) => r.rank)) : null;
    const worst = ranked ? Math.max(...rankedKeywords.map((r) => r.rank)) : null;

    // flat history placeholders (do not invent history)
    const series10 = Array.from({ length: 10 }, (_, i) => i + 1);
    const counts10 = series10.map(() => checked || 0);
    const coverage10 = series10.map(() =>
      ranked && checked ? +((ranked / checked) * 100).toFixed(1) : 0
    );
    const avgHistory = series10.map(() => avgCurrent);

    const newlyRanked = rankings.filter(
      (r) => !r.inTracker && r.rank > 0 && r.rank <= 100
    );
    const newly7 = {
      labels: Array.from({ length: 7 }, (_, i) => `D-${6 - i}`),
      counts: Array.from({ length: 7 }, () => 0).map((_, i, arr) =>
        i === arr.length - 1 ? newlyRanked.length : 0
      ),
    };

    return { checked, ranked, avgCurrent, best, worst, avgHistory, counts10, coverage10, newly7 };
  };

  const k = calc();

  const SectionHeader = () => (
    <div className="mb-3 flex items-center justify-between">
      <div className="text-base font-semibold text-slate-900">
        Rank Checker — KPI Summary
      </div>
      <Button type="default" icon={<Download size={16} />}>
        Export
      </Button>
    </div>
  );



  return (
    <div className="space-y-3">
      <SectionHeader />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* Checked */}
        <KpiCard
          index={0}
          title="Checked Keywords"
          info={<div>Total keywords checked in this batch.</div>}
          value={
            <Tooltip title="Total keywords checked in this batch">
              <span>{nf(k.checked)}</span>
            </Tooltip>
          }
          helper={
            k.checked
              ? `Ranked: ${nf(k.ranked)} (${pct((k.ranked / k.checked) * 100, 1)})`
              : "No keywords in this batch"
          }
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={k.counts10.map((v, i) => ({ run: i + 1, checked: v }))}>
                <Area
                  type="monotone"
                  dataKey="checked"
                  stroke="#1677ff"
                  fill="#e6f4ff"
                  strokeWidth={2}
                  dot={false}
                />
                <RTooltip
                  formatter={(value: any) => [nf(Number(value)), "Checked"]}
                  labelFormatter={(l) => `Run #${l}`}
                />
              </AreaChart>
            </ResponsiveContainer>
          }
        />

        {/* Coverage */}
        <KpiCard
          index={1}
          title="Ranked ≤ 100"
          info={<div>Keywords with a position from 1 to 100 in this batch.</div>}
          value={
            k.checked ? (
              <Tooltip title="Keywords ranked 1–100 / checked">
                <span>
                  {nf(k.ranked)} / {nf(k.checked)} ·{" "}
                  <span className="text-slate-500">
                    {pct((k.ranked / k.checked) * 100, 1)}
                  </span>
                </span>
              </Tooltip>
            ) : (
              "—"
            )
          }
          helper={
            k.ranked
              ? (() => {
                  const top3 = rankings.filter((r) => r.rank && r.rank <= 3).length;
                  const top10 = rankings.filter((r) => r.rank && r.rank <= 10).length;
                  const top20 = rankings.filter((r) => r.rank && r.rank <= 20).length;
                  return `Top 3: ${top3} · Top 10: ${top10} · Top 20: ${top20}`;
                })()
              : "No ranked keywords"
          }
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={k.coverage10.map((v, i) => ({ run: i + 1, coverage: v }))}>
                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="#1677ff"
                  fill="#e6f4ff"
                  strokeWidth={2}
                  dot={false}
                />
                <RTooltip
                  formatter={(value: any) => [pct(Number(value), 1), "Coverage"]}
                  labelFormatter={(l) => `Run #${l}`}
                />
              </AreaChart>
            </ResponsiveContainer>
          }
        />

        {/* Average position */}
        <KpiCard
          index={2}
          title="Average Position"
          info={<div>Average position across ranked rows only.</div>}
          value={
            k.avgCurrent != null ? (
              <Tooltip title="Average of ranks across ranked keywords only">
                <span>{k.avgCurrent}</span>
              </Tooltip>
            ) : (
              "—"
            )
          }
          helper={
            k.avgCurrent != null
              ? `Best: ${k.best ? `#${k.best}` : "—"} · Worst: ${k.worst ? `#${k.worst}` : "—"}`
              : "No ranked keywords"
          }
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={k.avgHistory.map((v, i) => ({ run: i + 1, avg: v }))}>
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke="#1677ff"
                  fill="#e6f4ff"
                  strokeWidth={2}
                  dot={false}
                />
                <RTooltip
                  formatter={(value: any) => [value == null ? "—" : value, "Avg position"]}
                  labelFormatter={(l) => `Run #${l}`}
                />
              </AreaChart>
            </ResponsiveContainer>
          }
        />

        {/* Newly ranked */}
        <KpiCard
          index={3}
          title="Newly Ranked vs Tracked"
          info={<div>Keywords ranking today but not yet added to your tracker.</div>}
          value={
            <Tooltip title="Keywords ranking today but not tracked">
              <span>{nf(k.newly7.counts.at(-1) || 0)}</span>
            </Tooltip>
          }
          helper={
            <Button
              type="link"
              size="small"
              aria-label="View newly ranked"
              className="p-0"
              onClick={() => onKpiFilter?.({ ranked: true, tracked: false })}
            >
              View newly ranked
            </Button>
          }
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={k.newly7.labels.map((d, i) => ({
                  day: d,
                  newly: k.newly7.counts[i],
                }))}
              >
                <CartesianGrid stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Bar dataKey="newly" radius={[4, 4, 0, 0]} fill="#1677ff" />
                <RTooltip
                  formatter={(value: any) => [`${nf(Number(value))} keywords`, "Newly ranked"]}
                  labelFormatter={(l) => (l === "D-0" ? "Today" : l.replace("D-", "Day -"))}
                />
              </BarChart>
            </ResponsiveContainer>
          }
        />
      </div>
    </div>
  );
}
