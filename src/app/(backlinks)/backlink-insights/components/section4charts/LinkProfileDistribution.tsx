"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";

/**
 * Wranker – Backlink Insights → Overview → Section 4
 * CHART 8: Link Profile Distribution (Donut)
 *
 * • Pure SVG donut (no lib), responsive, overflow-visible
 * • Hover rule: ONLY hovered slice dims (opacity 0.45); others stay unchanged
 * • Center label updates on hover (label + % + total)
 * • Smart tooltip (single card, anchored near cursor) with CTA
 * • Legend hover mirrors slice hover (same dimming rule)
 * • Click routing via onRoute prop
 *
 * Colors:
 * Safe        #10B981
 * Suspicious  #F59E0B
 * Toxic       #EF4444
 */

type RiskKey = "Safe" | "Suspicious" | "Toxic";

export type LinkProfileDistributionProps = {
    /** absolute counts; percentages computed internally */
    counts?: { Safe: number; Suspicious: number; Toxic: number };
    /** optional custom colors */
    colors?: Partial<Record<RiskKey, string>>;
    /** center label preference: "dominant" | "total" (default: dominant) */
    centerMode?: "dominant" | "total";
    /** click a slice or legend → route user (receive the risk key) */
    onRoute?: (risk: RiskKey) => void;
    /** chart title & subtitle (optional) */
    title?: string;
    subtitle?: string;
};

const DEFAULTS: Required<LinkProfileDistributionProps>["counts"] = {
    Safe: 1982,
    Suspicious: 502,
    Toxic: 300,
};

const PALETTE: Record<RiskKey, string> = {
    Safe: "#10B981",
    Suspicious: "#F59E0B",
    Toxic: "#EF4444",
};

const DESC: Record<RiskKey, string> = {
    Safe: "Mostly contextual, branded, or diversified anchors.",
    Suspicious: "High % of keyword anchors or placement anomalies.",
    Toxic: "Link farms, poor WR, flagged as risky.",
};

const dot = (c: string) =>
    <span
        style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background: c,
            marginRight: 8,
            transform: "translateY(-1px)",
        }}
        aria-hidden
    />;

const fmt = (n: number) => n.toLocaleString();
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

