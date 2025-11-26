"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Globe2,
    Server,
    Network as NetworkIcon,
    ShieldAlert,
    ShieldCheck,
    ExternalLink,
    Copy,
    ListTree,
    ChevronRight,
    Shield,
    Check,
    X,
    Clock,
} from "lucide-react";

/* ───────────────────────── Tokens (Wranker‑aligned) ───────────────────────── */
const TK = {
    brand: "#1090D0",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    borderLight: "#EFF0F6",
    surface: "#FFFFFF",
    appBg: "#F5F7FA",
    good: "#10B981",
    warn: "#F59E0B",
    critical: "#EF4444",
};

/* ───────────────────────── Types ───────────────────────── */
type LinkDetail = {
    link_id: string;
    domain: string;
    ip?: string;
    asn?: string;
    host?: string;
    ip_risk: boolean;
    ip_risk_reasons?: string[];
    last_checked?: string; // ISO
    disavowed?: boolean;
};

type CoLink = { domain: string; note?: string };

export type RiskNetworkProps = {
    detail: LinkDetail;
    colinks?: CoLink[];
    onDisavow?: (domain: string) => void;
    onWhitelist?: (payload: { scope: "domain" | "ip" | "asn"; value: string; until?: string; reason?: string }) => void;
};

/* ───────────────────────── Utilities ───────────────────────── */
const shortDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

function classNames(...cls: Array<string | false | undefined>) {
    return cls.filter(Boolean).join(" ");
}

function copyToClipboard(text: string, setToast: (t: string) => void) {
    navigator.clipboard
        .writeText(text)
        .then(() => setToast("Copied to clipboard"))
        .catch(() => setToast("Copy failed"));
}

