import React from 'react';
import {
    Info,
    ExternalLink,
    FileSearch,
    Shield,
    Eye,
    AlertCircle,
    PlugZap,
} from 'lucide-react';

/** -----------------------------------------------------------------------
 * Section 8 – Top Pages Affected by Toxic/Suspicious Links (Table)
 * - React + TailwindCSS
 * - Desktop: compact table; Mobile: stacked card layout
 * - GA4 referral traffic cell: Connected / 0 sessions / Not Connected (CTA)
 * - Actions: View Page Analyzer • Audit Links • Disavow (callbacks provided)
 * ---------------------------------------------------------------------- */

type AnchorRiskLevel = 'High' | 'Medium' | 'Low';

type ReferralState =
    | { connected: true; total: number; risky: number }          // ✅ Connected
    | { connected: true; total: 0; risky: 0 }                     // ⚠️ Connected but no data
    | { connected: false };                                       // ❌ Not connected

export type TopPageRiskRow = {
    id: string;
    title?: string;                   // Optional human title
    url: string;                      // Page path or full URL
    toxicBacklinks: number;           // Count of toxic backlinks
    suspiciousBacklinks: number;      // Count of suspicious backlinks
    anchorRisk: AnchorRiskLevel | { label: AnchorRiskLevel; aqs?: number }; // Label or label+score
    wrImpact: number;                 // Negative = reduction (e.g., -1.5)
    referral: ReferralState;          // GA4 metric state
};

export type Section8Props = {
    rows?: TopPageRiskRow[];
    loading?: boolean;
    onConnectGA4?: any;
    onOpenPageAnalyzer?: (row: TopPageRiskRow) => void;
    onAuditLinks?: (row: TopPageRiskRow) => void;
    onDisavow?: (row: TopPageRiskRow) => void;
    className?: string;
};

const BRAND = {
    blue: '#1090D0',        // GA4 connected text color
    border: '#EFF0F6',
};

function clsx(...parts: Array<string | false | undefined>) {
    return parts.filter(Boolean).join(' ');
}

function formatInt(n: number) {
    return new Intl.NumberFormat().format(n);
}

function riskBadge(level: AnchorRiskLevel) {
    switch (level) {
        case 'High':
            return 'border-red-200 text-red-700 bg-red-50';
        case 'Medium':
            return 'border-amber-200 text-amber-700 bg-amber-50';
        case 'Low':
            return 'border-emerald-200 text-emerald-700 bg-emerald-50';
    }
}

/** Small tooltip using Tailwind group hover */
const HoverTip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    return (
        <span className="relative inline-flex items-center group">
            {children}
            <span
                className={clsx(
                    'pointer-events-none absolute left-0 top-[115%] z-20 hidden w-max max-w-[260px]',
                    'rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-md',
                    'group-hover:block'
                )}
            >
                {text}
            </span>
        </span>
    );
};

/** Referral traffic cell renderer */
const ReferralCell: React.FC<{
    referral: ReferralState;
    onConnect?: any;
}> = ({ referral, onConnect }) => {
    if (!referral.connected) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-gray-400">–</span>
                <button
                    type="button"
                    onClick={onConnect}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                    <PlugZap className="h-3.5 w-3.5" />
                    Connect GA4
                </button>
            </div>
        );
    }

    const total = referral.total ?? 0;
    const risky = referral.risky ?? 0;
    const text = (
        <div className="flex flex-col sm:block">
            <span style={{ color: BRAND.blue }} className="font-medium">
                {formatInt(total)} sessions
            </span>
            <span className="sm:ml-1 text-gray-500">/ {formatInt(risky)} risky</span>
        </div>
    );

    const tip = total > 0
        ? `Total Referral Traffic: ${formatInt(total)} sessions\nFrom Risky Domains: ${formatInt(risky)} (${total ? ((risky / total) * 100).toFixed(1) : '0.0'}%)\nData from GA4 – last 30 days.`
        : `No referral traffic recorded for this page recently.`;

    return <HoverTip text={tip}>{text}</HoverTip>;
};

