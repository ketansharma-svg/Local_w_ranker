"use client";

import * as React from "react";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ShieldAlert,
    Network as NetworkIcon,
    Clock,
    Info,
    Activity,
    CheckCircle2,
    Download,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
} from "recharts";

/* ─────────────────────────────────────────────────────────────
   Wranker Tokens (aligned with reference)
   ───────────────────────────────────────────────────────────── */
const TOKENS = {
    brand: "#1090D0",
    brandHover: "#0E81BB",
    pastelBrand: "#D2EFFF",
    borderLight: "#E5E7EB",
    chipBg: "#F5F7FA",
    chipHover: "#EDF1F5",
    text: "#111827",
    textMuted: "#6B7280",
    danger: "#EF4444",
    warn: "#F59E0B",
    ok: "#10B981",
    white: "#FFFFFF",
};
const RADIUS = 12;

/* ─────────────────────────────────────────────────────────────
   Types (subset + optional series for snapshots)
   ───────────────────────────────────────────────────────────── */
export type MetricPoint = { t: string; v: number };
export type LinkDetailSummary = {
    wr?: number;
    wr_prev?: number;
    wr_changed_at?: string;
    wr_series?: MetricPoint[];
    spam?: number;
    spam_prev?: number;
    spam_changed_at?: string;
    spam_series?: MetricPoint[];
    ip_risk?: boolean;
    ip?: string;
    asn?: string;
    ip_risk_reasons?: string[];
    last_checked?: string | null;
    first_seen?: string | null;
    index_status?: "indexed" | "not_indexed" | "unknown";
};

/* ─────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────── */
const pct = (n?: number) => (Number.isFinite(n as number) ? Math.round(n as number) : null);
function delta(curr?: number | null, prev?: number | null) {
    if (curr == null || prev == null) return { d: 0, dir: "flat" as const };
    const d = Math.round(curr - prev);
    return { d, dir: d > 0 ? "up" : d < 0 ? "down" : ("flat" as const) };
}
function spamLevel(v?: number) {
    if (v == null || !Number.isFinite(v)) return { label: "—", color: TOKENS.textMuted };
    if (v <= 20) return { label: "Low", color: TOKENS.ok };
    if (v <= 40) return { label: "Medium", color: TOKENS.warn };
    return { label: "High", color: TOKENS.danger };
}
function fmtShort(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}
function daysSince(iso?: string | null) {
    if (!iso) return Infinity;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return Infinity;
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}
function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}

/* Count-up animation */
function useCountUp(value: number, duration = 500) {
    const [display, setDisplay] = React.useState(value);
    const from = React.useRef(value);
    React.useEffect(() => {
        const start = performance.now();
        const diff = value - from.current;
        let raf = 0;
        const step = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            setDisplay(from.current + diff * p);
            if (p < 1) raf = requestAnimationFrame(step);
            else from.current = value;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value, duration]);
    return Math.round(display);
}

/* ─────────────────────────────────────────────────────────────
   SmartPopover & InfoTooltip (side-aware like reference)
   ───────────────────────────────────────────────────────────── */
function SmartPopover({
    open,
    anchorX,
    anchorY,
    containerRef,
    children,
}: {
    open: boolean;
    anchorX: number;
    anchorY: number;
    containerRef: React.RefObject<HTMLElement>;
    children: React.ReactNode;
}) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState({ left: -9999, top: -9999 });
    React.useEffect(() => {
        if (!open || !containerRef.current || !ref.current) return;
        const cont = containerRef.current.getBoundingClientRect();
        const tip = ref.current.getBoundingClientRect();
        const sideLeft = anchorX > cont.width / 2;
        const left = sideLeft
            ? Math.max(8, anchorX - tip.width - 12)
            : Math.min(cont.width - tip.width - 8, anchorX + 12);
        const top = Math.min(cont.height - tip.height - 8, Math.max(8, anchorY - tip.height / 2));
        setPos({ left, top });
    }, [open, anchorX, anchorY, containerRef]);
    if (!open) return null;
    return (
        <div
            ref={ref}
            className="absolute z-50 rounded-md shadow-lg border bg-white p-3 text-xs"
            style={{ left: pos.left, top: pos.top, borderColor: TOKENS.borderLight, color: TOKENS.text, maxWidth: 320 }}
        >
            {children}
        </div>
    );
}
function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
    const containerRef: any = React.useRef<HTMLSpanElement>(null);
    const [open, setOpen] = React.useState(false);
    const [p, setP] = React.useState({ x: 0, y: 0 });
    return (
        <span ref={containerRef} className="relative inline-flex items-center">
            <button
                type="button"
                aria-label={`Info: ${label}`}
                onMouseEnter={(e) => {
                    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    setP({ x: e.clientX - r.left, y: e.clientY - r.top });
                    setOpen(true);
                }}
                onMouseLeave={() => setOpen(false)}
                onFocus={(e) => {
                    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    setP({ x: r.width - 16, y: 10 });
                    setOpen(true);
                }}
                onBlur={() => setOpen(false)}
                className="ml-2 text-gray-400 hover:text-gray-600"
            >
                <Info size={16} />
            </button>
            <SmartPopover open={open} anchorX={p.x} anchorY={p.y} containerRef={containerRef}>
                <div className="text-[12px] leading-5">{children}</div>
            </SmartPopover>
        </span>
    );
}

