"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Search,
  Globe,
  Laptop,
  Smartphone,
  Sparkles,
} from "lucide-react";

/* ===================== Tokens ===================== */
const TOKENS = {
  brand: "#008CCD",
  border: "#EFF0F6",
  chipBg: "#FFFFFF",
  chipHover: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  warning: "#F59E0B",
  critical: "#EF4444",
  good: "#10B981",
  // metric palette
  clicks: "#0077FF",
  sessions: "#059669",
  impressions: "#4F46E5",
  conversions: "#8B5CF6",
  ctr: "#F59E0B",
  avg_position: "#0EA5E9",
};
const RADIUS = 6;

/* ===================== Types ===================== */
export type MetricKey =
  | "clicks"
  | "impressions"
  | "sessions"
  | "conversions"
  | "avg_position"
  | "ctr";

export type SourceKey = "gsc" | "ga4";
export type DeviceSeg = "all" | "desktop" | "mobile";
export type BrandSeg = "all" | "brand" | "nonbrand";
export type Granularity = "daily" | "weekly" | "monthly";
export type CompareMode = "off" | "prev_period" | "prev_year";
export type SourceFilter = "all" | "gsc" | "ga4";

export interface SeriesPoint { t: string; v: number }
export interface TimeSeries { metric: MetricKey; points: SeriesPoint[] }
export interface AnomalyPoint {
  t: string; value: number; deltaPct: number; severity: "warning" | "critical";
  topContributor?: { dim: "device" | "country" | "brand"; key: string; share: number };
}
export interface TrafficVisibilityPayload {
  metric: MetricKey;
  source: SourceFilter;
  granularity: Granularity;
  device: DeviceSeg;
  countries: string[];
  brand: BrandSeg;
  primary: TimeSeries;
  compare?: TimeSeries;
  anomalies?: AnomalyPoint[];
  unit: "%" | "abs";
  latencyNote?: string;
  disconnected?: boolean;
}

/* ===================== Props ===================== */
export interface TrafficVisibilitySectionProps {
  data?: TrafficVisibilityPayload;
  sourcesConnected?: { gsc: boolean; ga4: boolean };
  defaults?: {
    metrics?: MetricKey[];
    device?: DeviceSeg;
    countries?: string[];
    brand?: BrandSeg;
    source?: SourceFilter;
    granularity?: Granularity;
    compare?: CompareMode;
    smoothing?: boolean;
  };
  onFiltersChange?: (f: {
    metrics: MetricKey[];
    device: DeviceSeg;
    countries: string[];
    brand: BrandSeg;
    source: SourceFilter;
    granularity: Granularity;
    compare: CompareMode;
    smoothing: boolean;
  }) => void;
  onExport?: (current?: TrafficVisibilityPayload) => void;
  onRefresh?: () => void;
  onConnectSource?: (src: SourceKey) => void;
  onOpenAffectedView?: (e: { metric: MetricKey; t: string; severity?: "warning" | "critical" }) => void;
}

/* ===================== Helpers & constants ===================== */
const METRIC_LABEL: Record<MetricKey, string> = {
  clicks: "Clicks",
  impressions: "Impressions",
  sessions: "Sessions",
  conversions: "Conversions",
  avg_position: "Avg Position",
  ctr: "CTR",
};
const METRIC_SOURCE: Record<MetricKey, SourceKey> = {
  clicks: "gsc",
  impressions: "gsc",
  sessions: "ga4",
  conversions: "ga4",
  avg_position: "gsc",
  ctr: "gsc",
};
const METRIC_ORDER: MetricKey[] = ["clicks", "sessions", "impressions", "conversions", "ctr", "avg_position"];
const METRIC_COLOR: Record<MetricKey, string> = {
  clicks: TOKENS.clicks,
  sessions: TOKENS.sessions,
  impressions: TOKENS.impressions,
  conversions: TOKENS.conversions,
  ctr: TOKENS.ctr,
  avg_position: TOKENS.avg_position,
};

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  const num = parseInt(raw, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}
function pastel(hex: string, alpha = 0.22) {
  return `rgba(${hexToRgb(hex)}, ${alpha})`;
}
function cx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }

function formatValue(v: number, unit: "%" | "abs") {
  if (!Number.isFinite(v)) return "—";
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${Math.round(v)}`;
}
function formatDateISO(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
function sma(points: SeriesPoint[], w = 7) {
  if (!points.length) return points;
  const out: SeriesPoint[] = [];
  let sum = 0;
  const q: number[] = [];
  for (let i = 0; i < points.length; i++) {
    q.push(points[i].v);
    sum += points[i].v;
    if (q.length > w) sum -= q.shift()!;
    out.push({ t: points[i].t, v: sum / q.length });
  }
  return out;
}
function isHigherBetter(m: MetricKey) { return m !== "avg_position"; }

/* ===================== Toolbar primitives ===================== */
function ToolbarChip({
  children, onClick, className, disabled, title,
}: React.PropsWithChildren<{ onClick?: () => void; className?: string; disabled?: boolean; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "h-9 px-3 rounded border inline-flex items-center gap-2 text-sm",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50",
        className
      )}
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
    >
      {children}
    </button>
  );
}
function Segmented<T extends string>({
  options, value, onChange, ariaLabel, disabledKeys = [],
}: {
  options: { key: T; label: string; icon?: React.ComponentType<{ size?: number }> }[];
  value: T; onChange: (k: T) => void; ariaLabel?: string; disabledKeys?: T[];
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex overflow-hidden border rounded" style={{ borderColor: TOKENS.border }}>
      {options.map((o, idx) => {
        const isActive = value === o.key;
        const Icon = o.icon;
        const disabled = disabledKeys.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            className={cx("px-2.5 h-9 flex items-center gap-1.5 text-[13px]", idx > 0 && "border-l", disabled && "opacity-50 cursor-not-allowed")}
            style={{
              borderColor: TOKENS.border,
              background: isActive ? pastel(TOKENS.clicks, 0.25) : TOKENS.chipBg,
              color: isActive ? TOKENS.clicks : TOKENS.text,
            }}
            onClick={() => !disabled && onChange(o.key)}
          >
            {Icon && <Icon size={16}   />}
            <span className={isActive ? "font-semibold" : "font-medium"}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm" style={{ color: TOKENS.text }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("h-6 w-11 rounded-full relative transition-colors", checked ? "bg-[#0F172A]" : "bg-gray-300/70")}
      >
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-5" : "left-0.5")} />
      </button>
    </div>
  );
}

/* ===================== Country dropdown (multi) — Select all fixed ===================== */
const COUNTRY_OPTS: [string, string][] = [
  ["US", "United States"], ["GB", "United Kingdom"], ["IN", "India"], ["AU", "Australia"],
  ["CA", "Canada"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"], ["SG", "Singapore"],
];
function CountryDropdown({ values, onChange }: { values: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (!open) return; if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = COUNTRY_OPTS.filter(([, name]) => name.toLowerCase().includes(q.toLowerCase()));
  const allCodes = (q.trim() ? filtered : COUNTRY_OPTS).map(([code]) => code);

  return (
    <div className="relative" ref={ref}>
      <ToolbarChip onClick={() => setOpen(s => !s)}>
        <Globe size={16} className="text-[#6B7280]" />
        Country – {values.length === 0 ? "All" : `${values.length} selected`}
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ToolbarChip>
      {open && (
        <div className="absolute z-50 mt-2 min-w-[260px] bg-white shadow rounded border" style={{ borderColor: TOKENS.border }}>
          <div className="p-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center gap-2 rounded border px-2 py-1.5" style={{ borderColor: TOKENS.border }}>
              <Search size={16} className="text-[#9CA3AF]" />
              <input className="w-full text-sm outline-none" placeholder="Search country" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="max-h-[280px] overflow-auto">
            {filtered.map(([code, name]) => {
              const checked = values.includes(code);
              return (
                <label key={code} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? Array.from(new Set([...values, code])) : values.filter((c) => c !== code);
                      onChange(next);
                    }}
                  />
                  <span>{name}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center gap-3">
              <button className="text-sm underline" onClick={() => onChange(allCodes)}>Select all</button>
              <button className="text-sm underline" onClick={() => onChange([])}>Clear</button>
            </div>
            <button className="text-sm underline" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Compare dropdown ===================== */
function CompareDropdown({ value, onChange }: { value: CompareMode; onChange: (v: CompareMode) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (!open) return; if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const label = value === "off" ? "Off" : value === "prev_period" ? "Prev period" : "Prev year";
  return (
    <div className="relative" ref={ref}>
      <ToolbarChip onClick={() => setOpen(s => !s)}>
        <SlidersHorizontal size={16} className="text-[#6B7280]" />
        Compare – {label}
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ToolbarChip>
      {open && (
        <div className="absolute z-50 mt-2 min-w-[220px] bg-white shadow rounded border" style={{ borderColor: TOKENS.border }}>
          {(["off", "prev_period", "prev_year"] as CompareMode[]).map((k) => (
            <button key={k} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { onChange(k); setOpen(false); }}>
              {k === "off" ? "Off" : k === "prev_period" ? "Prev period" : "Prev year"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Metric dropdown (multi-select with colored dots) ===================== */
function MetricDropdown({
  selected, onChange, sourcesConnected, sourceFilter, onConnectSource,
}: {
  selected: MetricKey[];
  onChange: (next: MetricKey[]) => void;
  sourcesConnected: { gsc: boolean; ga4: boolean };
  sourceFilter: SourceFilter;
  onConnectSource?: (src: SourceKey) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (!open) return; if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items = METRIC_ORDER.map((m) => {
    const src = METRIC_SOURCE[m];
    const allowed = sourceFilter === "all" || sourceFilter === src;
    const connected = sourcesConnected[src];
    const disabled = !(allowed && connected);
    return { key: m, label: METRIC_LABEL[m], color: METRIC_COLOR[m], disabled, src };
  });

  const title =
    selected.length === METRIC_ORDER.length
      ? "All"
      : selected.length === 1
      ? METRIC_LABEL[selected[0]]
      : `${selected.length} selected`;

  const toggle = (m: MetricKey, disabled: boolean, src: SourceKey) => {
    if (disabled) { onConnectSource?.(src); return; }
    const has = selected.includes(m);
    if (has) {
      if (selected.length === 1) return; // keep at least one
      onChange(selected.filter((x) => x !== m));
    } else {
      onChange([...selected, m]);
    }
  };

  const selectAllAvailable = () => {
    const avail = items.filter(i => !i.disabled).map(i => i.key);
    if (avail.length === 0) return;
    onChange(avail);
  };

  return (
    <div className="relative" ref={ref}>
      <ToolbarChip onClick={() => setOpen(s => !s)} title="Metrics">
        Metrics – {title}
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ToolbarChip>
      {open && (
        <div className="absolute z-50 mt-2 min-w-[260px] bg-white shadow rounded border" style={{ borderColor: TOKENS.border }}>
          <div className="max-h-[320px] overflow-auto py-1">
            {items.map(({ key, label, color, disabled, src }) => (
              <label key={key} className={cx("flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-50", disabled && "opacity-50")}>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <span>{label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={selected.includes(key)}
                  disabled={disabled}
                  onChange={() => toggle(key, disabled, src)}
                />
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center gap-3">
              <button className="text-sm underline" onClick={selectAllAvailable}>Select all</button>
              <button className="text-sm underline" onClick={() => onChange([selected[0] ?? "clicks"])}>Keep first only</button>
              <button className="text-sm underline" onClick={() => onChange(["clicks"])}>Reset</button>
            </div>
            <button className="text-sm underline" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Measure hook ===================== */
function useMeasure<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setSize({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

/* ===================== Chart types ===================== */
type SeriesBundle = {
  metric: MetricKey;
  unit: "%" | "abs";
  color: string;
  inverted: boolean;
  points: SeriesPoint[];
  compare?: SeriesPoint[];
  anomalies?: AnomalyPoint[];
};

/* ===================== Unified Chart ===================== */
function UnifiedChart({
  series,
  smoothing,
  normalize,               // true when multi-metric -> indexed 0..1
  onOpenAffectedView,
}: {
  series: SeriesBundle[];
  smoothing: boolean;
  normalize: boolean;
  onOpenAffectedView?: (t: string) => void;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const height = 340;
  const pad = { top: 12, right: 16, bottom: 28, left: 44 };
  const w = Math.max(320, width);
  const h = height;

  const base = series[0]?.points ?? [];
  const count = base.length;
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const stepX = count > 1 ? innerW / (count - 1) : innerW;

  const xAt = (i: number) => pad.left + i * stepX;

  // Single-metric Y domain
  let yMin = 0, yMax = 1;
  if (!normalize) {
    const vals = base.map(p => p.v);
    yMin = Math.min(0, Math.min(...vals));
    yMax = Math.max(1, Math.max(...vals));
  }
  const yAt = (v: number) => pad.top + (1 - (v - yMin) / Math.max(1e-6, yMax - yMin)) * innerH;
  const yAtNorm = (nv: number) => pad.top + (1 - nv) * innerH;

  // Prepare series: smoothing + per-metric shared normalization (primary & compare share same domain)
  type Prep = { s: SeriesBundle; prim: SeriesPoint[]; comp?: SeriesPoint[]; mapY: (v: number) => number };
  const prepared: Prep[] = series.map((s) => {
    const primRaw = smoothing ? sma(s.points, 7) : s.points;
    const compRaw = s.compare && s.compare.length > 0 ? (smoothing ? sma(s.compare, 7) : s.compare) : undefined;

    if (!normalize) {
      // Single metric: no normalization
      return { s, prim: primRaw, comp: compRaw, mapY: yAt };
    }

    // Multi-metric: compute union domain across primary+compare for THIS metric
    const allVals = primRaw.map(p => p.v).concat(compRaw ? compRaw.map(p => p.v) : []);
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const denom = Math.max(1e-6, max - min);
    const invert = s.inverted;

    const n = (v: number) => (invert ? (max - v) / denom : (v - min) / denom);

    const prim = primRaw.map(p => ({ t: p.t, v: n(p.v) }));
    const comp = compRaw ? compRaw.map(p => ({ t: p.t, v: n(p.v) })) : undefined;

    return { s, prim, comp, mapY: yAtNorm };
  });

  const strokePolyline = (points: SeriesPoint[], mapY: (v: number) => number) =>
    points.map((p, i) => `${xAt(i)},${mapY(p.v)}`).join(" ");

  // Hover index with RAF throttling for stability
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  React.useEffect(() => { if (count > 0) setHoverIdx(count - 1); }, [count, w]);

  function idxFromMouse(evt: React.MouseEvent) {
    const rect = (evt.currentTarget as HTMLDivElement).getBoundingClientRect();
    const i = Math.round((evt.clientX - rect.left - pad.left) / Math.max(1, stepX));
    return Math.max(0, Math.min(count - 1, i));
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (count === 0) return;
    const idx = idxFromMouse(e);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHoverIdx((prev) => (prev === idx ? prev : idx));
    });
  };

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{ height: h }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (hoverIdx == null || count === 0) return;
        if (e.key === "ArrowLeft") setHoverIdx(Math.max(0, hoverIdx - 1));
        if (e.key === "ArrowRight") setHoverIdx(Math.min(count - 1, hoverIdx + 1));
      }}
    >
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} aria-label="Traffic & Visibility chart">
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = pad.top + p * innerH;
          return <line key={i} x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke={TOKENS.border} strokeWidth={1} />;
        })}

        {/* primary series */}
        {prepared.map(({ s, prim, mapY }) => {
          if (prim.length < 2) return null;
          if (normalize) {
            return (
              <polyline
                key={`p-${s.metric}`}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                points={strokePolyline(prim, (v) => mapY(v))}
              />
            );
          }
          const path = `M ${xAt(0)} ${mapY(prim[0].v)} ${prim.map((p, i) => `L ${xAt(i)} ${mapY(p.v)}`).join(" ")} L ${xAt(prim.length - 1)} ${pad.top + innerH} L ${xAt(0)} ${pad.top + innerH} Z`;
          return (
            <g key={`p-${s.metric}`}>
              <path d={path} fill={pastel(s.color, 0.22)} stroke="none" />
              <polyline fill="none" stroke={s.color} strokeWidth={2} points={strokePolyline(prim, (v) => mapY(v))} />
            </g>
          );
        })}

        {/* compare lines (dashed) — DRAWN LAST to stay visible */}
        {prepared.map(({ s, comp, mapY }) => {
          if (!comp || comp.length < 2) return null;
          return (
            <polyline
              key={`c-${s.metric}`}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray="6,4"
              strokeLinecap="round"
              opacity={0.8}
              points={strokePolyline(comp, (v) => mapY(v))}
            />
          );
        })}

        {/* anomalies */}
        {prepared.map(({ s, prim, mapY }) => {
          const anomalies = s.anomalies ?? [];
          return anomalies.map((a, i) => {
            const idx = base.findIndex((p) => p.t === a.t);
            if (idx < 0) return null;
            const val = prim[idx]?.v ?? 0;
            const x = xAt(idx);
            const y = mapY(val);
            const col = a.severity === "critical" ? TOKENS.critical : TOKENS.warning;
            return (
              <g key={`${s.metric}-${a.t}-${i}`}>
                <circle cx={x} cy={y} r={4} fill={col} opacity={0.9} />
                <circle cx={x} cy={y} r={8} fill={col} opacity={0.12} />
              </g>
            );
          });
        })}

        {/* y labels */}
        {[0, 0.5, 1].map((p, i) => {
          const val = normalize ? Math.round(p * 100) : (yMax - (yMax - yMin) * p);
          const label = normalize ? `${val}` : formatValue(val, series[0]?.unit ?? "abs");
          const y = pad.top + p * innerH;
          return <text key={i} x={pad.left - 8} y={y + 4} textAnchor="end" fontSize={12} fill={TOKENS.muted}>{label}</text>;
        })}

        {/* crosshair */}
        {hoverIdx != null && (
          <line x1={xAt(hoverIdx)} y1={pad.top} x2={xAt(hoverIdx)} y2={pad.top + innerH} stroke={TOKENS.muted} strokeDasharray="3,3" />
        )}
      </svg>

      {/* mouse layer */}
      <div
        className="absolute inset-0"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={onMouseMove}
        onClick={() => { if (hoverIdx != null && base[hoverIdx]) onOpenAffectedView?.(base[hoverIdx].t); }}
      />

      {/* smart tooltip (stable) */}
      {hoverIdx != null && base[hoverIdx] && (
        <div
          className="absolute px-3 py-2 text-xs rounded border bg-white shadow"
          style={{
            left: Math.min(Math.max(xAt(hoverIdx) - 100, 8), w - 200),
            top: 12,
            borderColor: TOKENS.border,
            color: TOKENS.text,
            pointerEvents: "none",
          }}
        >
          <div className="font-semibold">{formatDateISO(base[hoverIdx].t)}</div>
          <div className="mt-1 space-y-1">
            {series.map((s) => {
              const p = s.points[hoverIdx] ?? { v: NaN, t: base[hoverIdx].t };
              const c = s.compare?.[hoverIdx];
              let deltaPct: number | undefined;
              if (c && Number.isFinite(c.v) && c.v !== 0) deltaPct = ((p.v - c.v) / Math.abs(c.v)) * 100;
              const good = deltaPct != null ? (isHigherBetter(s.metric) ? deltaPct > 0 : deltaPct < 0) : undefined;
              return (
                <div key={s.metric}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span>{METRIC_LABEL[s.metric]}</span>
                    </div>
                    <div className="font-medium">{formatValue(p.v, s.unit)}</div>
                  </div>
                  {deltaPct != null && (
                    <div className="pl-5 text-[11px]" style={{ color: good ? TOKENS.good : TOKENS.critical }}>
                      {deltaPct >= 0 ? "+" : "−"}{Math.abs(deltaPct).toFixed(1)}% vs compare
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {series.some(s => (s.anomalies ?? []).some(a => a.t === base[hoverIdx].t)) && (
            <div className="mt-2 inline-flex items-center gap-1">
              <Sparkles size={14} className="text-[#F59E0B]" />
              <span>Anomaly detected</span>
            </div>
          )}
          <div className="mt-2">
            <span className="inline-block pointer-events-auto">
              <button
                className="underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAffectedView?.(base[hoverIdx].t);
                }}
              >
                Open affected view
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Mock data generator (deterministic) ===================== */
function makeRng(seed: string) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function isoNDaysAgo(n: number) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function buildAxis(granularity: Granularity): string[] {
  if (granularity === "daily") return Array.from({ length: 90 }, (_, i) => isoNDaysAgo(89 - i));
  if (granularity === "weekly") {
    const weeks = 26, out: string[] = []; const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (weeks - 1) * 7);
    for (let i = 0; i < weeks; i++) { const d = new Date(start); d.setDate(d.getDate() + i * 7); out.push(d.toISOString().slice(0, 10)); } return out;
  }
  const months = 12, out: string[] = []; const start = new Date(); start.setHours(0,0,0,0); start.setMonth(start.getMonth() - (months - 1));
  for (let i = 0; i < months; i++) { const d = new Date(start); d.setMonth(start.getMonth() + i); d.setDate(1); out.push(d.toISOString().slice(0, 10)); } return out;
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function unitForMetric(m: MetricKey): "%" | "abs" { return m === "ctr" ? "%" : "abs"; }
function latencyForMetric(m: MetricKey): string { return METRIC_SOURCE[m] === "gsc" ? "GSC data may be delayed up to 48h" : "GA4 near real-time (may backfill)"; }
function generateSeries(axis: string[], metric: MetricKey, seedKey: string): SeriesPoint[] {
  const rng = makeRng(seedKey); const n = axis.length;
  let base = 1000, amp = 200, trend = 3, noise = 60, min = 0, max = Number.POSITIVE_INFINITY;
  switch (metric) {
    case "clicks": base = 1400; amp = 280; trend = 4; noise = 80; break;
    case "impressions": base = 9000; amp = 1200; trend = 12; noise = 220; break;
    case "sessions": base = 1100; amp = 180; trend = 3; noise = 70; break;
    case "conversions": base = 80; amp = 20; trend = 0.3; noise = 6; break;
    case "avg_position": base = 14; amp = 2.2; trend = -0.02; noise = 0.35; min = 1; max = 30; break;
    case "ctr": base = 2.8; amp = 0.6; trend = 0.005; noise = 0.15; min = 0.2; max = 12; break;
  }
  const pts: SeriesPoint[] = [];
  for (let i = 0; i < n; i++) {
    const cyc = Math.sin(i / 5) * amp + Math.cos(i / 11) * (amp * 0.35);
    const val = base + trend * i + cyc + (rng() - 0.5) * 2 * noise;
    pts.push({ t: axis[i], v: clamp(val, min, max) });
  }
  if (n >= 20) {
    const w = Math.floor(n * 0.65), c = Math.floor(n * 0.85);
    if (metric === "avg_position") { pts[w].v = clamp(pts[w].v * 1.25, min, max); pts[c].v = clamp(pts[c].v * 1.5, min, max); }
    else { pts[w].v = clamp(pts[w].v * 0.78, min, max); pts[c].v = clamp(pts[c].v * 0.62, min, max); }
  }
  return pts;
}
function generatePayload(params: {
  metric: MetricKey; device: DeviceSeg; countries: string[]; brand: BrandSeg; source: SourceFilter; granularity: Granularity; compare: CompareMode;
}): TrafficVisibilityPayload {
  const { metric, device, countries, brand, source, granularity, compare } = params;
  const axis = buildAxis(granularity);
  const seed = `${metric}|${granularity}|${device}|${countries.slice().sort().join(",")}|${brand}|${source}|${compare}`;
  let primary = generateSeries(axis, metric, seed);
  const deviceMul = device === "desktop" ? 0.96 : device === "mobile" ? 1.04 : 1;
  const countryMul = countries.length > 0 ? 1 + Math.min(0.03 * countries.length, 0.12) : 1;
  const brandMul =
    metric === "avg_position" ? (brand === "brand" ? 0.95 : brand === "nonbrand" ? 1.05 : 1)
      : metric === "ctr" ? (brand === "brand" ? 1.08 : brand === "nonbrand" ? 0.96 : 1) : 1;
  primary = primary.map((p) => ({ t: p.t, v: p.v * deviceMul * countryMul * brandMul }));

  let compareSeries: SeriesPoint[] | undefined;
  if (compare !== "off") {
    const mul = metric === "avg_position" ? (compare === "prev_period" ? 1.04 : 1.08) : (compare === "prev_period" ? 0.94 : 0.88);
    compareSeries = primary.map((p) => ({ t: p.t, v: p.v * mul }));
  }
  const anomalies: AnomalyPoint[] = [];
  if (primary.length >= 20) {
    const w = Math.floor(primary.length * 0.65), c = Math.floor(primary.length * 0.85);
    anomalies.push({ t: primary[w].t, value: primary[w].v, deltaPct: metric === "avg_position" ? +25 : -22, severity: "warning" });
    anomalies.push({ t: primary[c].t, value: primary[c].v, deltaPct: metric === "avg_position" ? +50 : -38, severity: "critical" });
  }
  return {
    metric, source, granularity, device, countries, brand, 
    primary: { metric, points: primary },
    compare: compareSeries ? { metric, points: compareSeries } : undefined,
    anomalies,
    unit: metric === "ctr" ? "%" : "abs",
    latencyNote: latencyForMetric(metric),
    disconnected: false,
  };
}

/* ===================== Section ===================== */
export default function TrafficVisibilitySection({
  data,
  sourcesConnected = { gsc: true, ga4: true },
  defaults,
  onFiltersChange,
  onExport,
  onRefresh,
  onConnectSource,
  onOpenAffectedView,
}: TrafficVisibilitySectionProps) {
  // Multi metric selection
  const [metrics, setMetrics] = React.useState<MetricKey[]>(defaults?.metrics?.length ? defaults.metrics : ["clicks"]);
  const primaryMetric = metrics[0] ?? "clicks";

  const [device, setDevice] = React.useState<DeviceSeg>(defaults?.device ?? "all");
  const [countries, setCountries] = React.useState<string[]>(defaults?.countries ?? []);
  const [brand, setBrand] = React.useState<BrandSeg>(defaults?.brand ?? "all");
  const [source, setSource] = React.useState<SourceFilter>(defaults?.source ?? "all");
  const [granularity, setGranularity] = React.useState<Granularity>(defaults?.granularity ?? "daily");
  const [compare, setCompare] = React.useState<CompareMode>(defaults?.compare ?? "prev_period");
  const [smoothing, setSmoothing] = React.useState<boolean>(defaults?.smoothing ?? false);

  React.useEffect(() => {
    onFiltersChange?.({ metrics, device, countries, brand, source, granularity, compare, smoothing });
  }, [metrics, device, countries, brand, source, granularity, compare, smoothing]); // eslint-disable-line

  // Gating helper for metric availability
  const metricDisabled = (m: MetricKey) => {
    const src = METRIC_SOURCE[m];
    const allowed = source === "all" || source === src;
    const connected = sourcesConnected[src];
    return !(allowed && connected);
  };

  // Build data for each selected metric (demo generator by default)
  const generatedByMetric = React.useMemo(() => {
    const base = metrics.reduce<Record<MetricKey, TrafficVisibilityPayload>>((acc, m) => {
      acc[m] = generatePayload({ metric: m, device, countries, brand, source, granularity, compare });
      return acc;
    }, {} as Record<MetricKey, TrafficVisibilityPayload>);
    return base;
  }, [metrics.join(","), device, brand, source, granularity, compare, JSON.stringify(countries)]);

  // Primary payload for export (or consume provided data if given)
  const primaryPayload = data ?? generatedByMetric[primaryMetric];

  // Build chart bundles
  const bundles: SeriesBundle[] = metrics.map((m) => {
    const payload = generatedByMetric[m];
    return {
      metric: m,
      unit: payload.unit,
      color: METRIC_COLOR[m],
      inverted: m === "avg_position",
      points: payload.primary.points,
      compare: payload.compare?.points,
      anomalies: payload.anomalies,
    };
  });

  const normalize = metrics.length > 1;

  // When source filter changes, auto-drop metrics that are not allowed/connected
  React.useEffect(() => {
    const allowed = metrics.filter((m) => !metricDisabled(m));
    if (allowed.length === 0) {
      const firstAvail = METRIC_ORDER.find((m) => !metricDisabled(m)) ?? "clicks";
      setMetrics([firstAvail]);
    } else if (allowed.length !== metrics.length) {
      setMetrics(allowed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, sourcesConnected.gsc, sourcesConnected.ga4]);

  return (
    <section className="w-full px-6 bg-white">
      {/* Section header */}
      <div className="flex items-center justify-between py-4">
        <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>Traffic & Visibility</h3>
        <div className="flex items-center gap-2">
          <ToolbarChip onClick={() => onExport?.(primaryPayload)}>
            <Download size={16} className="text-[#6B7280]" />
            Export
          </ToolbarChip>
          <ToolbarChip onClick={onRefresh}>
            <RefreshCw size={16} className="text-[#6B7280]" />
            Refresh
          </ToolbarChip>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2">
          {/* Metrics multi-select */}
          <MetricDropdown
            selected={metrics}
            onChange={(next) => setMetrics(next.length ? next : metrics)}
            sourcesConnected={sourcesConnected}
            sourceFilter={source}
            onConnectSource={onConnectSource}
          />

          {/* Device */}
          <Segmented
            ariaLabel="Device"
            value={device}
            onChange={(k) => setDevice(k)}
            options={[
              { key: "all", label: "All", icon: Globe },
              { key: "desktop", label: "Desktop", icon: Laptop },
              { key: "mobile", label: "Mobile", icon: Smartphone },
            ]}
          />

          {/* Country */}
          <CountryDropdown values={countries} onChange={setCountries} />

          {/* Brand (GSC only) */}
          <Segmented
            ariaLabel="Brand"
            value={brand}
            onChange={(k) => setBrand(k)}
            disabledKeys={!(source === "all" || source === "gsc") ? (["brand", "nonbrand"] as BrandSeg[]) : []}
            options={[
              { key: "all", label: "All" },
              { key: "brand", label: "Brand" },
              { key: "nonbrand", label: "Non-brand" },
            ]}
          />

          {/* Source */}
          <Segmented
            ariaLabel="Source"
            value={source}
            onChange={(k) => setSource(k)}
            options={[
              { key: "all", label: "All" },
              { key: "ga4", label: "GA4" },
              { key: "gsc", label: "GSC" },
            ]}
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Granularity */}
          <Segmented
            ariaLabel="Granularity"
            value={granularity}
            onChange={(k) => setGranularity(k)}
            options={[
              { key: "daily", label: "Daily" },
              { key: "weekly", label: "Weekly" },
              { key: "monthly", label: "Monthly" },
            ]}
          />
          {/* Compare */}
          <CompareDropdown value={compare} onChange={setCompare} />
          {/* Smoothing */}
          <Switch checked={smoothing} onChange={setSmoothing} label="Smoothing" />
        </div>
      </div>

      <div className="mt-3" style={{ borderBottom: `1px solid ${TOKENS.border}` }} />

      {/* Chart */}
      <div className="mt-4">
        <UnifiedChart
          series={bundles}
          smoothing={smoothing}
          normalize={normalize}
          onOpenAffectedView={(t) => onOpenAffectedView?.({ metric: primaryMetric, t })}
        />
      </div>

      {/* Meta footer */}
      <div className="mt-2 flex items-center justify-between text-xs" style={{ color: TOKENS.muted }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {metrics.length > 1 ? "Metrics:" : "Metric:"}{" "}
            <span className="font-medium">
              {metrics.map((m) => METRIC_LABEL[m]).join(" • ")}
            </span>
          </span>
          {metrics.length > 1 && <span>• Indexed for visual comparison (see tooltip for exact values)</span>}
        </div>
        {primaryPayload?.latencyNote && <div>{primaryPayload.latencyNote}</div>}
      </div>
    </section>
  );
}


