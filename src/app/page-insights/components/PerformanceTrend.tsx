"use client";

/* ===========================================================================
   Wranker — Section 1 (C)
   Performance Trend (Charts) — Refined to match reference patterns
   ---------------------------------------------------------------------------
   ✓ Inter / Inter Fallback fonts
   ✓ Branded #008CCD section icon; favicons used for page-domain chips
   ✓ Pointer cursor on interactive elements
   ✓ Modular chips (mode + primary metric) & toggle switch (anomalies)
   ✓ Smart popover (PORTALED) with colored dot annotations
   ✓ Bar hover animation — POPUP + subtle fill change on hovered bar only
   ✓ Modular legend (chip toggles) for series visibility
   ✓ Export button (CSV / PNG) in the header
   ✓ Tailwind classes; Recharts-only
   =========================================================================== */

import React, { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceDot,
  Cell,
} from "recharts";
import { createPortal } from "react-dom";
import { BarChart3, Download, Info } from "lucide-react";

/* ----------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------*/
type Device = "mobile" | "desktop";

export interface TrendPoint {
  date: string; // ISO day
  clicks?: number;
  impressions?: number;
  ctr?: number; // 0..1
  avgPosition?: number; // lower is better
  visibility?: number; // 0..100
}
export interface TrendSeries {
  label: "Aggregate" | string; // page URL or "Aggregate"
  points: TrendPoint[];
  device: Device;
  section?: string;
}
type Primary = "clicks" | "impressions" | "ctr" | "visibility";

/* ----------------------------------------------------------------------------
 * Tokens
 * --------------------------------------------------------------------------*/
const TOKENS = {
  brand: "#008CCD",
  action: "#0077FF",
  actionHover: "#1A86FF", // slightly brighter than action for hover
  pastel: "#D9EEF8",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  text: "#111827",
  muted: "#6B7280",
  gray: ["#9CA3AF", "#6B7280", "#4B5563", "#374151", "#1F2937"],
} as const;

/* ----------------------------------------------------------------------------
 * Utilities
 * --------------------------------------------------------------------------*/
