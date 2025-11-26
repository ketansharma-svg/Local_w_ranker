"use client";
import React, { useMemo, useRef, useState } from "react";

/**
 * Wranker – Backlink Insights / Overview / Section 4
 * CHART 12: Categories of Referring Domains (Horizontal Bar)
 *
 * - Hover effect: ONLY the hovered bar dims (others stay unchanged)
 * - Smart anchored tooltip (no scatter / overflow-safe)
 * - Click a bar → route to Audit > Referring Domains filtered by category
 * - Legend with % and color swatches
 * - Fully responsive; no external chart libs
 *
 * Tailwind recommended; uses CSS variables with safe fallbacks.
 */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
    brand: "var(--wr-brand, #1090D0)",
    text: "var(--wr-text, #111827)",
    muted: "var(--wr-muted, #6B7280)",
    surface: "var(--wr-surface, #FFFFFF)",
    bgSubtle: "var(--wr-bg-subtle, #F5F7FA)",
    border: "var(--wr-border, #E5E7EB)",
    borderLight: "var(--wr-borderLight, #EFF0F6)",
    shadowSm: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
    radius: "var(--wr-radius-lg, 16px)",
};

/* ----------------------------- Types ------------------------------ */
export type CategoryKey =
    | "Blogs"
    | "Business Sites"
    | "Directories"
    | "Forums"
    | "Media / News"
    | "E‑commerce"
    | "EDU/GOV"
    | "PBN / Suspect"
    | "Other";

export type DomainCategoryDatum = { key: CategoryKey; count: number };

/* ------------------------- Palette & Icons ------------------------- */
const CAT_COLOR: Record<CategoryKey, string> = {
    "Blogs": "#1090D0",          // brand blue
    "Business Sites": "#0EA5E9", // cyan
    "Directories": "#F59E0B",    // amber
    "Forums": "#8B5CF6",         // violet
    "Media / News": "#60A5FA",   // light blue
    "E‑commerce": "#10B981",     // green
    "EDU/GOV": "#1E40AF",        // deep blue
    "PBN / Suspect": "#EF4444",  // red
    "Other": "#9CA3AF",          // gray
};
const CAT_ICON: Record<CategoryKey, string> = {
    "Blogs": "📰",
    "Business Sites": "🏢",
    "Directories": "📚",
    "Forums": "💬",
    "Media / News": "🗞️",
    "E‑commerce": "🛒",
    "EDU/GOV": "🎓",
    "PBN / Suspect": "⚠️",
    "Other": "📦",
};

/* --------------------------- Demo dataset -------------------------- */
const DEMO: DomainCategoryDatum[] = [
    { key: "Blogs", count: 340 },
    { key: "Business Sites", count: 290 },
    { key: "Directories", count: 182 },
    { key: "Forums", count: 101 },
    { key: "Media / News", count: 62 },
    { key: "E‑commerce", count: 47 },
    { key: "EDU/GOV", count: 18 },
    { key: "PBN / Suspect", count: 12 },
    { key: "Other", count: 23 },
];

/* ----------------------------- Helpers ----------------------------- */
const fmt = (n: number) => n.toLocaleString();
const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "0.0");

