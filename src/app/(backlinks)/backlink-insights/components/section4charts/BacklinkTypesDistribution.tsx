"use client";
import React, { useMemo, useRef, useState } from "react";

/** CHART 9 – Backlink Types Distribution (Donut)
 *  - Inline SVG (no chart lib)
 *  - Hover: DIM the hovered slice only (others unchanged)
 *  - Smooth hover animation (scale + fade), sticky smart tooltip
 *  - Center label: dominant type by default → hovered slice while hovering
 *  - Legend with % + count; click routes to Audit filtered by type
 *  - Routing exposed via onSliceClick(type)
 *
 *  Tailwind required (or swap classes). All layout pieces are overflow-visible to prevent clipping.
 */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
    surface: "var(--wr-surface, #FFFFFF)",
    text: "var(--wr-text, #0B1220)",
    muted: "var(--wr-muted, #6B7280)",
    border: "var(--wr-border, #E5E7EB)",
    borderLight: "var(--wr-borderLight, #EEF2F6)",
    radius: "var(--wr-radius-lg, 16px)",
    shadow: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.06))",
};

/* ------------------------------ Types ------------------------------ */
type TypeKey = "Text" | "Image" | "Frame" | "Redirect" | "Form/Misc";

type BacklinkTypeDatum = {
    key: TypeKey;
    label: string;
    color: string;
    count: number;
    tooltip: string;
};

/* ------------------------------ Palette ------------------------------ */
const TYPE_ORDER: TypeKey[] = ["Text", "Image", "Frame", "Redirect", "Form/Misc"] as const;

const TYPE_COLOR: Record<TypeKey, string> = {
    Text: "#3B82F6",      // blue
    Image: "#F59E0B",     // amber
    Frame: "#8B5CF6",     // violet
    Redirect: "#EF4444",  // red
    "Form/Misc": "#9CA3AF", // gray
};

/* ----------------------------- Helpers ----------------------------- */
const fmt = (n: number) => n.toLocaleString();
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

/** Build a donut arc path (outerR/innerR, angles in radians) */
function donutArcPath(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    start: number,
    end: number
) {
    // Guard against identical angles
    if (Math.abs(end - start) < 1e-6) return "";
    const largeArc = end - start > Math.PI ? 1 : 0;

    const x0 = cx + outerR * Math.cos(start);
    const y0 = cy + outerR * Math.sin(start);
    const x1 = cx + outerR * Math.cos(end);
    const y1 = cy + outerR * Math.sin(end);

    const x2 = cx + innerR * Math.cos(end);
    const y2 = cy + innerR * Math.sin(end);
    const x3 = cx + innerR * Math.cos(start);
    const y3 = cy + innerR * Math.sin(start);

    return [
        `M ${x0} ${y0}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1} ${y1}`,
        `L ${x2} ${y2}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x3} ${y3}`,
        "Z",
    ].join(" ");
}