const RADIUS = 8;
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const toShortLabel = (path: string) => {
  const seg = path.replace(/\/+$/, "").split("/").filter(Boolean);
  if (!seg.length) return "Home";
  if (seg.length === 1) return seg[0];
  return seg.slice(0, 2).join("/");
};
const getHost = () => {
  if (typeof window !== "undefined" && window?.location?.hostname) return window.location.hostname;
  return "example.com";
};
const favicon = (host = getHost(), sz = 16) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sz}`;

/* ----------------------------------------------------------------------------
 * Demo data (28 days)
 * --------------------------------------------------------------------------*/
function days(n = 28) {
  const arr: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}
const DATES = days(28);

function mkSeries(label: string, mul: number): TrendSeries {
  const pts: TrendPoint[] = DATES.map((d, i) => {
    const base = Math.max(20, 100 + Math.sin(i / 3) * 40 + (label === "Aggregate" ? 60 : 0));
    const clicks = Math.round(base * mul + (Math.random() - 0.5) * 20);
    const impressions = Math.round(clicks * (18 + Math.random() * 6));
    const ctr = clicks / Math.max(1, impressions);
    const avgPosition = Math.max(2, 12 - Math.sin(i / 4) * 3 + (label === "Aggregate" ? 0 : (Math.random() - 0.5) * 2));
    const visibility = clamp(60 + Math.sin(i / 2.7) * 15, 20, 100);
    return { date: d, clicks, impressions, ctr, avgPosition, visibility };
  });
  return { label, points: pts, device: "mobile" };
}
const AGG = mkSeries("Aggregate", 1.0);
const PAGES = ["/blog/seo-checklist", "/services/seo", "/product/wranker", "/blog/cwv-guide", "/academy/seo-course"].map((l, i) => {
  const s = mkSeries(l, 0.3 + i * 0.1);
  s.points = s.points.map((p, k) => ({ ...p, clicks: Math.max(5, (p.clicks ?? 0) - (i * 8 + (k % 3 === 0 ? 20 : 0))) }));
  return s;
});

/* ----------------------------------------------------------------------------
 * Helpers used by the chart
 * --------------------------------------------------------------------------*/
function val(primary: Primary, p: TrendPoint) {
  switch (primary) {
    case "clicks":
      return p.clicks ?? 0;
    case "impressions":
      return p.impressions ?? 0;
    case "ctr":
      return p.ctr ?? 0;
    case "visibility":
      return p.visibility ?? 0;
  }
}

function sumSeries(series: TrendSeries[]) {
  return DATES.map((d) => {
    const rows = series.map((s) => s.points.find((p) => p.date === d)!);
    const agg: TrendPoint = {
      date: d,
      clicks: rows.reduce((a, r) => a + (r.clicks ?? 0), 0),
      impressions: rows.reduce((a, r) => a + (r.impressions ?? 0), 0),
      ctr: (() => {
        const c = rows.reduce((a, r) => a + (r.clicks ?? 0), 0);
        const i = rows.reduce((a, r) => a + (r.impressions ?? 0), 0);
        return i ? c / i : 0;
      })(),
      avgPosition: rows.reduce((a, r) => a + (r.avgPosition ?? 0), 0) / Math.max(1, rows.length),
      visibility: rows.reduce((a, r) => a + (r.visibility ?? 0), 0) / Math.max(1, rows.length),
    };
    return agg;
  });
}

function mergeTop5(series: TrendSeries[]) {
  const rows: any[] = DATES.map((date) => ({ date }));
  series.forEach((s) => {
    s.points.forEach((p, i) => {
      rows[i][s.label] = p.clicks ?? 0;
      rows[i][`${s.label}-avgPosition`] = p.avgPosition ?? 0;
      rows[i]["avgPosition"] = (rows[i]["avgPosition"] ?? 0) + (p.avgPosition ?? 0) / series.length;
      rows[i]["clicks"] = (rows[i]["clicks"] ?? 0) + (p.clicks ?? 0);
      rows[i]["impressions"] = (rows[i]["impressions"] ?? 0) + (p.impressions ?? 0);
      rows[i]["ctr"] = (rows[i]["ctr"] ?? 0) + (p.ctr ?? 0) / series.length;
      rows[i]["visibility"] = (rows[i]["visibility"] ?? 0) + (p.visibility ?? 0) / series.length;
    });
  });
  return rows;
}

/* ----------------------------------------------------------------------------
 * UI atoms — Chip, ToggleSwitch, ExportButton, ModularLegend
 * --------------------------------------------------------------------------*/
function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 cursor-pointer rounded-full border px-2.5 text-sm ${active ? "font-semibold" : ""}`}
      style={{
        borderColor: TOKENS.border,
        background: active ? TOKENS.pastel : "#fff",
        color: active ? TOKENS.action : TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex cursor-pointer select-none items-center gap-2"
      title={label}
    >
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-[#008CCD]" : "bg-gray-300"}`}>
        <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0"}`} />
      </span>
      {label && <span className="text-sm" style={{ color: TOKENS.muted }}>{label}</span>}
    </button>
  );
}

function ExportButton({
  onCSV,
  onPNG,
}: {
  onCSV: () => void;
  onPNG: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => setOpen((s) => !s)}
      >
        <Download size={16} color={TOKENS.brand} />
        Export
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border bg-white p-1 shadow-lg" style={{ borderColor: TOKENS.border }}>
          <button
            className="w-full cursor-pointer rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onCSV();
            }}
          >
            CSV
          </button>
          <button
            className="w-full cursor-pointer rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onPNG();
            }}
          >
            PNG
          </button>
        </div>
      )}
    </div>
  );
}

