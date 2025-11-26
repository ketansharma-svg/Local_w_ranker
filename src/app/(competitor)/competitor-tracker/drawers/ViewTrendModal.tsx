"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X as CloseIcon,
  Info as InfoIcon,
  CalendarDays,
  LineChart,
  FilePlus2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Line,
  Area,
  Scatter,
} from "recharts";

/* ------------------------------ TOKENS ------------------------------ */
const TK = {
  brand: "#1090D0", // You
  valueBlue: "#0077FF", // Competitor
  text: "#282829",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  ok: "#16A34A",
  warn: "#F59E0B",
  danger: "#F04438",
  radius: 6,
} as const;

/* ------------------------------ TYPES ------------------------------- */
type PageTrendPoint = {
  dateISO: string;   // YYYY-MM-DD
  rank: number;      // 1..100 (lower is better)
  wordCount: number; // int
  fs: boolean;       // FS presence
};

type ViewTrendData = {
  pageUrl: string;             // '/seo-guide'
  competitorDomain: string;    // 'comp1.com'
  device?: "All" | "Desktop" | "Mobile";
  country?: string;            // 'US'
  range: "7d" | "30d" | "90d" | { from: string; to: string };
  series: PageTrendPoint[];
  youSeries?: Array<{ dateISO: string; rank: number }>; // Compare overlay
};

type RangeOpt = "Last 7 Days" | "Last 30 Days" | "Last 90 Days";

/* ---------------------------- FORMATTERS ---------------------------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const kfmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return nf(n);
};
const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

/* ----------------------------- HELPERS ------------------------------ */
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** Build FS marker type with gain/loss detection */
type FsMarker = { dateISO: string; rankY: number; kind: "gain" | "loss" | "present" };
function computeFsMarkers(points: PageTrendPoint[]): FsMarker[] {
  const out: FsMarker[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    if (!p) continue;
    if (p.fs) {
      let kind: FsMarker["kind"] = "present";
      if (prev && !prev.fs) kind = "gain";
      out.push({ dateISO: p.dateISO, rankY: p.rank, kind });
    } else if (prev && prev.fs && !p.fs) {
      // loss marker sits on current date at current rank (or previous?), choose current for clarity
      out.push({ dateISO: p.dateISO, rankY: p.rank, kind: "loss" });
    }
  }
  return out;
}

/** Build insight string heuristically */
function buildInsight(points: PageTrendPoint[]): string | null {
  if (!points.length) return null;
  // Check for FS change and word count change within ±2 days
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const wcDeltaPct = ((b.wordCount - a.wordCount) / Math.max(1, a.wordCount)) * 100;
    if (a.fs && !b.fs && wcDeltaPct <= -10) {
      return `Lost Featured Snippet on ${fmtDate(b.dateISO)} after ${Math.abs(
        wcDeltaPct
      ).toFixed(0)}% decrease in word count.`;
    }
    if (!a.fs && b.fs && wcDeltaPct >= 10) {
      return `Gained Featured Snippet on ${fmtDate(b.dateISO)} after ${wcDeltaPct
        .toFixed(0)
        .toString()}% increase in word count.`;
    }
  }
  // Rank uplift with content increase
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const rankImprovement = a.rank - b.rank; // positive = better
    const wcDeltaPct = ((b.wordCount - a.wordCount) / Math.max(1, a.wordCount)) * 100;
    if (rankImprovement >= 5 && wcDeltaPct >= 8) {
      return `Rank improved by ${rankImprovement} positions after content grew ~${wcDeltaPct.toFixed(
        0
      )}%.`;
    }
  }
  return null;
}

/** Merge competitor & you lines into common dataset keyed by date */
function mergeSeries(
  series: PageTrendPoint[],
  you?: Array<{ dateISO: string; rank: number }>
) {
  const map = new Map<string, any>();
  series.forEach((p) =>
    map.set(p.dateISO, {
      dateISO: p.dateISO,
      rank: p.rank,
      wordCount: p.wordCount,
      fs: p.fs,
    })
  );
  (you ?? []).forEach((y) => {
    const row = map.get(y.dateISO) || { dateISO: y.dateISO };
    row.youRank = y.rank;
    map.set(y.dateISO, row);
  });
  return Array.from(map.values()).sort((a, b) =>
    a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0
  );
}

