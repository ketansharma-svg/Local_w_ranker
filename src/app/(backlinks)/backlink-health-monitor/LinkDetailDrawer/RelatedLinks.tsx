"use client";

import React from "react";
import {
    ExternalLink,
    Eye,
    Info,
    Link as LinkIcon,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
    brand: "#1090D0",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    borderLight: "#EFF0F6",
    card: "#FFFFFF",
    radius: 10,
    ok: "#10B981",
    warn: "#F59E0B",
    danger: "#EF4444",
    pastel: "#F5F7FA",
};

type Status =
    | "active"
    | "removed"
    | "broken"
    | "redirected"
    | "not_found"
    | "not_checked";

type LinkType = "dofollow" | "nofollow" | "sponsored" | "ugc";

type RelatedLink = {
    id?: string;
    path: string; // source URL path (no host)
    source_url?: string; // full url
    status: Status;
    type: LinkType;
    wr: number; // 0..100
    last_checked?: string; // ISO
    type_prev?: LinkType;
    type_changed_at?: string; // ISO
    wr_prev?: number;
};

/* ───────────────────────── Utilities ───────────────────────── */
const STATUS_LABEL: Record<Status, string> = {
    active: "Active",
    removed: "Removed",
    broken: "Broken (404)",
    redirected: "Redirected",
    not_found: "Not Found",
    not_checked: "Not Checked",
};

const TYPE_LABEL: Record<LinkType, string> = {
    dofollow: "Dofollow",
    nofollow: "Nofollow",
    sponsored: "Sponsored",
    ugc: "UGC",
};

const statusHue = (s: Status) =>
    s === "active"
        ? TK.ok
        : s === "redirected"
            ? TK.warn
            : s === "not_checked"
                ? TK.muted
                : TK.danger; // removed/broken/not_found

function truncatePath(path: string, start = 28, end = 20) {
    if (!path) return "—";
    return path.length <= start + end
        ? path
        : path.slice(0, start) + "…" + path.slice(-end);
}

function shortDate(iso?: string) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        const fmt = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        return fmt.format(d);
    } catch {
        return "—";
    }
}

const OVERDUE_MS = 14 * 86400000;
const isOverdue = (iso?: string) =>
    iso ? Date.now() - new Date(iso).getTime() > OVERDUE_MS : false;

// Severity tiebreak: Removed/Broken/Not Found > Redirected > Active > Not Checked
const statusRank: Record<Status, number> = {
    removed: 3,
    broken: 3,
    not_found: 3,
    redirected: 2,
    active: 1,
    not_checked: 0,
};

function sortRelated(a: RelatedLink, b: RelatedLink) {
    // 1) Last checked desc
    const at = a.last_checked ? new Date(a.last_checked).getTime() : -1;
    const bt = b.last_checked ? new Date(b.last_checked).getTime() : -1;
    if (bt !== at) return bt - at;
    // 2) Severity
    const sr = statusRank[b.status] - statusRank[a.status];
    if (sr !== 0) return sr;
    // 3) WR desc
    return b.wr - a.wr;
}

/* ───────────────────────── Tiny Donut ───────────────────────── */
function TinyDonut({ value, size = 18 }: { value: number; size?: number }) {
    const stroke = 3;
    const r = (size - stroke) / 2;
    const c = Math.PI * 2 * r;
    const pct = Math.max(0, Math.min(100, value));
    const offset = c * (1 - pct / 100);
    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-label={`WR ${Math.round(pct)}`}
        >
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={TK.border}
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={TK.brand}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                />
            </g>
        </svg>
    );
}

/* ───────────────────────── Badge ───────────────────────── */
function Pill({
    color,
    children,
    title,
    changed,
}: {
    color: string;
    children: React.ReactNode;
    title?: string;
    changed?: boolean;
}) {
    return (
        <span
            title={title}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px]"
            style={{
                borderColor: `${color}22`,
                background: `${color}14`,
                color: changed ? TK.warn : color,
            }}
        >
            {children}
        </span>
    );
}

