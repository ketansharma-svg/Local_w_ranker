"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  PieChart as PieChartIcon,
  BookOpen,
  Compass,
  Briefcase,
  ShoppingCart,
  Download,
} from "lucide-react";

/**
 * Tab 1: Overview
 * Section 4 — Keyword Intent Breakdown (Stacked Donut + Table, side‑by‑side)
 *
 * Update:
 * - Smart popover now shows ONLY the hovered slice’s metrics (not full breakdown).
 * - Preserves: compact donut size, single legend instance, no shadows, Inter font,
 *   branded (#008CCD) icons, pointer cursors, modular chips/toggles.
 */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
  brand: "#008CCD",
  brand50: "#D9EEF8",
  surface: "#FFFFFF",
  bgSubtle: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  shadowSm: "0 2px 6px rgba(0,0,0,.05)",
};

/* ----------------------------- Types ------------------------------ */
type IntentKey = "Informational" | "Navigational" | "Commercial" | "Transactional";

type KeywordRow = {
  intent: IntentKey;
  branded?: boolean;
  hasSerpFeature?: boolean;
  traffic: number;
};

type IntentMetrics = {
  intent: IntentKey;
  count: number;
  traffic: number;
};

/* ----------------------- Intent palette & icons ----------------------- */
const INTENT_ORDER: IntentKey[] = ["Informational", "Navigational", "Commercial", "Transactional"];

const INTENT_COLOR: Record<IntentKey, string> = {
  Informational: "#3B82F6", // blue
  Navigational: "#10B981",  // emerald
  Commercial: "#F59E0B",    // amber
  Transactional: "#EF4444", // red
};

const IntentIcon = ({ k, size = 14 }: { k: IntentKey; size?: number }) => {
  const props = { size, color: TK.brand };
  if (k === "Informational") return <BookOpen {...props} />;
  if (k === "Navigational") return <Compass {...props} />;
  if (k === "Commercial") return <Briefcase {...props} />;
  return <ShoppingCart {...props} />;
};

/* --------------------------- Demo dataset --------------------------- */
const DEMO_ROWS: KeywordRow[] = [
  ...Array.from({ length: 520 }, () => ({
    intent: "Informational" as const,
    branded: Math.random() > 0.85,
    hasSerpFeature: Math.random() > 0.55,
    traffic: 2 + Math.round(Math.random() * 6),
  })),
  ...Array.from({ length: 210 }, () => ({
    intent: "Navigational" as const,
    branded: true,
    hasSerpFeature: Math.random() > 0.9,
    traffic: 3 + Math.round(Math.random() * 10),
  })),
  ...Array.from({ length: 330 }, () => ({
    intent: "Commercial" as const,
    branded: Math.random() > 0.75,
    hasSerpFeature: Math.random() > 0.5,
    traffic: 3 + Math.round(Math.random() * 8),
  })),
  ...Array.from({ length: 160 }, () => ({
    intent: "Transactional" as const,
    branded: Math.random() > 0.2,
    hasSerpFeature: Math.random() > 0.4,
    traffic: 5 + Math.round(Math.random() * 15),
  })),
];

/* ----------------------------- Utils ----------------------------- */
const fmt = (n: number) => n.toLocaleString();
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

