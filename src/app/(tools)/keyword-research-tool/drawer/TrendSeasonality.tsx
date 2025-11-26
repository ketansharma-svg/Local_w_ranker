"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  SlidersHorizontal, Info, Download, Lock, TrendingUp, TrendingDown, Minus,
  Image as ImageIcon, FileSpreadsheet, FileDown, ChevronDown
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",          // Branded icon color (updated)
  action: "var(--wr-action, #0077FF)",
  valueBlue: "var(--wr-valueBlue, #4286F5)",
  pastel: "var(--wr-bg-pastel, #D9EEF8)",
  ok: "var(--wr-ok, #10B981)",
  warn: "var(--wr-warn, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  radius: "var(--wr-radius, 6px)",
  shadowSm: "var(--wr-shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
};

/* ───────────────────────── Types ───────────────────────── */
type RangeKey = "3m" | "6m" | "12m";
type SmoothKey = "off" | "ema3" | "ema5";

export interface TrendPoint { month: string; volume: number | null; }   // ISO "YYYY-MM-01"
export interface TrendDataset {
  series: TrendPoint[];
  yoySeries?: TrendPoint[];   // optional: 12 months back
  gscSeries?: TrendPoint[];   // optional: site clicks (domain-aware)
  tm?: number;                // optional precomputed; else we compute
  seasonalityIndex?: number[]; // length 12 Jan..Dec, relative to median; else computed
  band?: { min: number; median: number; max: number }; // else computed
}

export interface TrendSeasonalityProps {
  keyword?: string;
  data: TrendDataset;
  projectConnected?: boolean;
  defaultRange?: RangeKey;
  defaultSmoothing?: SmoothKey;
  defaultShowYOY?: boolean;
  defaultShowGSC?: boolean;
}

/* ───────────────────────── Telemetry stub ───────────────────────── */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const envelope = { event, ts: new Date().toISOString(), props };
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail: envelope }));
}

/* ───────────────────────── Utilities ───────────────────────── */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtK = (n: number | null | undefined) =>
  n == null ? "—" : (n >= 1_000_000 ? `${(n/1e6).toFixed(1)}m` : n >= 1_000 ? `${(n/1e3).toFixed(1)}k` : String(Math.round(n)));

function ema(values: (number | null)[], span: number): (number | null)[] {
  let prev: number | null = null;
  const alpha = 2 / (span + 1);
  return values.map(v => {
    if (v == null) return prev;
    prev = prev == null ? v : alpha * v + (1 - alpha) * prev;
    return prev;
  });
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function computeTM(values: number[]): number {
  if (values.length < 3) return 0;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = values.reduce((a, b) => a + b, 0) / values.length;
  let num = 0, den = 0;
  for (let i = 0; i < values.length; i++) { const dx = xs[i] - meanX; num += dx * (values[i] - meanY); den += dx * dx; }
  const slope = den === 0 ? 0 : num / den;
  const norm = meanY === 0 ? 0 : slope / meanY;
  const deltas: number[] = [];
  for (let i = values.length - 2; i < values.length; i++) {
    if (i <= 0) continue;
    const prev = values[i - 1], curr = values[i];
    if (prev > 0) deltas.push((curr - prev) / prev);
  }
  const mom = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
  const tm = clamp((norm * 6) + (mom * 2), -2, 2);
  return Math.round(tm * 10) / 10;
}

function monthShort(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}
function computeBand(last12: (number | null)[]) {
  const vals = last12.filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return { min: 0, median: 0, max: 0 };
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { min: sorted[0], median, max: sorted[sorted.length - 1] };
}
function computeSeasonalityIndex(series: TrendPoint[]) {
  const buckets: Record<number, number[]> = {};
  series.forEach(p => {
    const d = new Date(p.month);
    const m = d.getMonth(); // 0..11
    if (p.volume != null) {
      buckets[m] = buckets[m] || [];
      buckets[m].push(p.volume);
    }
  });
  const avg: number[] = Array.from({ length: 12 }, (_, m) => {
    const arr = buckets[m] || [];
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  });
  const meds = avg.filter(x => x > 0).sort((a, b) => a - b);
  const median = meds.length ? meds[Math.floor(meds.length / 2)] : 1;
  return avg.map(v => (median === 0 ? 1 : v / median || 0));
}

/* ───────────────────────── Toggle chips / segmented ───────────────────────── */
const ToggleChip: React.FC<{
  active: boolean; label: string; onClick?: () => void; disabled?: boolean; title?: string; iconLeft?: React.ReactNode
}> = ({ active, label, onClick, disabled, title, iconLeft }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "h-8 px-3 rounded-full border text-sm inline-flex items-center gap-1",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#F7FAFC] cursor-pointer"
    )}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastel : "#FFF", color: active ? TK.text : TK.muted }}
    aria-pressed={active}
  >
    {iconLeft}{label}
  </button>
);