/* ─────────────────────────────────────────────────────────────
   TinyDonut (brand ring)
   ───────────────────────────────────────────────────────────── */
function TinyDonut({ value }: { value: number }) {
    const size = 28;
    const stroke = 4;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const v = clamp01(value / 100);
    const dash = c * v;
    const gap = c - dash;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} stroke={TOKENS.borderLight} strokeWidth={stroke} fill="none" />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={TOKENS.brand}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${dash} ${gap}`}
            />
        </svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   Card shell (reference-style header with tooltip)
   ───────────────────────────────────────────────────────────── */
function Card({
    title,
    icon,
    tooltip,
    children,
    onClick,
}: {
    title: string;
    icon: React.ReactNode;
    tooltip: React.ReactNode;
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <section
            className="relative flex flex-col"
            style={{ background: TOKENS.white, borderRadius: RADIUS, border: `1px solid ${TOKENS.borderLight}`, boxShadow: "0 2px 6px rgba(17,24,39,0.06)" }}
        >
            <header className="flex items-center justify-between px-4 pt-3">
                <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded" style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.borderLight}` }}>{icon}</span>
                    <h3 className="text-sm font-medium" style={{ color: TOKENS.text }}>{title}</h3>
                </div>
                <InfoTooltip label={title}>{tooltip}</InfoTooltip>
            </header>
            <button type="button" onClick={onClick} className="text-left" style={{ cursor: onClick ? "pointer" : "default" }}>
                {children}
            </button>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   Snapshot micro charts (WITH smart popovers for trend charts)
   ───────────────────────────────────────────────────────────── */