/* ---------------------------- Component ---------------------------- */
export default function OVI_Section_RefDomainCategories({
    data = DEMO,
    title = "Categories of Referring Domains",
    height = 280,
    onDrillDown,
}: {
    data?: DomainCategoryDatum[];
    title?: string;
    height?: number; // ~260–300px target
    /** Drilldown route handler (e.g., → Audit > Referring Domains filtered by category) */
    onDrillDown?: (category: CategoryKey) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<CategoryKey | null>(null);
    const [tt, setTt] = useState<{ open: boolean; x: number; y: number; key?: CategoryKey }>(
        { open: false, x: 0, y: 0 }
    );

    /* Sort by count desc and compute totals */
    const rows = useMemo(
        () => [...data].sort((a, b) => b.count - a.count),
        [data]
    );
    const total = useMemo(() => rows.reduce((s, r) => s + r.count, 0), [rows]);
    const maxVal = useMemo(() => Math.max(1, ...rows.map((r) => r.count)), [rows]);

    /* Tooltip positioning helper */
    const openTooltip = (key: CategoryKey, e: React.MouseEvent) => {
        const host = containerRef.current;
        if (!host) return;
        const hostRect = host.getBoundingClientRect();
        const x = Math.min(
            Math.max(e.clientX - hostRect.left + 12, 8),
            hostRect.width - 8
        );
        const y = Math.min(
            Math.max(e.clientY - hostRect.top - 4, 8),
            hostRect.height - 8
        );
        setTt({ open: true, x, y, key });
    };

    /* ------------------------------- UI ------------------------------- */
    return (
        <section
            className="w-full rounded-xl border bg-white p-4 sm:p-5"
            style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}
            aria-label={title}
        >
            {/* Header */}
            <header className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
                    {title}
                </h3>
                <span className="text-[12px]" style={{ color: TK.muted }}>
                    {fmt(total)} referring domains · hover to inspect · click to drill down
                </span>
                <div className="ml-auto text-[12px]" style={{ color: TK.muted }}>
                    Bar variant (preferred) · shares per category
                </div>
            </header>

            {/* Chart container */}
            <div
                ref={containerRef}
                className="relative w-full overflow-visible rounded-lg border bg-white p-3"
                style={{ borderColor: TK.borderLight, minHeight: Math.max(240, height) }}
            >
                {/* Bars */}
                <div className="grid grid-cols-1 gap-3">
                    {rows.map((r) => {
                        const share = total ? r.count / total : 0;
                        const widthPct = Math.max(2, (r.count / maxVal) * 100); // ensure a minimum visible bar
                        const isHover = hover === r.key;
                        return (
                            <div key={r.key} className="flex items-center gap-3">
                                {/* Left label */}
                                <div className="w-40 shrink-0 pr-1 text-[13px] sm:w-48">
                                    <span className="inline-flex items-center gap-2">
                                        <span className="inline-block h-2 w-2 rounded" style={{ background: CAT_COLOR[r.key] }} />
                                        <span className="font-medium" style={{ color: TK.text }}>
                                            {CAT_ICON[r.key]} {r.key}
                                        </span>
                                    </span>
                                </div>

                                {/* Bar rail + fill */}
                                <button
                                    className="group relative h-7 w-full overflow-visible rounded-md"
                                    style={{ background: TK.bgSubtle }}
                                    onClick={() => onDrillDown?.(r.key)}
                                    onMouseEnter={(e) => {
                                        setHover(r.key);
                                        openTooltip(r.key, e);
                                    }}
                                    onMouseMove={(e) => openTooltip(r.key, e)}
                                    onMouseLeave={() => {
                                        setHover(null);
                                        setTt((s) => ({ ...s, open: false }));
                                    }}
                                    onFocus={(e) => {
                                        setHover(r.key);
                                        openTooltip(r.key, e as unknown as React.MouseEvent);
                                    }}
                                    onBlur={() => {
                                        setHover(null);
                                        setTt((s) => ({ ...s, open: false }));
                                    }}
                                    title={`View ${r.key} domains`}
                                >
                                    <div
                                        className="absolute left-0 top-0 h-full rounded-md transition-all"
                                        style={{
                                            width: `${widthPct}%`,
                                            background: CAT_COLOR[r.key],
                                            opacity: isHover ? 0.55 : 1, // HOVER RULE: dim ONLY hovered
                                            boxShadow: isHover ? "0 1px 0 rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.03) inset" : "none",
                                        }}
                                        aria-hidden
                                    />
                                    {/* Inline value on the right (count + %) */}
                                    <div className="absolute inset-0 flex items-center justify-end pr-2 text-[12px]">
                                        <span
                                            className="rounded px-1.5 py-0.5 tabular-nums"
                                            style={{ color: TK.text, background: "rgba(255,255,255,.85)" }}
                                        >
                                            {fmt(r.count)} · {pct(r.count, total)}%
                                        </span>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Smart Tooltip (anchored; avoids clipping) */}
                {tt.open && tt.key && (
                    <div
                        role="tooltip"
                        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[110%] rounded-md border bg-white px-3 py-2 text-[12px] shadow-md"
                        style={{
                            left: tt.x,
                            top: tt.y,
                            borderColor: TK.border,
                            maxWidth: 280,
                            whiteSpace: "nowrap",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded" style={{ background: CAT_COLOR[tt.key] }} />
                            <span className="font-semibold" style={{ color: TK.text }}>
                                {CAT_ICON[tt.key]} {tt.key}
                            </span>
                        </div>
                        <div className="mt-1 text-[12px]" style={{ color: TK.muted }}>
                            {fmt(rows.find((x) => x.key === tt.key)!.count)} domains · {pct(rows.find((x) => x.key === tt.key)!.count, total)}%
                        </div>
                        <div className="mt-1 text-[12px]" style={{ color: TK.muted }}>
                            Click to audit this category →
                        </div>
                        {/* Tooltip arrow */}
                        <div
                            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r bg-white"
                            style={{ borderColor: TK.border }}
                        />
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3 lg:grid-cols-4">
                {rows.map((r) => {
                    const share = total ? (r.count / total) * 100 : 0;
                    const isHover = hover === r.key;
                    return (
                        <button
                            key={r.key}
                            className="flex items-center justify-between rounded-md border px-2 py-1 text-left text-[12px] transition"
                            style={{
                                borderColor: TK.borderLight,
                                background: isHover ? "rgba(0,0,0,0.03)" : "transparent",
                            }}
                            onMouseEnter={() => setHover(r.key)}
                            onMouseLeave={() => setHover(null)}
                            onClick={() => onDrillDown?.(r.key)}
                            title={`View ${r.key} domains`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded" style={{ background: CAT_COLOR[r.key] }} />
                                <span style={{ color: TK.text }}>{r.key}</span>
                            </span>
                            <span className="tabular-nums" style={{ color: TK.muted }}>
                                {share.toFixed(1)}%
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Footer note / CTA slot (optional) */}
            <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px]" style={{ color: TK.muted }}>
          Tip: Blogs + Directories &gt; ~60% may warrant diversification.
                </span>
                {/* Placeholder to wire into your router */}
                <button
                    className="rounded-md border px-3 py-1 text-[12px] font-medium"
                    style={{ borderColor: TK.border, color: TK.text }}
                    onClick={() => onDrillDown?.("Blogs")}
                    title="Quick view example"
                >
                    View Blog domains
                </button>
            </div>
        </section>
    );
}


