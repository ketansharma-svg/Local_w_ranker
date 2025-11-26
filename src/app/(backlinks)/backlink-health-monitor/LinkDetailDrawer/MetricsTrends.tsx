"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip
} from "recharts";

/* --------------------------------------------------------------------------
   Wranker Tokens (light mode)
----------------------------------------------------------------------------*/
const TK = {
    brand: "#1090D0",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    borderLight: "#EFF0F6",
    ok: "#10B981",
    warn: "#F59E0B",
    danger: "#EF4444",
    card: "#FFFFFF",
    pastel: "#F5F7FA",
};

/* --------------------------------------------------------------------------
   Types
----------------------------------------------------------------------------*/
export type MetricPoint = { t: string; v: number }; // ISO date string, 0..100

export interface MetricsTrendsProps {
    wr_series?: MetricPoint[];     // ascending by t
    spam_series?: MetricPoint[];   // ascending by t
    wr?: number; wr_prev?: number;
    spam?: number; spam_prev?: number;
    maxPoints?: number; // default 6
    isLoading?: boolean;
    error?: string | null;
    onPointNavigate?: (opts: { metric: 'wr' | 'spam'; iso: string }) => void;
}

/* --------------------------------------------------------------------------
   Utilities
----------------------------------------------------------------------------*/
const fmtShortDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return new Intl.DateTimeFormat("en-US", opts).format(d);
};

const buildSeries = (points: MetricPoint[] | undefined, cap = 6) => {
    if (!points || !points.length) return [] as MetricPoint[];
    const valid = points.filter(p => Number.isFinite(p.v));
    return valid.slice(-Math.min(cap, 12));
};

