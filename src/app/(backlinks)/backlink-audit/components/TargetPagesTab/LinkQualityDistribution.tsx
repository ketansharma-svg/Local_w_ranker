"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ───────────────────────────────────────────────────────────────
 *  Wranker – Target Pages Tab → Section 2: Link Quality Distribution (Redesign)
 *  - Only stacked DONUT (no stacked bar, no toggle)
 *  - Vertical legend at the RIGHT side of the donut
 *  - Center shows the main metric: Total Backlinks
 *  - Pure SVG donut + smart tooltip, dims ONLY hovered slice (opacity 0.45)
 *  - Click segment or legend → multi-select filter callback (onFilterChange)
 *  - Export: CSV (no deps). Provide your own handler via onExport if desired.
 *  - Tailwind + Design Tokens (CSS vars) with sensible fallbacks
 *  - Fonts: Inter, Inter_Fallback
 *  - Use only half panel width by default (w-full lg:w-1/2)
 *  ─────────────────────────────────────────────────────────────── */

type Key = "toxic" | "potential" | "nonToxic" | "whitelisted";
type Distribution = Partial<Record<Key, number>>;

export type LinkQualityDistributionProps = {
  counts?: Distribution;
  onFilterChange?: (selected: Key[]) => void;
  onExport?: (csv: string) => void;
  title?: string;
  subtitle?: string;
  /** Optional className on outer card */
  className?: string;
};

const LABEL: Record<Key, string> = {
  toxic: "Toxic",
  potential: "Potential Toxic",
  nonToxic: "Non-Toxic",
  whitelisted: "Whitelisted",
};

/** Colors use design tokens with fallbacks to keep parity with recent designs. */
const COLOR: Record<Key, string> = {
  toxic: "var(--danger-500, #FF4D4D)",
  potential: "var(--warning-500, #FFA64D)",
  nonToxic: "var(--success-500, #22C55E)",
  /** Brand for whitelisted + branded icon requirement (#008CCD) */
  whitelisted: "var(--brand-500, #008CCD)",
};

// Demo counts (visible by default; replace via props.counts)
const DEMO: Required<Distribution> = {
  toxic: 300,
  potential: 502,
  nonToxic: 1982,
  whitelisted: 150,
};

const KEYS: Key[] = ["toxic", "potential", "nonToxic", "whitelisted"];

const fmt = (n: number) => n.toLocaleString();
const pct = (v: number, total: number) =>
  total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "0%";

