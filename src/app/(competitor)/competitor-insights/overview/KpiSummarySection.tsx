import React from "react";
import {
  Info, Download, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import {useState} from 'react';
import PageSpeedOptimizationDrawer from "./drawers/PageSpeedOptimization";
/* =========================================================================================
   Types
   ========================================================================================= */
type MetricId =
  | "seoScore"
  | "pageHealth"
  | "topKeywordCount"
  | "trafficPotential"
  | "refDomains"
  | "avgPageSpeed";

type DomainMap = Record<string, number>;

export type KpiSummaryPayload = {
  /** Your domain (project) — appears first in all cards */
  projectDomain: string;
  /** Selected competitors (order determines row order after project) */
  competitors: string[];
  /** Metric values by domain (project + competitors) */
  data: {
    seoScore: DomainMap;       // 0–100, higher is better
    pageHealth: DomainMap;     // 0–100, higher is better
    topKeywordCount: DomainMap;// absolute number, higher is better
    trafficPotential: DomainMap;// absolute number, higher is better
    refDomains: DomainMap;     // absolute number, higher is better
    avgPageSpeed: DomainMap;   // seconds, *lower is better*
  };
};

/* =========================================================================================
   Small utilities
   ========================================================================================= */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const kf = (n: number) => {
  const abs = Math.abs(n);
  if (abs < 1000) return `${n}`;
  if (abs < 1_000_000) return `${(n / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  if (abs < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Normalize a value to 0–100 for the donut progress (per metric) */
function normalizeForDonut(
  value: number,
  allValues: number[],
  orientation: "higher" | "lower"
) {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (max === min) return 100;
  if (orientation === "higher") {
    return clamp01((value - min) / (max - min)) * 100;
  }
  // lower is better
  return clamp01((max - value) / (max - min)) * 100;
}

/** Compare competitor vs project → delta indicator config */
function deltaVsProject(
  competitorValue: number,
  projectValue: number,
  orientation: "higher" | "lower"
) {
  if (competitorValue === projectValue) return { dir: "flat" as const, tone: "muted" as const };
  if (orientation === "higher") {
    const better = competitorValue > projectValue;
    return { dir: better ? ("up" as const) : ("down" as const), tone: better ? "good" : "bad" as const };
  }
  // lower is better
  const better = competitorValue < projectValue;
  return { dir: better ? ("up" as const) : ("down" as const), tone: better ? "good" : "bad" as const };
}

/** Fixed palette: project = brand blue; competitors = gray scale sequence */
function domainColor(domain: string, projectDomain: string, idxAmongCompetitors: number) {
  if (domain === projectDomain) return "#008CCD"; // brand blue
  const grayPalette = ["#6B7280", "#9CA3AF", "#94A3B8", "#D1D5DB", "#64748B", "#A8A29E"];
  return grayPalette[idxAmongCompetitors % grayPalette.length];
}

/* =========================================================================================
   Tiny primitives (Tip, Export, MiniDonut)
   ========================================================================================= */
function Tip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-1 hover:bg-gray-50"
        aria-label="Info"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={16} className="text-gray-500" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 max-w-xs rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-md"
          style={{ right: 0 }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function ExportMenu({ onExport }: { onExport?: (fmt: "csv" | "png") => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        className="inline-flex h-8 items-center gap-2 rounded-md border border-gray-200 bg-white px-2 text-sm hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
      >
        <Download size={16} /> Export <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onExport?.("csv");
            }}
          >
            CSV (Summary)
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onExport?.("png");
            }}
          >
            PNG (Cards)
          </button>
        </div>
      )}
    </div>
  );
}

/** Simple SVG donut for the project row */
function MiniDonut({
  pct,
  size = 18,
  color = "#008CCD",
}: {
  pct: number; // 0–100
  size?: number;
  color?: string;
}) {
  const radius = 16;
  const C = 2 * Math.PI * radius;
  const dash = (pct / 100) * C;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-label={`Status: ${pct.toFixed(0)}%`}
      className="shrink-0"
    >
      <circle cx="20" cy="20" r={radius} stroke="#E5E7EB" strokeWidth="6" fill="none" />
      <g transform="rotate(-90 20 20)">
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${C - dash}`}
        />
      </g>
    </svg>
  );
}

/* =========================================================================================
   Metric Card
   ========================================================================================= */
