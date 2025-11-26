"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useContext,
    createContext,
} from "react";

/* ========================= UI kit (filters bar + table skeleton layout) =========================
   These imports match the reference “Card/Table” layout you shared.
   If your project aliases differ, adjust the paths below.
   ---------------------------------------------------------------------------------------------- */
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import {
    Table as STable,
    TableBody as STableBody,
    TableCell as STableCell,
    TableHead as STableHead,
    TableHeader as STableHeader,
    TableRow as STableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/* ========================= Charts ========================= */
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as RTooltip,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
} from "recharts";

/* ========================= Icons ========================= */
import {
    Sparkles,
    ChevronDown,
    MoreHorizontal,
    Info as InfoIcon,
    ChevronsUpDown,
    ChevronUp,
    ChevronRight,
    ChevronLeft,
    ChevronFirst,
    ChevronLast,
    Filter,
    Settings2,
    RefreshCw,
    Search,
    ClipboardList,
    Trash2,
    Eye,
    Calendar,
    Repeat,
    Edit2,
} from "lucide-react";

/* ========================================================================================
 * TOKENS
 * ====================================================================================== */
const TOKENS = {
    surface: "var(--wr-surface, #FFFFFF)",
    text: "var(--wr-text, #111827)",
    muted: "var(--wr-muted, #6B7280)",
    border: "var(--wr-border, #EFF0F6)",
    borderStrong: "var(--wr-borderStrong, #E5E7EB)",
    subtle: "var(--wr-subtle, #F5F7FA)",
    valueBlue: "var(--wr-value-blue, #0077FF)",
    pastelBlue: "var(--wr-pastel-blue, #D9EEF8)",
    success: "var(--wr-success, #10B981)",
    successPastel: "rgba(16,185,129,0.15)",
    warning: "var(--wr-warning, #F59E0B)",
    warningPastel: "rgba(245,158,11,0.15)",
    danger: "var(--wr-danger, #EF4444)",
    dangerPastel: "rgba(239,68,68,0.15)",
    info: "var(--wr-info, #3B82F6)",
    infoPastel: "rgba(59,130,246,0.15)",
    brand: "var(--wr-brand, #1090D0)",
} as const;

/* ========================================================================================
 * HELPERS / FORMATTERS
 * ====================================================================================== */