export default function LinkQualityDistribution({
  counts = DEMO,
  onFilterChange,
  onExport,
  title = "Link Quality Distribution",
  subtitle = "Across all linked pages in this project.",
  className,
}: LinkQualityDistributionProps) {
  /** Font: Inter, Inter_Fallback */
  const fontFamily =
    'Inter, Inter_Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"';

  // Safe counts + derived items
  const safeCounts: Required<Distribution> = {
    toxic: counts.toxic ?? 0,
    potential: counts.potential ?? 0,
    nonToxic: counts.nonToxic ?? 0,
    whitelisted: counts.whitelisted ?? 0,
  };

  const total = Math.max(
    0,
    safeCounts.toxic + safeCounts.potential + safeCounts.nonToxic + safeCounts.whitelisted
  );

  const items = useMemo(
    () =>
      KEYS.map((k) => ({
        key: k,
        label: LABEL[k],
        color: COLOR[k],
        count: safeCounts[k],
        share: total > 0 ? safeCounts[k] / total : 0,
      })),
    [safeCounts, total]
  );

  // Hover + tooltip state
  const [hovered, setHovered] = useState<Key | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tt, setTt] = useState<{ show: boolean; x: number; y: number; key: Key | null }>({
    show: false,
    x: 0,
    y: 0,
    key: null,
  });

  // Multi-select filter (legend + segments)
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  useEffect(() => {
    onFilterChange?.(Array.from(selected));
  }, [selected, onFilterChange]);

  // Tooltip layout clamp inside wrapper
  const placeTooltip = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current?.getBoundingClientRect();
    if (!wrap) return { left: clientX, top: clientY };
    const w = 280;
    const h = 120;
    let left = clientX - wrap.left + 14;
    let top = clientY - wrap.top + 10;
    if (left + w > wrap.width) left = Math.max(8, clientX - wrap.left - w - 12);
    if (top + h > wrap.height) top = Math.max(8, clientY - wrap.top - h - 12);
    return { left, top };
  };

  // Export (CSV by default, unless custom handler provided)
  const doExport = () => {
    const lines = [
      "Type,Count,Percent",
      ...items.map((i) => `${i.label},${i.count},${pct(i.count, total)}`),
      `Total,${total},100%`,
    ].join("\n");
    if (onExport) {
      onExport(lines);
    } else {
      const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "link-quality-distribution.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Donut geometry (stroke-dasharray)
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const ring = 26;
  const C = 2 * Math.PI * r;
  const gap = 1.5;

  const segments = useMemo(() => {
    let offset = 0;
    return items.map((it) => {
      const usable = Math.max(0, C - items.length * gap);
      const len = it.share * usable;
      const dashArray = `${len} ${C - len}`;
      const seg = { ...it, dashArray, offset };
      offset -= len + gap;
      return seg;
    });
  }, [items, C]);

  // Common hover handlers
  const enter = (k: Key, e: React.MouseEvent) => {
    setHovered(k);
    const { left, top } = placeTooltip(e.clientX, e.clientY);
    setTt({ show: true, x: left, y: top, key: k });
  };
  const move = (e: React.MouseEvent) => {
    const { left, top } = placeTooltip(e.clientX, e.clientY);
    setTt((s) => ({ ...s, show: true, x: left, y: top }));
  };
  const leave = () => {
    setHovered(null);
    setTt((s) => ({ ...s, show: false, key: null }));
  };
  const toggleSelect = (k: Key) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // Legend row (vertical list)
  const LegendRow = ({ k }: { k: Key }) => {
    const it = items.find((i) => i.key === k)!;
    const isActive = selected.has(k);
    const dimmed = hovered === k;

    return (
      <button
        type="button"
        onMouseEnter={() => setHovered(k)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => toggleSelect(k)}
        className={[
          "grid w-full grid-cols-[auto,1fr,auto] items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
          "border-[color:var(--border-subtle,#E5E7EB)]",
          isActive
            ? "ring-1 ring-[var(--brand-500,#008CCD)] shadow-sm"
            : "hover:bg-[var(--surface-subtle,#F9FAFB)]",
          "cursor-pointer",
        ].join(" ")}
        title={`Filter by ${it.label}`}
        aria-pressed={isActive}
      >
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: it.color, opacity: dimmed ? 0.45 : 1 }}
        />
        <div className="truncate">
          <div className="text-[13px] font-medium text-[color:var(--fg-default,#0F172A)]">
            {it.label}
          </div>
          <div className="text-[12px] text-[color:var(--fg-muted,#6B7280)]">
            {fmt(it.count)} backlinks
          </div>
        </div>
        <div className="text-[13px] font-semibold text-[color:var(--fg-default,#0F172A)]">
          {pct(it.count, total)}
        </div>
      </button>
    );
  };

  // Tooltip card
  const Tooltip = () => {
    if (!tt.show || !tt.key) return null;
    const it = items.find((i) => i.key === tt.key);
    if (!it) return null;
    return (
      <div
        role="tooltip"
        className="pointer-events-none absolute z-10 rounded-xl border bg-white p-3 shadow-lg"
        style={{
          left: tt.x,
          top: tt.y,
          minWidth: 240,
          maxWidth: 320,
          borderColor: "var(--border-subtle,#E5E7EB)",
          fontFamily,
        }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: it.color }}
          />
          <div className="font-semibold text-[color:var(--fg-default,#0F172A)]">
            {it.label}
          </div>
        </div>
        <div className="text-sm font-semibold text-[color:var(--fg-default,#0F172A)]">
          {fmt(it.count)} backlinks ({pct(it.count, total)})
        </div>
        <div className="mt-1 text-xs text-[color:var(--fg-muted,#6B7280)]">
          Click to filter this type in the Top Linked Pages table.
        </div>
      </div>
    );
  };

  return (
    <section
      className={[
        // Half-panel width default
        "w-full",
        // Card shell using tokens with fallbacks
        "rounded-2xl border shadow-sm",
        "border-[color:var(--border-subtle,#E5E7EB)]",
        "bg-[var(--surface-card,#FFFFFF)]",
        "p-4",
        // Font
        `font-[${fontFamily}]`,
        className || "",
      ].join(" ")}
      style={{ fontFamily }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Branded icon (#008CCD) */}
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md"
            title="Link Quality Distribution"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-500)"
              style={{ color: "var(--brand-500, #008CCD)", stroke: "currentColor" }}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* stylized donut/chain mark */}
              <path d="M12 3a9 9 0 1 1-6.364 2.636" />
              <path d="M8 6 5 3" />
            </svg>
          </span>
          <div>
            <h3 className="text-[16px] font-semibold text-[color:var(--fg-default,#0F172A)]">
              {title}
            </h3>
            <div className="text-[12.5px] text-[color:var(--fg-muted,#6B7280)]">
              {subtitle}
            </div>
          </div>
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={doExport}
          className={[
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium",
            "border-[color:var(--border-subtle,#E5E7EB)]",
            "text-[color:var(--fg-default,#0F172A)]",
            "hover:bg-[var(--surface-subtle,#F9FAFB)]",
            "cursor-pointer",
          ].join(" ")}
          title="Export distribution as CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-80">
            <path
              d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export
        </button>
      </div>

      {/* Chart + Right Legend */}
      <div
        ref={wrapRef}
        className="relative grid items-center gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(220px,1fr)]"
      >
        {/* DONUT ONLY */}
        <div className="relative max-w-[360px] overflow-visible">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width="100%"
            height="100%"
            className="block overflow-visible"
            aria-label="Link quality distribution donut"
            onMouseLeave={leave}
          >
            {/* rotate so segments start at 12 o'clock */}
            <g transform={`translate(${cx} ${cy}) rotate(-90)`}>
              {/* Rail */}
              <circle
                r={r}
                cx={0}
                cy={0}
                fill="none"
                stroke="var(--surface-rail,#F3F4F6)"
                strokeWidth={ring}
              />
              {/* Segments */}
              {segments.map((s) => (
                <circle
                  key={s.key}
                  r={r}
                  cx={0}
                  cy={0}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={ring}
                  strokeDasharray={s.dashArray}
                  strokeDashoffset={s.offset}
                  style={{
                    transition: "opacity 160ms ease, transform 160ms ease",
                    opacity: hovered === s.key ? 0.45 : 1,
                    transform: hovered === s.key ? "scale(0.985)" : "scale(1.0)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => enter(s.key, e)}
                  onMouseMove={move}
                  onClick={() => toggleSelect(s.key)}
                />
              ))}
            </g>

            {/* Center label → Total Backlinks */}
            <g>
              <foreignObject x={cx - 90} y={cy - 46} width={180} height={92}>
                <div className="flex h-full w-full flex-col items-center justify-center text-center leading-tight">
                  <div className="text-[12px] font-medium text-[color:var(--fg-muted,#6B7280)]">
                    Total Backlinks
                  </div>
                  <div className="mt-1 text-[22px] font-extrabold tracking-[-0.01em] text-[color:var(--fg-default,#0F172A)]">
                    {fmt(total)}
                  </div>
                </div>
              </foreignObject>
            </g>
          </svg>

          {/* Tooltip */}
          <Tooltip />
        </div>

        {/* Right-side Vertical Legend */}
        <div className="self-stretch">
          <div className="flex flex-col gap-2.5">
            {KEYS.map((k) => (
              <LegendRow key={k} k={k} />
            ))}
          </div>

          <div className="mt-3 text-[12.5px] text-[color:var(--fg-muted,#6B7280)]">
            Click a segment or legend to filter the Top Linked Pages table. Multi‑select supported.
          </div>
        </div>
      </div>
    </section>
  );
}