type LegendItem = { key: string; label: string; color: string; iconUrl?: string };
function ModularLegend({
  items,
  enabled,
  onToggle,
}: {
  items: LegendItem[];
  enabled: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {items.map((it) => {
        const active = enabled[it.key] ?? true;
        return (
          <button
            key={it.key}
            type="button"
            className="cursor-pointer rounded-full border px-2 py-1 text-xs"
            style={{
              borderColor: TOKENS.border,
              background: active ? "#F5F7FA" : "#fff",
              color: active ? TOKENS.text : TOKENS.muted,
            }}
            onClick={() => onToggle(it.key)}
            title={it.label}
          >
            <span className="inline-flex items-center gap-2">
              {/* colored dot + optional favicon */}
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
                {it.iconUrl ? <img src={it.iconUrl} alt="favicon" className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="truncate max-w-[160px]">{it.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Smart popover (PORTALED) used by the chart tooltip
 * --------------------------------------------------------------------------*/
function PortalTooltip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - 280);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div
      className="pointer-events-none fixed z-[2147483647]"
      style={{ left, top }}
    >
      <div
        className="rounded-md border bg-white p-2 text-xs shadow ring-1 ring-black/10"
        style={{ borderColor: TOKENS.border }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function SmartTooltip({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  primary,
  pageColors,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  primary: Primary;
  pageColors: Record<string, string>;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string; dataKey: string }>;

  // Sort: primary bar first, then Avg Position (agg), then per-page Avg Pos (top5)
  const order = (r: any) => (r.dataKey === primary ? 0 : r.dataKey === "avgPosition" ? 1 : 2);
  const sorted = rows
    .filter((r) => r.dataKey !== "__anomaly")
    .sort((a, b) => order(a) - order(b));

  return (
    <PortalTooltip x={x} y={y}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        {new Date(label as string).toLocaleDateString()}
      </div>
      <div className="flex flex-col gap-1">
        {sorted.map((r, i) => {
          const pretty =
            r.dataKey === "avgPosition"
              ? r.value?.toFixed(1)
              : primary === "ctr"
              ? pctFmt(r.value ?? 0)
              : intFmt.format(Math.round(r.value ?? 0));

          // favicon for per-page avg pos keys: "<path>-avgPosition"
          const isPage = /-avgPosition$/.test(r.dataKey);
          const path = isPage ? r.dataKey.replace(/-avgPosition$/, "") : "";
          const iconUrl = isPage ? favicon() : undefined;

          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: isPage ? pageColors[path] : r.color || TOKENS.action }} />
                {iconUrl ? <img src={iconUrl} alt="favicon" className="h-3.5 w-3.5" /> : null}
                <span style={{ color: TOKENS.muted }}>
                  {r.name}
                </span>
              </div>
              <div className="font-semibold" style={{ color: TOKENS.text }}>
                {pretty}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltip>
  );
}

/* ----------------------------------------------------------------------------
 * Component
 * --------------------------------------------------------------------------*/
export default function DemoPerformanceTrend() {
  const [mode, setMode] = useState<"aggregate" | "top5">("aggregate");
  const [primary, setPrimary] = useState<Primary>("clicks");
  const [showAnom, setShowAnom] = useState<boolean>(true);

  const agg = useMemo(() => AGG, []);
  const top5 = useMemo(() => PAGES, []);
  const primaryLabel: Record<Primary, string> = {
    clicks: "Clicks",
    impressions: "Impressions",
    ctr: "CTR",
    visibility: "Visibility",
  };

  // page color registry (stable)
  const PAGE_COLORS: Record<string, string> = useMemo(() => {
    const all = top5.map((s, i) => [s.label, ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"][i % 5]] as const);
    return Object.fromEntries(all);
  }, [top5]);

  // anomalies (on primary series)
  const anomalies = useMemo(() => {
    if (!showAnom) return [];
    const base = mode === "aggregate" ? agg.points : sumSeries(top5);
    const pts = base.map((p, i, arr) => {
      if (i === 0) return null;
      const prev = arr[i - 1];
      const a = val(primary, p);
      const b = val(primary, prev);
      if (b <= 0) return null;
      const change = (a - b) / b;
      if (Math.abs(change) > 0.5) return { date: p.date, y: a, up: change > 0 };
      return null;
    });
    return pts.filter(Boolean) as { date: string; y: number; up: boolean }[];
  }, [primary, mode, agg, top5, showAnom]);

  // data source for the chart
  const chartData = useMemo(() => (mode === "aggregate" ? agg.points : mergeTop5(top5)), [agg.points, mode, top5]);

  // hover index to animate the SINGLE hovered bar
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // legend toggles
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { primary: true, avgPosition: true };
    top5.forEach((s) => (init[`${s.label}-avgPosition`] = true));
    return init;
  });
  const toggleLegend = (k: string) => setEnabled((m) => ({ ...m, [k]: !(m[k] ?? true) }));

  const legendItems: LegendItem[] =
    mode === "aggregate"
      ? [
          { key: "primary", label: primaryLabel[primary], color: TOKENS.action },
          { key: "avgPosition", label: "Avg Position", color: "#111827" },
        ]
      : [
          { key: "primary", label: primaryLabel[primary], color: TOKENS.action },
          { key: "avgPosition", label: "Avg Position (Agg)", color: "#111827" },
          ...top5.map((s) => ({
            key: `${s.label}-avgPosition`,
            label: `Pos — ${toShortLabel(s.label)}`,
            color: PAGE_COLORS[s.label],
            iconUrl: favicon(),
          })),
        ];

  // refs for export + tooltip portal placement
  const cardRef = useRef<HTMLDivElement | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------- Export helpers ------------------------- */
  function exportCSV() {
    const rows: string[] = [];
    const header = ["date", primaryLabel[primary], "avgPosition"];
    rows.push(header.join(","));
    chartData.forEach((r: any) => {
      const v = r[primary] ?? 0;
      const ap = r["avgPosition"];
      const cellPrimary = primary === "ctr" ? (typeof v === "number" ? (v * 100).toFixed(1) + "%" : "") : intFmt.format(Math.round(v ?? 0));
      const cellAP = typeof ap === "number" ? ap.toFixed(1) : "";
      rows.push([r.date, cellPrimary, cellAP].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `performance-trend-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  function exportPNG() {
    const el = cardRef.current;
    if (!el) return;
    // Lightweight foreignObject snapshot (keeps typography)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;font-family:Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial">
            ${el.outerHTML}
          </div>
        </foreignObject>
      </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = el.clientWidth;
      canvas.height = el.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = data;
      a.download = `performance-trend.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /* ---------------------------- Render ----------------------------- */
  return (
    <div
      className="w-full py-4 px-4"
      style={{
        color: TOKENS.text,
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue'",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Performance Trend — {primaryLabel[primary]} & Avg Position
          </h3>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50 cursor-pointer"
            title="Primary metric bars + Avg Position line(s)."
            aria-label="About this section"
          >
            <Info size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode chips */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs" style={{ color: TOKENS.muted }}>
              Mode:
            </span>
            <Chip active={mode === "aggregate"} onClick={() => setMode("aggregate")} title="Aggregate (all pages)">
              Aggregate
            </Chip>
            <Chip active={mode === "top5"} onClick={() => setMode("top5")} title="Top 5 Pages">
              Top 5 Pages
            </Chip>
          </div>

          {/* Primary chips */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs" style={{ color: TOKENS.muted }}>
              Primary:
            </span>
            {(["clicks", "impressions", "ctr", "visibility"] as Primary[]).map((p) => (
              <Chip key={p} active={primary === p} onClick={() => setPrimary(p)} title={primaryLabel[p]}>
                {primaryLabel[p]}
              </Chip>
            ))}
          </div>

          {/* Anomalies switch */}
          <ToggleSwitch checked={showAnom} onChange={setShowAnom} label="Show anomalies" />

          {/* Export */}
          <ExportButton onCSV={exportCSV} onPNG={exportPNG} />
        </div>
      </div>

      {/* Card + Legend + Chart */}
      <div
        ref={cardRef}
        className="rounded-[10px] border bg-white p-3 shadow-sm"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Modular legend (chip toggles) */}
        <ModularLegend items={legendItems} enabled={enabled} onToggle={toggleLegend} />

        {/* Chart */}
        <div
          ref={chartWrapRef}
          className="w-full cursor-pointer"
          style={{ height: 420 }}
        >
          <ResponsiveContainer>
            <ComposedChart
              data={chartData}
              margin={{ top: 16, right: 24, bottom: 36, left: 48 }}
              onMouseMove={(e: any) => {
                if (typeof e?.activeTooltipIndex === "number") setHoverIdx(e.activeTooltipIndex);
              }}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={(e: any) => {
                if (e?.activeLabel) {
                  // hook: filter table by date
                  // eslint-disable-next-line no-console
                  console.log("Filter by date:", e.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.borderLight} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5).replace("-", "/")}
                minTickGap={24}
                label={{ value: "Date", position: "bottom", offset: 12 }}
              />
              {/* Left Y = Primary */}
              <YAxis
                yAxisId="L"
                domain={primary === "ctr" ? [0, 0.2] : primary === "visibility" ? [0, 100] : ["auto", "auto"]}
                tickFormatter={(v) => (primary === "ctr" ? `${Math.round((v as number) * 100)}%` : intFmt.format(Math.round(v as number)))}
                label={{ value: primaryLabel[primary], angle: -90, position: "insideLeft" }}
              />
              {/* Right Y = Avg Position (inverted) */}
              <YAxis
                yAxisId="R"
                orientation="right"
                domain={[60, 0]}
                allowDataOverflow
                label={{ value: "Avg Position (lower is better)", angle: 90, position: "insideRight" }}
              />

              {/* Smart popover (PORTALED) */}
              <RTooltip
                content={(tp: any) => (
                  <SmartTooltip
                    {...tp}
                    containerRect={chartWrapRef.current?.getBoundingClientRect() ?? null}
                    primary={primary}
                    pageColors={PAGE_COLORS}
                  />
                )}
                wrapperStyle={{ visibility: "hidden" }}
                allowEscapeViewBox={{ x: true, y: true }}
              />

              {/* Bars: PRIMARY (hover animates ONLY the hovered bar) */}
              {enabled["primary"] !== false && (
                <Bar
                  yAxisId="L"
                  dataKey={primary}
                  name={primaryLabel[primary]}
                  fill={TOKENS.action}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive
                >
                  {(chartData as any[]).map((_, i) => {
                    const isHover = i === hoverIdx;
                    return (
                      <Cell
                        key={`b-${i}`}
                        fill={isHover ? TOKENS.actionHover : TOKENS.action}
                        style={{
                          transition: "transform .16s ease, filter .16s ease, fill .12s ease",
                          transform: isHover ? "translateY(-3px) scaleY(1.03)" : "none",
                          transformBox: "fill-box",
                          transformOrigin: "center bottom",
                          filter: isHover ? "drop-shadow(0 2px 6px rgba(0,119,255,.35))" : "none",
                          cursor: "pointer",
                        }}
                        shapeRendering="geometricPrecision"
                      />
                    );
                  })}
                </Bar>
              )}

              {/* Avg position lines */}
              {enabled["avgPosition"] !== false && (
                <Line
                  yAxisId="R"
                  type="monotone"
                  dataKey="avgPosition"
                  name="Avg Position"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}

              {/* Top5 per-page lines (only when in top5 mode & enabled) */}
              {mode === "top5" &&
                top5.map((s) =>
                  enabled[`${s.label}-avgPosition`] === false ? null : (
                    <Line
                      key={s.label}
                      yAxisId="R"
                      type="monotone"
                      dataKey={`${s.label}-avgPosition`}
                      name={`Avg Pos — ${toShortLabel(s.label)}`}
                      stroke={["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"][top5.findIndex((x) => x.label === s.label) % 5]}
                      strokeWidth={1.6}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )
                )}

              {/* Anomaly markers */}
              {showAnom &&
                anomalies.map((a, i) => (
                  <ReferenceDot key={i} x={a.date} y={a.y} yAxisId="L" r={5} fill={a.up ? "#22C55E" : "#EF4444"} stroke="#fff" />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer meta */}
      <div className="mt-3 flex items-center justify-between text-[13px]" style={{ color: TOKENS.muted }}>
        <div>
          Mode: <b>{mode === "aggregate" ? "Aggregate" : "Top 5 Pages"}</b>
        </div>
        <div>Click a data point to jump the table to that date range.</div>
      </div>
    </div>
  );
}