function SparkArea({ points, color = TOKENS.brand, height = 54 }: { points: MetricPoint[]; color?: string; height?: number }) {
    const data = (points || []).map((p) => ({ date: p.t, value: p.v }));
    const ref: any = React.useRef<HTMLDivElement>(null);
    const [hover, setHover] = React.useState<{ open: boolean; x: number; y: number; idx: number }>({ open: false, x: 0, y: 0, idx: -1 });
    if (!data.length) return <div style={{ height }} />;
    return (
        <div ref={ref} className="relative px-3 pb-3">
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart
                        data={data}
                        margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
                        onMouseMove={(s: any) => {
                            if (!s?.activePayload?.[0]?.payload) return;
                            setHover({ open: true, x: s.chartX, y: s.chartY, idx: s.activeTooltipIndex ?? -1 });
                        }}
                        onMouseLeave={() => setHover({ open: false, x: 0, y: 0, idx: -1 })}
                    >
                        <defs>
                            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#sparkFill)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <SmartPopover open={hover.open && hover.idx >= 0} anchorX={hover.x} anchorY={hover.y} containerRef={ref}>
                {hover.idx >= 0 && (
                    <div>
                        <div className="font-medium mb-1">{data[hover.idx].date}</div>
                        <div className="text-[12px]">WR {Math.round(data[hover.idx].value)}</div>
                    </div>
                )}
            </SmartPopover>
        </div>
    );
}
function SparkLine({ points, color = "#374151", height = 54 }: { points: MetricPoint[]; color?: string; height?: number }) {
    const data = (points || []).map((p) => ({ date: p.t, value: p.v }));
    const ref: any = React.useRef<HTMLDivElement>(null);
    const [hover, setHover] = React.useState<{ open: boolean; x: number; y: number; idx: number }>({ open: false, x: 0, y: 0, idx: -1 });
    if (!data.length) return <div style={{ height }} />;
    return (
        <div ref={ref} className="relative px-3 pb-3">
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height={height}>
                    <LineChart
                        data={data}
                        margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
                        onMouseMove={(s: any) => {
                            if (!s?.activePayload?.[0]?.payload) return;
                            setHover({ open: true, x: s.chartX, y: s.chartY, idx: s.activeTooltipIndex ?? -1 });
                        }}
                        onMouseLeave={() => setHover({ open: false, x: 0, y: 0, idx: -1 })}
                    >
                        <XAxis dataKey="date" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <SmartPopover open={hover.open && hover.idx >= 0} anchorX={hover.x} anchorY={hover.y} containerRef={ref}>
                {hover.idx >= 0 && (
                    <div>
                        <div className="font-medium mb-1">{data[hover.idx].date}</div>
                        <div className="text-[12px]">Spam {Math.round(data[hover.idx].value)}</div>
                    </div>
                )}
            </SmartPopover>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Section A — Summary Cards (reference-styled)
   ───────────────────────────────────────────────────────────── */
export function LinkDetailSummaryCards({ detail }: { detail: LinkDetailSummary }) {
    const wrVal = pct(detail.wr);
    const wrPrev = pct(detail.wr_prev);
    const wrDelta = delta(wrVal, wrPrev);
    const spamVal = pct(detail.spam);
    const spamPrev = pct(detail.spam_prev);
    const spamDelta = delta(spamVal, spamPrev);
    const spamLvl = spamLevel(spamVal || undefined);
    const overdue = daysSince(detail.last_checked) > 14;

    const wrDisplay = useCountUp(wrVal ?? 0);
    const spamDisplay = useCountUp(spamVal ?? 0);

    return (
        <section className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* Card 1 — WR Score (with donut + snapshot) */}
                <Card
                    title="WR Score"
                    icon={<Activity size={14} color={TOKENS.brand} />}
                    tooltip={
                        <>
                            Current Website Reputation (0–100). Prev: {wrPrev ?? "—"} • Δ {wrPrev != null && wrVal != null ? (wrDelta.d > 0 ? "+" : "") + wrDelta.d : "—"} • {fmtShort(detail.wr_changed_at)}
                        </>
                    }
                    onClick={() => {
                        const el = document.querySelector("#trends") as HTMLElement | null;
                        el?.scrollIntoView({ behavior: "smooth" });
                        el?.focus?.();
                    }}
                >
                    <div className="px-4 pb-2 flex items-center gap-3 mt-2">
                        <TinyDonut value={wrVal ?? 0} />
                        <div className="flex items-center gap-2">
                            <div className="text-3xl font-semibold leading-tight tabular-nums" style={{ color: TOKENS.text }}>{wrVal == null ? "—" : wrDisplay}</div>
                            {wrPrev != null && wrVal != null ? (
                                wrDelta.dir === "up" ? <TrendingUp size={18} color={TOKENS.ok} /> : wrDelta.dir === "down" ? <TrendingDown size={18} color={TOKENS.danger} /> : <Minus size={18} color={TOKENS.textMuted} />
                            ) : (
                                <Minus size={18} color={TOKENS.textMuted} />
                            )}
                        </div>
                    </div>
                    {detail.wr_series && detail.wr_series.length >= 3 && (
                        <SparkArea points={detail.wr_series} color={TOKENS.brand} />
                    )}
                </Card>

                {/* Card 2 — Spam Score (with snapshot) */}
                <Card
                    title="Spam Score"
                    icon={<ShieldAlert size={14} color={TOKENS.brand} />}
                    tooltip={
                        <>
                            Risk heuristic (0–100). Level: <b style={{ color: spamLvl.color }}>{spamLvl.label}</b>. Prev: {spamPrev ?? "—"} • Δ {spamPrev != null && spamVal != null ? (spamDelta.d > 0 ? "+" : "") + spamDelta.d : "—"} • {fmtShort(detail.spam_changed_at)}
                        </>
                    }
                    onClick={() => {
                        const el = document.querySelector("#trends") as HTMLElement | null;
                        el?.scrollIntoView({ behavior: "smooth" });
                        el?.focus?.();
                    }}
                >
                    <div className="px-4 pb-2 flex items-center gap-2 mt-2">
                        <div className="text-3xl font-semibold leading-tight tabular-nums" style={{ color: spamLvl.label === "High" ? TOKENS.danger : TOKENS.text }}>{spamVal == null ? "—" : spamDisplay}</div>
                        <span className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: TOKENS.chipBg, color: spamLvl.color, border: `1px solid ${TOKENS.borderLight}` }}>{spamLvl.label}</span>
                    </div>
                    {detail.spam_series && detail.spam_series.length >= 3 && (
                        <SparkLine points={detail.spam_series} color={spamLvl.color} />
                    )}
                </Card>

                {/* Card 3 — IP / Network Risk */}
                <Card
                    title="IP / Network"
                    icon={<NetworkIcon size={14} color={TOKENS.brand} />}
                    tooltip={
                        detail.ip_risk ? (
                            <>
                                <div className="font-medium mb-1" style={{ color: TOKENS.danger }}>Network flagged</div>
                                {detail.ip && <div>IP: {detail.ip}</div>}
                                {detail.asn && <div>ASN: {detail.asn}</div>}
                                {detail.ip_risk_reasons && detail.ip_risk_reasons.length > 0 && (
                                    <ul className="mt-1 list-disc pl-4">
                                        {detail.ip_risk_reasons.slice(0, 3).map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        ) : (
                            <>No network risk flagged.</>
                        )
                    }
                    onClick={() => {
                        const el = document.querySelector("#risk") as HTMLElement | null;
                        el?.scrollIntoView({ behavior: "smooth" });
                        el?.focus?.();
                    }}
                >
                    <div className="px-4 pb-4 mt-2">
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold" style={{ color: detail.ip_risk ? TOKENS.danger : TOKENS.ok }}>{detail.ip_risk ? "Flagged" : "Safe"}</div>
                            {detail.asn && detail.ip_risk && (<span className="text-[12px]" style={{ color: TOKENS.textMuted }}>{detail.asn}</span>)}
                        </div>
                        <div className="mt-0.5 text-[12px]" style={{ color: TOKENS.textMuted }}>
                            {detail.ip_risk ? "Review reasons & co‑links in Risk section" : "No suspicious signals detected"}
                        </div>
                    </div>
                </Card>

                {/* Card 4 — Last Checked / First Seen */}
                <Card
                    title="Last Checked / First Seen"
                    icon={<Clock size={14} color={TOKENS.brand} />}
                    tooltip={
                        <>
                            Last Checked: {detail.last_checked ?? "—"}
                            <br />
                            First Seen: {detail.first_seen ?? "—"}
                        </>
                    }
                    onClick={() => {
                        const el = document.querySelector("#timeline") as HTMLElement | null;
                        el?.scrollIntoView({ behavior: "smooth" });
                        el?.focus?.();
                    }}
                >
                    <div className="px-4 pb-4 mt-2 flex items-center gap-2 flex-wrap">
                        <div className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
                            {fmtShort(detail.last_checked)} / {fmtShort(detail.first_seen)}
                        </div>
                        {daysSince(detail.last_checked) !== Infinity && overdue && (
                            <span className="text-[11.5px] px-2 py-[2px] rounded-full border" style={{ color: TOKENS.warn, borderColor: `${TOKENS.warn}66`, background: `${TOKENS.warn}14` }}>Overdue</span>
                        )}
                        {detail.index_status && detail.index_status !== "unknown" && (
                            <span className="ml-auto text-[11.5px] px-2 py-[2px] rounded-full border" style={{ color: detail.index_status === "indexed" ? TOKENS.ok : TOKENS.textMuted, borderColor: `${TOKENS.borderLight}`, background: TOKENS.chipBg }}>
                                {detail.index_status === "indexed" ? "Indexed" : "Not Indexed"}
                            </span>
                        )}
                    </div>
                </Card>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   Demo Canvas (default export) — with snapshot series & tests
   ───────────────────────────────────────────────────────────── */
const WR_SERIES: MetricPoint[] = Array.from({ length: 6 }).map((_, i) => ({
    t: new Date(Date.now() - (5 - i) * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    v: 65 + (i % 3 === 0 ? 8 : i % 2 ? 4 : -2),
}));
const SPAM_SERIES: MetricPoint[] = Array.from({ length: 6 }).map((_, i) => ({
    t: new Date(Date.now() - (5 - i) * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    v: 18 + (i % 3 === 0 ? 6 : i % 2 ? -3 : 2),
}));

// Test cases (UI harness)
const CASES: Record<string, LinkDetailSummary> = {
    "Default (Flagged)": {
        wr: 78,
        wr_prev: 90,
        wr_changed_at: "2025-07-30T10:05:00Z",
        wr_series: WR_SERIES,
        spam: 22,
        spam_prev: 28,
        spam_changed_at: "2025-07-30T10:05:00Z",
        spam_series: SPAM_SERIES,
        ip_risk: true,
        ip: "203.0.113.10",
        asn: "AS64500",
        ip_risk_reasons: ["Known spam network", "High overlap with PBNs", "Disposable hosting"],
        last_checked: "2025-08-08T04:15:00Z",
        first_seen: "2025-05-12T10:12:00Z",
        index_status: "indexed",
    },
    "No Previous Values": {
        wr: 64,
        wr_prev: undefined,
        wr_series: WR_SERIES.slice(0, 2), // not enough for spark → empty state
        spam: 12,
        spam_prev: undefined,
        spam_series: SPAM_SERIES.slice(0, 2),
        ip_risk: false,
        last_checked: "2025-08-02T05:00:00Z",
        first_seen: "2025-07-29T11:00:00Z",
        index_status: "unknown",
    },
    "Safe Network": {
        wr: 84,
        wr_prev: 80,
        wr_changed_at: "2025-08-06T04:00:00Z",
        wr_series: WR_SERIES.map((p, i) => ({ ...p, v: p.v + 10 })),
        spam: 14,
        spam_prev: 18,
        spam_changed_at: "2025-08-06T04:00:00Z",
        spam_series: SPAM_SERIES.map((p, i) => ({ ...p, v: Math.max(5, p.v - 6) })),
        ip_risk: false,
        last_checked: "2025-08-08T04:15:00Z",
        first_seen: "2025-05-12T10:12:00Z",
        index_status: "indexed",
    },
    "Overdue & Not Indexed": {
        wr: 58,
        wr_prev: 70,
        wr_changed_at: "2025-07-22T10:05:00Z",
        wr_series: WR_SERIES.map((p, i) => ({ ...p, v: 50 + i * 3 })),
        spam: 46,
        spam_prev: 30,
        spam_changed_at: "2025-07-22T10:05:00Z",
        spam_series: SPAM_SERIES.map((p, i) => ({ ...p, v: 40 + i * 2 })),
        ip_risk: true,
        ip: "198.51.100.44",
        asn: "AS65001",
        ip_risk_reasons: ["Multiple suspicious co‑links", "ASN reputation low"],
        last_checked: "2025-07-10T04:15:00Z", // >14d old → Overdue chip
        first_seen: "2025-05-12T10:12:00Z",
        index_status: "not_indexed",
    },
};

export default function DemoSummaryCards() {
    const names = Object.keys(CASES);
    const [caseName, setCaseName] = React.useState(names[0]);
    const detail = CASES[caseName];

    // Export handler — JSON of current visible case
    const onExport = React.useCallback(() => {
        try {
            const data = { case: caseName, detail };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `summary-cards-${caseName.replace(/\s+/g, "-").toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Export failed");
        }
    }, [caseName, detail]);

    return (
        <div className=" w-full">
            <div className=" mx-auto">
                <header className="mb-4 flex items-center justify-between">
                    <h2 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>Link Detail —  Summary</h2>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 h-9 px-3 text-[13px] font-medium rounded-md border"
                            style={{ color: TOKENS.brand, borderColor: TOKENS.brand, background: TOKENS.white }}
                            onClick={onExport}
                            title="Export Summary"
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>

                    </div>
                </header>

                <div className="bg-white border rounded-xl p-4" style={{ borderColor: TOKENS.borderLight }}>
                    <LinkDetailSummaryCards detail={detail} />
                </div>

            </div>
        </div>
    );
}



