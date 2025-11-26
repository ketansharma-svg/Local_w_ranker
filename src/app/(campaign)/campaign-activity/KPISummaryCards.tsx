"use client";

import React, { useMemo, useState } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Tooltip as RTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Info as InfoIcon, ChevronDown } from "lucide-react";

/* ----------------------------------------------------------------------------
 * DESIGN TOKENS
 * --------------------------------------------------------------------------*/
const TOKENS = {
    surface: "#FFFFFF",
    text: "#000000",
    muted: "#282829",
    border: "#EFF0F6",
    subtle: "#F5F7FA",
    accentPanel: "#D2EFFF",

    brand: "#1090D0",
    red: "#EA5455",
    yellow: "rgb(255, 159, 67)",
    green: "rgb(40, 199, 111)",
    neutral: "#6C757D",
} as const;

/* Status colours (as requested) */
const STATUS_COLORS = {
    NOT_STARTED: "rgb(203, 213, 225)",
    IN_PROGRESS: "rgb(16, 144, 208)",
    UNDER_REVIEW: "rgb(255, 159, 67)",
    COMPLETED: "rgb(40, 199, 111)",
} as const;

/* ----------------------------------------------------------------------------
 * TYPES
 * --------------------------------------------------------------------------*/
type SeriesPoint = { t: string; v: number };
type TrendSeries = SeriesPoint[];
type ProjectCount = { id: string; name: string; count: number };

type KpiSummaryData = {
    open: {
        total: number;
        delta: number;
        byProject: ProjectCount[];
        series: TrendSeries;
        color: string;
        info: string;
    };
    inProgress: {
        total: number;
        delta: number;
        byProject: ProjectCount[];
        series: TrendSeries;
        color: string;
        info: string;
    };
    underReview: {
        total: number;
        delta: number;
        byProject: ProjectCount[];
        series: TrendSeries;
        color: string;
        info: string;
    };
    overdue: {
        total: number;
        delta: number;
        byProject: ProjectCount[];
        series: TrendSeries;
        color: string;
        info: string;
    };
    dueToday: {
        total: number;
        delta: number;
        byProject: ProjectCount[];
        series: TrendSeries;
        color: string;
        info: string;
    };
    completedWeek: {
        total7d: number;
        delta: number;
        byProject: ProjectCount[];
        series: TrendSeries;
        color: string;
        info: string;
    };
};

/* ----------------------------------------------------------------------------
 * HELPERS / FORMATTERS
 * --------------------------------------------------------------------------*/
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null) {
    if (n === undefined || n === null || Number.isNaN(n)) return "—";
    return intFmt.format(n);
}
function caret(v?: number) {
    if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
    return v > 0 ? "▲" : "▼";
}
function deltaColor(v?: number, invert = false) {
    if (typeof v !== "number" || Number.isNaN(v) || v === 0) return TOKENS.muted;
    const good = invert ? v < 0 : v > 0;
    return good ? TOKENS.green : TOKENS.red;
}
function toDateLabel(d: string | number | Date) {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

/* Color mixing (base → lighter tints) */
function hexToRgb(hex: string) {
    const n = hex.replace("#", "");
    const bigint = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}
function rgbToHex(r: number, g: number, b: number) {
    return (
        "#" +
        [r, g, b]
            .map((x) => {
                const h = x.toString(16);
                return h.length === 1 ? "0" + h : h;
            })
            .join("")
    );
}
function mixWithWhite(hex: string, weight01: number) {
    const { r, g, b } = hexToRgb(hex);
    const W = 255;
    const w = Math.max(0, Math.min(1, weight01));
    return rgbToHex(Math.round(r * (1 - w) + W * w), Math.round(g * (1 - w) + W * w), Math.round(b * (1 - w) + W * w));
}

function toRgba(c: string, alpha: number) {
    if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    if (c.startsWith("#")) {
        const { r, g, b } = hexToRgb(c);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return c;
}

// ADD this helper (above SparkArea/SparkBars)
function EmptyMini({ label = "No data" }: { label?: string }) {
    return (
        <div
            className="flex h-16 w-full items-center justify-center  text-[11px]"
            title={label}
        >
            {label}
        </div>
    );
}

const OPACITY_STEPS = [1, 0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.18];
const withAlpha = (color: string, a: number) => toRgba(color, a);

function makeProjectSplitParts(byProject: ProjectCount[], base: string, maxSlices = 11) {
    const positives = (byProject ?? []).filter((p) => (p.count ?? 0) > 0);
    if (positives.length === 0) return [];

    const sorted = positives.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    const head = sorted.slice(0, maxSlices - 1);
    const tail = sorted.slice(maxSlices - 1);
    const others = tail.reduce((s, p) => s + (p.count || 0), 0);
    const rows = others > 0 ? [...head, { id: "others", name: "Other Projects", count: others }] : head;

    return rows.map((p, i) => ({
        name: p.name ?? "—",
        count: p.count || 0,
        color: withAlpha(base, OPACITY_STEPS[i] ?? OPACITY_STEPS.at(-1)!),
    }));
}


function SmartTooltip({ active, label, payload, zeroMode }: any) {
    if (!active) return null;
    const rows = (payload ?? []);
    const total = rows.reduce((s: number, r: any) => s + (r?.value ?? 0), 0);
    const showRows = rows.length > 0 ? rows : [{ name: "Value", value: 0, color: TOKENS.muted }];

    return (
        <div
            role="tooltip"
            className="rounded-md border bg-white p-2 text-xs shadow"
            style={{
                borderColor: TOKENS.border,
                color: TOKENS.text,
                pointerEvents: "none",
                zIndex: 9999,
                width: "max-content",
                maxWidth: "90vw",
            }}
        >
            {label !== undefined && (
                <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
                    {toDateLabel(label as string)}
                </div>
            )}

            <div className="flex flex-col gap-1">
                {showRows.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 whitespace-nowrap">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                            <span className="truncate" style={{ color: TOKENS.muted, maxWidth: "48ch" }}>
                                {p.name}
                            </span>
                        </div>
                        <div className="ml-auto font-semibold">{fmtInt(p.value as number)}</div>
                    </div>
                ))}
            </div>

            {(zeroMode || total === 0) && (
                <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
                    No data for this period
                </div>
            )}
        </div>
    );
}