const Segmented: React.FC<{ value: RangeKey; onChange: (v: RangeKey) => void }> = ({ value, onChange }) => (
  <div
    className="inline-flex items-center p-0.5 rounded-[6px] bg-white"
    style={{ border: `1px solid ${TK.border}` }}
    role="radiogroup"
    aria-label="Range"
  >
    {(["3m","6m","12m"] as RangeKey[]).map(k => (
      <button
        key={k}
        role="radio"
        aria-checked={value === k}
        onClick={() => onChange(k)}
        className="px-3 h-8 text-[13px] font-semibold rounded-[6px] cursor-pointer"
        style={value === k
          ? { background: TK.pastel, color: TK.text, border: `1px solid ${TK.border}` }
          : { background: "#FFF", color: TK.muted, border: `1px solid ${TK.border}` }}
      >
        {k.toUpperCase()}
      </button>
    ))}
  </div>
);

/* ───────────────────────── Section Card (with branded icon) ───────────────────────── */
const SectionCard: React.FC<React.PropsWithChildren<{ title: string; right?: React.ReactNode }>> = ({ title, right, children }) => (
  <div
    className="rounded-[6px] bg-white border"
    style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm, fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui" }}
  >
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" color={TK.brand} aria-hidden />
        <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>{title}</h3>
      </div>
      {right}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

/* ───────────────────────── Chart (area + smart popover) ───────────────────────── */

type SparklineProps = {
  width?: number;
  height?: number;
  series: TrendPoint[];
  yoy?: TrendPoint[] | null;
  gsc?: TrendPoint[] | null;
  smoothing: SmoothKey;
  range: RangeKey;
  ariaLabel?: string;
  svgRef?: React.Ref<SVGSVGElement>;
};

const DotSwatch: React.FC<{ color: string; title?: string }> = ({ color, title }) => (
  <span className="inline-block rounded-full" title={title} style={{ width: 8, height: 8, background: color }} />
);

const Sparkline: React.FC<SparklineProps> = ({
  width = 720, height = 200, series, yoy, gsc, smoothing, range, ariaLabel, svgRef
}) => {
  const pad = { t: 16, r: 12, b: 24, l: 12 };

  // Measure container to use FULL panel width
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [W, setW] = React.useState<number>(width);
  const H = height;
  const innerW = React.useMemo(() => W - pad.l - pad.r, [W]);
  const innerH = React.useMemo(() => H - pad.t - pad.b, [H]);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      // Clamp to a sensible minimum to avoid divide-by-zero
      setW(Math.max(320, Math.floor(cr.width)));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const valuesRaw = series.map(p => p.volume);
  const values = React.useMemo(() => {
    const vs = [...valuesRaw];
    if (smoothing === "ema3") return ema(vs, 3);
    if (smoothing === "ema5") return ema(vs, 5);
    return vs;
  }, [valuesRaw, smoothing]);

  const lastIdx = series.length - 1;
  const winLen = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const start = Math.max(0, lastIdx - (winLen - 1));
  const winSeries = React.useMemo(() => series.slice(start), [series, start]);
  const winValues = React.useMemo(() => values.slice(start), [values, start]);
  const yoyWin = React.useMemo(() => (yoy ? yoy.slice(start) : null), [yoy, start]);
  const gscWin = React.useMemo(() => (gsc ? gsc.slice(start) : null), [gsc, start]);

  const maxVal = React.useMemo(() => Math.max(
    1,
    ...winValues.filter((v): v is number => v != null) as number[],
    ...(yoyWin || []).map(p => p.volume || 0),
    ...(gscWin || []).map(p => p.volume || 0)
  ), [winValues, yoyWin, gscWin]);

  const minVal = React.useMemo(() => Math.min(
    0,
    ...winValues.filter((v): v is number => v != null) as number[],
    ...(yoyWin || []).map(p => p.volume || 0),
    ...(gscWin || []).map(p => p.volume || 0)
  ), [winValues, yoyWin, gscWin]);

  const x = React.useCallback((i: number) => pad.l + (i / Math.max(1, winSeries.length - 1)) * innerW, [pad.l, innerW, winSeries.length]);
  const y = React.useCallback((v: number | null) => {
    if (v == null) return pad.t + innerH;
    const t = (v - minVal) / (maxVal - minVal || 1);
    return pad.t + (1 - t) * innerH;
  }, [innerH, pad.t, minVal, maxVal]);

  function pathFrom(vals: (number | null)[]) {
    return vals.reduce((acc, v, i) => {
      const xi = x(i), yi = y(v == null ? 0 : v);
      return acc + (i === 0 ? `M ${xi},${yi}` : ` L ${xi},${yi}`);
    }, "");
  }

  const areaPath = React.useMemo(() => {
    if (winValues.length === 0) return "";
    const top = pathFrom(winValues);
    const lastX = x(winValues.length - 1);
    const firstX = x(0);
    const baseY = y(minVal);
    return `${top} L ${lastX},${baseY} L ${firstX},${baseY} Z`;
  }, [winValues, minVal, x, y]);

  const linePath = React.useMemo(() => pathFrom(winValues), [winValues, x, y]);
  const yoyPath = React.useMemo(() => (yoyWin ? pathFrom(yoyWin.map(p => p.volume)) : ""), [yoyWin, x, y]);
  const gscPath = React.useMemo(() => (gscWin ? pathFrom(gscWin.map(p => p.volume)) : ""), [gscWin, x, y]);

  const peakIdxs = React.useMemo(() => {
    const vals = winValues.filter((v): v is number => v != null);
    if (vals.length === 0) return [] as number[];
    const max = Math.max(...vals);
    return winValues.map(v => v ?? -Infinity).map((v, i) => (v === max ? i : -1)).filter(i => i >= 0);
  }, [winValues]);

  /* Hover state + smart popover position (follows cursor) */
  const [hoverI, setHoverI] = React.useState<number | null>(null);
  const [popXY, setPopXY] = React.useState<{ x: number; y: number } | null>(null);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const innerWActual = rect.width - pad.l - pad.r;
    if (innerWActual <= 0 || winSeries.length === 0) return;
    const fx = (e.clientX - rect.left - pad.l) / innerWActual;
    const i = clamp(Math.round(fx * (winSeries.length - 1)), 0, winSeries.length - 1);
    setHoverI(i);

    // position popover near cursor inside container
    const parent = containerRef.current?.getBoundingClientRect();
    if (parent) {
      const loX = e.clientX - parent.left;
      const loY = e.clientY - parent.top;
      setPopXY({ x: loX, y: loY });
    }
  }
  function handleLeave() { setHoverI(null); setPopXY(null); }

  const hov = React.useMemo(() => {
    if (hoverI == null) return null;
    const p = winSeries[hoverI];
    const v = winValues[hoverI] ?? null;
    const yv = yoyWin?.[hoverI]?.volume ?? null;
    const gv = gscWin?.[hoverI]?.volume ?? null;

    let deltaText = "—";
    if (hoverI > 0) {
      const prev = winValues[hoverI - 1] ?? null;
      if (prev && v) {
        const d = ((v - prev) / prev) * 100;
        deltaText = `${d >= 0 ? "+" : ""}${Math.round(d)}%`;
      }
    }
    const d = new Date(p.month);
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return { label, v, yv, gv, xi: x(hoverI), yi: y(v ?? 0), deltaText };
  }, [hoverI, winSeries, winValues, yoyWin, gscWin, x, y]);

  // Clamp smart popover inside container, prefer right, flip if close to edge
  const popStyle: React.CSSProperties | undefined = React.useMemo(() => {
    if (!popXY || !containerRef.current || !hov) return;
    const PADDING = 8, TW = 220, TH = 120;
    const rect = containerRef.current.getBoundingClientRect();
    const preferLeft = popXY.x + TW + PADDING > rect.width;
    const left = clamp(preferLeft ? popXY.x - TW - 12 : popXY.x + 12, 4, rect.width - TW - 4);
    const top = clamp(popXY.y - TH - 8, 4, rect.height - TH - 4);
    return {
      position: "absolute",
      left, top,
      width: TW, height: "auto",
      zIndex: 20,
      border: `1px solid ${TK.borderLight}`,
      background: "#FFF",            // same as panel background
      borderRadius: 8,
      boxShadow: TK.shadowSm,
      pointerEvents: "none",
      padding: 8,
    };
  }, [popXY, hov]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef as React.Ref<SVGSVGElement>}
        role="img"
        aria-label={ariaLabel || "Trend line"}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block cursor-crosshair"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {/* area */}
        <path d={areaPath} fill={TK.pastel} fillOpacity={0.18} />
        {/* YOY dashed */}
        {yoyPath && <path d={yoyPath} stroke="#93B5E1" strokeDasharray="5,4" strokeWidth={2} fill="none" />}
        {/* GSC overlay */}
        {gscPath && <path d={gscPath} stroke={TK.brand} strokeWidth={1.5} fill="none" />}
        {/* main line */}
        <path d={linePath} stroke={TK.valueBlue} strokeWidth={2} fill="none" />

        {/* current month rule */}
        {winSeries.length > 0 && (
          <line x1={x(winSeries.length - 1)} x2={x(winSeries.length - 1)} y1={pad.t} y2={pad.t + innerH} stroke={TK.borderLight} />
        )}

        {/* x-axis labels (max 6 ticks) */}
        {winSeries.map((p, i) => {
          const step = Math.ceil(winSeries.length / 6);
          if (i % step !== 0 && i !== winSeries.length - 1) return null;
          return (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="text-[10px]" style={{ fill: TK.muted }}>
              {MONTHS[new Date(p.month).getMonth()]}
            </text>
          );
        })}

        {/* peaks */}
        {peakIdxs.map(i => (
          <polygon
            key={i}
            points={`${x(i)},${y(winValues[i] || 0) - 5} ${x(i)+5},${y(winValues[i] || 0)} ${x(i)},${y(winValues[i] || 0)+5} ${x(i)-5},${y(winValues[i] || 0)}`}
            fill={TK.brand}
          />
        ))}

        {/* hover marker */}
        {hov && (
          <>
            <line x1={hov.xi} x2={hov.xi} y1={pad.t} y2={pad.t + innerH} stroke={TK.border} strokeDasharray="3,3" />
            <circle cx={hov.xi} cy={hov.yi} r={3.5} fill={TK.valueBlue} stroke="#fff" strokeWidth={1} />
          </>
        )}
      </svg>

      {/* Smart popover (global pattern, follows cursor) */}
      {hov && popStyle && (
        <div style={popStyle}>
          <div className="text-[12px] font-semibold mb-1" style={{ color: TK.text }}>{hov.label}</div>
          <ul className="space-y-1 text-[12px]">
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><DotSwatch color={TK.valueBlue} /> Trend</span>
              <span style={{ color: TK.text }}>{fmtK(hov.v)}</span>
            </li>
            {yoy && (
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><DotSwatch color={"#93B5E1"} /> YOY</span>
                <span style={{ color: TK.text }}>{fmtK(hov.yv)}</span>
              </li>
            )}
            {gsc && (
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><DotSwatch color={TK.brand} /> GSC</span>
                <span style={{ color: TK.text }}>{fmtK(hov.gv)}</span>
              </li>
            )}
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><DotSwatch color={TK.muted} /> Δ MoM</span>
              <span style={{ color: TK.text }}>{hov.deltaText}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Heat Map (month label under bubble) ───────────────────────── */
const HeatCell: React.FC<{
  label: string; value: number; isPeak?: boolean;
}> = ({ label, value, isPeak }) => {
  let bg = "#F7F8FA"; // < 0.75
  if (value >= 1.25) bg = "#1090D0";
  else if (value >= 1.10) bg = "#42A6E3";
  else if (value >= 0.90) bg = "#EAF5FD";
  else if (value >= 0.75) bg = "#F2F4F7";

  const hatch = value >= 1.25
    ? "repeating-linear-gradient(45deg, rgba(255,255,255,.14), rgba(255,255,255,.14) 4px, rgba(255,255,255,0) 4px, rgba(255,255,255,0) 8px)"
    : "none";

  return (
    <div className="flex flex-col items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={`${label} — ${value >= 1 ? "+" : ""}${Math.round((value - 1) * 100)}% vs median`}
            className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-md border relative focus:outline-none focus:ring-2 cursor-pointer")}
            style={{
              borderColor: TK.borderLight,
              background: bg,
              boxShadow: isPeak ? `inset 0 0 0 2px ${TK.action}` : "none",
            }}
          >
            <div className="absolute inset-0 rounded-md" style={{ backgroundImage: hatch }} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {label} — {value >= 1 ? "+" : ""}{Math.round((value - 1) * 100)}% vs median
        </TooltipContent>
      </Tooltip>
      {/* Full month name directly under the bubble */}
      <div className="text-[11px]" style={{ color: TK.muted }}>{label}</div>
    </div>
  );
};

/* ───────────────────────── TM Meter ───────────────────────── */
const TMMeter: React.FC<{ tm: number }> = ({ tm }) => {
  let Arrow = Minus; let color = TK.muted; let label = `${tm >= 0 ? "+" : ""}${tm.toFixed(1)}`;
  if (tm >= 1.0) { Arrow = TrendingUp; color = TK.valueBlue; }
  else if (tm >= 0.25) { Arrow = TrendingUp; color = TK.brand; }
  else if (tm <= -1.0) { Arrow = TrendingDown; color = TK.critical; }
  else if (tm <= -0.25) { Arrow = TrendingDown; color = TK.warn; }

  const pos = ((tm + 2) / 4) * 100; // -2..+2 → 0..100

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 text-sm cursor-default" title="Trend Momentum">
            <Arrow className="h-4 w-4" style={{ color }} />
            <span className="px-2 py-0.5 rounded-full text-[12px]" style={{ background: "#F3F7FF", color: TK.text }}>
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          Momentum over the selected period. Calculated from normalized trend slope and recent MoM deltas.
        </TooltipContent>
      </Tooltip>
      <div className="flex-1 h-2 rounded-full relative" style={{ background: "#EEF2F7" }}>
        <div className="absolute left-1/2 top-0 h-full w-[2px]" style={{ background: TK.borderLight }} />
        <div className="absolute top-[-3px] h-3.5 w-3.5 rounded-full" style={{ left: `calc(${pos}% - 7px)`, background: TK.valueBlue, border: `1px solid ${TK.border}` }} />
      </div>
      <div className="text-xs text-muted-foreground">−2</div>
      <div className="text-xs text-muted-foreground">+2</div>
    </div>
  );
};

/* ───────────────────────── Export helpers ───────────────────────── */
async function download(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function svgToPng(svgEl: SVGSVGElement, width: number, height: number, filename: string) {
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    download(`${filename}.png`, png);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
function buildCsv(series: TrendPoint[], yoy?: TrendPoint[] | null, gsc?: TrendPoint[] | null) {
  const header = ["month","trend","yoy","gsc"];
  const rows = series.map((p, i) => {
    const y = yoy?.[i]?.volume ?? "";
    const g = gsc?.[i]?.volume ?? "";
    return [p.month, p.volume ?? "", y, g].join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

/* ───────────────────────── Main section ───────────────────────── */
export const TrendSeasonalitySection: React.FC<TrendSeasonalityProps> = ({
  keyword = "keyword",
  data,
  projectConnected = false,
  defaultRange = "12m",
  defaultSmoothing = "off",
  defaultShowYOY = false,
  defaultShowGSC = false,
}) => {
  const [range, setRange] = React.useState<RangeKey>(defaultRange);
  const [smoothing, setSmoothing] = React.useState<SmoothKey>(defaultSmoothing);
  const [showYOY, setShowYOY] = React.useState<boolean>(defaultShowYOY && !!data.yoySeries?.length);
  const [showGSC, setShowGSC] = React.useState<boolean>(defaultShowGSC && !!data.gscSeries?.length && projectConnected);

  const lastIdx = data.series.length - 1;
  const windowLen = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const start = Math.max(0, lastIdx - (windowLen - 1));

  const windowSeries = React.useMemo(() => data.series.slice(start), [data.series, start]);
  const windowYOY = React.useMemo(() => showYOY ? data.yoySeries?.slice(start) ?? null : null, [showYOY, data.yoySeries, start]);
  const windowGSC = React.useMemo(() => showGSC ? data.gscSeries?.slice(start) ?? null : null, [showGSC, data.gscSeries, start]);

  const tm = React.useMemo(() => {
    if (typeof data.tm === "number") return data.tm;
    const vals = windowSeries.map(p => p.volume ?? 0);
    return computeTM(vals);
  }, [data.tm, windowSeries]);

  const seasonality = React.useMemo(() => data.seasonalityIndex ?? computeSeasonalityIndex(data.series.slice(-12)), [data.seasonalityIndex, data.series]);
  const band = React.useMemo(() => data.band ?? computeBand(data.series.slice(-12).map(p => p.volume)), [data.band, data.series]);

  const peakMonthsIdx = seasonality.map((v, i) => v >= 1.2 ? i : -1).filter(i => i >= 0);
  const peakRanges: number[][] = [];
  if (peakMonthsIdx.length) {
    let run: number[] = [peakMonthsIdx[0]];
    for (let i = 1; i < peakMonthsIdx.length; i++) {
      if (peakMonthsIdx[i] === peakMonthsIdx[i - 1] + 1) run.push(peakMonthsIdx[i]); else { peakRanges.push(run); run = [peakMonthsIdx[i]]; }
    }
    if (run.length) peakRanges.push(run);
  }
  const strongRange = peakRanges.find(r => r.length >= 2) || null;

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const svgWidth = 1100, svgHeight = 220; // used only for PNG export sizing

  function onRangeChange(v: RangeKey) { setRange(v); krTrack("kr.trend.range_changed", { range: v }); }
  function onSmoothChange(v: SmoothKey) { setSmoothing(v); krTrack("kr.trend.smoothing_changed", { mode: v }); }
  function toggleYOY() { const next = !showYOY && !!data.yoySeries?.length; setShowYOY(next); krTrack("kr.trend.yoy_toggled", { on: next }); }
  function toggleGSC() {
    const next = !showGSC;
    if (!projectConnected || !data.gscSeries?.length) return;
    setShowGSC(next); krTrack("kr.trend.gsc_overlay_toggled", { on: next });
  }

  function doExport(kind: "png" | "svg" | "csv") {
    if (kind === "csv") {
      const csv = buildCsv(windowSeries, windowYOY || undefined, windowGSC || undefined);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      download(`trend-${keyword}.csv`, url);
      URL.revokeObjectURL(url);
      krTrack("kr.trend.export_clicked", { type: "csv" });
      return;
    }
    const svgEl = svgRef.current;
    if (!svgEl) return;
    if (kind === "svg") {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
      download(`trend-${keyword}.svg`, url);
      krTrack("kr.trend.export_clicked", { type: "svg" });
    } else {
      svgToPng(svgEl, svgWidth, svgHeight, `trend-${keyword}`);
      krTrack("kr.trend.export_clicked", { type: "png" });
    }
  }

  const rightControls = (
    <div className="flex items-center gap-2 flex-wrap">
      <Segmented value={range} onChange={onRangeChange} />
      <div className="flex items-center gap-1 text-sm">
        <span className="text-[12px] text-muted-foreground">Smoothing</span>
        <Select value={smoothing} onValueChange={(v: any) => onSmoothChange(v)}>
          <SelectTrigger className="h-8 w-[160px] cursor-pointer"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="ema3">Light (EMA‑3)</SelectItem>
            <SelectItem value="ema5">Strong (EMA‑5)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <ToggleChip
              active={showYOY}
              onClick={toggleYOY}
              label="YOY"
              disabled={!data.yoySeries?.length}
              title={data.yoySeries?.length ? "Overlay last year's period" : "YOY requires ≥24 months"}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {data.yoySeries?.length ? "Overlay last year's period for context." : "YOY requires ≥24 months of data."}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <ToggleChip
              active={showGSC}
              onClick={toggleGSC}
              label={projectConnected ? "GSC overlay" : "GSC (locked)"}
              disabled={!projectConnected || !data.gscSeries?.length}
              title={projectConnected ? (data.gscSeries?.length ? "Overlay site clicks from GSC" : "No GSC data") : "Connect GSC to overlay site clicks"}
              iconLeft={!projectConnected ? <Lock className="h-3.5 w-3.5" /> : undefined}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {projectConnected ? (data.gscSeries?.length ? "Overlay site clicks" : "No GSC data available") : "Connect GSC to overlay site clicks."}
        </TooltipContent>
      </Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 cursor-pointer">
            <Download className="h-4 w-4 mr-1" /> Export <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[200px]">
          <button className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-[#F7FAFC] cursor-pointer" onClick={() => doExport("png")}>
            <ImageIcon className="h-4 w-4" /> PNG
          </button>
          <button className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-[#F7FAFC] cursor-pointer" onClick={() => doExport("svg")}>
            <FileDown className="h-4 w-4" /> SVG
          </button>
          <button className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-[#F7FAFC] cursor-pointer" onClick={() => doExport("csv")}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <TooltipProvider delayDuration={120}>
      <SectionCard title="Trend & Seasonality" right={rightControls}>
        {/* Legend */}
        <div className="px-3 pt-2">
          <div className="flex items-center gap-4 text-[12px] mb-1">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: TK.valueBlue }} />
              Trend
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "#93B5E1" }} />
              YOY (dashed)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: TK.brand }} />
              GSC clicks
            </span>
          </div>
        </div>

        {/* Chart — full panel width */}
        <div className="w-full">
          <Sparkline
            svgRef={svgRef}
            height={220}
            series={windowSeries}
            yoy={showYOY ? (windowYOY || null) : null}
            gsc={showGSC ? (windowGSC || null) : null}
            smoothing={smoothing}
            range={range}
            ariaLabel={`Trend line for ${keyword}, last ${range}`}
          />
        </div>

        {/* TM Meter */}
        <div className="mt-3">
          <TMMeter tm={tm} />
        </div>

        {/* Seasonality Heat Map (month labels under bubbles) */}
        <div className="mt-4 rounded-[6px] border p-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium" style={{ color: TK.text }}>Seasonality (relative to median)</div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>Low</span>
              <span className="inline-block h-3 w-6 rounded" style={{ background: "#F7F8FA", border: `1px solid ${TK.borderLight}` }} />
              <span className="inline-block h-3 w-6 rounded" style={{ background: "#F2F4F7", border: `1px solid ${TK.borderLight}` }} />
              <span className="inline-block h-3 w-6 rounded" style={{ background: "#EAF5FD", border: `1px solid ${TK.borderLight}` }} />
              <span className="inline-block h-3 w-6 rounded" style={{ background: "#42A6E3", border: `1px solid ${TK.borderLight}` }} />
              <span className="inline-block h-3 w-6 rounded" style={{ background: "#1090D0", border: `1px solid ${TK.borderLight}` }} />
              <span>High</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 sm:gap-3">
            {Array.from({ length: 12 }, (_, idx) => {
              const v = seasonality[idx] ?? 1;
              const isPeak = v >= 1.2;
              return <HeatCell key={idx} label={MONTHS[idx]} value={v} isPeak={isPeak} />;
            })}
          </div>

          {/* Band chips */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: TK.borderLight }}>Min {fmtK(band.min)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: TK.borderLight }}>Median {fmtK(band.median)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: TK.borderLight }}>Max {fmtK(band.max)}</span>
          </div>
        </div>

        {/* Planning helper */}
        <div className="mt-3 text-sm text-muted-foreground">
          {strongRange
            ? <>Plan content <strong style={{ color: TK.text }}>6–8 weeks</strong> before peak months:{" "}
                <strong style={{ color: TK.text }}>
                  {MONTHS[strongRange[0]]}–{MONTHS[strongRange[strongRange.length - 1]]}
                </strong>.
              </>
            : <>No strong seasonality detected; publish consistently.</>}
        </div>

        {/* Screen-reader table (a11y) */}
        <div className="sr-only" aria-hidden={false}>
          <table>
            <caption>Trend values for {keyword} ({range})</caption>
            <thead><tr><th>Month</th><th>Trend</th><th>YOY</th><th>GSC</th></tr></thead>
            <tbody>
              {windowSeries.map((p, i) => (
                <tr key={p.month}>
                  <td>{monthShort(p.month)}</td>
                  <td>{p.volume ?? ""}</td>
                  <td>{windowYOY?.[i]?.volume ?? ""}</td>
                  <td>{windowGSC?.[i]?.volume ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </TooltipProvider>
  );
};

/* ───────────────────────── Demo wrapper (remove in prod) ───────────────────────── */
export default function DemoTrendSeasonality() {
  // Mock 12 months data (Sep 2024 → Aug 2025)
  const base = new Date("2024-09-01T00:00:00Z").getTime();
  const series: TrendPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(base + i * 30 * 86400000); // approx month step
    const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
    // Seasonal pattern peaking Apr–Jun with some growth
    const m = new Date(month).getUTCMonth(); // 0..11
    const seasonal = [0.9, 0.95, 1.0, 1.18, 1.28, 1.16, 0.98, 0.96, 0.92, 0.9, 0.88, 0.87][m];
    const baseVol = 4800 + i * 80;
    const vol = Math.round(baseVol * seasonal);
    return { month, volume: vol };
  });

  const yoySeries: TrendPoint[] = series.map(p => ({ month: p.month, volume: p.volume ? Math.round(p.volume * 0.88) : null }));
  const gscSeries: TrendPoint[] = series.map(p => ({ month: p.month, volume: p.volume ? Math.round(p.volume * 0.07) : null }));

  const data: TrendDataset = { series, yoySeries, gscSeries };

  return (
    <div className="p-4" style={{ fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui" }}>
      <TrendSeasonalitySection
        keyword="technical seo checklist"
        data={data}
        projectConnected={true}
        defaultRange="12m"
        defaultSmoothing="off"
        defaultShowYOY={true}
        defaultShowGSC={true}
      />
    </div>
  );
}
