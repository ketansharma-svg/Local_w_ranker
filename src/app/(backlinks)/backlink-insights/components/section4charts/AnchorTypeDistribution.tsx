"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Wranker – OVI / Overview / Section 4
 * CHART 11: Anchor Type Distribution (Classic Pie)
 *
 * ✔ Hover behavior: only the hovered slice is dimmed (others unchanged)
 * ✔ Clean, single tooltip with sample anchor
 * ✔ No clipping: SVG + wrapper use overflow-visible
 * ✔ Legend with % + count (renormalized to visible items)
 * ✔ Overuse warnings: Exact-Match > 25%, Branded+Generic < 30%
 * ✔ Slice click: onSliceClick({ type }) → route to Anchors Audit
 * ✔ Tailwind-friendly, tokens via CSS variables
 */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
    surface: "var(--wr-surface, #FFFFFF)",
    border: "var(--wr-border, #E5E7EB)",
    borderLight: "var(--wr-borderLight, #EFF0F6)",
    text: "var(--wr-text, #111827)",
    muted: "var(--wr-muted, #6B7280)",
    brand: "var(--wr-brand, #1090D0)",
    radius: "var(--wr-radius-lg, 16px)",
    shadowSm: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.06))",
};

/* ------------------------------ Types ------------------------------ */
type AnchorTypeKey = "Branded" | "Exact Match" | "Partial Match" | "Generic" | "Naked URL";

type SliceDatum = {
    type: AnchorTypeKey;
    count: number;        // number of backlinks (or unique RDs) in this anchor category
    sample?: string;      // sample anchor to show in tooltip
};

/* ------------------------------ Palette ------------------------------ */
const ORDER: AnchorTypeKey[] = [
    "Branded",
    "Exact Match",
    "Partial Match",
    "Generic",
    "Naked URL",
];

const COLORS: Record<AnchorTypeKey, string> = {
    Branded: "#1090D0",       // blue
    "Exact Match": "#F87171", // red
    "Partial Match": "#FBBF24", // amber
    Generic: "#9CA3AF",       // gray
    "Naked URL": "#8B5CF6",   // violet
};

/* --------------------------- Demo / Defaults --------------------------- */
const DEMO: SliceDatum[] = [
    { type: "Branded", count: 460, sample: "“wranker”, “wranker seo”" },
    { type: "Exact Match", count: 183, sample: "“seo company in jaipur”" },
    { type: "Partial Match", count: 220, sample: "“best seo tools for agencies”" },
    { type: "Generic", count: 120, sample: "“click here”, “visit site”" },
    { type: "Naked URL", count: 94, sample: "https://example.com" },
];

/* ------------------------------ Utils ------------------------------ */
const fmt = (n: number) => n.toLocaleString();
const pctLabel = (p: number) => `${(p * 100).toFixed(1)}%`;

// Geometry helpers for classic pie (center to edge arcs)
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describePieSlice(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    // Move to center → line to arc start → arc → close back to center
    return [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
        "Z",
    ].join(" ");
}

