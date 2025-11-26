"use client";
import React, { useMemo, useRef, useState } from "react";

/**
 * Wranker – Backlink Insights / Overview / Section 4
 * CHART 10: Link Attribute Breakdown (Donut)
 *
 * Hover behavior: the hovered slice is slightly DIMMED (opacity ↓),
 * all other slices remain unchanged. (Same as Charts 8 & 9.)
 *
 * - No chart libs; pure SVG
 * - Center label shows Total (configurable)
 * - Legend shows color + % + count
 * - Click a slice to drill down (prop callback)
 * - Tooltip is a single, anchored card (no scattered popovers)
 *
 * Tailwind optional. Inline styles use CSS variables with safe fallbacks.
 */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
    brand: "var(--wr-brand, #1090D0)",
    surface: "var(--wr-surface, #FFFFFF)",
    text: "var(--wr-text, #111827)",
    muted: "var(--wr-muted, #6B7280)",
    border: "var(--wr-border, #E5E7EB)",
    borderLight: "var(--wr-borderLight, #EFF0F6)",
    radiusLg: "var(--wr-radius-lg, 16px)",
    shadowSm: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
};

/* ----------------------------- Types ------------------------------ */
type AttrKey = "dofollow" | "nofollow" | "sponsored" | "ugc";

export type LinkAttributeDatum = {
    key: AttrKey;
    label: string;
    value: number;
};

export type LinkAttributeBreakdownProps = {
    /** Pass data in any order; zeros allowed. */
    data?: LinkAttributeDatum[];
    /** Called when a slice or legend item is clicked. */
    onSliceClick?: (attr: AttrKey) => void;
    /** Optional center label variant: "total" (default) | "dofollow_pct" */
    centerMode?: "total" | "dofollow_pct";
    /** Optional card title override. */
    title?: string;
};

/* --------------------------- Palette & order --------------------------- */
const ORDER: AttrKey[] = ["dofollow", "nofollow", "sponsored", "ugc"];
const COLOR: Record<AttrKey, string> = {
    dofollow: "#10B981",  // green
    nofollow: "#3B82F6",  // blue
    sponsored: "#F59E0B", // amber
    ugc: "#A855F7",       // violet
};

/* ----------------------------- Helpers ----------------------------- */
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const fmt = (n: number) => n.toLocaleString();
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

/** SVG arc path for a ring slice (donut segment) */
function ringSlicePath(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    startDeg: number,
    endDeg: number
) {
    const toRad = (d: number) => (Math.PI / 180) * d;
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    const sxOuter = cx + rOuter * Math.cos(toRad(startDeg));
    const syOuter = cy + rOuter * Math.sin(toRad(startDeg));
    const exOuter = cx + rOuter * Math.cos(toRad(endDeg));
    const eyOuter = cy + rOuter * Math.sin(toRad(endDeg));

    const sxInner = cx + rInner * Math.cos(toRad(endDeg));
    const syInner = cy + rInner * Math.sin(toRad(endDeg));
    const exInner = cx + rInner * Math.cos(toRad(startDeg));
    const eyInner = cy + rInner * Math.sin(toRad(startDeg));

    return [
        `M ${sxOuter} ${syOuter}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${exOuter} ${eyOuter}`,
        `L ${sxInner} ${syInner}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${exInner} ${eyInner}`,
        "Z",
    ].join(" ");
}