const nf = new Intl.NumberFormat();
function fmtInt(n?: number | null, compact = true) {
    if (n == null || Number.isNaN(n)) return "—";
    if (compact && Math.abs(n) >= 10_000) {
        const u = [
            { v: 1e9, s: "B" },
            { v: 1e6, s: "M" },
            { v: 1e3, s: "K" },
        ];
        for (const it of u) if (Math.abs(n) >= it.v) return `${(n / it.v).toFixed(1)}${it.s}`;
    }
    return nf.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
    if (p == null || Number.isNaN(p)) return "—";
    return `${(p * 100).toFixed(digits)}%`;
}
function toDateLabel(d: string | number | Date) {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function caret(v?: number) {
    if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
    return v > 0 ? "▲" : "▼";
}
function toneByGoodBad(delta?: number, invert = false) {
    if (typeof delta !== "number") return TOKENS.muted;
    const isGood = invert ? delta < 0 : delta > 0;
    return isGood ? TOKENS.success : TOKENS.danger;
}
function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}
function daysFromToday(iso?: string | null) {
    if (!iso) return Number.NaN;
    const d = new Date(iso);
    const t = new Date();
    const dd = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    return Math.round((dd(d).getTime() - dd(t).getTime()) / 86400000);
}
function dueBucket(iso?: string | null): "overdue" | "today" | "week" | "later" | "none" {
    if (!iso) return "none";
    const delta = daysFromToday(iso);
    if (Number.isNaN(delta)) return "none";
    if (delta < 0) return "overdue";
    if (delta === 0) return "today";
    if (delta <= 7) return "week";
    return "later";
}
function minutesToHMM(min?: number | null) {
    if (!min && min !== 0) return "—";
    const m = Math.max(0, Math.round(min));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm.toString().padStart(2, "0")}m`;
}

/* ========================================================================================
 * TYPES
 * ====================================================================================== */
export type SeriesPoint = { t: string; v: number };
type TaskStatus = "todo" | "inprogress" | "review" | "blocked" | "done";
type Priority = "P1" | "P2" | "P3" | "P4";

type TaskRow = {
    id: string;
    title: string;
    project?: string;
    status: TaskStatus;
    priority?: Priority;
    dueAt?: string | null;
    assignee?: { id: string; name: string; avatarUrl?: string } | null;
    estimateMin?: number | null;
    spentMinTotal?: number;
    spentSeries?: Array<{ t: string; v: number }>;
    labels?: string[];
    description?: string;
    startAt?: string | null;
};

type TasksSnapshot = {
    timeframe: "7d" | "30d" | "90d" | "12m";
    scope: "mine" | "team";
    viewerId?: string;
    totals: {
        open: number;
        deltaOpenPct?: number;
        overdue: number;
        dueToday: number;
        dueThisWeek: number;
    };
    time: {
        weekTargetMin?: number;
        loggedWeekMin: number;
        loggedSeries: Array<{ t: string; hours: number; completed: number }>;
        deltaWeekPct?: number;
        dailyHours: SeriesPoint[];
        dailyCompleted: SeriesPoint[];
        leadTimeSeries: SeriesPoint[];
        avgReviewTimeDelta?: number;
    };
    rows: TaskRow[];
};

/* ========================================================================================
 * PERSISTED SEG-TABS
 * ====================================================================================== */
function useStickyTab<T extends string>(key: string, initial: T) {
    const [val, setVal] = useState<T>(initial);
    useEffect(() => {
        try {
            const v = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
            if (v) setVal(v as T);
        } catch { }
    }, [key]);
    const change = (v: T) => {
        setVal(v);
        try {
            if (typeof window !== "undefined") window.localStorage.setItem(key, String(v));
        } catch { }
    };
    return [val, change] as const;
}

/* ========================================================================================
 * SERIES HELPERS
 * ====================================================================================== */
function makeSeries(points = 12, base = 100, noise = 0.1, seed = "s"): SeriesPoint[] {
    const r = rng(seed);
    const start = new Date();
    start.setDate(start.getDate() - (points - 1));
    const out: SeriesPoint[] = [];
    let v = base;
    for (let i = 0; i < points; i++) {
        const d = new Date(start.getTime());
        d.setDate(start.getDate() + i);
        v = Math.max(0, v + (r() - 0.5) * base * noise);
        out.push({ t: d.toISOString().slice(0, 10), v: Math.round(v) });
    }
    return out;
}
function rng(seed: string) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

/* ========================================================================================
 * SMALL ATOMS (carried over from the Project Task Overview table) — Avatar, Pill, MiniBars14
 * ====================================================================================== */
const TK = {
    brand: "#1090D0",
    muted: "#282829",
    border: "#EFF0F6",
    borderStrong: "#E5E7EB",
    subtle: "#F5F7FA",
    radius: 6,
    status: {
        notStarted: "#CBD5E1",
        inProgress: "#1090D0",
        review: "#FF9F43",
        completed: "#28C76F",
        overdue: "#EA5455",
    },
    priority: { high: "#EA5455", medium: "#FF9F43", low: "#9AA4B2" },
};

const statusLabels = ["Not Started", "In Progress", "Under Review", "Completed"];

const avatarTintFromId = (id?: string) => {
    const hues = ["#7C8CF8", "#6AB0FF", "#7AD8B0", "#A16BD9", "#F59E0B", "#5B8DEF", "#96C56F", "#E49B5E"];
    let h = 0;
    const base = String(id || "x");
    for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) % hues.length;
    return hues[h];
};
const Avatar = ({ userId, name }: { userId?: string; name?: string }) => {
    const color = avatarTintFromId(userId || "x");
    const initials = (name || "U").slice(0, 2).toUpperCase();
    return (
        <span title={name} aria-label={name} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: color }}>
            {initials}
        </span>
    );
};
const Pill = ({ label, color, soft = true }: { label: string; color: string; soft?: boolean }) => (
    <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[12px] leading-none"
        style={{ color, background: soft ? `${color}1A` : "transparent", borderColor: `${color}33` }}
    >
        {label}
    </span>
);

/** Mini 14‑day spark bars for expanded row */
const MiniBars14: React.FC = () => {
    const data = useMemo(() => {
        const today = new Date();
        const arr: { date: string; value: number }[] = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            d.setHours(12, 0, 0, 0);
            const iso = d.toISOString().slice(0, 10);
            const value = 3 + Math.floor(Math.random() * 10);
            arr.push({ date: iso, value });
        }
        return arr;
    }, []);
    const max = Math.max(1, ...data.map((d) => d.value));
    const W = 200, H = 64, x0 = 8, baseY = 56, bw = 10, gap = 2;
    const barX = (i: number) => x0 + i * (bw + gap);
    const barH = (v: number) => Math.round((v / max) * 46);
    return (
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="14 day activity">
            {data.map((d, i) => {
                const h = barH(d.value);
                const x = barX(i);
                return <rect key={i} x={x} y={baseY - h} width={bw} height={h} rx="2" fill={TK.brand} opacity={0.8} />;
            })}
            <line x1="2" x2={W - 2} y1={baseY} y2={baseY} stroke={TOKENS.border} />
        </svg>
    );
};

/* ========================================================================================
 * SHARED ATOMS — Titles, ValueDelta, Smart tooltips
 * ====================================================================================== */
function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
    return (
        <div className="relative flex min-w-0 items-center gap-2 group/title">
            <div className="truncate text-[13px] font-semibold">{title}</div>
            {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
            {info ? (
                <div
                    role="tooltip"
                    className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
                    style={{ borderColor: TOKENS.border }}
                >
                    {info}
                </div>
            ) : null}
        </div>
    );
}

function ValueDelta({
    delta,
    invert = false,
    unit = "%",
    ariaId,
    explain,
}: {
    delta?: number;
    invert?: boolean;
    unit?: "%" | "pp" | "";
    ariaId?: string;
    explain?: string;
}) {
    if (typeof delta !== "number") {
        return (
            <div id={ariaId} className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                —
            </div>
        );
    }
    const color = toneByGoodBad(delta, invert);
    return (
        <div id={ariaId} className="mt-1 text-xs" style={{ color }}>
            {caret(delta)} {Math.abs(delta).toFixed(1)}
            {unit && <span>&nbsp;{unit}</span>}
            {explain && (
                <span className="ml-1 text-[11px]" style={{ color: TOKENS.muted }}>
                    ({explain})
                </span>
            )}
        </div>
    );
}

function SmartTooltip({
    active,
    label,
    payload,
    valueFmt,
    labelFmt,
}: any & { valueFmt?: (v: number, name?: string) => string; labelFmt?: (l: any) => string }) {
    if (!active) return null;
    return (
        <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}>
            {label !== undefined && (
                <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
                    {labelFmt ? labelFmt(label) : String(label)}
                </div>
            )}
            <div className="flex flex-col gap-1">
                {(payload ?? []).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                            <span style={{ color: TOKENS.muted }}>{p.name}</span>
                        </div>
                        <div className="font-semibold">{valueFmt ? valueFmt(p.value as number, p.name) : fmtInt(p.value as number, false)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
function DonutTooltip({
    active,
    title,
    parts,
    valueFmt,
}: any & { title?: string; parts: { name: string; value: number; color: string }[]; valueFmt?: (v: number) => string }) {
    if (!active) return null;
    return (
        <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}>
            {title && (
                <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
                    {title}
                </div>
            )}
            <div className="flex flex-col gap-1">
                {parts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                            <span style={{ color: TOKENS.muted }}>{p.name}</span>
                        </div>
                        <div className="font-semibold">{valueFmt ? valueFmt(p.value) : fmtInt(p.value)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ========================================================================================
 * Charts — spark area, spark bars, donuts
 * ====================================================================================== */
function SparkArea({
    series,
    aria,
    color = TOKENS.valueBlue,
    pastel = TOKENS.pastelBlue,
}: {
    series?: SeriesPoint[];
    aria: string;
    color?: string;
    pastel?: string;
}) {
    const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
    const gradId = `grad-${aria.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2)}`;
    return (
        <div className="h-16 w-[10.75rem]" role="img" aria-label={aria}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={pastel} stopOpacity={0.2} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                        content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />}
                        allowEscapeViewBox={{ x: true, y: true }}
                        offset={8}
                        wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                        cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
                    />
                    <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
function SparkBars({ series, aria, color = TOKENS.valueBlue }: { series?: SeriesPoint[]; aria: string; color?: string }) {
    const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
    return (
        <div className="h-16 w-[10.75rem]" role="img" aria-label={aria}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                        content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />}
                        allowEscapeViewBox={{ x: true, y: true }}
                        offset={8}
                        wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
function DonutSplit({
    parts,
    aria,
    size = 54,
    tooltipTitle,
    valueFmt = (v: number) => fmtPct01(v),
}: {
    parts: { name: string; value: number; color: string }[];
    aria: string;
    size?: number;
    tooltipTitle?: string;
    valueFmt?: (v: number) => string;
}) {
    const data = parts.map((p) => ({ ...p, v: clamp01(p.value) }));
    return (
        <div className="h-[54px] w-[54px] shrink-0" role="img" aria-label={aria} style={{ width: size, height: size }}>
            <ResponsiveContainer>
                <PieChart>
                    <RTooltip
                        content={<DonutTooltip title={tooltipTitle} parts={data} valueFmt={valueFmt} />}
                        allowEscapeViewBox={{ x: true, y: true }}
                        offset={8}
                        wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                    />
                    <Pie data={data} dataKey="v" innerRadius={size / 2 - 12} outerRadius={size / 2} startAngle={90} endAngle={-270} isAnimationActive>
                        {data.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ========================================================================================
 * SegTabs
 * ====================================================================================== */
function SegTabs<T extends string>({
    value,
    onChange,
    items,
}: {
    value: T;
    onChange: (v: T) => void;
    items: { value: T; label: string }[];
}) {
    return (
        <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
            {items.map((it) => (
                <button
                    key={it.value}
                    onClick={() => onChange(it.value)}
                    className={`rounded-full px-2.5 py-1 transition ${value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"}`}
                    aria-pressed={value === it.value}
                >
                    {it.label}
                </button>
            ))}
        </div>
    );
}

