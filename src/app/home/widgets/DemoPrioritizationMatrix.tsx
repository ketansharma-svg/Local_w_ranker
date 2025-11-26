"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  RefreshCw,
  Filter,
  ChevronDown,
  X as XIcon,
} from "lucide-react";
import Demo_QuickPeekDrawer from "../drawers/QuickPeekDrawer";
/* ============================================================================
 * Tokens (align with dashboard look)
 * ==========================================================================*/
const TOKENS = {
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  subtle: "#F5F7FA",
  panel: "#FFFFFF",
  brand: "#0077FF",
  brandPastel: "#D9EEF8",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
} as const;

/* ============================================================================
 * Types
 * ==========================================================================*/
export type Role =
  | "seo"
  | "dev"
  | "content"
  | "analyst"
  | "manager"
  | "other";

export interface MatrixDatum {
  id: string;
  name: string;             // short label (e.g., project or domain)
  domain?: string;          // secondary label
  x: number;                // Site Health Score (0..100)
  y: number;                // Opportunity Index (0..100)
  sessions: number;         // organic sessions (bubble area)
  wr: number;               // WR Score (0..100) -> color gradient
  owner?: string;
  team?: string;
  role?: Role;
  tags?: string[];
  staleDays?: number;       // days since last touch/sync
}

export interface PrioritizationMatrixProps {
  data: MatrixDatum[];

  /** Split rule: "median" (auto) or "fixed" (xSplit/ySplit). Default: "median". */
  splitMode?: "median" | "fixed";
  xSplit?: number; // used when splitMode === 'fixed' (default 50)
  ySplit?: number; // used when splitMode === 'fixed' (default 50)

  /** Filtering & controls */
  defaultFilters?: {
    owners?: string[];
    teams?: string[];
    roles?: Role[];
    tags?: string[];
    staleOnly?: boolean;
  };
  staleDaysThreshold?: number; // default 30

  /** Click bubble → open Project Quick Peek Drawer (or any handler) */
  onBubbleClick?: (d: MatrixDatum) => void;

  /** Height of chart area (excluding header/filters). Default: 460 */
  height?: number;

  className?: string;
}

/* ============================================================================
 * Utilities
 * ==========================================================================*/
function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function fmtInt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}
function median(values: number[]) {
  if (!values.length) return 50;
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

/** Area-correct radius scale for bubble sizes. */
function makeRadiusScale(values: number[], minR = 6, maxR = 28) {
  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  if (!isFinite(vmin) || !isFinite(vmax) || vmin === vmax) {
    return (_v: number) => (minR + maxR) / 2;
  }
  // sqrt scale so area ~ value
  return (v: number) => {
    const t = (v - vmin) / (vmax - vmin);
    const r = Math.sqrt(clamp01(t));
    return minR + r * (maxR - minR);
  };
}

/** Smooth WR gradient (0..100) from red → amber → teal/green → blue. */
function wrColor(wr: number) {
  const t = clamp01(wr / 100);
  // piecewise 0..0.5..1 blend (R->Amber->Teal->Blue)
  const stops = [
    { t: 0.0, rgb: [239, 68, 68] },   // red-500
    { t: 0.33, rgb: [245, 158, 11] }, // amber-500
    { t: 0.66, rgb: [16, 185, 129] }, // emerald-500
    { t: 1.0, rgb: [29, 78, 216] },   // blue-600
  ];
  let i = 0;
  while (i < stops.length - 1 && t > stops[i + 1].t) i++;
  const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
  const local = (t - a.t) / Math.max(1e-6, b.t - a.t);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * local);
  const [r, g, b_] = [mix(a.rgb[0], b.rgb[0]), mix(a.rgb[1], b.rgb[1]), mix(a.rgb[2], b.rgb[2])];
  return `rgb(${r}, ${g}, ${b_})`;
}

/* ============================================================================
 * Filters UI
 * ==========================================================================*/
type FilterState = {
  owners: string[];
  teams: string[];
  roles: string[];
  tags: string[];
  staleOnly: boolean;
};