/* ----------------------------- Component ----------------------------- */
export default function LinkAttributeBreakdownDonut({
    data = [
        { key: "dofollow", label: "Dofollow", value: 1200 },
        { key: "nofollow", label: "Nofollow", value: 970 },
        { key: "sponsored", label: "Sponsored", value: 140 },
        { key: "ugc", label: "UGC", value: 42 },
    ],
    onSliceClick,
    centerMode = "total",
    title = "Link Attribute Breakdown",
}: LinkAttributeBreakdownProps) {
    const [hoverKey, setHoverKey] = useState<AttrKey | null>(null);
    const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    /* Normalize order, compute totals */
    const ordered = useMemo(() => {
        const map = new Map<AttrKey, LinkAttributeDatum>();
        data.forEach((d) => map.set(d.key, d));
        return ORDER.map((k) => map.get(k) ?? { key: k, label: cap(k), value: 0 });
    }, [data]);

    const total = useMemo(() => ordered.reduce((s, d) => s + Math.max(0, d.value), 0), [ordered]);
    const withShare = useMemo(
        () =>
            ordered.map((d) => ({
                ...d,
                share: total ? d.value / total : 0,
                color: COLOR[d.key],
            })),
        [ordered, total]
    );

    /* Center label */
    const dofollow = withShare.find((d) => d.key === "dofollow")!;
    const centerPrimary =
        centerMode === "dofollow_pct"
            ? `${(dofollow.share * 100).toFixed(1)}%`
            : `Total: ${fmt(total)}`;
    const centerSecondary =
        centerMode === "dofollow_pct" ? "Dofollow" : dofollow ? `Dofollow: ${(dofollow.share * 100).toFixed(1)}%` : "";

    /* Tooltip data */
    const tip = hoverKey ? withShare.find((d) => d.key === hoverKey)! : null;

    /* Mouse capture for tooltip */
    const onMove: React.MouseEventHandler = (e) => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (!r) return;
        setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    };

    /* Donut geometry (responsive but fixed viewBox) */
    const VB_W = 360;
    const VB_H = 260;
    const cx = 130;
    const cy = 130;
    const R_OUT = 100;
    const R_IN = 70;
    const PAD_DEG = 1.5; // small gap between slices

    /* Build slices */
    let accDeg = -90; // start at top
    const slices = withShare.map((d) => {
        const sweep = clamp(d.share * 360, 0, 359.999);
        const start = accDeg + PAD_DEG / 2;
        const end = accDeg + sweep - PAD_DEG / 2;
        accDeg += sweep;

        const path = sweep <= 0 ? "" : ringSlicePath(cx, cy, R_OUT, R_IN, start, end);
        return { ...d, path, start, end };
    });

    return (
        <section
            className="w-full rounded-xl border bg-white p-4 sm:p-5"
            style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}
            ref={wrapRef}
            onMouseMove={onMove}
            onMouseLeave={() => { setHoverKey(null); setMouse(null); }}
        >
            {/* Header */}
            <header className="mb-3 flex items-center gap-2">
                <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
                    {title}
                </h3>
                <span className="ml-auto text-[12px]" style={{ color: TK.muted }}>
                    Dofollow · Nofollow · Sponsored · UGC
                </span>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Donut */}
                <div className="relative overflow-visible">
                    <svg
                        role="img"
                        aria-label="Backlinks by link attribute"
                        viewBox={`0 0 ${VB_W} ${VB_H}`}
                        width="100%"
                        height="100%"
                        className="block"
                    >
                        {/* Background rail to avoid card clipping */}
                        <circle cx={cx} cy={cy} r={(R_OUT + R_IN) / 2} fill="#F5F7FA" />

                        {/* Slices */}
                        {slices.map((s) => (
                            <path
                                key={s.key}
                                d={s.path}
                                fill={s.color}
                                style={{
                                    opacity: hoverKey === s.key ? 0.55 : 1, // ← dim hovered slice only
                                    transition: "opacity .15s ease, transform .15s ease",
                                    transformOrigin: `${cx}px ${cy}px`,
                                }}
                                onMouseEnter={() => setHoverKey(s.key)}
                                onClick={() => onSliceClick?.(s.key)}
                            >
                                <title>
                                    {`${s.label} • ${fmt(s.value)} backlinks (${pct(s.share)})`}
                                </title>
                            </path>
                        ))}

                        {/* Center label */}
                        <g transform={`translate(${cx},${cy})`} textAnchor="middle">
                            <text
                                y={-2}
                                fontSize="18"
                                fontWeight={600}
                                fill={TK.text}
                                style={{ dominantBaseline: "middle" }}
                            >
                                {centerPrimary}
                            </text>
                            <text
                                y={18}
                                fontSize="12"
                                fill={TK.muted}
                                style={{ dominantBaseline: "hanging" }}
                            >
                                {centerSecondary}
                            </text>
                        </g>
                    </svg>

                    {/* Tooltip (single, smart) */}
                    {tip && mouse && (
                        <div
                            className="pointer-events-none absolute z-10 rounded-lg border bg-white px-3 py-2 text-[12px] shadow-md"
                            style={{
                                left: clamp(mouse.x + 12, 8, (wrapRef.current?.clientWidth ?? 0) - 180),
                                top: clamp(mouse.y + 12, 8, (wrapRef.current?.clientHeight ?? 0) - 80),
                                borderColor: TK.border,
                            }}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <span
                                    className="inline-block h-2 w-2 rounded"
                                    style={{ background: tip.color }}
                                />
                                <span className="font-medium" style={{ color: TK.text }}>
                                    {tip.label}
                                </span>
                            </div>
                            <div className="tabular-nums" style={{ color: TK.text }}>
                                {fmt(tip.value)} backlinks &nbsp;•&nbsp; {pct(tip.share)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-col justify-center gap-2">
                    {withShare.map((d) => (
                        <button
                            key={d.key}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left hover:bg-gray-50"
                            style={{ borderColor: TK.border }}
                            onMouseEnter={() => setHoverKey(d.key)}
                            onMouseLeave={() => setHoverKey(null)}
                            onClick={() => onSliceClick?.(d.key)}
                            aria-label={`View ${d.label} backlinks`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded" style={{ background: d.color }} />
                                <span className="text-[13px] font-medium" style={{ color: TK.text }}>
                                    {d.label}
                                </span>
                            </span>
                            <span className="text-[12px] tabular-nums" style={{ color: TK.muted }}>
                                {pct(d.share)} · {fmt(d.value)}
                            </span>
                        </button>
                    ))}

                    {/* Context line */}
                    <div className="mt-2 text-[12px]" style={{ color: TK.muted }}>
                        Click a slice or legend to open the Backlinks table filtered by link type.
                    </div>
                </div>
            </div>
        </section>
    );
}

/* --------------------------- Small utils --------------------------- */
function cap(k: string) {
    return k.charAt(0).toUpperCase() + k.slice(1);
}