/* ========================================================================================
 * Assignee palette
 * ====================================================================================== */
const BRAND_HEX = "#0077FF";
function hexToRgb(hex: string) {
    const n = hex.replace("#", "");
    const bigint = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
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
function buildPalette(n = 12) {
    return Array.from({ length: n }).map((_, i) => mixWithWhite(BRAND_HEX, 0.08 + i * 0.07));
}

/* ========================================================================================
 * MAIN SECTION (Charts + Tasks Table)
 * ====================================================================================== */
export interface TasksActivitiesSectionProps {
    data?: TasksSnapshot; // optional; mock used if empty
    onNavigate?: (url: string) => void;
    onAddToReport?: () => void;
    onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
    onRefresh?: () => void;
    loading?: boolean;
    className?: string;
}

export default function TasksActivitiesSection({
    data,
    onNavigate,
    onAddToReport,
    onExport,
    onRefresh,
    loading,
    className,
}: TasksActivitiesSectionProps) {
    const D = useMemo(() => data ?? makeMockTasksSnapshot(), [data]);

    const [scopeTab, setScopeTab] = useStickyTab<"mine" | "team">("wr:tasks:scope", D.scope ?? "mine");
    const [timeTab, setTimeTab] = useStickyTab<"7d" | "30d" | "90d" | "12m">("wr:tasks:tf", D.timeframe ?? "30d");
    const viewerId = D.viewerId || "u0";

    const windowDays = useMemo(() => (timeTab === "7d" ? 7 : timeTab === "30d" ? 30 : timeTab === "90d" ? 90 : 365), [timeTab]);

    // Scope + time filters for **both charts and table**
    const scopeRows = useMemo(
        () => (scopeTab === "mine" ? D.rows.filter((r) => r.assignee?.id === viewerId) : D.rows),
        [D.rows, scopeTab, viewerId]
    );
    const rows = useMemo(() => {
        const now = new Date();
        return scopeRows.filter((r) => {
            if (!r.dueAt) return true;
            const d = daysFromToday(r.dueAt);
            if (Number.isNaN(d)) return true;
            return Math.abs(d) <= windowDays;
        });
    }, [scopeRows, windowDays]);

    // Derived for KPI cards
    const openRows = useMemo(() => rows.filter((r) => r.status !== "done"), [rows]);
    const inprogRows = useMemo(() => rows.filter((r) => r.status === "inprogress"), [rows]);

    const openTrend = useMemo(
        () => makeSeries(Math.min(16, Math.max(8, Math.floor(windowDays / 2))), openRows.length || 1, 0.15, `open-${scopeTab}-${timeTab}`),
        [openRows.length, scopeTab, timeTab, windowDays]
    );
    const inprogTrend = useMemo(
        () => makeSeries(Math.min(16, Math.max(8, Math.floor(windowDays / 2))), inprogRows.length || 1, 0.15, `ip-${scopeTab}-${timeTab}`),
        [inprogRows.length, scopeTab, timeTab, windowDays]
    );

    const openByStatus = useMemo(() => {
        const c = { todo: 0, inprogress: 0, review: 0, blocked: 0 };
        openRows.forEach((r) => {
            if (r.status in c) (c as any)[r.status] += 1;
        });
        const total = Math.max(1, c.todo + c.inprogress + c.review + c.blocked);
        return [
            { name: "In Progress", value: c.inprogress / total, color: TOKENS.valueBlue },
            { name: "In Review", value: c.review / total, color: TOKENS.warning },
            { name: "Blocked", value: c.blocked / total, color: TOKENS.danger },
            { name: "To Do", value: c.todo / total, color: "#E5E7EB" },
        ];
    }, [openRows]);

    const ipDueParts = useMemo(() => {
        let dueToday = 0,
            overdue = 0,
            upcoming = 0;
        inprogRows.forEach((r) => {
            const b = dueBucket(r.dueAt);
            if (b === "overdue") overdue += 1;
            else if (b === "today") dueToday += 1;
            else upcoming += 1;
        });
        const total = Math.max(1, inprogRows.length);
        return [
            { name: "Due Today", value: dueToday / total, color: TOKENS.warning },
            { name: "Overdue", value: overdue / total, color: TOKENS.danger },
            { name: "Upcoming", value: (upcoming || 0) / total, color: TOKENS.info },
        ];
    }, [inprogRows]);

    const paletteMemo = useMemo(() => buildPalette(12), []);
    function partsByAssignee(filterFn: (r: TaskRow) => boolean) {
        const map = new Map<string, { name: string; count: number }>();
        rows.filter(filterFn).forEach((r) => {
            const key = r.assignee?.id || "_unassigned";
            const name = r.assignee?.name || "Unassigned";
            map.set(key, { name, count: (map.get(key)?.count ?? 0) + 1 });
        });
        const arr = Array.from(map.values()).sort((a, b) => b.count - a.count);
        const total = arr.reduce((s, x) => s + x.count, 0) || 1;
        const parts = arr.slice(0, 11).map((x, i) => ({ name: x.name, value: x.count / total, color: paletteMemo[i % paletteMemo.length] }));
        if (arr.length > 11) {
            const others = arr.slice(11).reduce((s, x) => s + x.count, 0);
            parts.push({ name: "Others", value: others / total, color: mixWithWhite(BRAND_HEX, 0.82) });
        }
        return { parts, total, list: arr };
    }
    const overdueAgg = useMemo(() => partsByAssignee((r) => r.status !== "done" && dueBucket(r.dueAt) === "overdue"), [rows]);
    const todayAgg = useMemo(() => partsByAssignee((r) => r.status !== "done" && dueBucket(r.dueAt) === "today"), [rows]);
    const upcomingAgg = useMemo(() => {
        return partsByAssignee((r) => {
            if (r.status === "done") return false;
            const d = daysFromToday(r.dueAt);
            return !Number.isNaN(d) && d >= 0 && d <= windowDays;
        });
    }, [rows, windowDays]);
    const openByAssigneeAgg = useMemo(() => partsByAssignee((r) => r.status !== "done"), [rows]);

    // Weekly series (time‑aware)
    const burnWeeklySeries = useMemo(() => {
        if (timeTab === "7d") {
            const days = Math.min(7, Math.max(D.time.dailyHours.length, D.time.dailyCompleted.length));
            const arr: { date: string; Hours: number; Completed: number }[] = [];
            for (let i = Math.max(0, D.time.dailyHours.length - days); i < D.time.dailyHours.length; i++) {
                const h = D.time.dailyHours[i];
                const c = D.time.dailyCompleted[i] ?? { t: h.t, v: 0 };
                arr.push({ date: h.t, Hours: h.v, Completed: c.v });
            }
            return arr;
        }
        const weeks = timeTab === "30d" ? 4 : 12;
        const w = Math.min(weeks, D.time.loggedSeries.length);
        const start = Math.max(0, D.time.loggedSeries.length - w);
        return D.time.loggedSeries.slice(start).map((p) => ({ date: p.t, Hours: p.hours, Completed: p.completed }));
    }, [D.time.dailyHours, D.time.dailyCompleted, D.time.loggedSeries, timeTab]);

    /* ======================= RENDER ======================= */
    return (
        <section className={className}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
                    Project Tasks & Activities
                </h3>
                <div className="flex items-center gap-2">
                    <Button onClick={onAddToReport} className="h-9 gap-2 px-3 text-sm">
                        <Sparkles size={16} /> Add to Report
                    </Button>
                    <Button variant="outline" className="h-9 gap-2 px-3 text-sm" onClick={() => onExport?.("PNG")}>
                        Export <ChevronDown size={16} className="text-[#9CA3AF]" />
                    </Button>
                    <Button variant="outline" className="h-9 gap-2 px-3 text-sm" onClick={onRefresh}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Global filters bar (applies to both charts and table) */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <SegTabs value={scopeTab} onChange={setScopeTab} items={[{ value: "mine", label: "My Tasks" }, { value: "team", label: "Team Tasks" }]} />
                <SegTabs
                    value={timeTab}
                    onChange={setTimeTab}
                    items={[
                        { value: "7d", label: "7D" },
                        { value: "30d", label: "30D" },
                        { value: "90d", label: "90D" },
                        { value: "12m", label: "12M" },
                    ]}
                />
            </div>

            <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

            {/* ===================== KPI GRID ===================== */}
            <div className="mt-4 grid grid-cols-12 gap-4">
                {/* Open Tasks */}
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <TitleWithHoverInfo title={`Open Tasks (${scopeTab === "mine" ? "My" : "Project"})`} info="To Do, In Progress, In Review, Blocked (filtered by scope/time)." />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <DonutSplit parts={openByStatus} aria="Open by status" tooltipTitle="Open by status" />
                                <div>
                                    <output className="block text-[22px] font-bold">{fmtInt(openRows.length, false)}</output>
                                    <ValueDelta delta={D.totals.deltaOpenPct} ariaId="open-delta" />
                                </div>
                                <SparkArea series={openTrend} aria="Open trend" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* In‑Progress */}
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <TitleWithHoverInfo title="In‑Progress (Due Split)" info="Overdue / Due Today / Upcoming (incl. no due)." />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <DonutSplit parts={ipDueParts} aria="In-progress due split" tooltipTitle="In-progress by due state" />
                                <div>
                                    <output className="block text-[22px] font-bold">{fmtInt(inprogRows.length, false)}</output>
                                    <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                                        active now
                                    </div>
                                </div>
                                <SparkBars series={inprogTrend} aria="In-progress trend" color={TOKENS.info} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Overdue by assignee */}
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <TitleWithHoverInfo title="Overdue (by Assignee)" info="Past due & not completed — share by assignee." />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <DonutSplit parts={overdueAgg.parts} aria="Overdue by assignee" tooltipTitle="Overdue by assignee" />
                                <div>
                                    <output className="block text-[22px] font-bold">{fmtInt(overdueAgg.total, false)}</output>
                                    <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                                        lower is better
                                    </div>
                                </div>
                                <SparkBars
                                    series={makeSeries(Math.min(16, Math.max(8, Math.floor(windowDays / 2))), overdueAgg.total || 1, 0.25, `ovd-${scopeTab}-${timeTab}`)}
                                    aria="Overdue trend"
                                    color={TOKENS.danger}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Due Today by assignee */}
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <TitleWithHoverInfo title="Due Today (by Assignee)" info="Due today & not completed — share by assignee." />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <DonutSplit parts={todayAgg.parts} aria="Due today by assignee" tooltipTitle="Due today by assignee" />
                                <div>
                                    <output className="block text-[22px] font-bold">{fmtInt(todayAgg.total, false)}</output>
                                    <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                                        due by EOD
                                    </div>
                                </div>
                                <SparkArea
                                    series={makeSeries(Math.min(16, Math.max(8, Math.floor(windowDays / 2))), todayAgg.total || 1, 0.25, `tdy-${scopeTab}-${timeTab}`)}
                                    aria="Due today trend"
                                    color={TOKENS.warning}
                                    pastel={TOKENS.warningPastel}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Weekly burn & Time Spent */}
                <div className="col-span-12 lg:col-span-7">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <TitleWithHoverInfo title="Weekly Burn & Velocity" info="Hours logged (bars) and tasks completed (area)." />
                            <div className="h-48 w-full" role="img" aria-label="Weekly burn chart">
                                <ResponsiveContainer>
                                    <BarChart data={burnWeeklySeries} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke={TOKENS.border} vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(t) => toDateLabel(t)} />
                                        <YAxis />
                                        <RTooltip
                                            content={
                                                <SmartTooltip
                                                    valueFmt={(v, name) => (name === "Hours" ? `${v as number}h` : fmtInt(v as number, false))}
                                                    labelFmt={(l) => toDateLabel(l as string)}
                                                />
                                            }
                                            allowEscapeViewBox={{ x: true, y: true }}
                                            offset={10}
                                            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                                        />
                                        <Bar dataKey="Hours" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
                                        <Area type="monotone" dataKey="Completed" stroke={TOKENS.success} fill={TOKENS.successPastel} strokeWidth={2} dot={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-5">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <TitleWithHoverInfo title="Time Spent (This Week)" info="Logged hours vs target. Daily breakdown shown." />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <DonutSplit
                                    aria="Time progress"
                                    tooltipTitle="Time Progress"
                                    parts={[
                                        { name: "Logged", value: (D.time.loggedWeekMin ?? 0) / Math.max(1, D.time.weekTargetMin ?? 1), color: TOKENS.valueBlue },
                                        { name: "Remaining", value: 1 - (D.time.loggedWeekMin ?? 0) / Math.max(1, D.time.weekTargetMin ?? 1), color: TOKENS.pastelBlue },
                                    ]}
                                    valueFmt={(v) => `${Math.round(v * 100)}%`}
                                />
                                <div>
                                    <output className="block text-[22px] font-bold">
                                        {minutesToHMM(D.time.loggedWeekMin)} / {minutesToHMM(D.time.weekTargetMin)}
                                    </output>
                                    <ValueDelta delta={D.time.deltaWeekPct} ariaId="time-delta" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <SparkBars series={D.time.dailyHours} aria="Daily logged hours" color={TOKENS.valueBlue} />
                                    <SparkBars series={D.time.dailyCompleted} aria="Daily completed items" color={TOKENS.success} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Open by Assignee */}
                <div className="col-span-12">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <TitleWithHoverInfo
                                    title={`Open by Assignee (Top 10) — ${scopeTab === "mine" ? "My" : "Project"} scope`}
                                    info="Share of open tasks across assignees for this project."
                                />
                                <Button
                                    variant="outline"
                                    className="h-8 rounded-full px-3 text-xs"
                                    onClick={() => onNavigate?.(`/project-task-overview`)}
                                    title="Open Project Task Overview"
                                >
                                    Open Task Manager
                                </Button>
                            </div>
                            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <DonutSplit parts={openByAssigneeAgg.parts} aria="Open by assignee" tooltipTitle="Open by assignee" size={76} />
                                    <div>
                                        <output className="block text-[22px] font-bold">{fmtInt(openByAssigneeAgg.total, false)} open</output>
                                        <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                                            Top contributors shown
                                        </div>
                                    </div>
                                </div>
                                <div className="grid flex-1 grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {openByAssigneeAgg.list.slice(0, 10).map((a, i) => {
                                        const color = i < 11 ? paletteMemo[i % paletteMemo.length] : mixWithWhite(BRAND_HEX, 0.82);
                                        return (
                                            <div key={a.name + i} className="flex items-center justify-between gap-3 rounded-md border px-2 py-1 text-xs" style={{ borderColor: TOKENS.border }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                                                    <span className="truncate" title={a.name}>
                                                        {a.name}
                                                    </span>
                                                </div>
                                                <div className="font-semibold">{fmtInt(a.count, false)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ===================== TABLE (shadcn layout + Project Task Overview cells) ===================== */}
            <div className="mt-6">
                <TasksTableScoped
                    rows={rows}
                    onOpenTask={(id) => onNavigate?.(`/project-task-overview?task=${encodeURIComponent(id)}`)}
                    onRedirectToOverview={() => onNavigate?.(`/project-task-overview`)}
                />
            </div>
        </section>
    );
}