/** Polar → Cartesian */
function pc(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/** Donut slice path between start..end (deg) */
function donutPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number
) {
  const startOuter = pc(cx, cy, rOuter, startDeg);
  const endOuter = pc(cx, cy, rOuter, endDeg);
  const startInner = pc(cx, cy, rInner, endDeg);
  const endInner = pc(cx, cy, rInner, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

/* --------------------------- Small components --------------------------- */
function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: React.ReactNode; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`h-8 rounded-full px-3 text-sm transition ${
            value === it.value
              ? "bg-[var(--wr-brand-50,#D9EEF8)] font-medium text-[var(--wr-brand,#008CCD)]"
              : "hover:bg-gray-100"
          }`}
          style={{ cursor: "pointer" }}
          type="button"
          title={typeof it.label === "string" ? it.label : undefined}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "bg-[var(--wr-brand-50,#D9EEF8)] text-[var(--wr-brand,#008CCD)] border-transparent"
          : "text-[var(--wr-muted,#6B7280)] hover:bg-gray-50"
      }`}
      style={!active ? { borderColor: TK.border } : {}}
      title={label}
      aria-pressed={active}
      type="button"
    >
      {label}
    </button>
  );
}

/* ------------------------- Smart Popover (Donut) ------------------------- */
/** Shows ONLY the hovered slice’s metrics with a colored dot annotation. */
function DonutPopover({
  show,
  x,
  y,
  rows,
  activeKey,
}: {
  show: boolean;
  x: number;
  y: number;
  rows: Array<{
    key: IntentKey;
    label: string;
    color: string;
    share: number;
    value: number;
    traffic: number;
  }>;
  activeKey: IntentKey | null;
}) {
  if (!show || !activeKey) return null;
  const r = rows.find((it) => it.key === activeKey);
  if (!r) return null;

  return (
    <div
      className="absolute z-50 rounded-md border bg-white p-2 text-xs"
      style={{
        left: x,
        top: y,
        borderColor: TK.border,
        pointerEvents: "none",
        width: 200,
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />
        <span className="font-medium" style={{ color: TK.text }}>
          {r.label}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span style={{ color: TK.muted }}>Share</span>
          <span className="font-semibold" style={{ color: TK.text }}>
            {pct(r.share)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: TK.muted }}>Keywords</span>
          <span className="font-semibold" style={{ color: TK.text }}>
            {fmt(r.value)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: TK.muted }}>Traffic</span>
          <span className="font-semibold" style={{ color: TK.text }}>
            {fmt(r.traffic)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Component ---------------------------- */
export default function OVI_Section_KeywordIntentBreakdown({
  rows = DEMO_ROWS,
  onViewReport,
}: {
  rows?: KeywordRow[];
  onViewReport?: (params: {
    filter: "all" | "branded" | "nonbranded" | "serp_only";
    mode: "percent" | "count";
  }) => void;
}) {
  const [mode, setMode] = useState<"percent" | "count">("percent");
  const [filter, setFilter] =
    useState<"all" | "branded" | "nonbranded" | "serp_only">("all");
  const [legend, setLegend] = useState<Record<IntentKey, boolean>>({
    Informational: true,
    Navigational: true,
    Commercial: true,
    Transactional: true,
  });
  const [exportOpen, setExportOpen] = useState(false);

  // Donut hover + popover state
  const [hoverKey, setHoverKey] = useState<IntentKey | null>(null);
  const [popXY, setPopXY] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const donutWrapRef = useRef<HTMLDivElement>(null);

  /* -------- Filtered base set (chips) -------- */
  const filtered = useMemo(() => {
    switch (filter) {
      case "branded":
        return rows.filter((r) => r.branded);
      case "nonbranded":
        return rows.filter((r) => !r.branded);
      case "serp_only":
        return rows.filter((r) => r.hasSerpFeature);
      default:
        return rows;
    }
  }, [rows, filter]);

  /* -------- Aggregate by intent -------- */
  const agg: IntentMetrics[] = useMemo(() => {
    const base: Record<IntentKey, IntentMetrics> = {
      Informational: { intent: "Informational", count: 0, traffic: 0 },
      Navigational: { intent: "Navigational", count: 0, traffic: 0 },
      Commercial: { intent: "Commercial", count: 0, traffic: 0 },
      Transactional: { intent: "Transactional", count: 0, traffic: 0 },
    };
    for (const r of filtered) {
      base[r.intent].count += 1;
      base[r.intent].traffic += r.traffic;
    }
    return INTENT_ORDER.map((k) => base[k]);
  }, [filtered]);

  /* -------- Apply legend visibility & totals -------- */
  const visibleAgg = useMemo(
    () => agg.filter((a) => legend[a.intent]),
    [agg, legend]
  );
  const totalCount = useMemo(
    () => visibleAgg.reduce((s, a) => s + a.count, 0),
    [visibleAgg]
  );
  const totalTraffic = useMemo(
    () => visibleAgg.reduce((s, a) => s + a.traffic, 0),
    [visibleAgg]
  );

  /* -------- Donut segments (renormalize when legend toggled) -------- */
  const donutSegs = useMemo(() => {
    if (!visibleAgg.length) return [];
    const sum = visibleAgg.reduce((s, a) => s + a.count, 0) || 1;
    return visibleAgg.map((a) => ({
      key: a.intent,
      label: a.intent,
      color: INTENT_COLOR[a.intent],
      value: a.count,
      share: a.count / sum,
      traffic: a.traffic,
    }));
  }, [visibleAgg]);

  /* -------- CSV Export (table) -------- */
  function exportCSV() {
    const header = ["filter", "mode", "intent", "count", "share", "traffic"];
    const rowsCsv = INTENT_ORDER.filter((k) => legend[k]).map((k) => {
      const row = agg.find((a) => a.intent === k)!;
      const share = totalCount ? row.count / totalCount : 0;
      return [filter, mode, k, `${row.count}`, `${(share * 100).toFixed(1)}%`, `${row.traffic}`];
    });
    const csv = [header, ...rowsCsv].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyword-intent-breakdown.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  /* -------- PNG Export (donut SVG) -------- */
  async function exportPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const cloned = svg.cloneNode(true) as SVGSVGElement;
    const xml = new XMLSerializer().serializeToString(cloned);
    const svg64 = window.btoa(unescape(encodeURIComponent(xml)));
    const image64 = `data:image/svg+xml;base64,${svg64}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = svg.viewBox.baseVal.width || 280;
      const h = svg.viewBox.baseVal.height || 200;
      const canvas = document.createElement("canvas");
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "intent-breakdown.png";
      a.click();
    };
    img.src = image64;
    setExportOpen(false);
  }

  const toggleLegend = (intent: IntentKey) =>
    setLegend((s) => ({ ...s, [intent]: !s[intent] }));

  return (
    <section
      className="w-full rounded-xl border bg-white p-4 sm:p-5 mt-4"
      style={{
        borderColor: TK.border,
        boxShadow: TK.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <PieChartIcon size={18} color={TK.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
            Keyword Intent Breakdown
          </h3>
        </div>

        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "percent" | "count")}
          aria="Metric mode"
          items={[
            { label: "Intent %", value: "percent" },
            { label: "Keyword Count", value: "count" },
          ]}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Pill active={filter === "all"} label="All" onClick={() => setFilter("all")} />
          <Pill active={filter === "branded"} label="Branded" onClick={() => setFilter("branded")} />
          <Pill
            active={filter === "nonbranded"}
            label="Non‑Branded"
            onClick={() => setFilter("nonbranded")}
          />
          <Pill
            active={filter === "serp_only"}
            label="SERP Feature Only"
            onClick={() => setFilter("serp_only")}
          />

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((s) => !s)}
              className="h-9 rounded-md border px-3 text-sm inline-flex items-center gap-2 hover:bg-gray-50"
              style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              type="button"
              title="Export"
            >
              <Download size={16} color={TK.brand} />
              Export
            </button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white"
                style={{ borderColor: TK.border }}
              >
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ cursor: "pointer" }}
                  onClick={exportPNG}
                >
                  PNG (Chart)
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ cursor: "pointer" }}
                  onClick={exportCSV}
                >
                  CSV (Table)
                </button>
                <button
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
                  title="PDF export available in Reports"
                  disabled
                >
                  PDF (via Reports)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Divider */}
      <div className="mb-3 border-t" style={{ borderColor: TK.borderLight }} />

      {/* Side‑by‑side: Donut (left, compact) · Table (right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Donut (compact) + Legend chips (only legend instance) */}
        <div
          className="rounded-lg border p-3 lg:col-span-4"
          style={{ borderColor: TK.borderLight }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[13px]" style={{ color: TK.muted }}>
              {mode === "percent" ? "Share of visible keywords by intent" : "Keywords by intent (proportional)"}
            </div>
            <div className="text-[12px]" style={{ color: TK.muted }}>
              Traffic (visible):{" "}
              <span className="font-medium" style={{ color: TK.text }}>
                {fmt(totalTraffic)}
              </span>
            </div>
          </div>

          {/* Donut chart (smaller) */}
          <div ref={donutWrapRef} className="relative mx-auto w-full">
            <svg
              ref={svgRef}
              role="img"
              aria-label="Keyword distribution by intent (stacked donut)"
              viewBox="0 0 280 200"
              className="block mx-auto"
              onMouseMove={(e) => {
                if (!donutWrapRef.current) return;
                const rect = donutWrapRef.current.getBoundingClientRect();
                const left = Math.min(rect.width - 210, Math.max(8, e.clientX - rect.left + 12));
                const top = Math.min(rect.height - 110, Math.max(8, e.clientY - rect.top + 12));
                setPopXY({ x: left, y: top });
              }}
              onMouseLeave={() => {
                setHoverKey(null);
                setPopXY(null);
              }}
            >
              {/* background (no shadow) */}
              <rect x="0" y="0" width="280" height="200" fill={TK.surface} />

              {/* donut ring */}
              <g transform="translate(0,0)">
                {(() => {
                  const cx = 120;
                  const cy = 100;
                  const rOuter = 64;
                  const rInner = 46;

                  let a0 = 0;
                  const nodes: React.ReactNode[] = [];

                  // track
                  nodes.push(
                    <circle
                      key="track"
                      cx={cx}
                      cy={cy}
                      r={rOuter}
                      fill="none"
                      stroke={TK.bgSubtle}
                      strokeWidth={rOuter - rInner}
                    />
                  );

                  donutSegs.forEach((s) => {
                    const a1 = a0 + s.share * 360;
                    const d = donutPath(cx, cy, rOuter, rInner, a0, a1);
                    const active = hoverKey === s.key;
                    nodes.push(
                      <path
                        key={s.key}
                        d={d}
                        fill={s.color}
                        stroke="#fff"
                        strokeWidth={active ? 2 : 1}
                        transform="rotate(-90, 120, 100)"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHoverKey(s.key)}
                        onMouseLeave={() => setHoverKey(null)}
                      >
                        <title>
                          {`${s.label} · ${pct(s.share)} (${fmt(s.value)} kw · ${fmt(
                            s.traffic
                          )} traffic)`}
                        </title>
                      </path>
                    );
                    a0 = a1;
                  });

                  // center label
                  nodes.push(
                    <g key="center" transform="translate(120,100)">
                      <circle r={rInner - 9} fill={TK.surface} />
                      <text x={0} y={-6} textAnchor="middle" fontSize="11" fill={TK.muted}>
                        Total (visible)
                      </text>
                      <text
                        x={0}
                        y={14}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight={600}
                        fill={TK.text}
                      >
                        {fmt(totalCount)}
                      </text>
                    </g>
                  );

                  return nodes;
                })()}
              </g>
            </svg>

            {/* Smart popover — ONLY hovered slice */}
            <DonutPopover
              show={!!hoverKey && !!popXY}
              x={popXY?.x ?? 0}
              y={popXY?.y ?? 0}
              rows={donutSegs as any}
              activeKey={hoverKey}
            />
          </div>

          {/* Legend chips (ONLY legend instance) */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {INTENT_ORDER.map((k) => (
              <button
                key={`chip-${k}`}
                onClick={() => toggleLegend(k)}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                  legend[k] ? "bg-white" : "bg-gray-100 opacity-60"
                }`}
                style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
                role="switch"
                aria-checked={legend[k]}
                title={`${k} — toggle`}
              >
                <span
                  className="inline-block h-2 w-2 rounded"
                  style={{ background: INTENT_COLOR[k] }}
                />
                <IntentIcon k={k} />
                <span>{k}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Table */}
        <div className="lg:col-span-8">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[14px] font-semibold" style={{ color: TK.text }}>
              Keywords by Intent
            </h4>
            <button
              className="text-[13px] font-medium text-[var(--wr-brand,#008CCD)] hover:underline"
              style={{ cursor: "pointer" }}
              onClick={() => onViewReport?.({ filter, mode })}
              type="button"
              title="Open full report"
            >
              View Full Report
            </button>
          </div>

          <div
            className="overflow-x-auto rounded-lg border bg-white"
            style={{ borderColor: TK.border }}
          >
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[var(--wr-bg-subtle,#F5F7FA)]">
                <tr className="text-[12px]" style={{ color: TK.muted }}>
                  <th className="px-3 py-2 font-medium">Intent</th>
                  <th className="px-3 py-2 font-medium">Percentage</th>
                  <th className="px-3 py-2 font-medium">Keywords</th>
                  <th className="px-3 py-2 font-medium">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {INTENT_ORDER.filter((k) => legend[k]).map((k) => {
                  const row = agg.find((a) => a.intent === k)!;
                  const share = totalCount ? row.count / totalCount : 0;
                  return (
                    <tr
                      key={k}
                      className="border-t hover:bg-gray-50"
                      style={{ borderColor: TK.borderLight }}
                    >
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded"
                            style={{ background: INTENT_COLOR[k] }}
                          />
                          <IntentIcon k={k} />
                          <span className="font-medium" style={{ color: TK.text }}>
                            {k}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-40 overflow-hidden rounded bg-gray-100">
                            <div
                              className="h-2"
                              style={{
                                width: `${Math.max(2, share * 100)}%`,
                                background: INTENT_COLOR[k],
                              }}
                              aria-hidden
                            />
                          </div>
                          <span className="tabular-nums" style={{ color: TK.text }}>
                            {(share * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{fmt(row.count)}</td>
                      <td className="px-3 py-2">{fmt(row.traffic)}</td>
                    </tr>
                  );
                })}

                {INTENT_ORDER.every((k) => !legend[k]) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-[13px]"
                      style={{ color: TK.muted }}
                    >
                      No intents visible — toggle one or more in the legend.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!totalCount && (
            <div
              className="mt-3 rounded-md border p-3 text-[13px]"
              style={{ borderColor: TK.borderLight, color: TK.muted }}
            >
              No keywords match the selected filters. Try a different filter or broaden the date
              range.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}