function Chip({
  active,
  children,
  onClick,
  title,
}: React.PropsWithChildren<{ active?: boolean; onClick?: () => void; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "h-8 rounded-full border px-3 text-sm inline-flex items-center",
        active ? "font-semibold bg-white" : "hover:bg-gray-50"
      )}
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      {children}
    </button>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const title =
    selected.length === 0
      ? "All"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div className="relative" ref={ref}>
      <Chip onClick={() => setOpen((s) => !s)}>
        <Filter className="mr-2 h-4 w-4 text-[#6B7280]" />
        {label}: {title}
        <ChevronDown className="ml-1 h-4 w-4 text-[#9CA3AF]" />
      </Chip>
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[240px] rounded border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="max-h-72 overflow-auto py-1">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="truncate">{opt}</span>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
              </label>
            ))}
          </div>
          <div
            className="flex items-center justify-between border-t px-3 py-2"
            style={{ borderColor: TOKENS.border }}
          >
            <div className="flex items-center gap-3">
              <button className="text-sm underline" onClick={() => onChange(options)}>
                Select all
              </button>
              <button className="text-sm underline" onClick={() => onChange([])}>
                Clear
              </button>
            </div>
            <button className="text-sm underline" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Main component
 * ==========================================================================*/
export function PrioritizationMatrix({
  data,
  splitMode = "median",
  xSplit = 50,
  ySplit = 50,
  defaultFilters,
  staleDaysThreshold = 30,
  onBubbleClick,
  height = 460,
  className,
}: PrioritizationMatrixProps) {
  // Build option lists from data
  const owners = useMemo(() => Array.from(new Set(data.map((d) => d.owner).filter(Boolean))) as string[], [data]);
  const teams = useMemo(() => Array.from(new Set(data.map((d) => d.team).filter(Boolean))) as string[], [data]);
  const roles = useMemo(() => Array.from(new Set(data.map((d) => d.role).filter(Boolean))) as Role[], [data]);
  const tags = useMemo(() => Array.from(new Set(data.flatMap((d) => d.tags ?? []))), [data]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    owners: defaultFilters?.owners ?? [],
    teams: defaultFilters?.teams ?? [],
    roles: defaultFilters?.roles ?? [],
    tags: defaultFilters?.tags ?? [],
    staleOnly: defaultFilters?.staleOnly ?? false,
  });

  // Filtered data
  const filtered = useMemo(() => {
    const sOwners = new Set(filters.owners);
    const sTeams = new Set(filters.teams);
    const sRoles = new Set(filters.roles);
    const sTags = new Set(filters.tags);
    return data.filter((d) => {
      if (sOwners.size && (!d.owner || !sOwners.has(d.owner))) return false;
      if (sTeams.size && (!d.team || !sTeams.has(d.team))) return false;
      if (sRoles.size && (!d.role || !sRoles.has(d.role))) return false;
      if (sTags.size && !(d.tags ?? []).some((t) => sTags.has(t))) return false;
      if (filters.staleOnly && (d.staleDays ?? 0) <= staleDaysThreshold) return false;
      return true;
    });
  }, [data, filters, staleDaysThreshold]);

  // Dynamic split lines (medians over filtered set)
  const dynamicX = useMemo(
    () => (splitMode === "median" ? median(filtered.map((d) => d.x)) : xSplit ?? 50),
    [filtered, splitMode, xSplit]
  );
  const dynamicY = useMemo(
    () => (splitMode === "median" ? median(filtered.map((d) => d.y)) : ySplit ?? 50),
    [filtered, splitMode, ySplit]
  );

  // SVG scales
  const padding = { top: 28, right: 20, bottom: 40, left: 48 };
  const { ref, width } = useMeasure<HTMLDivElement>();
  const W = Math.max(320, width);
  const H = height;
  const innerW = Math.max(100, W - padding.left - padding.right);
  const innerH = Math.max(100, H - padding.top - padding.bottom);
  const xTo = (v: number) => padding.left + (clamp01(v / 100) * innerW);
  const yTo = (v: number) =>
    padding.top + (1 - clamp01(v / 100)) * innerH; // invert Y (top=100)

  // Radius scale (sessions)
  const rScale = useMemo(
    () => makeRadiusScale(filtered.map((d) => d.sessions)),
    [filtered]
  );

  // Quadrant classifier
  const qName = (x: number, y: number) => {
    const right = x >= dynamicX;
    const top = y >= dynamicY;
    if (right && top) return "Quick Wins";
    if (!right && top) return "Fix First";
    if (right && !top) return "Build Authority";
    return "Re‑think Strategy";
  };

  // Quadrant counts
  const qCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Quick Wins": 0,
      "Fix First": 0,
      "Build Authority": 0,
      "Re‑think Strategy": 0,
    };
    for (const d of filtered) counts[qName(d.x, d.y)]++;
    return counts;
  }, [filtered, dynamicX, dynamicY]);

  // Tooltip state
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hovered = hoverId ? filtered.find((d) => d.id === hoverId) : undefined;

  const resetFilters = () =>
    setFilters({ owners: [], teams: [], roles: [], tags: [], staleOnly: false });

  /* --------------------------------- Render -------------------------------- */
  return (
    <section className={className}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
            Prioritization Matrix
          </h3>
          <div
            className="text-xs inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
            title="X: Site Health • Y: Opportunity Index • Size: Sessions • Color: WR"
          >
            <Info className="h-3.5 w-3.5" />
            X: Health, Y: Opportunity, Size: Sessions, Color: WR
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip
            onClick={() =>
              setFilters((f) => ({ ...f, staleOnly: !f.staleOnly }))
            }
            title={`Show items stale > ${staleDaysThreshold}d`}
          >
            Stale only:{" "}
            <span
              className={cx(
                "ml-1 rounded-full px-2 py-0.5 text-xs",
                filters.staleOnly ? "font-semibold" : ""
              )}
              style={{
                background: filters.staleOnly ? TOKENS.subtle : "transparent",
                color: filters.staleOnly ? TOKENS.text : TOKENS.muted,
              }}
            >
              {filters.staleOnly ? "On" : "Off"}
            </span>
          </Chip>

          <Chip onClick={resetFilters} title="Clear all filters">
            <RefreshCw className="mr-2 h-4 w-4 text-[#6B7280]" />
            Reset
          </Chip>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Owner"
          options={owners}
          selected={filters.owners}
          onChange={(owners) => setFilters((f) => ({ ...f, owners }))}
        />
        <MultiSelect
          label="Team"
          options={teams}
          selected={filters.teams}
          onChange={(teams) => setFilters((f) => ({ ...f, teams }))}
        />
        <MultiSelect
          label="Role"
          options={roles}
          selected={filters.roles}
          onChange={(roles) => setFilters((f) => ({ ...f, roles }))}
        />
        <MultiSelect
          label="Tags"
          options={tags}
          selected={filters.tags}
          onChange={(tags) => setFilters((f) => ({ ...f, tags }))}
        />
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="rounded-full border px-2 py-0.5" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
            Split: <b className="ml-1">{splitMode === "median" ? "Median" : "Fixed 50/50"}</b>
          </span>
          <span className="rounded-full border px-2 py-0.5" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
            QW {qCounts["Quick Wins"]} • FF {qCounts["Fix First"]} • BA {qCounts["Build Authority"]} • RS {qCounts["Re‑think Strategy"]}
          </span>
        </div>
      </div>

      <div
        ref={ref}
        className="mt-4 w-full overflow-hidden rounded-md border bg-white"
        style={{ borderColor: TOKENS.border, height: H }}
      >
        {/* SVG chart */}
        <svg width="100%" height={H} role="img" aria-label="Prioritization Matrix">
          {/* quadrant backgrounds */}
          <rect
            x={padding.left}
            y={padding.top}
            width={innerW / 2 + (xTo(dynamicX) - (padding.left + innerW / 2))}
            height={innerH / 2 + (padding.top + innerH / 2 - yTo(dynamicY))}
            fill={TOKENS.brandPastel}
            opacity={0.35}
          />
          <rect
            x={xTo(dynamicX)}
            y={padding.top}
            width={padding.left + innerW - xTo(dynamicX)}
            height={padding.top + innerH / 2 - padding.top + (padding.top + innerH / 2 - yTo(dynamicY))}
            fill={TOKENS.good}
            opacity={0.06}
          />
          <rect
            x={padding.left}
            y={yTo(dynamicY)}
            width={xTo(dynamicX) - padding.left}
            height={padding.top + innerH - yTo(dynamicY)}
            fill={TOKENS.warn}
            opacity={0.06}
          />
          <rect
            x={xTo(dynamicX)}
            y={yTo(dynamicY)}
            width={padding.left + innerW - xTo(dynamicX)}
            height={padding.top + innerH - yTo(dynamicY)}
            fill={TOKENS.danger}
            opacity={0.05}
          />

          {/* axes */}
          <line
            x1={padding.left}
            y1={padding.top + innerH}
            x2={padding.left + innerW}
            y2={padding.top + innerH}
            stroke={TOKENS.border}
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + innerH}
            stroke={TOKENS.border}
          />

          {/* grid ticks */}
          {[0, 25, 50, 75, 100].map((t, i) => (
            <g key={"x" + i}>
              <line
                x1={xTo(t)}
                y1={padding.top}
                x2={xTo(t)}
                y2={padding.top + innerH}
                stroke={TOKENS.border}
                opacity={t === 50 ? 0.8 : 0.5}
                strokeDasharray={t === dynamicX ? "3,3" : undefined}
              />
              <text
                x={xTo(t)}
                y={padding.top + innerH + 16}
                textAnchor="middle"
                fontSize={12}
                fill={TOKENS.muted}
              >
                {t}
              </text>
            </g>
          ))}
          {[0, 25, 50, 75, 100].map((t, i) => (
            <g key={"y" + i}>
              <line
                x1={padding.left}
                y1={yTo(t)}
                x2={padding.left + innerW}
                y2={yTo(t)}
                stroke={TOKENS.border}
                opacity={t === 50 ? 0.8 : 0.5}
                strokeDasharray={t === dynamicY ? "3,3" : undefined}
              />
              <text
                x={padding.left - 8}
                y={yTo(t) + 4}
                textAnchor="end"
                fontSize={12}
                fill={TOKENS.muted}
              >
                {t}
              </text>
            </g>
          ))}

          {/* split lines */}
          <line
            x1={xTo(dynamicX)}
            y1={padding.top}
            x2={xTo(dynamicX)}
            y2={padding.top + innerH}
            stroke={TOKENS.muted}
            strokeDasharray="4,4"
            opacity={0.7}
          />
          <line
            x1={padding.left}
            y1={yTo(dynamicY)}
            x2={padding.left + innerW}
            y2={yTo(dynamicY)}
            stroke={TOKENS.muted}
            strokeDasharray="4,4"
            opacity={0.7}
          />

          {/* axis labels */}
          <text
            x={padding.left + innerW / 2}
            y={padding.top + innerH + 32}
            textAnchor="middle"
            fontSize={12}
            fill={TOKENS.text}
          >
            Site Health Score →
          </text>
          <text
            x={14}
            y={padding.top + innerH / 2}
            textAnchor="middle"
            fontSize={12}
            fill={TOKENS.text}
            transform={`rotate(-90, 14, ${padding.top + innerH / 2})`}
          >
            Opportunity Index ↑
          </text>

          {/* quadrant titles */}
          <text x={xTo(dynamicX) + 8} y={padding.top + 16} fontSize={12} fill={TOKENS.text}>
            Quick Wins
          </text>
          <text x={padding.left + 8} y={padding.top + 16} fontSize={12} fill={TOKENS.text}>
            Fix First
          </text>
          <text x={xTo(dynamicX) + 8} y={yTo(dynamicY) + 16} fontSize={12} fill={TOKENS.text}>
            Build Authority
          </text>
          <text x={padding.left + 8} y={yTo(dynamicY) + 16} fontSize={12} fill={TOKENS.text}>
            Re‑think Strategy
          </text>

          {/* bubbles */}
          {filtered.map((d) => {
            const cx = xTo(d.x);
            const cy = yTo(d.y);
            const r = rScale(d.sessions);
            const fill = wrColor(d.wr);
            return (
              <g key={d.id} transform={`translate(${cx}, ${cy})`}>
                <circle
                  r={r}
                  fill={fill}
                  opacity={0.85}
                  stroke="#111827"
                  strokeOpacity={0.12}
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.name}: Health ${Math.round(d.x)}, Opportunity ${Math.round(d.y)}, Sessions ${fmtInt(
                    d.sessions
                  )}, WR ${Math.round(d.wr)}`}
                  onMouseEnter={() => setHoverId(d.id)}
                  onMouseLeave={() => setHoverId((prev) => (prev === d.id ? null : prev))}
                  onFocus={() => setHoverId(d.id)}
                  onBlur={() => setHoverId((prev) => (prev === d.id ? null : prev))}
                  onClick={() => onBubbleClick?.(d)}
                />
                {/* name label (small) */}
                <text
                  y={r + 12}
                  textAnchor="middle"
                  fontSize={11}
                  fill={TOKENS.text}
                  opacity={0.9}
                >
                  {d.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="pointer-events-auto absolute rounded-md border bg-white p-3 text-xs shadow"
            style={{
              borderColor: TOKENS.border,
              left: Math.min(Math.max(xTo(hovered.x) + 16, 8), W - 220),
              top: Math.min(Math.max(yTo(hovered.y) - 20, 8), H - 140),
              width: 220,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="font-semibold truncate" title={hovered.name}>
                {hovered.name}
              </div>
              <button
                className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
                onClick={() => setHoverId(null)}
                aria-label="Close tooltip"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {hovered.domain && (
              <div className="mt-0.5 truncate" style={{ color: TOKENS.muted }}>
                {hovered.domain}
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded border p-2" style={{ borderColor: TOKENS.border }}>
                <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                  Site Health
                </div>
                <div className="text-sm font-semibold">{Math.round(hovered.x)}</div>
              </div>
              <div className="rounded border p-2" style={{ borderColor: TOKENS.border }}>
                <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                  Opportunity
                </div>
                <div className="text-sm font-semibold">{Math.round(hovered.y)}</div>
              </div>
              <div className="rounded border p-2" style={{ borderColor: TOKENS.border }}>
                <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                  Sessions
                </div>
                <div className="text-sm font-semibold">{fmtInt(hovered.sessions)}</div>
              </div>
              <div className="rounded border p-2" style={{ borderColor: TOKENS.border }}>
                <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                  WR Score
                </div>
                <div className="text-sm font-semibold">{Math.round(hovered.wr)}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {hovered.team && (
                <span
                  className="rounded-full border px-2"
                  style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
                >
                  {hovered.team}
                </span>
              )}
              {hovered.owner && (
                <span
                  className="rounded-full border px-2"
                  style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
                >
                  {hovered.owner}
                </span>
              )}
              {hovered.role && (
                <span
                  className="rounded-full border px-2"
                  style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
                >
                  {hovered.role}
                </span>
              )}
              {(hovered.tags ?? []).slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-2"
                  style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
                >
                  #{t}
                </span>
              ))}
              {hovered.tags && hovered.tags.length > 3 && (
                <span className="text-[11px]" style={{ color: TOKENS.muted }}>
                  +{hovered.tags.length - 3} more
                </span>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onBubbleClick?.(hovered)}
                className="rounded-md bg-[color:var(--btn,#0077FF)] px-3 py-1.5 text-xs font-medium text-white"
                style={{ ["--btn" as any]: TOKENS.brand } as React.CSSProperties}
              >
                Open Quick Peek
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legends */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Color legend (WR) */}
        <div className="flex items-center gap-2">
          <span style={{ color: TOKENS.muted }}>Color:</span>
          <div className="h-2 w-40 rounded"
               style={{
                 background:
                   "linear-gradient(90deg, rgb(239,68,68) 0%, rgb(245,158,11) 33%, rgb(16,185,129) 66%, rgb(29,78,216) 100%)",
                 border: `1px solid ${TOKENS.border}`,
               }}
          />
          <div className="flex items-center gap-1" style={{ color: TOKENS.muted }}>
            <span>WR</span><span className="font-medium">0</span>
            <span className="ml-2">→</span>
            <span className="font-medium">100</span>
          </div>
        </div>

        {/* Size legend (Sessions) */}
        <div className="flex items-center gap-3" style={{ color: TOKENS.muted }}>
          <span>Size: Sessions</span>
          <div className="flex items-center gap-2">
            {[2_000, 20_000, 200_000].map((v, i) => {
              const r = makeRadiusScale([1, v, 1_000_000])(v);
              return (
                <div key={i} className="relative h-9 w-14">
                  <svg width="56" height="36">
                    <circle cx="18" cy="18" r={r} fill={TOKENS.brandPastel} stroke={TOKENS.border} />
                  </svg>
                  <div className="absolute left-10 top-2 font-medium">{fmtInt(v)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * Optional demo wrapper — remove in production
 * ==========================================================================*/
export default function DemoPrioritizationMatrix() {
  // Mock data (10 projects)
  const demo: MatrixDatum[] = [
    { id: "p1",  name: "Wranker",  domain: "wranker.com",  x: 78, y: 72, sessions: 265000, wr: 64, owner: "Ava", team: "SEO", role: "seo", tags: ["core","priority"], staleDays: 42 },
    { id: "p2",  name: "Vefogix",  domain: "vefogix.com",  x: 54, y: 81, sessions: 148000, wr: 58, owner: "Liam", team: "Growth", role: "manager", tags: ["backlinks"], staleDays: 16 },
    { id: "p3",  name: "W3era",    domain: "w3era.com",    x: 63, y: 39, sessions:  82000, wr: 52, owner: "Mia", team: "SEO", role: "seo", tags: ["content"], staleDays: 8 },
    { id: "p4",  name: "Acme",     domain: "acme.com",     x: 28, y: 77, sessions:  61000, wr: 35, owner: "Noah", team: "Web", role: "dev", tags: ["fix-first"], staleDays: 55 },
    { id: "p5",  name: "Globex",   domain: "globex.com",   x: 86, y: 84, sessions: 420000, wr: 72, owner: "Zoe", team: "SEO", role: "analyst", tags: ["quick-win"], staleDays: 5 },
    { id: "p6",  name: "Umbra",    domain: "umbra.dev",    x: 32, y: 22, sessions:  15000, wr: 18, owner: "Kai", team: "Content", role: "content", tags: ["rethink"], staleDays: 90 },
    { id: "p7",  name: "Stellar",  domain: "stellar.ai",   x: 71, y: 48, sessions:  99000, wr: 62, owner: "Ivy", team: "SEO", role: "seo", tags: ["ba"], staleDays: 29 },
    { id: "p8",  name: "North",    domain: "north.co",     x: 45, y: 59, sessions:  53000, wr: 41, owner: "Eli", team: "Web", role: "dev", tags: ["tech"], staleDays: 31 },
    { id: "p9",  name: "Helio",    domain: "helio.app",    x: 90, y: 35, sessions: 110000, wr: 80, owner: "Zoe", team: "SEO", role: "manager", tags: ["internal"], staleDays: 18 },
    { id: "p10", name: "Quanta",   domain: "quanta.io",    x: 22, y: 64, sessions:  27000, wr: 27, owner: "Ava", team: "Growth", role: "seo", tags: ["fix-first"], staleDays: 47 },
  ];
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
    <div className="w-full rounded-lg border bg-white p-4 mt-4" style={{ borderColor: TOKENS.border }}>
            {drawerRow && (
              <Drawer title="Drawer" onClose={closeDrawer}>
                <Demo_QuickPeekDrawer   />
             </Drawer>
           )}
      <PrioritizationMatrix
        data={demo}
        splitMode="median"     
        staleDaysThreshold={30}
        onBubbleClick={openDrawer}
      />
    </div>
  );
}