function delta(curr?: number, prev?: number) {
    if (typeof curr !== 'number' || typeof prev !== 'number') return { d: 0, dir: 'flat' as const };
    const d = Math.round(curr - prev);
    return { d, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' as const };
}

const spamLevel = (v: number) => (v <= 20 ? 'Low' : v <= 40 ? 'Medium' : 'High');
const spamColor = (v: number) => (v <= 20 ? TK.ok : v <= 40 ? TK.warn : TK.danger);

/* --------------------------------------------------------------------------
   Custom Tooltip content for sparks (accessible)
----------------------------------------------------------------------------*/
function SparkTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0]?.payload as MetricPoint & { label: string };
    const value = Math.round(p.v);
    return (
        <div
            style={{
                background: TK.card,
                border: `1px solid ${TK.border}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                borderRadius: 8,
                padding: 8,
                fontSize: 12,
                color: TK.text,
            }}
            role="dialog"
            aria-live="polite"
        >
            <div style={{ fontWeight: 600 }}>{p.label} {value}</div>
            <div style={{ color: TK.muted }}>{fmtShortDate(p.t)}</div>
            <div style={{ color: TK.muted, marginTop: 4 }}>ISO: {p.t}</div>
        </div>
    );
}

/* --------------------------------------------------------------------------
   Spark Card (reusable for WR / Spam)
----------------------------------------------------------------------------*/
function SparkCard({
    title,
    series,
    color,
    current,
    previous,
    metric,
    onPointNavigate,
    yFixed = true,
    valueSuffix = "",
    getPointColor,
}: {
    title: string;
    series: MetricPoint[];
    color: string;
    current?: number;
    previous?: number;
    metric: 'wr' | 'spam';
    onPointNavigate?: (opts: { metric: 'wr' | 'spam'; iso: string }) => void;
    yFixed?: boolean;
    valueSuffix?: string;
    getPointColor?: (v: number) => string; // for Spam per-level coloring
}) {
    const { d, dir } = useMemo(() => delta(current, previous), [current, previous]);
    const hasData = series && series.length >= 3;

    const arrow = dir === 'up' ? <ArrowUpRight size={14} color={TK.ok} /> : dir === 'down' ? <ArrowDownRight size={14} color={TK.danger} /> : <Minus size={14} color={TK.muted} />;

    const data = useMemo(() =>
        series.map((p, i) => ({ ...p, idx: i, label: metric === 'wr' ? 'WR' : 'Spam' })),
        [series, metric]);

    return (
        <div
            className="rounded-[10px] border bg-white"
            style={{ borderColor: TK.border, padding: 12 }}
            role="group"
            aria-label={`${title} spark trends`}
        >
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[12.5px]" style={{ color: TK.muted }}>{title}</div>
                <div className="flex items-center gap-1 text-[12px]" style={{ color: TK.text }}>
                    <span className="tabular-nums font-semibold">{typeof current === 'number' ? Math.round(current) : '—'}{valueSuffix}</span>
                    <span className="inline-flex items-center gap-0.5 ml-1">
                        {arrow}
                        <span className="tabular-nums" style={{ color: dir === 'up' ? TK.ok : dir === 'down' ? TK.danger : TK.muted }}>{dir === 'flat' ? '—' : (d > 0 ? `+${d}` : `${d}`)}</span>
                    </span>
                </div>
            </div>

            {/* Chart area */}
            <div
                className="h-[64px] outline-none"
                tabIndex={0}
                aria-label={`${title} trend: ${series.length} checks. Latest ${typeof current === 'number' ? Math.round(current) : '—'}${valueSuffix}${previous != null ? `, Δ ${d}` : ''}`}
                role="img"
            >
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                            <YAxis domain={[0, 100]} hide={true} />
                            <XAxis dataKey="t" hide={true} />
                            <Tooltip content={<SparkTooltip />} isAnimationActive={false} />
                            <Bar dataKey="v" fill={color} radius={[4, 4, 0, 0]}
                                onClick={(d: any) => onPointNavigate && onPointNavigate({ metric, iso: d.t })}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-[12px]" style={{ color: TK.muted }}>
                        Not enough checks yet. <span className="ml-1 underline cursor-pointer" onClick={() => onPointNavigate && onPointNavigate({ metric, iso: new Date().toISOString() })}>Re‑check now</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* --------------------------------------------------------------------------
   Section wrapper
----------------------------------------------------------------------------*/
export function MetricsTrendsSection(props: MetricsTrendsProps) {
    const {
        wr_series = [], spam_series = [], wr, wr_prev, spam, spam_prev,
        maxPoints = 6, isLoading, error, onPointNavigate
    } = props;

    const wrS = useMemo(() => buildSeries(wr_series, maxPoints), [wr_series, maxPoints]);
    const spS = useMemo(() => buildSeries(spam_series, maxPoints), [spam_series, maxPoints]);

    return (
        <section id="trends" className="w-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>Metrics Trends</h3>
                <div className="flex items-center gap-1 text-[12px]" style={{ color: TK.muted }}>
                    <Info size={14} /> Deltas based on last successful checks.
                </div>
            </div>

            {/* Loading / Error */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-busy>
                    <div className="h-[104px] rounded-[10px] border" style={{ borderColor: TK.border, background: TK.card }}>
                        <div className="animate-pulse h-full w-full" style={{ background: TK.pastel }} />
                    </div>
                    <div className="h-[104px] rounded-[10px] border" style={{ borderColor: TK.border, background: TK.card }}>
                        <div className="animate-pulse h-full w-full" style={{ background: TK.pastel }} />
                    </div>
                </div>
            )}

            {error && !isLoading && (
                <div className="rounded-[10px] border p-3 text-[13px]" style={{ borderColor: TK.border, color: TK.danger }}>
                    Couldn’t load trends. {error} <button className="underline ml-1" onClick={() => location.reload()}>Retry</button>
                </div>
            )}

            {!isLoading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SparkCard
                        title="WR Score"
                        series={wrS}
                        color={TK.brand}
                        current={wr}
                        previous={wr_prev}
                        metric='wr'
                        onPointNavigate={onPointNavigate}
                    />

                    <SparkCard
                        title="Spam Score"
                        series={spS}
                        color="#374151" // neutral dark gray per spec
                        current={spam}
                        previous={spam_prev}
                        metric='spam'
                        onPointNavigate={onPointNavigate}
                        getPointColor={(v) => spamColor(v)}
                    />
                </div>
            )}
        </section>
    );
}

/* --------------------------------------------------------------------------
   Demo Canvas (default export)
----------------------------------------------------------------------------*/

function mockSeries(startISO: string, values: number[]): MetricPoint[] {
    const start = new Date(startISO).getTime();
    const step = 1000 * 60 * 60 * 24 * 14; // 14 days between checks
    return values.map((v, i) => ({ t: new Date(start + i * step).toISOString(), v }));
}

const DEMO_WR = mockSeries("2025-03-01T04:00:00Z", [64, 68, 72, 70, 66, 78]);
const DEMO_SPAM = mockSeries("2025-03-01T04:00:00Z", [34, 31, 28, 24, 22, 18]);

export default function MetricsTrendsDemo() {
    const [wrCurr, setWrCurr] = useState(DEMO_WR[DEMO_WR.length - 1].v);
    const [wrPrev, setWrPrev] = useState(DEMO_WR[DEMO_WR.length - 2].v);
    const [spamCurr, setSpamCurr] = useState(DEMO_SPAM[DEMO_SPAM.length - 1].v);
    const [spamPrev, setSpamPrev] = useState(DEMO_SPAM[DEMO_SPAM.length - 2].v);

    const onPointNavigate = ({ metric, iso }: { metric: 'wr' | 'spam'; iso: string }) => {
        const el = document.getElementById("timeline") || document.getElementById("trends");
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`[navigate] metric=${metric} → timeline@${iso}`);
    };

    return (
        <div className="min-h-screen w-full" style={{ background: TK.pastel }}>
            <div className="max-w-3xl mx-auto p-4 md:p-6">
                <div className="mb-3">
                    <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>Link Detail Drawer — Section E Demo</h2>
                    <p className="text-[13px]" style={{ color: TK.muted }}>Bar charts for WR & Spam across the last checks. Click a bar to jump to Timeline (demo logs in console).</p>
                </div>

                <div className="rounded-[12px] border bg-white p-4" style={{ borderColor: TK.border }}>
                    <MetricsTrendsSection
                        wr_series={DEMO_WR}
                        spam_series={DEMO_SPAM}
                        wr={wrCurr}
                        wr_prev={wrPrev}
                        spam={spamCurr}
                        spam_prev={spamPrev}
                        onPointNavigate={onPointNavigate}
                    />

                    <div id="timeline" className="mt-10 p-4 rounded-[10px] border" style={{ borderColor: TK.border }}>
                        <div className="text-[14px] font-semibold mb-1" style={{ color: TK.text }}>Change History (mock anchor)</div>
                        <p className="text-[13px]" style={{ color: TK.muted }}>This block exists to demonstrate scroll‑to behavior when clicking bars.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