function anchorRiskLabel(a: TopPageRiskRow['anchorRisk']): AnchorRiskLevel {
    return typeof a === 'string' ? a : a.label;
}

function anchorRiskAqs(a: TopPageRiskRow['anchorRisk']): number | undefined {
    return typeof a === 'string' ? undefined : a.aqs;
}

const DEFAULT_ROWS: TopPageRiskRow[] = [
    {
        id: '1',
        title: 'SEO Guide',
        url: '/blog/seo-guide',
        toxicBacklinks: 18,
        suspiciousBacklinks: 32,
        anchorRisk: { label: 'High', aqs: 38 },
        wrImpact: -2.1,
        referral: { connected: true, total: 1812, risky: 432 },
    },
    {
        id: '2',
        title: 'Pricing',
        url: '/pricing',
        toxicBacklinks: 5,
        suspiciousBacklinks: 9,
        anchorRisk: { label: 'Medium', aqs: 62 },
        wrImpact: -0.7,
        referral: { connected: true, total: 821, risky: 0 },
    },
    {
        id: '3',
        title: 'Bulk Analyzer',
        url: '/tools/bulk-analyzer',
        toxicBacklinks: 15,
        suspiciousBacklinks: 10,
        anchorRisk: 'High',
        wrImpact: -1.2,
        referral: { connected: false },
    },
];