export default function Chart8_LinkProfileDistribution({
    counts = DEFAULTS,
    colors,
    centerMode = "dominant",
    onRoute,
    title = "Link Profile Distribution",
    subtitle = "Across all backlinks",
}: LinkProfileDistributionProps) {
    const mergedColors: Record<RiskKey, string> = {
        Safe: colors?.Safe ?? PALETTE.Safe,
        Suspicious: colors?.Suspicious ?? PALETTE.Suspicious,
        Toxic: colors?.Toxic ?? PALETTE.Toxic,
    };

    const total = Math.max(
        0,
        (counts.Safe || 0) + (counts.Suspicious || 0) + (counts.Toxic || 0)
    );

    const items = useMemo(
        () =>
            (["Safe", "Suspicious", "Toxic"] as RiskKey[])
                .map((k) => ({
                    key: k,
                    label: k,
                    count: counts[k],
                    color: mergedColors[k],
                    share: total ? counts[k] / total : 0,
                    description: DESC[k],
                }))
                // keep donut order Safe → Suspicious → Toxic
                .filter((d) => d.count > 0),
        [counts, mergedColors, total]
    );

    // Center label logic
    const dominant =
        items.length > 0
            ? items.slice().sort((a, b) => b.share - a.share)[0]
            : undefined;

    // Hover (only hovered slice dims; others unchanged)
    const [hovered, setHovered] = useState<RiskKey | null>(null);

    // Tooltip state (single smart card)
    const [tt, setTt] = useState<{
        show: boolean;
        x: number;
        y: number;
        k: RiskKey | null;
    }>({ show: false, x: 0, y: 0, k: null });

    const wrapRef = useRef<HTMLDivElement>(null);

    // Keep tooltip inside card on resize/scroll
    useEffect(() => {
        const cb = () => setTt((s) => ({ ...s })); // trigger re-layout
        window.addEventListener("resize", cb);
        return () => window.removeEventListener("resize", cb);
    }, []);

    // Donut geometry
    const size = 260; // SVG viewBox size (square)
    const cx = size / 2;
    const cy = size / 2;
    const r = 90; // ring center radius
    const ring = 26; // ring thickness
    const C = 2 * Math.PI * r; // circumference
    const gap = 1.5; // tiny gap between slices (in px along circumference)

    // Build segments using stroke-dasharray technique
    const segments = useMemo(() => {
        let offset = 0;
        return items.map((it, idx) => {
            const len = Math.max(0, it.share * (C - items.length * gap)); // reserve tiny space for visual separation
            const dash = `${len} ${C - len}`;
            const seg = {
                ...it,
                dash,
                offset, // dashOffset to position slice
            };
            offset -= len + gap; // move to next
            return seg;
        });
    }, [items, C, gap]);

    // Label shown in the center (updates on hover)
    const center = useMemo(() => {
        const target =
            hovered && items.find((i) => i.key === hovered) ? hovered : undefined;

        if (target) {
            const i = items.find((x) => x.key === target)!;
            return {
                line1: `${pct(i.share)} ${i.label}`,
                line2: `Total: ${fmt(total)}`,
                color: i.color,
            };
        }
        if (centerMode === "total" || !dominant) {
            return { line1: `Total: ${fmt(total)}`, line2: "", color: "#111827" };
        }
        return {
            line1: `${pct(dominant.share)} ${dominant.label}`,
            line2: `Total: ${fmt(total)}`,
            color: dominant.color,
        };
    }, [hovered, items, total, centerMode, dominant]);

    // Tooltip renderer
    const TooltipCard = () => {
        if (!tt.show || !tt.k) return null;
        const it = items.find((i) => i.key === tt.k);
        if (!it) return null;

        // place within wrapper bounds
        const wrap = wrapRef.current;
        let left = tt.x + 14;
        let top = tt.y + 10;
        if (wrap) {
            const rect = wrap.getBoundingClientRect();
            const w = 280;
            const h = 132;
            // If going outside, flip left/top
            if (left + w > rect.width) left = Math.max(8, tt.x - w - 12);
            if (top + h > rect.height) top = Math.max(8, tt.y - h - 12);
        }

        return (
            <div
                role="tooltip"
                style={{
                    position: "absolute",
                    left,
                    top,
                    minWidth: 260,
                    maxWidth: 320,
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 6px 20px rgba(0,0,0,.08)",
                    borderRadius: 12,
                    padding: 12,
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {dot(it.color)}
                    <div style={{ fontWeight: 600, color: "#111827" }}>{it.label}</div>
                </div>
                <div
                    style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "#111827",
                        fontWeight: 600,
                    }}
                >
                    {fmt(it.count)} links ({pct(it.share)})
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#6B7280" }}>
                    {it.description}
                </div>
                <div
                    style={{
                        marginTop: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--wr-brand, #1090D0)",
                        pointerEvents: "auto",
                    }}
                >
                    {/* Pointer-events enabled only for CTA text */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRoute?.(it.key);
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        {it.key === "Toxic"
                            ? "Audit Toxic Links →"
                            : it.key === "Suspicious"
                                ? "Review Suspicious Links →"
                                : "View Safe Links →"}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section
            className="wr-card"
            style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1px solid var(--wr-border, #E5E7EB)",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 2px 6px rgba(0,0,0,.05)",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h3
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#111827",
                    }}
                >
                    {title}
                </h3>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{subtitle}</div>
            </div>

            {/* Chart row */}
            <div
                ref={wrapRef}
                style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "minmax(260px, 320px) 1fr",
                    gap: 12,
                    alignItems: "center",
                    marginTop: 8,
                    overflow: "visible", // prevents donut from being clipped
                }}
            >
                {/* Donut */}
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: 340,
                        justifySelf: "start",
                        overflow: "visible",
                    }}
                >
                    <svg
                        viewBox={`0 0 ${size} ${size}`}
                        width="100%"
                        height="100%"
                        style={{
                            display: "block",
                            overflow: "visible",
                        }}
                        aria-label="Link profile risk distribution donut"
                        onMouseLeave={() => {
                            setHovered(null);
                            setTt((s) => ({ ...s, show: false, k: null }));
                        }}
                    >
                        {/* rotate so slices start at top (12 o'clock) */}
                        <g transform={`translate(${cx} ${cy}) rotate(-90)`}>
                            {/* Background rail */}
                            <circle
                                r={r}
                                cx={0}
                                cy={0}
                                fill="none"
                                stroke="#F3F4F6"
                                strokeWidth={ring}
                            />
                            {/* Slices */}
                            {segments.map((s) => (
                                <g key={s.key}>
                                    <circle
                                        r={r}
                                        cx={0}
                                        cy={0}
                                        fill="none"
                                        stroke={s.color}
                                        strokeWidth={ring}
                                        strokeDasharray={s.dash}
                                        strokeDashoffset={s.offset}
                                        style={{
                                            transition: "opacity 160ms ease, transform 160ms ease",
                                            opacity: hovered === s.key ? 0.45 : 1, // ONLY hovered slice dims
                                            transform:
                                                hovered === s.key ? "scale(0.985)" : "scale(1.0)", // subtle micro-shrink on hover
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            setHovered(s.key);
                                            // position tooltip relative to wrapper
                                            const rect = (e.target as SVGCircleElement).ownerSVGElement!.getBoundingClientRect();
                                            const wrapRect = wrapRef.current?.getBoundingClientRect();
                                            const ex = (e as any).clientX - (wrapRect?.left || rect.left);
                                            const ey = (e as any).clientY - (wrapRect?.top || rect.top);
                                            setTt({ show: true, x: ex, y: ey, k: s.key });
                                        }}
                                        onMouseMove={(e) => {
                                            const rect = (e.target as SVGCircleElement).ownerSVGElement!.getBoundingClientRect();
                                            const wrapRect = wrapRef.current?.getBoundingClientRect();
                                            const ex = (e as any).clientX - (wrapRect?.left || rect.left);
                                            const ey = (e as any).clientY - (wrapRect?.top || rect.top);
                                            setTt((prev) => ({ ...prev, show: true, x: ex, y: ey }));
                                        }}
                                        onClick={() => onRoute?.(s.key)}
                                    />
                                </g>
                            ))}
                        </g>

                        {/* Center label (not rotated) */}
                        <g>
                            <foreignObject
                                x={cx - 90}
                                y={cy - 38}
                                width={180}
                                height={76}
                                style={{ pointerEvents: "none" }}
                            >
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        lineHeight: 1.2,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 16,
                                            color: center.color,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {center.line1}
                                    </div>
                                    {center.line2 && (
                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: 13,
                                                color: "#6B7280",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {center.line2}
                                        </div>
                                    )}
                                </div>
                            </foreignObject>
                        </g>
                    </svg>

                    {/* Tooltip */}
                    <TooltipCard />
                </div>

                {/* Legend & helper text */}
                <div style={{ alignSelf: "center" }}>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 16,
                            rowGap: 10,
                            fontSize: 14,
                            color: "#111827",
                        }}
                    >
                        {items.map((it) => (
                            <button
                                key={it.key}
                                type="button"
                                onMouseEnter={() => setHovered(it.key)}
                                onMouseLeave={() => setHovered(null)}
                                onClick={() => onRoute?.(it.key)}
                                title={`Open Audit filtered by ${it.label}`}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    background: "transparent",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 999,
                                    padding: "6px 10px",
                                    cursor: "pointer",
                                    transition: "box-shadow 120ms ease, transform 120ms ease",
                                    boxShadow:
                                        hovered === it.key ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                                    transform: hovered === it.key ? "translateY(-1px)" : "none",
                                    opacity: hovered === it.key ? 0.9 : 1, // mirror the hover intent but do NOT dim other items
                                }}
                            >
                                {dot(it.color)}
                                <span style={{ fontWeight: 500 }}>{it.label}:</span>
                                <span style={{ fontWeight: 700 }}>
                                    {pct(it.share)}
                                </span>
                                <span style={{ color: "#6B7280" }}>({fmt(it.count)})</span>
                            </button>
                        ))}
                    </div>

                    <div
                        style={{
                            marginTop: 10,
                            fontSize: 13,
                            color: "#6B7280",
                        }}
                    >
                        Click a segment to open the Backlink Audit filtered by risk level.
                    </div>
                </div>
            </div>
        </section>
    );
}