/* ───────────────────────── Whitelist Dialog ───────────────────────── */
function WhitelistDialog({
    open,
    onClose,
    domain,
    ip,
    asn,
    onConfirm,
}: {
    open: boolean;
    onClose: () => void;
    domain?: string;
    ip?: string;
    asn?: string;
    onConfirm?: (payload: { scope: "domain" | "ip" | "asn"; value: string; until?: string; reason?: string }) => void;
}) {
    const [scope, setScope] = useState<"domain" | "ip" | "asn">("domain");
    const [until, setUntil] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    useEffect(() => {
        if (open) {
            setScope("domain");
            setUntil("");
            setReason("");
        }
    }, [open]);
    if (!open) return null;
    const value = scope === "domain" ? domain : scope === "ip" ? ip : asn;
    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wl-title"
        >
            <div className="w-[92vw] max-w-xl rounded-xl border border-[color:var(--wr-borderLight,#EFF0F6)] bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="wl-title" className="text-base font-semibold text-[color:var(--wr-text,#111827)]">
                        Whitelist network signals
                    </h2>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-lg border border-[color:var(--wr-borderLight,#EFF0F6)] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                        aria-label="Close"
                    >
                        <X className="mx-auto h-5 w-5 text-[color:var(--wr-muted,#6B7280)]" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Scope */}
                    <div>
                        <div className="mb-2 text-sm font-medium text-[color:var(--wr-text,#111827)]">Scope</div>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    { key: "domain", label: `Domain${domain ? ` (${domain})` : ""}` },
                                    { key: "ip", label: `IP${ip ? ` (${ip})` : ""}` },
                                    { key: "asn", label: `ASN${asn ? ` (${asn})` : ""}` },
                                ] as const
                            ).map((o) => (
                                <button
                                    key={o.key}
                                    onClick={() => setScope(o.key)}
                                    className={classNames(
                                        "h-10 rounded-lg border text-sm",
                                        scope === o.key
                                            ? "border-[color:var(--wr-brand,#1090D0)] bg-[color:var(--wr-brand,#1090D0)]/10 text-[color:var(--wr-brand,#1090D0)]"
                                            : "border-[color:var(--wr-border,#E5E7EB)] text-[color:var(--wr-text,#111827)] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                                    )}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[color:var(--wr-text,#111827)]">Duration</label>
                            <select
                                className="w-full rounded-lg border border-[color:var(--wr-border,#E5E7EB)] p-2 text-sm"
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "indef") setUntil("");
                                    else if (v === "30") setUntil(new Date(Date.now() + 30 * 86400000).toISOString());
                                    else if (v === "90") setUntil(new Date(Date.now() + 90 * 86400000).toISOString());
                                }}
                            >
                                <option value="indef">Indefinite</option>
                                <option value="30">30 days</option>
                                <option value="90">90 days</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[color:var(--wr-text,#111827)]">Until (ISO, optional)</label>
                            <input
                                value={until}
                                onChange={(e) => setUntil(e.target.value)}
                                placeholder="2025-12-01T00:00:00Z"
                                className="w-full rounded-lg border border-[color:var(--wr-border,#E5E7EB)] p-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[color:var(--wr-text,#111827)]">Reason (optional)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            maxLength={200}
                            className="w-full resize-none rounded-lg border border-[color:var(--wr-border,#E5E7EB)] p-2 text-sm"
                            placeholder="e.g., Known partner network; suppress false positives"
                        />
                    </div>

                    <p className="text-xs text-[color:var(--wr-muted,#6B7280)]">
                        Whitelist suppresses network warnings for this project. Monitoring continues; scores aren’t automatically boosted.
                    </p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="h-9 rounded-lg border border-[color:var(--wr-border,#E5E7EB)] px-3 text-sm hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (!value) return onClose();
                            onConfirm?.({ scope, value, until: until || undefined, reason: reason || undefined });
                            onClose();
                        }}
                        className="h-9 rounded-lg bg-[color:var(--wr-brand,#1090D0)] px-3 text-sm text-white hover:brightness-95"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────── Section F — Risk & Network ───────────────────────── */
export function RiskNetworkSection({ detail, colinks = [], onDisavow, onWhitelist }: RiskNetworkProps) {
    const [toast, setToast] = useState<string>("");
    const [showWL, setShowWL] = useState(false);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(""), 1600);
        return () => clearTimeout(t);
    }, [toast]);

    const { showReasons, moreCount } = useMemo(() => {
        const arr = detail.ip_risk_reasons || [];
        return { showReasons: arr.slice(0, 3), moreCount: Math.max(0, arr.length - 3) };
    }, [detail.ip_risk_reasons]);

    return (
        <section id="risk" aria-labelledby="risk-title" className="scroll-mt-24">
            <div className="mb-3 flex items-end justify-between">
                <div>
                    <h3 id="risk-title" className="text-[15px] font-semibold text-[color:var(--wr-text,#111827)]">
                        Risk & Network
                    </h3>
                    <p className="text-xs text-[color:var(--wr-muted,#6B7280)]">Network identity, risk status, co-links & decisive actions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr]">
                {/* Left Column: Identity + Risk */}
                <div className="space-y-3">
                    {/* F1: Network Identity */}
                    <div className="rounded-xl border border-[color:var(--wr-border,#E5E7EB)] bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <NetworkIcon className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
                            <span className="text-sm font-semibold text-[color:var(--wr-text,#111827)]">Network</span>
                        </div>
                        <dl className="grid grid-cols-1 gap-3">
                            {/* IP */}
                            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                <div>
                                    <dt className="text-xs text-[color:var(--wr-muted,#6B7280)]">IP Address</dt>
                                    <dd className="font-mono text-[15px] text-[color:var(--wr-text,#111827)]">{detail.ip || "—"}</dd>
                                </div>
                                <div className="flex gap-1">
                                    {detail.ip && (
                                        <button
                                            onClick={() => copyToClipboard(detail.ip!, setToast)}
                                            className="h-9 w-9 rounded-lg border border-[color:var(--wr-borderLight,#EFF0F6)] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                                            aria-label={`Copy IP ${detail.ip}`}
                                        >
                                            <Copy className="mx-auto h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* ASN */}
                            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                <div>
                                    <dt className="text-xs text-[color:var(--wr-muted,#6B7280)]">ASN</dt>
                                    <dd className="text-[15px] text-[color:var(--wr-text,#111827)]">{detail.asn || "—"}</dd>
                                </div>
                                <div className="flex gap-1">
                                    {detail.asn && (
                                        <button
                                            onClick={() => copyToClipboard(detail.asn!, setToast)}
                                            className="h-9 w-9 rounded-lg border border-[color:var(--wr-borderLight,#EFF0F6)] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                                            aria-label={`Copy ASN ${detail.asn}`}
                                        >
                                            <Copy className="mx-auto h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Host */}
                            <div>
                                <dt className="text-xs text-[color:var(--wr-muted,#6B7280)]">Host (reverse/provider)</dt>
                                <dd className="truncate text-[15px] text-[color:var(--wr-text,#111827)]">{detail.host || "—"}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* F2: Risk Status & Reasons */}
                    <div
                        className={classNames(
                            "rounded-xl border bg-white p-4",
                            detail.ip_risk
                                ? "border-[color:var(--wr-border,#E5E7EB)]"
                                : "border-[color:var(--wr-border,#E5E7EB)]"
                        )}
                        style={detail.ip_risk ? { boxShadow: `inset 4px 0 0 ${TK.critical}` } : undefined}
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {detail.ip_risk ? (
                                    <ShieldAlert className="h-4 w-4 text-[color:var(--wr-critical,#EF4444)]" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4 text-[color:var(--wr-good,#10B981)]" />
                                )}
                                <span className="text-sm font-semibold text-[color:var(--wr-text,#111827)]">Risk Status</span>
                            </div>
                            <span
                                title={
                                    detail.ip_risk
                                        ? `Detected ${shortDate(detail.last_checked)}`
                                        : "No network risk flagged"
                                }
                                className={classNames(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                                    detail.ip_risk
                                        ? "border-[color:var(--wr-critical,#EF4444)] bg-[color:var(--wr-critical,#EF4444)]/10 text-[color:var(--wr-critical,#EF4444)]"
                                        : "border-[color:var(--wr-good,#10B981)] bg-[color:var(--wr-good,#10B981)]/10 text-[color:var(--wr-good,#10B981)]"
                                )}
                            >
                                {detail.ip_risk ? "Flagged" : "Safe"}
                            </span>
                        </div>

                        {detail.ip_risk ? (
                            <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--wr-text,#111827)]">
                                {showReasons.length === 0 && <li>Reason not specified</li>}
                                {showReasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                                {moreCount > 0 && <li className="text-[color:var(--wr-muted,#6B7280)]">+{moreCount} more</li>}
                            </ul>
                        ) : (
                            <p className="text-sm text-[color:var(--wr-muted,#6B7280)]">No suspicious network patterns detected.</p>
                        )}

                        <p className="mt-2 text-xs text-[color:var(--wr-muted,#6B7280)]">
                            Risk evaluates network patterns across recent crawls. It doesn’t judge page content.
                        </p>
                    </div>
                </div>

                {/* Right Column: Co‑links + CTAs */}
                <div className="flex flex-col gap-3">
                    {/* F3: Co‑links */}
                    <div className="rounded-xl border border-[color:var(--wr-border,#E5E7EB)] bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ListTree className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
                                <span className="text-sm font-semibold text-[color:var(--wr-text,#111827)]">Co‑links from same IP/ASN</span>
                            </div>
                        </div>

                        {colinks.length === 0 ? (
                            <p className="text-sm text-[color:var(--wr-muted,#6B7280)]">No suspicious co‑links found.</p>
                        ) : (
                            <ul className="space-y-2">
                                {colinks.slice(0, 3).map((c) => (
                                    <li key={c.domain}>
                                        <button
                                            onClick={() => {
                                                // In product: route to main table with filter: domain=c.domain
                                                window.alert(`Filter main table by domain: ${c.domain}`);
                                            }}
                                            className="group inline-flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-1 text-left hover:border-[color:var(--wr-border,#E5E7EB)] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                                            aria-label={`View domain ${c.domain}`}
                                        >
                                            <span className="truncate text-[color:var(--wr-brand,#1090D0)] underline-offset-2 group-hover:underline">
                                                {c.domain}
                                            </span>
                                            <div className="ml-2 flex items-center gap-2">
                                                {c.note && <span className="text-xs text-[color:var(--wr-muted,#6B7280)]">{c.note}</span>}
                                                <ChevronRight className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* F4: CTA Row */}
                    <div className="rounded-xl border border-[color:var(--wr-border,#E5E7EB)] bg-white p-3">
                        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                {detail.disavowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--wr-critical,#EF4444)] bg-[color:var(--wr-critical,#EF4444)]/10 px-2 py-0.5 text-xs text-[color:var(--wr-critical,#EF4444)]">
                                        <Shield className="h-3.5 w-3.5" /> Already disavowed
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    onClick={() => (onDisavow ? onDisavow(detail.domain) : window.alert(`Open Disavow Monitor for ${detail.domain}`))}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[color:var(--wr-critical,#EF4444)] px-3 text-sm text-[color:var(--wr-critical,#EF4444)] hover:bg-[color:var(--wr-critical,#EF4444)]/10"
                                >
                                    <Shield className="h-4 w-4" /> Disavow domain
                                </button>
                                <button
                                    onClick={() => setShowWL(true)}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[color:var(--wr-brand,#1090D0)] px-3 text-sm text-white hover:brightness-95"
                                >
                                    <Check className="h-4 w-4" /> Whitelist…
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-[71] rounded-lg border border-[color:var(--wr-border,#E5E7EB)] bg-white px-3 py-2 text-sm shadow-md">
                    {toast}
                </div>
            )}

            {/* Dialog */}
            <WhitelistDialog
                open={showWL}
                onClose={() => setShowWL(false)}
                domain={detail.domain}
                ip={detail.ip}
                asn={detail.asn}
                onConfirm={onWhitelist}
            />
        </section>
    );
}

/* ───────────────────────── Demo Canvas ───────────────────────── */
export default function RiskNetworkDemo() {
    const [detail, setDetail] = useState<LinkDetail>({
        link_id: "lnk_123",
        domain: "example.com",
        ip: "203.0.113.10",
        asn: "AS64500",
        host: "edge-203-0-113-10.isp.example",
        ip_risk: true,
        ip_risk_reasons: [
            "Known spam network",
            "High overlap with PBNs",
            "Multiple suspicious co‑links",
        ],
        last_checked: new Date(Date.now() - 2 * 86400000).toISOString(),
        disavowed: false,
    });

    const colinks: CoLink[] = useMemo(
        () => [
            { domain: "pbn-node.site", note: "High spam score" },
            { domain: "cheap-links.info", note: "Exact‑match anchors" },
            { domain: "spam-example.net" },
        ],
        []
    );

    return (
        <div className=" w-full  ">
            <div className="mx-auto  rounded-xl border border-[color:var(--wr-border,#E5E7EB)] bg-white p-4">
                {/* Demo Header (mock of drawer header context) */}
                <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-[color:var(--wr-borderLight,#EFF0F6)] bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                        <img
                            src="/favicon.ico"
                            alt="fav"
                            onError={(e: any) => { e.currentTarget.style.display = 'none' }}
                            className="h-4 w-4 rounded"
                        />
                        <a
                            href={`https://${detail.domain}`}
                            target="_blank"
                            className="font-medium text-[color:var(--wr-brand,#1090D0)] hover:underline"
                        >
                            {detail.domain}
                        </a>
                        <span className="text-[color:var(--wr-muted,#6B7280)]">/blog/post-a</span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[color:var(--wr-border,#E5E7EB)] px-2 py-0.5 text-xs text-[color:var(--wr-muted,#6B7280)]">
                            <Clock className="h-3.5 w-3.5" /> Last checked {shortDate(detail.last_checked)}
                        </span>
                    </div>
                </div>

                <RiskNetworkSection
                    detail={detail}
                    colinks={colinks}
                    onDisavow={(d) => alert(`Navigate to /disavow?domain=${d}`)}
                    onWhitelist={(p) => alert(`Whitelist → ${p.scope}: ${p.value}\nUntil: ${p.until || "(indef)"}\nReason: ${p.reason || ""}`)}
                />

                {/* Demo toggles */}
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <button
                        className="h-10 rounded-lg border border-[color:var(--wr-border,#E5E7EB)] bg-white px-3 text-sm hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                        onClick={() => setDetail((d) => ({ ...d, ip_risk: !d.ip_risk }))}
                    >
                        Toggle Risk ({detail.ip_risk ? "Now Safe" : "Now Flagged"})
                    </button>
                    <button
                        className="h-10 rounded-lg border border-[color:var(--wr-border,#E5E7EB)] bg-white px-3 text-sm hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                        onClick={() => setDetail((d) => ({ ...d, disavowed: !d.disavowed }))}
                    >
                        Toggle Disavowed ({detail.disavowed ? "Off" : "On"})
                    </button>
                </div>
            </div>
        </div>
    );
}



