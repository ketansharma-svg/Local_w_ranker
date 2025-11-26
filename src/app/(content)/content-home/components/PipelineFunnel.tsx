"use client";

/**
 * Pipeline Funnel — Section 7 (finalized)
 * • Cards (no duplicate title chip), event bus hooks
 * • Full‑width stacked area trend with X/Y axes
 * • Smart popover matches container bg and avoids the cursor line
 * • Subtle hover animations (areas fade, crosshair fades, pulsing halo at band midpoint)
 *
 * Tokens: brand/text/status/borders/radius/shadow per Wranker v1.0
 * (metric blue #0077FF only for headline numbers)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Workflow,
  FilePlus2,
  FileBadge2,
  PencilLine,
  Users,
  CheckCircle2,
  FileText,
  ChevronDown,
} from "lucide-react";

/* ───────────────────────── Tokens (from CSS vars) ───────────────────────── */
const TK = {
  brand: "var(--brand, #008CCD)",
  focus: "var(--focus, #4286F5)",
  text: "var(--text, #374151)",
  textStrong: "var(--text-strong, #111827)",
  textMuted: "var(--text-muted, #6B7280)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  critical: "var(--critical, #E94134)",
  metricBlue: "#0077FF",
} as const;

/* ───────────────────────── Types ───────────────────────── */
export type StageKey = "ideas" | "briefs" | "drafts" | "review" | "approved" | "published";

export type PipelineStageDatum = {
  key: StageKey;
  label: string;
  count: number;    // current window
  deltaPct: number; // vs previous period
};

export type PipelineTrendPoint = {
  date: string; // YYYY-MM-DD
  stages: Partial<Record<StageKey, number>>;
};

export type PipelineFunnelProps = {
  stages?: PipelineStageDatum[];
  trend?: PipelineTrendPoint[];
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
  demoFallback?: boolean;
};

/* ───────────────────────── Meta ───────────────────────── */
const STAGE_META: Record<
  StageKey,
  { label: string; Icon: React.ComponentType<any>; tone: "brand" | "success" | "warning" | "muted" }
> = {
  ideas: { label: "Ideas", Icon: FilePlus2, tone: "muted" },
  briefs: { label: "Briefs", Icon: FileBadge2, tone: "brand" },
  drafts: { label: "Drafts", Icon: PencilLine, tone: "muted" },
  review: { label: "In Review", Icon: Users, tone: "warning" },
  approved: { label: "Approved", Icon: CheckCircle2, tone: "brand" },
  published: { label: "Published", Icon: FileText, tone: "success" },
};

const nf = new Intl.NumberFormat();
const pf = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

/* ───────────────────────── Utilities ───────────────────────── */
function toneColor(tone: "brand" | "success" | "warning" | "muted") {
  switch (tone) {
    case "brand":
      return TK.brand;
    case "success":
      return TK.success;
    case "warning":
      return TK.warning;
    case "muted":
      return TK.textMuted;
  }
}
function emit(name: string, detail: any) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ───────────────────────── Stage Card (title chip removed) ───────────────────────── */
function StageCard({
  d,
  selected,
  onClick,
  onViewQueue,
}: {
  d: PipelineStageDatum;
  selected: boolean;
  onClick: (key: StageKey) => void;
  onViewQueue: (key: StageKey) => void;
}) {
  const meta = STAGE_META[d.key];
  const Icon = meta.Icon;
  const deltaUp = d.deltaPct >= 0;
  const deltaColor = deltaUp ? TK.success : TK.critical;

  return (
    <button
      type="button"
      onClick={() => onClick(d.key)}
      className="group h-full w-full rounded-md border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus:outline-none"
      style={{
        borderColor: selected ? TK.brand : TK.border,
        background: TK.bgPanel,
        boxShadow: TK.shadow1,
        cursor: "pointer",
      }}
      aria-pressed={selected}
      aria-label={`${meta.label} — ${d.count} (${pf(d.deltaPct)} vs prev)`}
    >
      {/* Header: icon + label + CTA */}
      <div className="mb-1 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Icon size={16} style={{ color: TK.brand }} />
          <span className="text-[13px] font-medium" style={{ color: TK.text }}>
            {meta.label}
          </span>
        </div>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onViewQueue(d.key);
          }}
          className="text-xs underline decoration-transparent transition group-hover:decoration-inherit"
          style={{ color: TK.brand, cursor: "pointer" }}
          role="link"
          tabIndex={0}
        >
          View queue
        </span>
      </div>

      {/* Metric + delta */}
      <div className="flex items-end justify-between">
        <div>
          <div className="leading-none" style={{ color: TK.metricBlue, fontSize: 30, fontWeight: 700 }}>
            {nf.format(d.count)}
          </div>
          <div className="mt-1 text-[12px]">
            <span className="tabular-nums" style={{ color: deltaColor }}>
              {deltaUp ? "▲ " : "▼ "}
              {pf(Math.abs(d.deltaPct))}
            </span>
            <span className="ml-1" style={{ color: TK.textMuted }}>
              vs previous
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ───────────────────────── Stacked Area (full‑width, axes, smart popover w/ animation) ───────────────────────── */
function StackedArea({
  data,
  selected,
}: {
  data: PipelineTrendPoint[];
  selected?: StageKey | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(800);
  const H = 200;
  const pad = { l: 40, r: 10, t: 14, b: 24 };
  const innerW = Math.max(1, W - pad.l - pad.r);
  const innerH = Math.max(1, H - pad.t - pad.b);

  // responsive width
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        if (w > 0) setW(w);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const seriesKeys: StageKey[] = ["ideas", "briefs", "drafts", "review", "approved", "published"];

  // cumulative stack tops (normalized)
  const stacks = useMemo(() => {
    const xs = data.map((d, i) => ({
      x: pad.l + (innerW * i) / Math.max(1, data.length - 1),
      total: seriesKeys.reduce((s, k) => s + (d.stages[k] ?? 0), 0) || 1,
      raw: d.stages,
    }));
    const byKey = Object.fromEntries(seriesKeys.map((k) => [k, [] as { x: number; y: number }[]])) as Record<
      StageKey,
      { x: number; y: number }[]
    >;

    xs.forEach(({ x, total, raw }) => {
      let acc = 0;
      seriesKeys.forEach((k) => {
        const frac = (raw[k] ?? 0) / total;
        acc += frac;
        const y = pad.t + innerH * (1 - acc);
        byKey[k].push({ x, y });
      });
    });
    return byKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), innerW, innerH]);

  const prevKeyOf = (k: StageKey) => seriesKeys[Math.max(0, seriesKeys.indexOf(k) - 1)] as StageKey;

  // areas between prev top and current top
  const pathFor = (k: StageKey, idx: number) => {
    const ptsTop = stacks[k];
    const prevKey = idx > 0 ? seriesKeys[idx - 1] : undefined;
    const ptsBot = prevKey ? stacks[prevKey] : ptsTop.map((p) => ({ x: p.x, y: pad.t + innerH }));
    const top = ptsTop.map((p) => `${p.x},${p.y}`).join(" L ");
    const bot = ptsBot.slice().reverse().map((p) => `${p.x},${p.y}`).join(" L ");
    return `M ${top} L ${bot} Z`;
  };

  const fillFor = (k: StageKey) => {
    switch (k) {
      case "published":
        return TK.success;
      case "approved":
      case "briefs":
        return TK.brand;
      case "review":
        return TK.warning;
      case "drafts":
        return TK.textMuted;
      case "ideas":
      default:
        return TK.border; // subtle neutral
    }
  };

  // Hover state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const N = Math.max(0, data.length);
  const step = N > 1 ? innerW / (N - 1) : innerW;

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const px = e.clientX - rect.left - pad.l;
    const idx = Math.round(Math.max(0, Math.min(innerW, px)) / step);
    setHoverIdx(Math.max(0, Math.min(N - 1, idx)));
  };
  const onLeave = () => setHoverIdx(null);

  const hoverX = hoverIdx === null ? null : pad.l + step * hoverIdx;

  // Band midpoint for a given key at index
  const bandMidY = (k: StageKey, idx: number) => {
    const top = stacks[k]?.[idx]?.y ?? pad.t + innerH;
    const prev = prevKeyOf(k);
    const bot = stacks[prev]?.[idx]?.y ?? pad.t + innerH;
    return (top + bot) / 2;
  };

  // Popover placement (avoid overlapping the vertical cursor line)
  const POPOVER_W = 260;
  const popoverLeft =
    hoverX === null
      ? 0
      : hoverX + 12 + POPOVER_W <= W
      ? hoverX + 12
      : Math.max(8, hoverX - POPOVER_W - 12);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ cursor: "crosshair" }}
    >
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Pipeline trend stacked area"
      >
        {/* Axes */}
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + innerH} stroke={TK.border} />
        <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH} stroke={TK.border} />
        {/* Mid gridline */}
        <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH / 2} y2={pad.t + innerH / 2} stroke={TK.borderSubtle} />

        {/* Areas (animated opacity) */}
        {seriesKeys.map((k, i) => {
          const fill = fillFor(k);
          const isDim = selected && selected !== k;
          const baseOpacity = k === "briefs" || k === "approved" ? 0.35 : 0.55;
          return (
            <path
              key={k}
              d={pathFor(k, i)}
              fill={fill}
              fillOpacity={isDim ? baseOpacity * 0.5 : baseOpacity}
              stroke="none"
              style={{ transition: "opacity 200ms ease" }}
            />
          );
        })}

        {/* Hover crosshair (animated) */}
        {hoverX !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke={TK.border}
            strokeDasharray="3,3"
            style={{ opacity: 0.9, transition: "opacity 150ms ease" }}
          />
        )}

        {/* X-axis min/max labels */}
        {N >= 1 && (
          <>
            <text x={pad.l} y={pad.t + innerH + 16} fontSize="11" fill={TK.textMuted}>
              {data[0].date}
            </text>
            <text x={pad.l + innerW} y={pad.t + innerH + 16} fontSize="11" fill={TK.textMuted} textAnchor="end">
              {data[N - 1].date}
            </text>
          </>
        )}
        {/* Y-axis labels */}
        <text x={pad.l - 6} y={pad.t + innerH} fontSize="11" fill={TK.textMuted} textAnchor="end">
          0%
        </text>
        <text x={pad.l - 6} y={pad.t + innerH / 2 + 4} fontSize="11" fill={TK.textMuted} textAnchor="end">
          50%
        </text>
        <text x={pad.l - 6} y={pad.t + 4} fontSize="11" fill={TK.textMuted} textAnchor="end">
          100%
        </text>

        {/* Hover dots + halo at band midpoint (animated) */}
        {hoverIdx !== null &&
          seriesKeys.map((k) => {
            const y = bandMidY(k, hoverIdx);
            const col = fillFor(k);
            const dim = selected && selected !== k;
            const opa = dim ? 0.6 : 1;
            return (
              <g key={`dot-${k}`} style={{ opacity: opa }}>
                {/* halo */}
                <circle
                  cx={hoverX ?? 0}
                  cy={y}
                  r={6}
                  fill={col}
                  className="animate-ping"
                  style={{ opacity: 0.3 }}
                />
                {/* dot */}
                <circle
                  cx={hoverX ?? 0}
                  cy={y}
                  r={3}
                  fill={col}
                  style={{ transition: "transform 150ms ease, opacity 150ms ease" }}
                />
              </g>
            );
          })}
      </svg>

      {/* Smart popover (same bg as container; avoids cursor line; animated) */}
      {hoverIdx !== null && (
        <div
          className="absolute rounded-md border px-3 py-2 text-sm shadow will-change-transform transition-transform duration-150 ease-out"
          style={{
            left: popoverLeft,
            top: 10,
            background: TK.bgPanel,
            color: TK.text,
            borderColor: TK.border,
            boxShadow: TK.shadow1,
            pointerEvents: "none",
          }}
          role="dialog"
          aria-live="polite"
        >
          <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
            {data[hoverIdx].date}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {(["ideas", "briefs", "drafts", "review", "approved", "published"] as StageKey[])
              .map((k) => ({
                key: k,
                label: STAGE_META[k].label,
                val: data[hoverIdx].stages[k] ?? 0,
                color: fillFor(k),
                dim: selected && selected !== k,
              }))
              .map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-2" style={{ opacity: r.dim ? 0.7 : 1 }}>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: r.color }} />
                    <span className="text-[12px]">{r.label}</span>
                  </div>
                  <span className="text-[12px] tabular-nums">{nf.format(r.val)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Main component ───────────────────────── */
export default function PipelineFunnel({
  stages,
  trend,
  loading,
  error,
  onExport,
  demoFallback = true,
}: PipelineFunnelProps) {
  // Demo data
  const demoStages: PipelineStageDatum[] = [
    { key: "ideas", label: "Ideas", count: 64, deltaPct: 3.2 },
    { key: "briefs", label: "Briefs", count: 42, deltaPct: -4.1 },
    { key: "drafts", label: "Drafts", count: 37, deltaPct: 2.0 },
    { key: "review", label: "In Review", count: 18, deltaPct: 1.4 },
    { key: "approved", label: "Approved", count: 12, deltaPct: 5.8 },
    { key: "published", label: "Published", count: 9, deltaPct: 6.1 },
  ];

  const today = new Date();
  const demoTrend: PipelineTrendPoint[] = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today.getTime() - (13 - i) * 86400000);
    const t = d.toISOString().slice(0, 10);
    const ideas = 40 + Math.round(10 * Math.sin(i / 2.4));
    const briefs = 28 + Math.round(6 * Math.cos(i / 2.1));
    const drafts = 24 + Math.round(5 * Math.sin(i / 1.5));
    const review = 14 + Math.round(4 * Math.cos(i / 1.9));
    const approved = 10 + Math.round(3 * Math.sin(i / 1.7));
    const published = 8 + Math.round(3 * Math.cos(i / 1.4));
    return { date: t, stages: { ideas, briefs, drafts, review, approved, published } };
  });

  const data = (stages && stages.length ? stages : demoFallback ? demoStages : []) as PipelineStageDatum[];
  const points = (trend && trend.length ? trend : demoFallback ? demoTrend : []) as PipelineTrendPoint[];

  const [selected, setSelected] = useState<StageKey | null>(null);
  const [showTrend, setShowTrend] = useState<boolean>(true);

  const onCardClick = (key: StageKey) => {
    const next = selected === key ? null : key;
    setSelected(next);
    const detail = { stage: key, module: "pipeline_funnel", ts: Date.now() };
    emit("wr:pipeline_stage_click", detail);
    emit("kpi_segment_click", detail);
  };
  const onViewQueue = (key: StageKey) => {
    const detail = { stage: key, module: "pipeline_funnel", ts: Date.now() };
    emit("wr:pipeline_view_queue", detail);
  };

  const doExport = () => {
    if (onExport) return onExport();
    const hdr = ["Stage", "Count", "Delta %"];
    const rows = data.map((d) => [d.label, String(d.count), d.deltaPct.toFixed(1)]);
    const csv = [hdr.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pipeline-funnel.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) {
    return (
      <div
        className="rounded-md border p-3 text-sm"
        style={{ borderColor: TK.border, background: TK.warningBg, color: TK.warning, fontFamily: "Inter, Inter Fallback, ui-sans-serif" }}
      >
        Failed to load Pipeline Funnel.
      </div>
    );
  }

  return (
    <section
      className="rounded-md border mt-4"
      style={{ borderColor: TK.border, background: TK.bgPanel, boxShadow: TK.shadow1, fontFamily: "Inter, Inter Fallback, ui-sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="inline-flex items-center gap-2">
          <Workflow size={18} style={{ color: TK.brand }} />
          <h3 className="text-[20px] font-semibold leading-6" style={{ color: TK.textStrong }}>
            Pipeline Funnel
          </h3>
        </div>

        <div className="inline-flex items-center gap-2">
          {/* Segmented toggle: Trend Off/On */}
          <div className="inline-flex items-center overflow-hidden rounded-full border" style={{ borderColor: TK.border }}>
            <button
              className={["px-2.5 py-1 text-xs", !showTrend ? "bg-[color:var(--bg-panel,#fff)] font-semibold" : ""].join(" ")}
              style={{ cursor: "pointer" }}
              onClick={() => setShowTrend(false)}
              aria-pressed={!showTrend}
            >
              Trend Off
            </button>
            <button
              className={["px-2.5 py-1 text-xs", showTrend ? "bg-[color:var(--bg-panel,#fff)] font-semibold" : ""].join(" ")}
              style={{ cursor: "pointer" }}
              onClick={() => setShowTrend(true)}
              aria-pressed={showTrend}
            >
              Trend On
            </button>
          </div>

          {/* Export */}
          <button
            onClick={doExport}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            aria-label="Export CSV"
            title="Export CSV"
          >
            Export
            <ChevronDown size={14} className="opacity-60" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-3 px-4 pb-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="h-[104px] animate-pulse rounded-md border" style={{ borderColor: TK.border, background: TK.borderSubtle }} />
            ))
          : data.map((d) => (
              <StageCard key={d.key} d={d} selected={selected === d.key} onClick={onCardClick} onViewQueue={onViewQueue} />
            ))}
      </div>

      {/* Full‑width trend footer */}
      {showTrend && points.length > 0 && (
        <div className="border-t px-4 pb-4 pt-2" style={{ borderColor: TK.border }}>
          <div className="mb-2 text-[12px]" style={{ color: TK.textMuted }}>
            Pipeline volume by stage (normalized, last {points.length}d)
          </div>
          <StackedArea data={points} selected={selected ?? undefined} />
          {/* Inline legend (click to filter) */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {(["ideas", "briefs", "drafts", "review", "approved", "published"] as StageKey[]).map((k) => {
              const tone = STAGE_META[k].tone;
              const dim = selected && selected !== k;
              return (
                <button
                  key={k}
                  onClick={() => onCardClick(k)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: TK.border, color: toneColor(tone), cursor: "pointer", opacity: dim ? 0.6 : 1 }}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: toneColor(tone) }} />
                  {STAGE_META[k].label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