/* ========================================================================================
 * TASKS TABLE — shadcn layout (filters/header/skeleton) + row cells from Project Task Overview
 * ====================================================================================== */

/** Column keys for tasks table */
type ColKey = "select" | "expander" | "title" | "assignee" | "priority" | "status" | "start" | "due" | "actions";

function TasksTableScoped({
    rows,
    onOpenTask,
    onRedirectToOverview,
}: {
    rows: TaskRow[];
    onOpenTask?: (id: string) => void;
    onRedirectToOverview?: () => void;
}) {
    /* ---------- Filters (table-local) ---------- */
    const [query, setQuery] = useState("");
    const [statusSet, setStatusSet] = useState<Set<TaskStatus | "done">>(new Set(["todo", "inprogress", "review", "blocked", "done"]));
    const [prioSet, setPrioSet] = useState<Set<Priority>>(new Set(["P1", "P2", "P3", "P4"]));
    const assignees = useMemo(() => {
        const map = new Map<string, string>();
        rows.forEach((r) => {
            const id = r.assignee?.id || "_unassigned";
            const name = r.assignee?.name || "Unassigned";
            if (!map.has(id)) map.set(id, name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [rows]);
    const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
    const [onlyOverdue, setOnlyOverdue] = useState(false);

    const clearAll = () => {
        setQuery("");
        setStatusSet(new Set(["todo", "inprogress", "review", "blocked", "done"]));
        setPrioSet(new Set(["P1", "P2", "P3", "P4"]));
        setAssigneeFilter("all");
        setOnlyOverdue(false);
    };

    /* ---------- Columns visibility ---------- */
    const ALL_COLS: { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center"; sortable?: boolean; sticky?: boolean; stickyLeft?: number }[] = [
        { key: "select", label: "", width: 36, align: "center", sticky: true, stickyLeft: 0 },
        { key: "expander", label: "", width: 36, align: "center", sticky: true, stickyLeft: 36 },
        { key: "title", label: "Task Title", width: 360, sortable: true, sticky: true, stickyLeft: 72 },
        { key: "assignee", label: "Assignee", width: 180, sortable: true },
        { key: "priority", label: "Priority", width: 120, sortable: true, align: "center" },
        { key: "status", label: "Status", width: 140, sortable: true, align: "center" },
        { key: "start", label: "Start", width: 120, sortable: true, align: "right" },
        { key: "due", label: "Due", width: 120, sortable: true, align: "right" },
        { key: "actions", label: "Actions", width: 160 },
    ];
    const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
        select: true,
        expander: true,
        title: true,
        assignee: true,
        priority: true,
        status: true,
        start: true,
        due: true,
        actions: true,
    });
    const visibleColumns = useMemo(() => ALL_COLS.filter((c) => visibleCols[c.key] !== false), [ALL_COLS, visibleCols]);

    /* ---------- Sorting ---------- */
    type SortKey = Exclude<ColKey, "select" | "expander" | "actions">;
    const [sortBy, setSortBy] = useState<SortKey>("due");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const toggleSort = (k: ColKey) => {
        if (k === "select" || k === "expander" || k === "actions") return;
        const key = k as SortKey;
        if (sortBy !== key) {
            setSortBy(key);
            setSortDir("asc");
        } else {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        }
    };

    /* ---------- Selection / Expansion ---------- */
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [multiExpand, setMultiExpand] = useState(false);
    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            if (multiExpand) return { ...prev, [id]: !prev[id] };
            const next: Record<string, boolean> = {};
            if (!prev[id]) next[id] = true;
            return next;
        });
    };

    /* ---------- Infinite vs pagination ---------- */
    const [infinite, setInfinite] = useState(true);
    const [visibleCount, setVisibleCount] = useState(50);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    /* ---------- Filtering pipeline ---------- */
    const filtered = useMemo(() => {
        const tq = query.trim().toLowerCase();
        return rows.filter((r) => {
            if (tq && !r.title.toLowerCase().includes(tq)) return false;
            if (!statusSet.has(r.status)) return false;
            if (r.priority && !prioSet.has(r.priority)) return false;
            if (assigneeFilter !== "all" && (r.assignee?.id || "_unassigned") !== assigneeFilter) return false;
            if (onlyOverdue) {
                if (r.status === "done") return false;
                if (!r.dueAt || daysFromToday(r.dueAt) >= 0) return false;
            }
            return true;
        });
    }, [rows, query, statusSet, prioSet, assigneeFilter, onlyOverdue]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        const keyer = (r: TaskRow) => {
            switch (sortBy) {
                case "title":
                    return r.title.toLowerCase();
                case "assignee":
                    return r.assignee?.name || "";
                case "priority":
                    return r.priority || "P4";
                case "status":
                    return r.status;
                case "start":
                    return r.startAt || "";
                case "due":
                default:
                    return r.dueAt || "";
            }
        };
        arr.sort((a, b) => {
            const av = keyer(a),
                bv = keyer(b);
            if (av === bv) return 0;
            return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
        });
        return arr;
    }, [filtered, sortBy, sortDir]);

    const windowedRows = useMemo(() => {
        if (infinite) return sorted.slice(0, visibleCount);
        const start = (page - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, infinite, visibleCount, page, pageSize]);

    /* ---------- Infinite sentinel ---------- */
    useEffect(() => {
        if (!infinite) return;
        const el = document.getElementById("tasks-table-sentinel");
        if (!el) return;
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount((v) => Math.min(sorted.length, v + 50));
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, [infinite, sorted.length]);

    /* ---------- Bulk helpers ---------- */
    const visibleIds = windowedRows.map((r) => r.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
    const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;
    const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
    const anySelected = selectedIds.length > 0;
    const toggleAllVisible = (on: boolean) => {
        const patch: Record<string, boolean> = {};
        visibleIds.forEach((id) => (patch[id] = on));
        setSelected((s) => ({ ...s, ...patch }));
    };

    /* ---------- Export ---------- */
    const exportCSV = (onlySelected: boolean = false) => {
        const cols: (keyof TaskRow | "assigneeName")[] = ["title", "assigneeName", "priority", "status", "startAt", "dueAt", "project"];
        const dataset = onlySelected ? sorted.filter((r) => !!selected[r.id]) : sorted;
        const header = cols.join(",");
        const lines = dataset.map((r) => {
            const row: Record<string, any> = {
                ...r,
                assigneeName: r.assignee?.name || "Unassigned",
            };
            return cols.map((k) => JSON.stringify(row[k] ?? "")).join(",");
        });
        const csv = header + "\n" + lines.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = onlySelected ? "tasks-selected.csv" : "tasks.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    };

    /* ---------- Row render helpers (status/priority chips) ---------- */
    const colorForStatus = (s: string) =>
        s === "done"
            ? TK.status.completed
            : s === "inprogress"
                ? TK.status.inProgress
                : s === "review"
                    ? TK.status.review
                    : TK.status.notStarted;
    const priorityLabel = (p?: Priority) => (p === "P1" ? "High" : p === "P2" ? "Medium" : p === "P3" ? "Low" : "Low");
    const priorityColor = (p?: Priority) => (p === "P1" ? TK.priority.high : p === "P2" ? TK.priority.medium : TK.priority.low);

    /* ---------- UI: header + filters ---------- */
    const statusOptions: { key: TaskStatus | "done"; label: string }[] = [
        { key: "todo", label: "Not Started" },
        { key: "inprogress", label: "In Progress" },
        { key: "review", label: "Under Review" },
        { key: "blocked", label: "Blocked" },
        { key: "done", label: "Completed" },
    ];
    const prioOptions: { key: Priority; label: string }[] = [
        { key: "P1", label: "P1 — High" },
        { key: "P2", label: "P2 — Medium" },
        { key: "P3", label: "P3 — Low" },
        { key: "P4", label: "P4 — None" },
    ];

    return (
        <Card className="border" style={{ borderColor: TOKENS.border }}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Tasks</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Infinite */}
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Infinite</span>
                        <Switch checked={infinite} onCheckedChange={(v) => { setInfinite(Boolean(v)); if (Boolean(v)) setVisibleCount(50); }} />
                    </div>
                    {/* Expand multiple */}
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Expand multiple rows</span>
                        <Switch checked={multiExpand} onCheckedChange={setMultiExpand} />
                    </div>

                    {/* Columns control */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm text-muted-foreground hover:bg-[#F7FAFC]">
                                <Settings2 className="h-4 w-4" /> Columns
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                            <div className="mb-2 text-sm font-medium">Show / Hide Columns</div>
                            <ScrollArea className="max-h-[360px] pr-2">
                                <div className="space-y-2">
                                    {ALL_COLS.map((c) => (
                                        <label key={c.key} className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                                disabled={c.key === "select" || c.key === "expander" || c.key === "title"}
                                                checked={visibleCols[c.key] !== false}
                                                onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                                            />
                                            <span>{c.label || c.key}</span>
                                        </label>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="mt-3 flex justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setVisibleCols({
                                            select: true,
                                            expander: true,
                                            title: true,
                                            assignee: true,
                                            priority: true,
                                            status: true,
                                            start: true,
                                            due: true,
                                            actions: true,
                                        })
                                    }
                                >
                                    Reset
                                </Button>
                                <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                                    Apply
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Export */}
                    <Button variant="outline" size="sm" onClick={() => exportCSV(anySelected)}>
                        Export
                    </Button>

                    {/* Go to full panel */}
                    <Button variant="outline" size="sm" className="gap-2" onClick={onRedirectToOverview}>
                        Open Project Task Overview
                    </Button>
                </div>
            </CardHeader>

            {/* Bulk Bar */}
            {anySelected && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2" style={{ background: TOKENS.subtle, borderColor: TOKENS.border }}>
                    <div className="text-sm" style={{ color: TOKENS.text }}>
                        <strong>{selectedIds.length}</strong> selected
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="gap-2" onClick={() => alert("Mark Complete (bulk)")}>
                            <ClipboardList className="h-4 w-4" /> Mark Complete
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert("Reassign (bulk)")}>
                            Reassign
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportCSV(true)}>
                            Export Selection
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => alert("Remove (bulk)")}>
                            <Trash2 className="h-4 w-4" /> Remove
                        </Button>
                    </div>
                </div>
            )}

            {/* Filters Row */}
            <CardContent className="border-t pt-4" style={{ borderColor: TOKENS.border }}>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" /> Filters
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <InfoIcon className="h-3.5 w-3.5 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Filter the table below. These filters are additional to the global My/Team + Time filters above.</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button variant="outline" size="sm" onClick={clearAll}>
                        Clear all
                    </Button>

                    {/* Search by title */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task title…" className="w-[260px] pl-7" />
                    </div>

                    {/* Status multi-select (popover with checkboxes) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]">
                                Status
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56">
                            <div className="space-y-2">
                                {statusOptions.map((s) => (
                                    <label key={s.key} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={statusSet.has(s.key as any)}
                                            onCheckedChange={(v) =>
                                                setStatusSet((prev) => {
                                                    const next = new Set(prev);
                                                    if (v) next.add(s.key as any);
                                                    else next.delete(s.key as any);
                                                    return next;
                                                })
                                            }
                                        />
                                        <span>{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Priority multi-select */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]">
                                Priority
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56">
                            <div className="space-y-2">
                                {prioOptions.map((p) => (
                                    <label key={p.key} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={prioSet.has(p.key)}
                                            onCheckedChange={(v) =>
                                                setPrioSet((prev) => {
                                                    const next = new Set(prev);
                                                    if (v) next.add(p.key);
                                                    else next.delete(p.key);
                                                    return next;
                                                })
                                            }
                                        />
                                        <span>{p.label}</span>
                                    </label>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Assignee */}
                    <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v)}>
                        <SelectTrigger className="h-8 w-[200px]">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All assignees</SelectItem>
                            {assignees.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                    {a.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Overdue only */}
                    <label className="ml-1 inline-flex cursor-pointer select-none items-center gap-2 text-sm">
                        <Checkbox checked={onlyOverdue} onCheckedChange={(v) => setOnlyOverdue(Boolean(v))} />
                        <span className="inline-flex items-center gap-1">
                            Overdue only
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TK.status.overdue }} />
                        </span>
                    </label>
                </div>
            </CardContent>

            {/* Table */}
            <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-auto border-t" style={{ borderColor: TOKENS.border }}>
                    <STable className="text-sm">
                        <STableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                            <STableRow>
                                {visibleColumns.map((c) => (
                                    <STableHead
                                        key={c.key}
                                        style={{
                                            minWidth: c.width,
                                            position: c.sticky ? "sticky" : undefined,
                                            left: c.stickyLeft,
                                            zIndex: c.sticky ? 40 : undefined,
                                            background: c.sticky ? "#fff" : undefined,
                                            boxShadow: c.sticky ? "inset -1px 0 0 rgba(0,0,0,0.06)" : undefined,
                                        }}
                                        className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                                    >
                                        {c.key === "select" ? (
                                            <div className="flex items-center justify-center">
                                                <Checkbox
                                                    checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                                                    onCheckedChange={(v) => toggleAllVisible(Boolean(v))}
                                                />
                                            </div>
                                        ) : c.key === "expander" || !c.sortable ? (
                                            c.label
                                        ) : (
                                            <button
                                                className="inline-flex items-center gap-1 hover:text-foreground"
                                                onClick={() => toggleSort(c.key)}
                                                aria-label={`Sort by ${c.label}`}
                                            >
                                                <span>{c.label}</span>
                                                {sortBy === (c.key as SortKey) ? (
                                                    sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </button>
                                        )}
                                    </STableHead>
                                ))}
                            </STableRow>
                        </STableHeader>

                        <STableBody>
                            {windowedRows.map((r) => {
                                const dueColor =
                                    r.status !== "done" && r.dueAt && daysFromToday(r.dueAt) < 0
                                        ? TK.status.overdue
                                        : r.status !== "done" && r.dueAt && daysFromToday(r.dueAt) === 0
                                            ? TK.status.review
                                            : TOKENS.muted;
                                return (
                                    <React.Fragment key={r.id}>
                                        <STableRow className="hover:bg-[#F5F7FA]">
                                            {visibleCols.select !== false && (
                                                <STableCell
                                                    style={{
                                                        position: "sticky",
                                                        left: 0,
                                                        zIndex: 3,
                                                        background: "#fff",
                                                        boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                                    }}
                                                    className="text-center"
                                                >
                                                    <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))} />
                                                </STableCell>
                                            )}
                                            {visibleCols.expander !== false && (
                                                <STableCell
                                                    style={{
                                                        position: "sticky",
                                                        left: 36,
                                                        zIndex: 3,
                                                        background: "#fff",
                                                        boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                                    }}
                                                    className="text-center"
                                                >
                                                    <button
                                                        className="rounded-md border p-1 hover:bg-muted"
                                                        onClick={() => toggleExpand(r.id)}
                                                        aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                                                    >
                                                        {expanded[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                </STableCell>
                                            )}
                                            {visibleCols.title !== false && (
                                                <STableCell
                                                    style={{
                                                        position: "sticky",
                                                        left: 72,
                                                        zIndex: 3,
                                                        background: "#fff",
                                                        boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                                        minWidth: 360,
                                                    }}
                                                >
                                                    <a
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            onOpenTask?.(r.id);
                                                        }}
                                                        className="font-medium underline"
                                                        style={{ color: TOKENS.valueBlue }}
                                                        title="Open Task Manager"
                                                    >
                                                        {r.title}
                                                    </a>
                                                </STableCell>
                                            )}
                                            {visibleCols.assignee !== false && (
                                                <STableCell>
                                                    <div className="inline-flex items-center gap-2">
                                                        <Avatar userId={r.assignee?.id} name={r.assignee?.name} />
                                                        <span className="text-[13px] leading-none">{r.assignee?.name || "Unassigned"}</span>
                                                    </div>
                                                </STableCell>
                                            )}
                                            {visibleCols.priority !== false && (
                                                <STableCell className="text-center">
                                                    <Pill label={priorityLabel(r.priority)} color={priorityColor(r.priority)} />
                                                </STableCell>
                                            )}
                                            {visibleCols.status !== false && (
                                                <STableCell className="text-center">
                                                    <Pill
                                                        label={
                                                            r.status === "done"
                                                                ? "Completed"
                                                                : r.status === "inprogress"
                                                                    ? "In Progress"
                                                                    : r.status === "review"
                                                                        ? "Under Review"
                                                                        : r.status === "blocked"
                                                                            ? "Blocked"
                                                                            : "Not Started"
                                                        }
                                                        color={colorForStatus(r.status)}
                                                    />
                                                </STableCell>
                                            )}
                                            {visibleCols.start !== false && (
                                                <STableCell className="text-right text-[13px]" style={{ color: TOKENS.muted }}>
                                                    {r.startAt || "—"}
                                                </STableCell>
                                            )}
                                            {visibleCols.due !== false && (
                                                <STableCell className="text-right text-[13px]" style={{ color: dueColor, fontWeight: 500 }}>
                                                    {r.dueAt || "—"}
                                                </STableCell>
                                            )}
                                            {visibleCols.actions !== false && (
                                                <STableCell>
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onOpenTask?.(r.id)}>
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">Edit</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" aria-label="Reassign" onClick={() => onOpenTask?.(r.id)}>
                                                                        <Repeat className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">Reassign</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" aria-label="Change Dates" onClick={() => onOpenTask?.(r.id)}>
                                                                        <Calendar className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">Change Dates</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </STableCell>
                                            )}
                                        </STableRow>

                                        {/* Expanded row */}
                                        {expanded[r.id] && (
                                            <STableRow className="bg-[#F5F7FA]">
                                                <STableCell colSpan={visibleColumns.length}>
                                                    <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2" style={{ borderColor: TOKENS.border }}>
                                                        <div>
                                                            <div className="mb-1 text-sm font-semibold">Timeline (last 14d)</div>
                                                            <MiniBars14 />
                                                            <div className="mt-2 grid grid-cols-[70px_1fr] gap-2 text-sm">
                                                                <span className="text-muted-foreground">Status:</span>
                                                                <b>
                                                                    {r.status === "done"
                                                                        ? "Completed"
                                                                        : r.status === "inprogress"
                                                                            ? "In Progress"
                                                                            : r.status === "review"
                                                                                ? "Under Review"
                                                                                : r.status === "blocked"
                                                                                    ? "Blocked"
                                                                                    : "Not Started"}
                                                                </b>
                                                                <span className="text-muted-foreground">Priority:</span>
                                                                <b>{priorityLabel(r.priority)}</b>
                                                                <span className="text-muted-foreground">Start:</span>
                                                                <b>{r.startAt || "—"}</b>
                                                                <span className="text-muted-foreground">Due:</span>
                                                                <b>{r.dueAt || "—"}</b>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="mb-1 text-sm font-semibold">Task Summary</div>
                                                            <div className="text-[13px] text-muted-foreground">
                                                                {r.description || "—"}
                                                            </div>
                                                            <div className="mt-2 flex gap-2">
                                                                <Button size="sm" onClick={() => alert("Mark Complete")}>
                                                                    ✅ Mark Complete
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => alert("Reassign")}>
                                                                    🔁 Reassign
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => alert("Change Due")}>
                                                                    📅 Change Due
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </STableCell>
                                            </STableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </STableBody>
                    </STable>
                    {infinite && <div id="tasks-table-sentinel" className="h-8" />}
                </div>
            </CardContent>

            {/* Pagination footer (when Infinite OFF) */}
            {!infinite && (
                <div className="flex items-center justify-between border-t p-3" style={{ borderColor: TOKENS.border }}>
                    <div className="text-sm text-muted-foreground">
                        Showing {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(sorted.length, (page - 1) * pageSize + windowedRows.length)} of {sorted.length}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>
                            <ChevronFirst className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-16 text-center text-sm">{page}</div>
                        <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page * pageSize >= sorted.length}
                            onClick={() => setPage(Math.ceil(sorted.length / pageSize))}
                        >
                            <ChevronLast className="h-4 w-4" />
                        </Button>
                        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                            <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue placeholder="Page size" />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50, 100].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n} / page
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </Card>
    );
}