/* --------------------------- CUSTOM SHAPES --------------------------- */
/** FS marker dot with ring on gain/loss */
const FsDot: React.FC<any> = (props) => {
  const { cx, cy, payload } = props;
  const kind = payload.fsKind as FsMarker["kind"];
  const fill = TK.warn; // orange base
  const r = 4;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#fff" strokeWidth={1} />
      {kind === "gain" && (
        <circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke={TK.ok} strokeWidth={1.5} />
      )}
      {kind === "loss" && (
        <circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke={TK.danger} strokeWidth={1.5} />
      )}
    </g>
  );
};

/* ---------------------------- TOOLTIP UI ----------------------------- */
const LegendDot: React.FC<{ color: string; label: string; value?: string }> = ({
  color,
  label,
  value,
}) => (
  <div className="flex items-center gap-2">
    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    <span className="text-[12px]" style={{ color: TK.text }}>
      {label}
    </span>
    {value && (
      <span className="ml-1 tabular-nums text-[12px]" style={{ color: TK.text }}>
        {value}
      </span>
    )}
  </div>
);

const TrendTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  rows: any[];
}> = ({ active, payload, label, rows }) => {
  if (!active || !payload || !payload.length) return null;
  // payload[0].payload has full row
  const row = payload[0].payload as any;
  // find previous for deltas
  const idx = rows.findIndex((r) => r.dateISO === row.dateISO);
  const prev = idx > 0 ? rows[idx - 1] : null;

  const rankDelta = prev ? prev.rank - row.rank : 0; // + = improved
  const wcDelta = prev ? row.wordCount - prev.wordCount : 0;

  const rankDeltaStr =
    prev != null
      ? `${rankDelta > 0 ? "▲" : rankDelta < 0 ? "▼" : "—"} ${Math.abs(rankDelta)}`
      : "—";
  const wcDeltaStr =
    prev != null
      ? `${wcDelta > 0 ? "+" : wcDelta < 0 ? "−" : ""}${nf(Math.abs(wcDelta))}`
      : "—";

  const fsStr = row.fs ? "Yes" : "No";

  return (
    <div
      className="rounded-md border bg-white p-2 shadow"
      style={{ borderColor: TK.border, minWidth: 220 }}
    >
      <div className="mb-1 text-[12px]" style={{ color: TK.muted }}>
        {fmtDate(row.dateISO)}
      </div>
      <div className="flex flex-col gap-1">
        <LegendDot
          color={TK.valueBlue}
          label="Rank"
          value={`#${nf(row.rank)} (${rankDeltaStr})`}
        />
        <LegendDot
          color={TK.ok}
          label="Word Count"
          value={`${nf(row.wordCount)} (${wcDeltaStr})`}
        />
        <div className="text-[12px]" style={{ color: TK.text }}>
          FS: <b>{fsStr}</b>
        </div>
        {typeof row.youRank === "number" && (
          <LegendDot color={TK.brand} label="You (rank)" value={`#${nf(row.youRank)}`} />
        )}
      </div>
      <div className="mt-2">
        <button
          className="rounded border px-2 py-1 text-[11px] hover:bg-gray-50"
          style={{ borderColor: TK.border, color: TK.text }}
          onClick={() => alert("Open Page Snapshot")}
        >
          Open Page Snapshot
        </button>
      </div>
    </div>
  );
};