/* ----------------------------- Component ---------------------------- */
export default function OVI_Chart_BacklinkTypesDistribution({
    data = {
        Text: 1782,
        Image: 276,
        Frame: 68,
        Redirect: 38,
        "Form/Misc": 4,
    },
    title = "Backlink Types Distribution",
    subtitle = "Across all backlinks",
    height = 270, // chart card height (donut area ≈ square)
    onSliceClick,
}: {
    /** Raw counts per type */
    data?: Record<TypeKey, number>;
    title?: string;
    subtitle?: string;
    height?: number;
    /** Route to Audit > Backlinks filtered by type */
    onSliceClick?: (params: { type: TypeKey }) => void;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState<TypeKey | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

    const series: BacklinkTypeDatum[] = useMemo(() => {
        return TYPE_ORDER.map((k) => ({
            key: k,
            label: k,
            color: TYPE_COLOR[k],
            count: Math.max(0, data[k] ?? 0),
            tooltip:
                k === "Text"
                    ? "Most valuable links (in‑content, crawlable)"
                    : k === "Image"
                        ? "Often found in badges, footers, or widgets"
                        : k === "Frame"
                            ? "Embedded inside iframes"
                            : k === "Redirect"
                                ? "JS/meta/302 – consider auditing patterns"
                                : "In forms or unknown types",
        }));
    }, [data]);

    const total = useMemo(() => series.reduce((s, d) => s + d.count, 0), [series]);

    const withPct = useMemo(
        () =>
            series.map((d) => ({
                ...d,
                share: total ? d.count / total : 0,
            })),
        [series, total]
    );

    const dominant = useMemo(
        () => withPct.slice().sort((a, b) => b.share - a.share)[0] ?? withPct[0],
        [withPct]
    );

    /* Donut geometry */
    const size = 240; // inner square for donut SVG
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 98;
    const innerR = 62;
    const pad = 0.02; // ~1.1° gap between slices

    const arcs = useMemo(() => {
        let a0 = -Math.PI / 2; // start at top
        return withPct.map((d) => {
            const span = (Math.PI * 2) * d.share;
            // add tiny padding on each side for visual separator
            const start = a0 + pad;
            const end = a0 + Math.max(0, span - pad);
            a0 += span;
            return { ...d, start, end, path: donutArcPath(cx, cy, outerR, innerR, start, end) };
        });
    }, [withPct, cx, cy, innerR, outerR]);

    /* Hover handlers */
    function handleMove(e: React.MouseEvent) {
        const node = wrapRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    function clearHover() {
        setHovered(null);
        setTooltip(null);
    }

    /* Center label logic */
    const centerKey = hovered ?? dominant?.key ?? null;
    const centerDatum = centerKey ? withPct.find((d) => d.key === centerKey)! : undefined;

    return (
        <section
            className="w-full rounded-xl border bg-white p-4 sm:p-5"
            style={{ borderColor: TK.border, boxShadow: TK.shadow }}
        >
            {/* Header */}
            <header className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
                    {title}
                </h3>
                <span className="text-[12px] sm:ml-2" style={{ color: TK.muted }}>
                    {subtitle} · Total: <span className="font-medium" style={{ color: TK.text }}>{fmt(total)}</span>
                </span>
            </header>

            <div
                ref={wrapRef}
                className="grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)]"
                style={{ overflow: "visible" }} /* prevents clipping */
            >
                {/* Donut */}
                <div
                    className="relative flex items-center justify-center"
                    style={{
                        minHeight: height,
                        overflow: "visible",
                    }}
                >
                    <svg
                        role="img"
                        aria-label="Backlink types distribution donut chart"
                        width={size}
                        height={size}
                        viewBox={`0 0 ${size} ${size}`}
                        className="overflow-visible"
                        onMouseMove={handleMove}
                        onMouseLeave={clearHover}
                    >
                        {/* background rail for accessible focus ring if needed */}
                        <circle cx={cx} cy={cy} r={outerR} fill="#F5F7FA" />

                        {arcs.map((s) => {
                            const isHovered = hovered === s.key;
                            // IMPORTANT: Only the hovered slice dims (opacity lowered).
                            const opacity = isHovered ? 0.45 : 1;

                            return (
                                <g key={s.key}>
                                    <path
                                        d={s.path}
                                        fill={s.color}
                                        style={{
                                            opacity,
                                            transformBox: "fill-box",
                                            transformOrigin: "50% 50%",
                                            transition: "transform .22s cubic-bezier(.2,.8,.2,1), opacity .18s ease-out",
                                        }}
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHovered(s.key)}
                                        onClick={() => onSliceClick?.({ type: s.key })}
                                        // small scale on hover (same animation profile we used in recent charts)
                                        onMouseOver={(e) => {
                                            (e.currentTarget as SVGPathElement).style.transform = "scale(0.985)";
                                        }}
                                        onMouseOut={(e) => {
                                            (e.currentTarget as SVGPathElement).style.transform = "scale(1)";
                                        }}
                                    >
                                        <title>
                                            {`${s.label} · ${pct(s.share)} (${fmt(s.count)} backlinks) — ${s.tooltip}`}
                                        </title>
                                    </path>
                                </g>
                            );
                        })}

                        {/* Center label */}
                        {centerDatum && (
                            <g aria-hidden>
                                <circle cx={cx} cy={cy} r={innerR - 1} fill={TK.surface} />
                                <text
                                    x={cx}
                                    y={cy - 2}
                                    textAnchor="middle"
                                    className="font-semibold"
                                    style={{ fontSize: 14, fill: TK.text }}
                                >
                                    {centerDatum.key} Links
                                </text>
                                <text
                                    x={cx}
                                    y={cy + 18}
                                    textAnchor="middle"
                                    className="tabular-nums"
                                    style={{ fontSize: 13, fill: TK.muted }}
                                >
                                    {(centerDatum.share * 100).toFixed(1)}% · {fmt(centerDatum.count)}
                                </text>
                            </g>
                        )}
                    </svg>

                    {/* Smart tooltip */}
                    {hovered && tooltip && (
                        <div
                            className="pointer-events-none absolute z-10 w-[260px] max-w-[72vw] rounded-lg border bg-white p-3 text-[13px] shadow-md"
                            style={{
                                left: Math.min(tooltip.x + 14, size + 32),
                                top: Math.max(tooltip.y - 10, 4),
                                borderColor: TK.borderLight,
                            }}
                            role="tooltip"
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ background: TYPE_COLOR[hovered] }}
                                />
                                <div className="font-medium" style={{ color: TK.text }}>
                                    {hovered}
                                </div>
                            </div>
                            <div style={{ color: TK.text }}>
                                {fmt(withPct.find((d) => d.key === hovered)!.count)} backlinks (
                                {(withPct.find((d) => d.key === hovered)!.share * 100).toFixed(1)}%)
                            </div>
                            <div className="mt-1 text-[12px]" style={{ color: TK.muted }}>
                                {withPct.find((d) => d.key === hovered)!.tooltip}
                            </div>
                            <div className="mt-2">
                                <span
                                    className="inline-block cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-[#0B74D4]"
                                    onClick={() => onSliceClick?.({ type: hovered })}
                                    style={{ pointerEvents: "auto" }}
                                >
                                    View {hovered} Links →
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-col justify-center">
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {withPct.map((d) => (
                            <li key={d.key} className="flex items-center gap-2">
                                <button
                                    className="group inline-flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition"
                                    style={{ borderColor: TK.borderLight }}
                                    onMouseEnter={() => setHovered(d.key)}
                                    onMouseLeave={clearHover}
                                    onClick={() => onSliceClick?.({ type: d.key })}
                                    title={`Open ${d.key} links in Audit`}
                                >
                                    <span
                                        className="inline-block h-2 w-2 flex-none rounded-full"
                                        style={{ background: d.color }}
                                    />
                                    <span className="flex-1 text-[13px]" style={{ color: TK.text }}>
                                        {d.label}
                                    </span>
                                    <span className="text-[12px] tabular-nums" style={{ color: TK.muted }}>
                                        {(d.share * 100).toFixed(1)}% · {fmt(d.count)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-3 text-[12px]" style={{ color: TK.muted }}>
                        Click a slice or legend item to open the Backlink Audit filtered by backlink type.
                    </p>
                </div>
            </div>
        </section>
    );
}