/* ========================================================================================
 * MOCK DATA (deterministic) — replace with real data wiring in your app
 * ====================================================================================== */
function makeMockTasksSnapshot(): TasksSnapshot {
    const rnd = rng("tasks");
    const timeframe: "7d" | "30d" | "90d" | "12m" = "30d";
    const scope: "mine" | "team" = "team";
    const viewerId = "u0";

    const names = ["Alex", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Sam", "Quinn", "Ava", "Ben", "Chloe", "Diego"];
    const statuses: TaskStatus[] = ["todo", "inprogress", "review", "blocked", "done"];
    const rows: TaskRow[] = Array.from({ length: 72 }).map((_, idx) => {
        const status = statuses[Math.floor(rnd() * statuses.length)];
        const dueShift = Math.floor(rnd() * 20) - 5; // -5..+14
        const due = rnd() > 0.15 ? new Date(Date.now() + dueShift * 86400000).toISOString().slice(0, 10) : null;
        const assignee = rnd() > 0.25 ? { id: `u${idx % names.length}`, name: names[idx % names.length] } : null;
        const estimateMin = Math.random() > 0.2 ? Math.round(60 + rnd() * 240) : null;
        const spent = Math.round((estimateMin ?? 120) * (0.3 + rnd()));
        const series = makeSeries(10, 40 + rnd() * 80, 0.4, `spent-${idx}`).map((p) => ({ t: p.t, v: Math.max(0, Math.round(p.v / 4)) }));
        return {
            id: String(2200 + idx),
            title: `Implement UX improvement ${idx + 1}`,
            project: idx % 3 === 0 ? "Website" : idx % 3 === 1 ? "Docs" : "Growth",
            status,
            priority: (["P1", "P2", "P3", "P4"] as Priority[])[idx % 4],
            startAt: new Date(Date.now() - (7 + (idx % 7)) * 86400000).toISOString().slice(0, 10),
            dueAt: due,
            assignee,
            estimateMin,
            spentMinTotal: spent,
            spentSeries: series,
            labels: idx % 2 ? ["frontend"] : ["backend"],
            description:
                idx % 5 === 0
                    ? "Refactor header layout and improve lighthouse performance."
                    : "Tighten tracking events, add QA checklist and confirm UTM mapping.",
        };
    });

    const overdue = rows.filter((r) => dueBucket(r.dueAt) === "overdue" && r.status !== "done").length;
    const dueToday = rows.filter((r) => dueBucket(r.dueAt) === "today" && r.status !== "done").length;
    const dueThisWeek = rows.filter((r) => dueBucket(r.dueAt) === "week" && r.status !== "done").length;
    const open = rows.filter((r) => r.status !== "done").length;

    const loggedSeries = Array.from({ length: 12 }).map((_, i) => {
        const t = new Date();
        t.setDate(t.getDate() - (11 - i) * 7);
        const hours = Math.max(0, 12 + Math.round((Math.sin(i / 2.8) + 1) * 6) + (i % 3 === 0 ? 4 : 0));
        const completed = Math.max(0, 5 + Math.round((Math.cos(i / 2.2) + 1) * 3));
        return { t: t.toISOString().slice(0, 10), hours, completed };
    });

    return {
        timeframe,
        scope,
        viewerId,
        totals: {
            open,
            deltaOpenPct: -3.4,
            overdue,
            dueToday,
            dueThisWeek,
        },
        time: {
            weekTargetMin: 1200,
            loggedWeekMin: 760,
            deltaWeekPct: 6.2,
            loggedSeries,
            dailyHours: makeSeries(7, 6, 0.35, "daily-hours"),
            dailyCompleted: makeSeries(7, 3, 0.4, "daily-completed"),
            leadTimeSeries: makeSeries(14, 4, 0.3, "lead-days"),
            avgReviewTimeDelta: -0.6,
        },
        rows,
    };
}