/* ---------------------------- Component ---------------------------- */
export default function OVI_Chart_AnchorTypeDistribution({
    data = DEMO,
    title = "Anchor Type Distribution",
    onSliceClick,
}: {
    data?: SliceDatum[];
    title?: string;
    /** Deep link to Anchors Audit: e.g., onSliceClick({ type: "Exact Match" }) */
    onSliceClick?: (params: { type: AnchorTypeKey }) => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ w: number; h: number }>({ w: 520, h: 280 });
    const [hovered, setHovered] = useState<AnchorTypeKey | null>(null);
    const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; content: React.ReactNode }>({
        show: false,
        x: 0,
        y: 0,
        content: null,
    });

    // Responsive observer for container width (pie radius adapts)
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const e of entries) {
                const w = e.contentRect.width;
                // Keep height steady within 240–300; allow legend space
                const h = Math.min(300, Math.max(240, Math.round(w * 0.5)));
                setSize({ w, h });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Filter + normalize (ignore empty categories)
    const slices = useMemo(() => {
        const filtered = ORDER
            .map((k) => data.find((d) => d.type === k) || { type: k as AnchorTypeKey, count: 0 })
            .filter((d) => d.count > 0);

        const total = filtered.reduce((s, d) => s + d.count, 0) || 1;
        const withPct = filtered.map((d) => ({ ...d, pct: d.count / total }));
        return { items: withPct, total };
    }, [data]);

    // Overuse signals (on full dataset, not normalized by visibility)
    const totals = useMemo(() => {
        const map: Record<AnchorTypeKey, number> = {
            Branded: 0,
            "Exact Match": 0,
            "Partial Match": 0,
            Generic: 0,
            "Naked URL": 0,
        };
        for (const d of data) map[d.type] = d.count;
        const sum = Object.values(map).reduce((s, v) => s + v, 0) || 1;
        const exactPct = map["Exact Match"] / sum;
        const brandGenericPct = (map["Branded"] + map["Generic"]) / sum;
        return { map, sum, exactPct, brandGenericPct };
    }, [data]);

    // Pie geometry
    const { cx, cy, r } = useMemo(() => {
        const w = size.w;
        const h = size.h;
        // Keep some breathing room; prevent clipping
        const pad = 12;
        const radius = Math.min(w * 0.32, h * 0.42);
        return { cx: Math.round(w * 0.38), cy: Math.round(h * 0.52), r: Math.max(40, Math.round(radius) - pad) };
    }, [size]);

    // Tooltip builders
    function buildTooltip(d: { type: AnchorTypeKey; count: number; pct: number; sample?: string }) {
        return (
            <div className="rounded-md border bg-white px-3 py-2 text-[12px] shadow-md"
                style={{ borderColor: TK.border, maxWidth: 260 }}>
                <div className="mb-1 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded" style={{ background: COLORS[d.type] }} />
                    <span className="font-medium" style={{ color: TK.text }}>{d.type}</span>
                </div>
                <div className="text-[12px]" style={{ color: TK.text }}>
                    {fmt(d.count)} backlinks ({pctLabel(d.pct)})
                </div>
                {!!d.sample && (
                    <div className="mt-1 text-[12px]" style={{ color: TK.muted }}>
                        e.g., <span className="italic">{d.sample}</span>
                    </div>
                )}
            </div>
        );
    }

    // Mouse handlers for slices
    const onSliceEnter = (key: AnchorTypeKey, evt: React.MouseEvent, payload: any) => {
        setHovered(key);
        setTooltip({
            show: true,
            x: evt.clientX,
            y: evt.clientY,
            content: buildTooltip(payload),
        });
    };
    const onSliceMove = (evt: React.MouseEvent) => {
        setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY }));
    };
    const onSliceLeave = () => {
        setHovered(null);
        setTooltip((t) => ({ ...t, show: false }));
    };

    /* ------------------------------- UI ------------------------------- */
    return (
        <section
            ref={cardRef}
            className="w-full overflow-visible rounded-xl border bg-white p-4 sm:p-5 "
            style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}
        >
            {/* Header */}
            <header className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
                    {title}
                </h3>
                <span className="ml-auto text-[12px]" style={{ color: TK.muted }}>
                    Total analyzed: <span className="font-medium" style={{ color: TK.text }}>{fmt(totals.sum)}</span>
                </span>
            </header>

            <div className="grid grid-cols-1 items-center justify-center w-full ">
                {/* Chart */}
                <div className="relative overflow-visible flex items-center justify-center w-full ">
                    <svg
                        role="img"
                        aria-label="Anchor type distribution pie chart"
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${size.w} ${size.h}`}
                        className=" overflow-visible flex items-center justify-center w-full "
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMidYMid meet"
                        onMouseLeave={onSliceLeave}
                    >
                        {/* Pie slices */}
                        {(() => {
                            let startAngle = 0;
                            return slices.items.map((d, idx) => {
                                const sweep = d.pct * 360;
                                const endAngle = startAngle + sweep;
                                const path = describePieSlice(cx, cy, r, startAngle, endAngle);
                                const key = d.type;
                                const isHovered = hovered === key;

                                // Payload for tooltip
                                const payload = {
                                    type: key,
                                    count: d.count,
                                    pct: d.pct,
                                    sample: data.find((x) => x.type === key)?.sample,
                                };

                                const node = (
                                    <path
                                        key={key}
                                        d={path}
                                        fill={COLORS[key]}
                                        opacity={isHovered ? 0.45 : 1}     // ← dim ONLY hovered slice
                                        style={{ transition: "opacity 140ms ease, transform 140ms ease" }}
                                        onMouseEnter={(e) => onSliceEnter(key, e, payload)}
                                        onMouseMove={onSliceMove}
                                        onClick={() => onSliceClick?.({ type: key })}
                                        cursor={onSliceClick ? "pointer" : "default"}
                                    />
                                );
                                startAngle = endAngle;
                                return node;
                            });
                        })()}
                    </svg>

                    {/* Tooltip (portal-like absolute) */}
                    {tooltip.show && (
                        <div
                            className="pointer-events-none fixed z-50"
                            style={{
                                left: tooltip.x + 12,
                                top: tooltip.y + 12,
                            }}
                        >
                            {tooltip.content}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="overflow-hidden rounded-lg border p-3" style={{ borderColor: TK.borderLight, background: TK.surface }}>
                    <div className="mb-2 text-[13px]" style={{ color: TK.muted }}>
                        Share of anchors by type (visible):
                    </div>
                    <ul className="flex flex-col gap-2">
                        {slices.items.map((d) => (
                            <li
                                key={d.type}
                                className="flex items-center justify-between rounded-md px-2 py-1"
                                onMouseEnter={(e) => {
                                    // Mirror hover behavior from slices
                                    const payload = {
                                        type: d.type,
                                        count: d.count,
                                        pct: d.pct,
                                        sample: data.find((x) => x.type === d.type)?.sample,
                                    };
                                    setHovered(d.type);
                                    setTooltip({ show: true, x: (e as any).clientX, y: (e as any).clientY, content: buildTooltip(payload) });
                                }}
                                onMouseMove={(e) => setTooltip((t) => ({ ...t, x: (e as any).clientX, y: (e as any).clientY }))}
                                onMouseLeave={onSliceLeave}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded" style={{ background: COLORS[d.type] }} />
                                    <span
                                        className="truncate text-[13px] font-medium"
                                        style={{ color: TK.text, opacity: hovered === d.type ? 0.7 : 1 }}
                                    >
                                        {d.type}
                                    </span>
                                </span>
                                <span className="ml-3 shrink-0 tabular-nums text-[13px]" style={{ color: TK.text }}>
                                    {pctLabel(d.pct)} <span className="text-[12px]" style={{ color: TK.muted }}>· {fmt(d.count)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 border-t pt-2 text-[12px]" style={{ borderColor: TK.borderLight, color: TK.muted }}>
                        Click any slice to drill down in Anchors Audit.
                    </div>
                </div>
            </div>

            {/* Overuse / diversification alerts */}
            <div className="mt-3 space-y-2">
                {totals.exactPct > 0.25 && (
                    <div
                        className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
                        style={{ borderColor: "#FEE2E2", background: "#FFF7F7", color: "#991B1B" }}
                    >
                        <span>⚠</span>
                        <p>
                            High use of <b>Exact Match</b> anchors ({(totals.exactPct * 100).toFixed(1)}%). Diversify with branded / generic anchors.
                        </p>
                    </div>
                )}
                {totals.brandGenericPct < 0.30 && (
                    <div
                        className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
                        style={{ borderColor: "#FEF3C7", background: "#FFFBEB", color: "#7C2D12" }}
                    >
                        <span>💡</span>
                        <p>
                            <b>Branded + Generic</b> anchors are below 30% ({(totals.brandGenericPct * 100).toFixed(1)}%). Consider increasing safe anchor usage.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}