/* ---------------------------- MAIN MODAL ----------------------------- */
export function ViewTrendModal({
  open,
  onClose,
  data,
  compareOn = false,
  onCreateTask,
}: {
  open: boolean;
  onClose: () => void;
  data: ViewTrendData;
  compareOn?: boolean;
  onCreateTask?: (ctx: { pageUrl: string; range: RangeOpt; insight?: string }) => void;
}) {
  const [showRank, setShowRank] = useState(true);
  const [showWc, setShowWc] = useState(true);
  const [showFs, setShowFs] = useState(true);
  const [range, setRange] = useState<RangeOpt>("Last 30 Days");

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstCtlRef = useRef<HTMLInputElement | null>(null);
  const sliceCount = range === "Last 7 Days" ? 7 : range === "Last 90 Days" ? 90 : 30;
  const seriesSliced = data.series.slice(-sliceCount);
  const youSliced = (data.youSeries ?? []).slice(-sliceCount);

    const fsMarkers = useMemo(() => computeFsMarkers(seriesSliced), [seriesSliced]);
  const mergedRows = useMemo(
    () => mergeSeries(seriesSliced, compareOn ? youSliced : undefined),
    [seriesSliced, youSliced, compareOn]
  );

  const insight = useMemo(() => buildInsight(seriesSliced), [seriesSliced]);
  useEffect(() => {
    if (open) {
      // focus first control
      setTimeout(() => firstCtlRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Range slicing


  // FS markers mapped into scatter data rows
  const fsScatter = fsMarkers.map((m) => ({
    dateISO: m.dateISO,
    fsKind: m.kind,
    y: m.rankY,
  }));

  // Chart height & margins
  const chartH = 340;
  const margin = { top: 10, right: 16, bottom: 4, left: 6 };

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vtm-title"
        className="absolute left-1/2 top-6 w-[600px] -translate-x-1/2 rounded-md bg-white shadow-lg max-w-[95vw]"
        style={{ borderRadius: TK.radius }}
        ref={dialogRef}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between border-b px-4 py-3"
          style={{ borderColor: TK.border }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LineChart size={18} className="text-[#4B5563]" />
              <h3 id="vtm-title" className="truncate text-[16px] font-semibold" style={{ color: TK.text }}>
                Page Activity Trends — <span className="font-normal">{truncateMiddle(data.pageUrl, 42)}</span>
              </h3>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: TK.muted }}>
              <span>Competitor: {data.competitorDomain}</span>
              {data.device && <Chip label={`Device: ${data.device}`} />}
              {data.country && <Chip label={`Country: ${data.country}`} />}
              <InfoHover text="Rank axis is inverted (1 at top). Word Count shown as soft area. FS markers show gains/losses." />
            </div>
          </div>
          <button
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-gray-100"
            onClick={onClose}
            title="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip
              inputRef={firstCtlRef}
              label="Rank"
              checked={showRank}
              colorDot={TK.valueBlue}
              onChange={setShowRank}
            />
            <ToggleChip label="Word Count" checked={showWc} colorDot={TK.ok} onChange={setShowWc} />
            <ToggleChip label="SERP FS" checked={showFs} colorDot={TK.warn} onChange={setShowFs} />
            <LegendPills compareOn={compareOn} />
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm" style={{ borderColor: TK.border }}>
              <CalendarDays size={14} className="text-[#9CA3AF]" />
              <select
                className="outline-none"
                value={range}
                onChange={(e) => setRange(e.target.value as RangeOpt)}
              >
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-3 pb-2">
          <div
            className="h-[340px] w-full overflow-hidden"
            style={{
              borderRadius: `${TK.radius}px ${TK.radius}px 0 0`, // top corners only
            }}
          >
            <ResponsiveContainer>
              <ComposedChart data={mergedRows} margin={margin}>
                <CartesianGrid vertical={false} stroke={TK.border} />
                <XAxis
                  dataKey="dateISO"
                  tickFormatter={(v) => fmtDate(v as string)}
                  tick={{ fontSize: 12, fill: TK.muted }}
                />
                {/* Left Y (Rank) inverted */}
                <YAxis
                  yAxisId="rank"
                  domain={[100, 1]}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: TK.muted }}
                  tickCount={5}
                />
                {/* Right Y (Word Count) */}
                <YAxis
                  yAxisId="wc"
                  orientation="right"
                  tick={{ fontSize: 12, fill: TK.muted }}
                  tickFormatter={(v) => kfmt(v as number)}
                />
                <RTooltip
                  cursor={{ stroke: TK.valueBlue, strokeDasharray: "3 3", strokeOpacity: 0.25 }}
                  content={<TrendTooltip rows={mergedRows} />}
                />
                {/* Series */}
                {showWc && (
                  <Area
                    yAxisId="wc"
                    type="monotone"
                    dataKey="wordCount"
                    name="Word Count"
                    stroke={TK.ok}
                    fill={TK.ok}
                    fillOpacity={0.12}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                )}
                {showRank && (
                  <Line
                    yAxisId="rank"
                    type="monotone"
                    dataKey="rank"
                    name="Rank"
                    stroke={TK.valueBlue}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {compareOn && showRank && (
                  <Line
                    yAxisId="rank"
                    type="monotone"
                    dataKey="youRank"
                    name="You (Rank)"
                    stroke={TK.brand}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    strokeDasharray="5 4"
                  />
                )}
                {showFs && fsScatter.length > 0 && (
                  <Scatter
                    yAxisId="rank"
                    data={fsScatter}
                    name="FS"
                    shape={(props: any) => <FsDot {...props} />}
                    dataKey="y"
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insight (optional) */}
        {insight && (
          <div className="px-4 pb-2">
            <div
              className="flex items-start gap-2 rounded-md border p-3"
              style={{ borderColor: TK.border, background: TK.chipBg }}
            >
              <InfoIcon size={16} className="mt-[2px] text-[#9CA3AF]" />
              <div className="text-sm" style={{ color: TK.text }}>
                <span className="font-medium">Insight:</span> {insight}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 border-t px-4 py-3"
          style={{ borderColor: TK.border }}
        >
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white"
            style={{ background: TK.brand }}
            onClick={() =>
              onCreateTask?.({
                pageUrl: data.pageUrl,
                range,
                insight: insight ?? undefined,
              })
            }
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#0C7FB6")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brand)}
            title="Create a follow-up task"
          >
            <FilePlus2 size={16} />
            Create Task
          </button>
        </div>
      </section>
    </div>
  );
}

/* --------------------------- UI SUBCOMPONENTS -------------------------- */
function Chip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px]"
      style={{ background: TK.chipBg, color: TK.muted, border: `1px solid ${TK.border}` }}
    >
      {label}
    </span>
  );
}

function InfoHover({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        className="invisible absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-white p-2 text-[12px] leading-snug text-[#111827] shadow group-hover:visible"
        style={{ borderColor: TK.border }}
      >
        {text}
      </span>
    </span>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
  colorDot,
  inputRef,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  colorDot: string;
  inputRef?: any;
}) {
  return (
    <label
      className={classNames(
        "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm cursor-pointer",
        checked ? "bg-white" : "bg-[#F5F7FA]"
      )}
      style={{ borderColor: TK.border }}
      title={label}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--wr-brand,#1090D0)]"
      />
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: colorDot }} />
      <span>{label}</span>
    </label>
  );
}