/* ───────────────────────── Section Component ───────────────────────── */
export function RelatedLinksSection({
    domain,
    items,
    loading,
    error,
    onOpenLinkDetail,
    onOpenSource,
    onViewAll,
}: {
    domain: string;
    items: RelatedLink[];
    loading?: boolean;
    error?: string | null;
    onOpenLinkDetail?: (id: string) => void;
    onOpenSource?: (url: string) => void;
    onViewAll?: (domain: string) => void;
}) {
    const sorted = React.useMemo(() => [...items].sort(sortRelated).slice(0, 5), [items]);

    return (
        <section id="related-links" aria-labelledby="related-links-title" className="mt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 id="related-links-title" className="text-[16px] font-semibold text-[#111827]">
                    Related Links (same domain)
                </h3>
                <span className="text-[12px] text-[#6B7280]">Max 5 rows • Sorted by latest checks</span>
            </div>

            {/* Card container */}
            <div
                className="bg-white border rounded-lg"
                style={{ borderColor: TK.border }}
            >
                {/* Loading */}
                {loading && (
                    <div className="p-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: TK.borderLight }}>
                                <div className="h-4 w-1/2 bg-gray-100 rounded" />
                                <div className="ml-auto flex items-center gap-3">
                                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                                    <div className="h-5 w-10 bg-gray-100 rounded-full" />
                                    <div className="h-4 w-24 bg-gray-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {!!error && !loading && (
                    <div className="p-4 text-[14px] text-[#EF4444] flex items-center gap-2">
                        <Info size={16} />
                        Couldn't load related links. <button className="underline" onClick={() => window.location.reload()}>Retry</button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && sorted.length === 0 && (
                    <div className="p-5 flex items-center gap-3 text-[#6B7280]">
                        <LinkIcon size={18} />
                        <div>
                            <div className="text-[14px]">No other links from this domain.</div>
                            <button
                                className="text-[13px] underline"
                                onClick={() => onViewAll?.(domain)}
                            >
                                Open main table for {domain}
                            </button>
                        </div>
                    </div>
                )}

                {/* Table (≥sm) */}
                {!loading && !error && sorted.length > 0 && (
                    <div className="hidden sm:block">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="text-[#6B7280] text-left border-b" style={{ borderColor: TK.borderLight }}>
                                    <th className="py-2 pl-4" scope="col">Source Path</th>
                                    <th className="py-2" scope="col">Status</th>
                                    <th className="py-2" scope="col">Type</th>
                                    <th className="py-2" scope="col">WR</th>
                                    <th className="py-2 pr-4" scope="col">Last Checked</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((r, idx) => (
                                    <tr
                                        key={idx}
                                        tabIndex={0}
                                        aria-label={`Open details for ${r.path} — ${STATUS_LABEL[r.status]}, ${TYPE_LABEL[r.type]}, WR ${r.wr}, Last checked ${shortDate(r.last_checked)}`}
                                        className="group border-b last:border-b-0 cursor-pointer focus:outline-none"
                                        style={{ borderColor: TK.borderLight }}
                                        onClick={() => (r.id ? onOpenLinkDetail?.(r.id) : r.source_url ? onOpenSource?.(r.source_url) : undefined)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                r.id ? onOpenLinkDetail?.(r.id) : r.source_url && onOpenSource?.(r.source_url);
                                            }
                                        }}
                                    >
                                        {/* Path */}
                                        <td className="py-3 pl-4 pr-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    title={r.source_url || r.path}
                                                    className="text-[#1090D0] max-w-[420px] inline-block truncate"
                                                >
                                                    {truncatePath(r.path)}
                                                </span>
                                                {r.source_url && (
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenSource?.(r.source_url!);
                                                        }}
                                                        title="Open source page"
                                                        aria-label="Open source page"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 pr-2">
                                            <Pill
                                                color={statusHue(r.status)}
                                                title={`Last change detected ${shortDate(r.last_checked)}`}
                                            >
                                                {STATUS_LABEL[r.status]}
                                            </Pill>
                                        </td>

                                        {/* Type */}
                                        <td className="py-3 pr-2">
                                            <Pill
                                                color={TK.brand}
                                                changed={!!(r.type_prev && r.type_prev !== r.type)}
                                                title={r.type_prev && r.type_prev !== r.type && r.type_changed_at ? `Changed from ${TYPE_LABEL[r.type_prev]} to ${TYPE_LABEL[r.type]} on ${shortDate(r.type_changed_at)}` : TYPE_LABEL[r.type]}
                                            >
                                                {TYPE_LABEL[r.type]}
                                            </Pill>
                                        </td>

                                        {/* WR */}
                                        <td className="py-3 pr-2">
                                            <div className="flex items-center gap-2" title={`WR ${r.wr}${typeof r.wr_prev === 'number' ? ` · Prev ${r.wr_prev} · Δ ${r.wr - (r.wr_prev ?? 0)}` : ''}`}>
                                                <TinyDonut value={r.wr} />
                                                <span className="tabular-nums text-[13px]">{Math.round(r.wr)}</span>
                                            </div>
                                        </td>

                                        {/* Last Checked */}
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span title={r.last_checked || undefined}>{shortDate(r.last_checked)}</span>
                                                {isOverdue(r.last_checked) && (
                                                    <span
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]"
                                                        style={{ borderColor: `${TK.warn}55`, color: TK.warn, background: `${TK.warn}14` }}
                                                        title="Overdue — last check was over 14 days ago"
                                                    >
                                                        Overdue
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mobile stacked list (<sm) */}
                {!loading && !error && sorted.length > 0 && (
                    <div className="sm:hidden divide-y" style={{ borderColor: TK.borderLight }}>
                        {sorted.map((r, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left p-3 hover:bg-[#F5F7FA] focus:outline-none"
                                onClick={() => (r.id ? onOpenLinkDetail?.(r.id) : r.source_url ? onOpenSource?.(r.source_url) : undefined)}
                                aria-label={`Open details for ${r.path} — ${STATUS_LABEL[r.status]}, ${TYPE_LABEL[r.type]}, WR ${r.wr}, Last checked ${shortDate(r.last_checked)}`}
                            >
                                <div className="text-[#1090D0] truncate" title={r.source_url || r.path}>
                                    {truncatePath(r.path)}
                                </div>
                                <div className="mt-1 text-[12px] text-[#6B7280] flex flex-wrap items-center gap-2">
                                    <span style={{ color: statusHue(r.status) }}>{STATUS_LABEL[r.status]}</span>
                                    <span>•</span>
                                    <span className={r.type_prev && r.type_prev !== r.type ? "text-[#F59E0B]" : ""}>
                                        {TYPE_LABEL[r.type]}
                                    </span>
                                    <span>•</span>
                                    <span className="tabular-nums">WR {Math.round(r.wr)}</span>
                                    <span>•</span>
                                    <span>{shortDate(r.last_checked)}</span>
                                    {isOverdue(r.last_checked) && (
                                        <span className="ml-1 px-2 py-0.5 rounded-full border" style={{ borderColor: `${TK.warn}55`, color: TK.warn }}>
                                            Overdue
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="flex justify-end mt-3">
                <button
                    className="text-[13px] text-[#1090D0] hover:underline inline-flex items-center gap-1"
                    onClick={() => onViewAll?.(domain)}
                    aria-label={`Open main table filtered by ${domain}`}
                >
                    View all from this domain
                    <Eye size={16} />
                </button>
            </div>
        </section>
    );
}