export default function Section8TopPagesAffectedTable({
    rows = DEFAULT_ROWS,
    loading,
    onConnectGA4,
    onOpenPageAnalyzer,
    onAuditLinks,
    onDisavow,
    className,
}: Section8Props) {
    return (
        <div
            className={clsx(
                'w-full rounded-2xl border bg-white shadow-[0_2px_6px_rgba(0,0,0,0.05)]',
                'border-[--wr-border] p-4 sm:p-5',
                className
            )}
            style={{ ['--wr-border' as any]: BRAND.border }}
        >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-gray-900">
                        Top Pages Affected by Toxic/Suspicious Links
                    </h3>
                    <Info className="h-4 w-4 text-gray-400"  />
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full table-fixed">
                    <colgroup>
                        <col className="w-[28%]" />
                        <col className="w-[9%]" />
                        <col className="w-[10%]" />
                        <col className="w-[13%]" />
                        <col className="w-[11%]" />
                        <col className="w-[22%]" />
                        <col className="w-[7%]" />
                    </colgroup>
                    <thead className="text-left">
                        <tr className="border-b border-gray-100 text-[13px] text-gray-600">
                            <th className="pb-2 font-medium">Page URL / Title</th>
                            <th className="pb-2 font-medium">Toxic</th>
                            <th className="pb-2 font-medium">Suspicious</th>
                            <th className="pb-2 font-medium">Anchor Risk</th>
                            <th className="pb-2 font-medium">WR Impact</th>
                            <th className="pb-2 font-medium">Referral Traffic (Total vs Risky)</th>
                            <th className="pb-2 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="align-top">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                                    Loading…
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const risk = anchorRiskLabel(row.anchorRisk);
                                const aqs = anchorRiskAqs(row.anchorRisk);
                                return (
                                    <tr
                                        key={row.id}
                                        className="group border-b border-gray-50 hover:bg-[#F8FBFF]"
                                        onClick={() => onOpenPageAnalyzer?.(row)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        {/* Page */}
                                        <td className="py-3 pr-3">
                                            <div className="flex min-w-0 items-start gap-2">
                                                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium text-gray-900">{row.title ?? row.url}</div>
                                                    {row.title && (
                                                        <div className="truncate text-[13px] text-gray-500">{row.url}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Toxic */}
                                        <td className="py-3 pr-3 text-sm font-medium text-red-600">
                                            {formatInt(row.toxicBacklinks)}
                                        </td>

                                        {/* Suspicious */}
                                        <td className="py-3 pr-3 text-sm font-medium text-amber-600">
                                            {formatInt(row.suspiciousBacklinks)}
                                        </td>

                                        {/* Anchor Risk */}
                                        <td className="py-3 pr-3">
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                                    riskBadge(risk)
                                                )}
                                                title={aqs ? `Anchor Quality Score: ${aqs}` : undefined}
                                            >
                                                {risk === 'High' && <AlertCircle className="h-3.5 w-3.5" />}
                                                {risk} {aqs ? <span className="ml-1 text-[11px] font-normal">• AQS {aqs}</span> : null}
                                            </span>
                                        </td>

                                        {/* WR Impact */}
                                        <td className="py-3 pr-3">
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold',
                                                    row.wrImpact < 0 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                                                )}
                                                title="WR Score reduction due to backlinks impacting this page"
                                            >
                                                {row.wrImpact < 0 ? '−' : '+'}
                                                {Math.abs(row.wrImpact).toFixed(1)} pts
                                            </span>
                                        </td>

                                        {/* Referral Traffic */}
                                        <td className="py-3 pr-3">
                                            <ReferralCell referral={row.referral} onConnect={(e:any) => onConnectGA4?.()} />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenPageAnalyzer?.(row);
                                                    }}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Page
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAuditLinks?.(row);
                                                    }}
                                                >
                                                    <FileSearch className="h-3.5 w-3.5" />
                                                    Audit Links
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDisavow?.(row);
                                                    }}
                                                >
                                                    <Shield className="h-3.5 w-3.5" />
                                                    Disavow
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="sm:hidden">
                <ul className="divide-y divide-gray-100">
                    {rows.map((row) => {
                        const risk = anchorRiskLabel(row.anchorRisk);
                        const aqs = anchorRiskAqs(row.anchorRisk);
                        return (
                            <li
                                key={row.id}
                                className="py-3"
                                onClick={() => onOpenPageAnalyzer?.(row)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flex items-start gap-2">
                                    <ExternalLink className="mt-0.5 h-4 w-4 text-gray-400" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-gray-900">
                                            {row.title ?? row.url}
                                        </div>
                                        {row.title && (
                                            <div className="truncate text-[13px] text-gray-500">{row.url}</div>
                                        )}
                                        {/* Line 1: Toxic + Anchor Risk */}
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                                            <span className="font-medium text-red-600">{formatInt(row.toxicBacklinks)} toxic</span>
                                            <span className="text-gray-300">•</span>
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                                    riskBadge(risk)
                                                )}
                                                title={aqs ? `AQS ${aqs}` : undefined}
                                            >
                                                {risk} {aqs ? <span className="ml-1 text-[10px] font-normal">• AQS {aqs}</span> : null}
                                            </span>
                                        </div>
                                        {/* Line 2: WR Impact + Referral Traffic */}
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
                                                    row.wrImpact < 0 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                                                )}
                                                title="WR Score impact from backlinks"
                                            >
                                                {row.wrImpact < 0 ? '−' : '+'}
                                                {Math.abs(row.wrImpact).toFixed(1)} pts
                                            </span>
                                            <span className="text-gray-300">•</span>
                                            <ReferralCell referral={row.referral} onConnect={onConnectGA4} />
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenPageAnalyzer?.(row);
                                                }}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Page
                                            </button>
                                            <button
                                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAuditLinks?.(row);
                                                }}
                                            >
                                                <FileSearch className="h-3.5 w-3.5" />
                                                Audit Links
                                            </button>
                                            <button
                                                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDisavow?.(row);
                                                }}
                                            >
                                                <Shield className="h-3.5 w-3.5" />
                                                Disavow
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Footer helper / legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
                <div className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Toxic Backlinks
                </div>
                <div className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Suspicious Backlinks
                </div>
                <div className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND.blue }} /> GA4 Connected Metric
                </div>
                <div className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-300" /> 0 Sessions / Not Connected dash “–”
                </div>
            </div>
        </div>
    );
}