type Row = { domain: string; value: number; color: string; isProject: boolean };

function MetricCard({
  title,
  emoji,
  tooltip,
  rows,
  format,
  orientation = "higher",
  projectDomain,
  onViewDetails,
  footerNote,
}: {
  title: string;
  emoji: string;
  tooltip: string;
  rows: Row[];
  format: (v: number) => string;
  orientation?: "higher" | "lower";
  projectDomain: string;
  onViewDetails?: () => void;
  footerNote?: string;
}) {
  // prepare donut for the project row
  const allVals = rows.map((r) => r.value);
  const projectRow = rows.find((r) => r.isProject)!;
  const projectPct = normalizeForDonut(projectRow.value, allVals, orientation);

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#D2EFFF] bg-white p-4 shadow-sm transition hover:shadow">
      {/* title row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{emoji}</span>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            {title}
          </h4>
          <Tip text={tooltip} />
        </div>
      </div>

      {/* rows */}
      <div className="flex-1 space-y-2">
        {rows.map((r, idx) => {
          const isProject = r.isProject;
          const compIdx = isProject ? -1 : idx - 1; // index among competitors for color mapping
          const { dir, tone } = !isProject
            ? deltaVsProject(r.value, projectRow.value, orientation)
            : { dir: "flat" as const, tone: "muted" as const };

        const toneCls =
          tone === "good"
            ? "text-emerald-600"
            : tone === "bad"
            ? "text-rose-600"
            : "text-gray-400";

          return (
            <div
              key={r.domain}
              className="flex items-center justify-between rounded-md px-1 py-1 hover:bg-gray-50"
              title={r.domain}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: r.color }}
                />
                <span
                  className={`truncate text-[13px] ${
                    isProject ? "font-semibold text-gray-800" : "text-gray-700"
                  }`}
                >
                  {r.domain}
                </span>
              </div>

              <div className="ml-2 flex items-center gap-2">
                {/* status donut for project only */}
                {isProject && <MiniDonut pct={projectPct} size={16} color={r.color} />}
                <span className={`tabular-nums text-[13px] ${isProject ? "font-semibold text-gray-900" : "text-gray-800"}`}>
                  {format(r.value)}
                </span>

                {/* delta vs project for competitors only */}
                {!isProject && (
                  <span className={`inline-flex items-center gap-0.5 text-xs ${toneCls}`}>
                    {dir === "up" ? (
                      <ArrowUpRight size={14} />
                    ) : dir === "down" ? (
                      <ArrowDownRight size={14} />
                    ) : (
                      <Minus size={14} />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {footerNote ? <span>ⓘ {footerNote}</span> : <span>&nbsp;</span>}
        </div>
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs font-medium text-sky-700 hover:underline"
          >
            View Details →
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================================================
   Main Section: KPI Summary (6 cards, 3 per row)
   ========================================================================================= */
export function KpiSummarySection({
  payload,
  onExport,
  onOpen,
  className,
  title = "KPI Summary",
}: {
  payload: KpiSummaryPayload;
  onExport?: (fmt: "csv" | "png") => void;
  /** Optional per‑card open handlers */
  onOpen?: (metric: MetricId) => void;
  className?: string;
  title?: string;
}) {
  const { projectDomain, competitors, data } = payload;

  // helper to create sorted row list: project first, then competitors in given order
  const makeRows = (map: DomainMap): Row[] => {
    const order = [projectDomain, ...competitors.filter((c) => c in map)];
    return order.map((d, i) => ({
      domain: d,
      value: map[d],
      color: domainColor(d, projectDomain, i - 1),
      isProject: d === projectDomain,
    }));
  };

  // section header
  const comparingList = competitors.join(", ");

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }


  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm mt-2 ${className ?? ""}`}
      aria-label="Overview · KPI Summary"
    >
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <PageSpeedOptimizationDrawer   />
                    </Drawer>
                  )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-[16px] font-semibold text-gray-900">{title}</h3>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Currently Comparing:</span>{" "}
            {comparingList || "—"}
          </div>
        </div>
        <ExportMenu onExport={onExport} />
      </div>

      {/* 3-up responsive grid; fills width on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* 1) SEO Score */}
        <MetricCard
          title="SEO Score"
          emoji="🧠"
          tooltip="Composite: content, metadata, structure, internal linking & crawl health."
          rows={makeRows(data.seoScore)}
          format={(v) => `${Math.round(v)}`}
          orientation="higher"
          projectDomain={projectDomain}
          footerNote="Based on on‑page + technical factors."
          onViewDetails={() => onOpen?.("seoScore")}
        />

        {/* 2) Avg. Page Health */}
        <MetricCard
          title="Avg. Page Health Score"
          emoji="🩺"
          tooltip="Technical health & UX checks (0–100)."
          rows={makeRows(data.pageHealth)}
          format={(v) => `${Math.round(v)}`}
          orientation="higher"
          projectDomain={projectDomain}
          footerNote="From Site Audit panel."
          onViewDetails={() => onOpen?.("pageHealth")}
        />

        {/* 3) Top Keyword Count (Top 10) */}
        <MetricCard
          title="Top Keyword Count (Top 10)"
          emoji="🔑"
          tooltip="Number of keywords ranking in Top 10 positions."
          rows={makeRows(data.topKeywordCount)}
          format={(v) => kf(v)}
          orientation="higher"
          projectDomain={projectDomain}
          footerNote="Source: SE Ranking."
          onViewDetails={() => onOpen?.("topKeywordCount")}
        />

        {/* 4) Traffic Potential */}
        <MetricCard
          title="Traffic Potential"
          emoji="📈"
          tooltip="Estimated monthly organic traffic volume."
          rows={makeRows(data.trafficPotential)}
          format={(v) => kf(v)}
          orientation="higher"
          projectDomain={projectDomain}
          footerNote="Source: SE Ranking traffic model."
          onViewDetails={() => onOpen?.("trafficPotential")}
        />

        {/* 5) Top Referring Domains */}
        <MetricCard
          title="Top Referring Domains"
          emoji="🔗"
          tooltip="Count of unique high‑authority root domains linking."
          rows={makeRows(data.refDomains)}
          format={(v) => nf(v)}
          orientation="higher"
          projectDomain={projectDomain}
          footerNote="Source: SE Ranking."
          onViewDetails={() => onOpen?.("refDomains")}
        />

        {/* 6) Avg. Page Speed */}
        <MetricCard
          title="Avg. Page Speed"
          emoji="⚡"
          tooltip="Average load speed (seconds) across key landing pages."
          rows={makeRows(data.avgPageSpeed)}
          format={(v) => `${v.toFixed(1)}s`}
          orientation="lower"
          projectDomain={projectDomain}
          footerNote="Lower is better. Source: PageSpeed API."
          onViewDetails={openDrawer}
        />
      </div>

      {/* helper tip */}
      <div className="mt-4 text-xs text-gray-500">
        Tip: Each competitor’s arrow is shown relative to your project baseline.
      </div>
    </section>
  );
}

/* =========================================================================================
   Demo (remove in production)
   ========================================================================================= */
export default function DemoKpiSummarySection() {
  const mock: KpiSummaryPayload = {
    projectDomain: "wranker.com",
    competitors: ["competitor1.com", "competitor2.com", "competitor3.com"],
    data: {
      seoScore: {
        "wranker.com": 78,
        "competitor1.com": 83,
        "competitor2.com": 65,
        "competitor3.com": 74,
      },
      pageHealth: {
        "wranker.com": 81,
        "competitor1.com": 86,
        "competitor2.com": 72,
        "competitor3.com": 77,
      },
      topKeywordCount: {
        "wranker.com": 3400,
        "competitor1.com": 5200,
        "competitor2.com": 2800,
        "competitor3.com": 3100,
      },
      trafficPotential: {
        "wranker.com": 12500,
        "competitor1.com": 28900,
        "competitor2.com": 9700,
        "competitor3.com": 15100,
      },
      refDomains: {
        "wranker.com": 330,
        "competitor1.com": 620,
        "competitor2.com": 180,
        "competitor3.com": 290,
      },
      avgPageSpeed: {
        "wranker.com": 1.9,
        "competitor1.com": 1.2,
        "competitor2.com": 2.5,
        "competitor3.com": 1.7,
      },
    },
  };

  return (
          <KpiSummarySection
        payload={mock}
        onExport={(fmt) => console.log("Export →", fmt)}
        onOpen={(metric) => console.log("Open drilldown →", metric)}
      />
  );
}