function LegendPills({ compareOn }: { compareOn: boolean }) {
  return (
    <div className="ml-1 flex items-center gap-3 text-xs" style={{ color: TK.muted }}>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.valueBlue }} />
        Rank
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.ok }} />
        Word Count
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.warn }} />
        FS
      </span>
      {compareOn && (
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: `repeating-linear-gradient(90deg, ${TK.brand}, ${TK.brand} 4px, transparent 4px, transparent 8px)`,
            }}
          />
          You
        </span>
      )}
    </div>
  );
}

/* ----------------------------- DEMO / MOCK ---------------------------- */
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function clampRank(r: number) {
  return Math.min(100, Math.max(1, Math.round(r)));
}
function buildMockData(days = 30): ViewTrendData {
  const pageUrl = "/seo-guide";
  const competitorDomain = "comp1.com";

  const series: PageTrendPoint[] = [];
  let rank = 18; // start
  let wc = 2200;
  for (let i = days - 1; i >= 0; i--) {
    // gentle noise
    rank = clampRank(rank + (Math.random() * 4 - 2));
    wc = Math.max(1400, Math.round(wc + (Math.random() * 180 - 90)));
    const dateISO = daysAgo(i);
    // FS regime: gain around day ~18, then keep, then drop around day ~8
    const dayIndex = days - 1 - i;
    let fs = false;
    if (dayIndex >= 10 && dayIndex <= 20) fs = true; // present 10..20
    if (dayIndex > 20 && dayIndex < 24) fs = Math.random() > 0.5; // noisy
    series.push({ dateISO, rank, wordCount: wc, fs });
  }

  // You overlay ranks (slightly different)
  const youSeries = series.map((p) => ({
    dateISO: p.dateISO,
    rank: clampRank(p.rank + (Math.random() * 6 - 3) + 2), // generally a bit worse
  }));

  return {
    pageUrl,
    competitorDomain,
    device: "All",
    country: "US",
    range: "30d",
    series,
    youSeries,
  };
}

/* Truncate middle for header path */
function truncateMiddle(u: string, max = 42) {
  if (u.length <= max) return u;
  const left = Math.max(0, Math.floor((max - 1) / 2) - 1);
  const right = Math.max(0, max - left - 1);
  return `${u.slice(0, left)}…${u.slice(-right)}`;
}

/* --------------------------- DEMO WRAPPER ----------------------------- */
export default function Demo_ViewTrendModal({onClose}:{onClose: () => void;}) {
  const [open, setOpen] = useState(true);
  const data = useMemo(() => buildMockData(30), []);
  const [compareOn, setCompareOn] = useState(true);

  return (
 <>
     {open && (
          <ViewTrendModal
            open={open}
            onClose={onClose}
            data={data}
            compareOn={compareOn}
            onCreateTask={(ctx) =>
              alert(
                `Create Task\nPage: ${ctx.pageUrl}\nRange: ${ctx.range}\nInsight: ${ctx.insight ?? "—"}`
              )
            }
          />
        )}

 </>
  );
}