function DonutTooltip({
    active,
    title,
    parts,
}: any & { title?: string; parts: { name: string; count: number; share01: number; color: string }[] }) {
    if (!active) return null;
    return (
        <div
            role="tooltip"
            className="rounded-md border bg-white p-2 text-xs shadow"
            style={{
                borderColor: TOKENS.border,
                color: TOKENS.text,
                pointerEvents: "none",
                zIndex: 9999,
                width: "max-content",
                maxWidth: "90vw",
            }}
        >
            {title && (
                <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
                    {title}
                </div>
            )}
            <div className="flex flex-col gap-1">
                {parts.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 whitespace-nowrap">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                            <span className="truncate" style={{ color: TOKENS.muted, maxWidth: "48ch" }}>
                                {p.name}
                            </span>
                        </div>
                        <div className="ml-auto flex items-baseline gap-2">
                            <span className="font-semibold">{fmtInt(p.count)}</span>
                            <span className="text-[11px]" style={{ color: TOKENS.muted }}>
                                {(p.share01 * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DonutSplit({ parts, aria, size = 52, tooltipTitle, baseColor }: {
    parts: { name: string; count: number; color: string }[];
    aria: string; size?: number; tooltipTitle?: string; baseColor?: string;
}) {

    const nonZeroParts = (parts ?? []).filter((p) => (p.count ?? 0) > 0);
    const total = nonZeroParts.reduce((s, p) => s + (p.count || 0), 0);
    const isZero = total === 0;

    // Use the card-series colour when provided; otherwise fall back to first slice or muted.
    const base = baseColor || parts[0]?.color || TOKENS.muted;

    // For zero state, render a single faded ring; for data, render parts as-is.
    const safeParts = isZero ? [{ name: "No data", count: 1, color: toRgba(baseColor || TOKENS.muted, 0.18) }] : nonZeroParts;
    const normTotal = safeParts.reduce((s, p) => s + (p.count || 0), 0) || 1;
    const normalized = safeParts.map((p) => ({ ...p, v: p.count / normTotal, share01: p.count / normTotal }));

    return (
        <div className="h-[52px] w-[52px] shrink-0" role="img" aria-label={aria}>
            <ResponsiveContainer>
                <PieChart>
                    {!isZero && (
                        <RTooltip
                            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                            content={<DonutTooltip title={tooltipTitle} parts={normalized} />}
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={8}
                        />
                    )}
                    <Pie
                        data={normalized}
                        dataKey="v"
                        innerRadius={size / 2 - 12}
                        outerRadius={size / 2}
                        startAngle={90}
                        endAngle={-270}
                        isAnimationActive
                    >
                        {normalized.map((p, i) => (
                            <Cell key={i} fill={p.color} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}


function SparkArea({ series, aria, color }: { series: TrendSeries; aria: string; color: string }) {
    const data = series.map((p) => ({ date: p.t, value: p.v }));
    const allZero = data.every((d) => (d.value ?? 0) === 0);
    if (allZero) return <EmptyMini />;


    // Faded colours in zero-mode
    const stroke = allZero ? toRgba(color, 0.35) : color;
    const fillTop = allZero ? toRgba(color, 0.18) : color;
    const fillBottom = allZero ? toRgba("#ffffff", 0.06) : "#ffffff";

    const gradId = `grad-${aria.replace(/\s+/g, "-")}`;

    return (
        <div className="h-16  w-full md:w-[10.5rem]" role="img" aria-label={aria} title={allZero ? "No data for this period" : undefined}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={fillTop} stopOpacity={allZero ? 1 : 0.45} />
                            <stop offset="100%" stopColor={fillBottom} stopOpacity={allZero ? 1 : 0.2} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                        wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                        content={<SmartTooltip zeroMode={allZero} />}
                        allowEscapeViewBox={{ x: true, y: true }}
                        cursor={{ stroke: stroke, strokeOpacity: allZero ? 0.08 : 0.15 }}
                    />
                    <Area type="monotone" dataKey="value" stroke={stroke} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function SparkBars({ series, aria, color }: { series: TrendSeries; aria: string; color: string }) {
    const data = series.map((p) => ({ date: p.t, value: p.v }));
    const allZero = data.every((d) => (d.value ?? 0) === 0);
    if (allZero) return <EmptyMini />;

    const barFill = allZero ? toRgba(color, 0.25) : color;

    return (
        <div className="h-16  w-full md:w-[10.5rem]" role="img" aria-label={aria} title={allZero ? "No data for this period" : undefined}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                        wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                        content={<SmartTooltip zeroMode={allZero} />}
                        allowEscapeViewBox={{ x: true, y: true }}
                        cursor={{ fill: allZero ? toRgba("#000", 0.02) : "rgba(0,0,0,0.04)" }}
                    />
                    <Bar dataKey="value" fill={barFill} radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ----------------------------------------------------------------------------
 * CARD SHELL
 * --------------------------------------------------------------------------*/
function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
    return (
        <div className="relative flex min-w-0 items-center gap-2 group/title">
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.muted }}>
                {title}
            </div>
            {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
            {info ? (
                <div
                    role="tooltip"
                    className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
                    style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                >
                    {info}
                </div>
            ) : null}
        </div>
    );
}

function CardShell({
    title,
    info,
    children,
    onClick,
    rightSlot,
}: {
    title: string;
    info?: string;
    children: React.ReactNode;
    onClick?: () => void;
    rightSlot?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform   focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1090D0]/40 "
            style={{ background: TOKENS.surface, borderColor: TOKENS.border, overflow: "visible" }}
            aria-label={`${title}, click to filter`}
        >
            <div className="flex items-center justify-between">
                <TitleWithHoverInfo title={title} info={info} />
                {rightSlot}
            </div>
            <div className="mt-2">{children}</div>
        </button>
    );
}

/* ----------------------------------------------------------------------------
 * MAIN SECTION (DROP-IN)
 * --------------------------------------------------------------------------*/
export default function AllProjectsTaskSummary({ campaignData }: { campaignData: any }) {

    const asManager = campaignData?.as_manager ?? [];
    const asMember = campaignData?.as_member ?? [];
    const projects = [...asManager, ...asMember];

    // Build friendly project labels
    const toName = (p: any) => p.project_name || p.domain || `Project ${p.project_id}`;

    // Split arrays by project for each metric
    const openByProject: ProjectCount[] = projects.map((p: any) => {
        const ns = p.summary?.["Not Started"] ?? 0;
        const w = p.summary?.["Working"] ?? 0;
        const ur = p.summary?.["Under Review"] ?? 0;

        return { id: String(p.project_id), name: toName(p), count: ns + w + ur };
    });

    const inProgByProject: ProjectCount[] = projects.map((p: any) => ({
        id: String(p.project_id),
        name: toName(p),
        count: p.summary?.["Working"] ?? 0,
    }));

    const urByProject: ProjectCount[] = projects.map((p: any) => ({
        id: String(p.project_id),
        name: toName(p),
        count: p.summary?.["Under Review"] ?? 0,
    }));

    const overdueByProject: ProjectCount[] = projects.map((p: any) => ({
        id: String(p.project_id),
        name: toName(p),
        count: p.overdue ?? 0,
    }));

    const dueTodayByProject: ProjectCount[] = projects.map((p: any) => ({
        id: String(p.project_id),
        name: toName(p),
        count: p.due_today ?? 0,
    }));

    const completedByProject: ProjectCount[] = projects.map((p: any) => ({
        id: String(p.project_id),
        name: toName(p),
        count: p.completed_this_week ?? 0,
    }));
    const completedAllByProject: ProjectCount[] = projects.map((p: any) => ({
        id: String(p.project_id),
        name: toName(p),
        count: p.summary?.["Completed"] ?? 0, // all completed so far
    }));

    const sum = (arr: ProjectCount[]) => arr.reduce((s, x) => s + (x.count || 0), 0);

    type CompletedRange = "all" | "7d";
    const [completedRange, setCompletedRange] = useState<CompletedRange>("all");

    // Build trend series from trend_last_7_days (dates ascending)
    const trend = (campaignData?.trend_last_7_days ?? []) as Array<{
        date: string;
        ["Not Started"]?: number;
        ["Working"]?: number;
        ["Completed"]?: number;
        ["Under Review"]?: number;
        due_tasks?: number;
    }>;

    const toSeries = (vals: number[]) =>
        trend.map((d, i) => ({
            t: d.date,
            v: vals[i] || 0,
        }));

    const openSeriesVals = trend.map(
        (d) => (d["Not Started"] ?? 0) + (d["Working"] ?? 0) + (d["Under Review"] ?? 0)
    ); const inProgSeriesVals = trend.map((d) => d["Working"] ?? 0);
    const underReviewSeriesVals = trend.map((d) => d["Under Review"] ?? 0);
    const dueTodaySeriesVals = trend.map((d) => d.due_tasks ?? 0);
    const completedSeriesVals = trend.map((d) => d["Completed"] ?? 0);

    // No daily overdue history → keep a flat series at current total
    const overdueTotalNow = sum(overdueByProject);
    const overdueSeriesVals = trend.map(() => overdueTotalNow);

    // % deltas: last vs previous day
    function pctDelta(vals: number[]) {
        if (!vals?.length || vals.length < 2) return 0;
        const last = vals[vals.length - 1];
        const prev = vals[vals.length - 2];
        if (!prev) return 0;
        return ((last - prev) / Math.max(1, prev)) * 100;
    }

    const data: KpiSummaryData = {
        open: {
            total: sum(openByProject),
            delta: pctDelta(openSeriesVals),
            byProject: openByProject,
            series: toSeries(openSeriesVals),
            color: STATUS_COLORS.NOT_STARTED,
            info: "Open = Not started + In-progress + Under Review .",
        },
        inProgress: {
            total: sum(inProgByProject),
            delta: pctDelta(inProgSeriesVals),
            byProject: inProgByProject,
            series: toSeries(inProgSeriesVals),
            color: STATUS_COLORS.IN_PROGRESS,
            info: "In-progress split by project; bars show daily count.",
        },
        underReview: {
            total: sum(urByProject),
            delta: pctDelta(underReviewSeriesVals),
            byProject: urByProject,
            series: toSeries(underReviewSeriesVals),
            color: STATUS_COLORS.UNDER_REVIEW,
            info: "Under Review split by project; bars show daily count.",
        },
        overdue: {
            total: sum(overdueByProject),
            delta: 0, // no daily overdue history in payload
            byProject: overdueByProject,
            series: toSeries(overdueSeriesVals),
            color: TOKENS.red,
            info: "Overdue split by project; bars show current backlog.",
        },
        dueToday: {
            total: sum(dueTodayByProject),
            delta: pctDelta(dueTodaySeriesVals),
            byProject: dueTodayByProject,
            series: toSeries(dueTodaySeriesVals),
            color: TOKENS.yellow,
            info: "Due today split by project; area shows daily due-today count.",
        },
        completedWeek: {
            total7d: completedByProject.reduce((s, p) => s + (p.count || 0), 0),
            delta: pctDelta(completedSeriesVals),
            byProject: completedByProject,
            series: toSeries(completedSeriesVals),
            color: STATUS_COLORS.COMPLETED,
            info: "Completions (last 7 days) split by project; bars show daily completions.",
        },
    };

    const selectedCompletedByProject = completedRange === "all" ? completedAllByProject : completedByProject;
    const selectedCompletedTotal =
        completedRange === "all"
            ? selectedCompletedByProject.reduce((s, p) => s + (p.count || 0), 0)
            : completedByProject.reduce((s, p) => s + (p.count || 0), 0);


    /* --------------------------- DONUT PARTS ---------------------------- */
    const openParts = useMemo(() => makeProjectSplitParts(data.open.byProject, STATUS_COLORS.IN_PROGRESS), [data.open.byProject]);
    const inProgParts = useMemo(() => makeProjectSplitParts(data.inProgress.byProject, STATUS_COLORS.IN_PROGRESS), [data.inProgress.byProject]);
    const urParts = useMemo(() => makeProjectSplitParts(data.underReview.byProject, STATUS_COLORS.UNDER_REVIEW), [data.underReview.byProject]);
    const overdueParts = useMemo(() => makeProjectSplitParts(data.overdue.byProject, TOKENS.red), [data.overdue.byProject]);
    const dueTodayParts = useMemo(() => makeProjectSplitParts(data.dueToday.byProject, TOKENS.yellow), [data.dueToday.byProject]);
    const completedParts = useMemo(
        () => makeProjectSplitParts(selectedCompletedByProject, STATUS_COLORS.COMPLETED),
        [selectedCompletedByProject]
    );

    /* ------------------------------ EXPORT ------------------------------ */
    const [expOpen, setExpOpen] = useState(false);
    const doExport = (fmt: "PNG" | "CSV" | "PDF") => {
        setExpOpen(false);
        alert(`Export ${fmt}`);
    };

    return (
        <section className="w-full">
            {/* SECTION HEADER */}
            <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
                    All Projects Task Summary
                </h3>

                <div className="relative">
                    <button
                        onClick={() => setExpOpen((s) => !s)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm bg-white hover:bg-brand-blue1 smooth1 hover:text-white group "
                        style={{ borderColor: TOKENS.border }}
                    >
                        Export
                        <ChevronDown size={16} className="text-[#9CA3AF] group-hover:text-white" />
                    </button>
                    {expOpen && (
                        <div
                            role="menu"
                            className="absolute right-0  mt-1 w-40 rounded-md border bg-white py-1 text-sm shadow"
                            style={{ borderColor: TOKENS.border }}
                            onMouseLeave={() => setExpOpen(false)}
                        >
                            <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => doExport("PNG")}>
                                PNG
                            </button>
                            <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => doExport("CSV")}>
                                CSV
                            </button>
                            <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => doExport("PDF")}>
                                PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* GRID ROW (6 CARDS) */}
            <div className="mt-4 grid grid-cols-12 gap-4">
                {/* 1) Tasks Open — donut by project */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
                    <CardShell title="Tasks Open" info={data.open.info}>
                        <div className="flex items-center justify-between gap-3 ">
                            <DonutSplit parts={openParts} aria="Open tasks by project" tooltipTitle="Open tasks by project" baseColor={STATUS_COLORS.IN_PROGRESS} />
                            <div className="min-w-[85px]">
                                <output className="block text-[20px] font-bold">{fmtInt(data.open.total)}</output>
                                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.open.delta) }}>
                                    {caret(data.open.delta)} {Math.abs(data.open.delta).toFixed(1)}%
                                </div>
                            </div>
                            <SparkArea series={data.open.series} aria="Open tasks trend" color={STATUS_COLORS.IN_PROGRESS} />
                        </div>
                    </CardShell>
                </div>

                {/* 2) In-Progress */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
                    <CardShell title="In-Progress Tasks" info={data.inProgress.info}>
                        <div className="flex items-center justify-between gap-3">
                            <DonutSplit parts={inProgParts} aria="In-progress by project" tooltipTitle="In-progress by project" baseColor={STATUS_COLORS.IN_PROGRESS} />
                            <div className="min-w-[85px]">
                                <output className="block text-[20px] font-bold">{fmtInt(data.inProgress.total)}</output>
                                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.inProgress.delta) }}>
                                    {caret(data.inProgress.delta)} {Math.abs(data.inProgress.delta).toFixed(1)}%
                                </div>
                            </div>
                            <SparkBars series={data.inProgress.series} aria="In-progress per day" color={STATUS_COLORS.IN_PROGRESS} />
                        </div>
                    </CardShell>
                </div>

                {/* 3) Under Review */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
                    <CardShell title="Under Review Tasks" info={data.underReview.info}>
                        <div className="flex items-center justify-between gap-3">
                            <DonutSplit parts={urParts} aria="Under Review by project" tooltipTitle="Under Review by project" baseColor={STATUS_COLORS.UNDER_REVIEW} />
                            <div className="min-w-[85px]">
                                <output className="block text-[20px] font-bold">{fmtInt(data.underReview.total)}</output>
                                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.underReview.delta) }}>
                                    {caret(data.underReview.delta)} {Math.abs(data.underReview.delta).toFixed(1)}%
                                </div>
                            </div>
                            <SparkBars series={data.underReview.series} aria="Under Review per day" color={STATUS_COLORS.UNDER_REVIEW} />
                        </div>
                    </CardShell>
                </div>

                {/* 4) Overdue */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
                    <CardShell title="Overdue" info={data.overdue.info}>
                        <div className="flex items-center justify-between gap-3">
                            <DonutSplit parts={overdueParts} aria="Overdue by project" tooltipTitle="Overdue by project" baseColor={TOKENS.red} />
                            <div className="min-w-[85px]">
                                <output className="block text-[20px] font-bold">{fmtInt(data.overdue.total)}</output>
                                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.overdue.delta, true) }}>
                                    {caret(data.overdue.delta)} {Math.abs(data.overdue.delta).toFixed(1)}%{" "}
                                    <span className="font-normal" style={{ color: TOKENS.muted }}>
                                        (lower is better)
                                    </span>
                                </div>
                            </div>
                            <SparkBars series={data.overdue.series} aria="Overdue per day" color={TOKENS.red} />
                        </div>
                    </CardShell>
                </div>

                {/* 5) Due Today */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
                    <CardShell title="Due Today" info={data.dueToday.info}>
                        <div className="flex items-center justify-between gap-3">
                            <DonutSplit parts={dueTodayParts} aria="Due today by project" tooltipTitle="Due today by project" baseColor={TOKENS.yellow} />
                            <div className="min-w-[85px]">
                                <output className="block text-[20px] font-bold">{fmtInt(data.dueToday.total)}</output>
                                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.dueToday.delta) }}>
                                    {caret(data.dueToday.delta)} {Math.abs(data.dueToday.delta).toFixed(1)}%
                                </div>
                            </div>
                            <SparkArea series={data.dueToday.series} aria="Due today trend" color={TOKENS.yellow} />
                        </div>
                    </CardShell>
                </div>

                {/* 6) Completed This Week */}
<div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
  <CardShell
    title="Completed"
    info={
      completedRange === "all"
        ? "All-time completed split by project; bars show last 7 days of completions."
        : "Completions (last 7 days) split by project; bars show daily completions."
    }
    rightSlot={
      <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: TOKENS.border }}>
                <button
          type="button"
          onClick={() => setCompletedRange("all")}
          className={`px-2 py-1 text-xs font-semibold rounded ${completedRange === "all" ? "bg-[#D9EEF8] text-[#111827]" : "text-[#6B7280]"}`}
          title="Show all time"
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setCompletedRange("7d")}
          className={`px-2 py-1 text-xs font-semibold rounded ${completedRange === "7d" ? "bg-[#D9EEF8] text-[#111827]" : "text-[#6B7280]"}`}
          title="Show last 7 days"
        >
          Last 7 Days
        </button>

      </div>
    }
  >
    <div className="flex items-center justify-between gap-3">
      <DonutSplit
        parts={completedParts}
        aria={completedRange === "all" ? "Completed (all) by project" : "Completed (7d) by project"}
        tooltipTitle={completedRange === "all" ? "Completed (All) by project" : "Completed (7d) by project"}
        baseColor={TOKENS.green}
      />
      <div className="min-w-[85px]">
        <output className="block text-[20px] font-bold">{fmtInt(selectedCompletedTotal)}</output>
        <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.completedWeek.delta) }}>
          {caret(data.completedWeek.delta)} {Math.abs(data.completedWeek.delta).toFixed(1)}%
        </div>
      </div>
      <SparkBars series={data.completedWeek.series} aria="Completions per day" color={STATUS_COLORS.COMPLETED} />
    </div>
  </CardShell>
</div>

            </div>
        </section>
    );
}
