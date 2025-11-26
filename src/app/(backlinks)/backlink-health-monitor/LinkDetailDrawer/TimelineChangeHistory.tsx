"use client";
import React from "react";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BadgeCheck,
    CheckCircle2,
    Copy,
    ExternalLink,
    Flag,
    Globe2,
    MinusCircle,
    Shield,
    ShieldAlert,
    SquareEqual,
    TextCursorInput,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

/* --------------------------------------------------------------------------
   Wranker Tokens (light mode defaults)
----------------------------------------------------------------------------*/
const TK = {
    brand: "#1090D0",
    text: "#111827",
    muted: "#6B7280",
    surface: "#FFFFFF",
    appbg: "#F5F7FA",
    border: "#E5E7EB",
    borderLight: "#EFF0F6",
    ok: "#10B981",
    warn: "#F59E0B",
    danger: "#EF4444",
};

/* --------------------------------------------------------------------------
   Types — aligns with LinkDetail.events spec from the design
----------------------------------------------------------------------------*/
export type TimelineSeg = "all" | "status" | "type" | "anchor" | "scores" | "network";
export type EventType =
    | "check"
    | "status_change"
    | "type_change"
    | "anchor_change"
    | "wr_drop"
    | "wr_rise"
    | "wr_change"
    | "spam_change"
    | "ip_flag"
    | "ip_clear"
    | "first_seen";

export interface TimelineEvent {
    t: string; // ISO
    type: EventType;
    data?: Record<string, any>;
}

export interface TimelineProps {
    events: TimelineEvent[];
    /** Optional domain/status/type to enrich some labels for 'check' entries */
    context?: {
        status?: string;
        link_type?: string;
    };
    /** Handler to jump to other sections (#context | #trends | #risk) */
    onJump?: (anchor: "#context" | "#trends" | "#risk") => void;
}

/* --------------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------------*/
const SEG_MAP: Record<TimelineSeg, EventType[]> = {
    all: [
        "check",
        "status_change",
        "type_change",
        "anchor_change",
        "wr_drop",
        "wr_rise",
        "wr_change",
        "spam_change",
        "ip_flag",
        "ip_clear",
        "first_seen",
    ],
    status: ["check", "status_change"],
    type: ["type_change"],
    anchor: ["anchor_change"],
    scores: ["wr_drop", "wr_rise", "wr_change", "spam_change"],
    network: ["ip_flag", "ip_clear"],
};

function shortDate(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    // Absolute MMM D, YYYY (deterministic)
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function titleCase(s?: string) {
    if (!s) return "";
    return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusLabel(s?: string) {
    const map: Record<string, string> = {
        active: "Active",
        removed: "Removed",
        broken: "Broken (404)",
        redirected: "Redirected",
        not_found: "Not Found",
        not_checked: "Not Checked",
    };
    return s ? map[s] ?? titleCase(s) : "—";
}

function typeLabel(s?: string) {
    const map: Record<string, string> = {
        dofollow: "Dofollow",
        nofollow: "Nofollow",
        sponsored: "Sponsored",
        ugc: "UGC",
    };
    return s ? map[s] ?? titleCase(s) : "—";
}

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function copyJSON(obj: unknown) {
    const text = JSON.stringify(obj, null, 2);
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text);
}

/* --------------------------------------------------------------------------
   Event label builder
----------------------------------------------------------------------------*/
function buildEventLabel(ev: TimelineEvent, ctx?: TimelineProps["context"]) {
    const t = shortDate(ev.t);
    const iso = ev.t;
    const d = ev.data || {};

    switch (ev.type) {
        case "check": {
            const st = statusLabel(d.status ?? ctx?.status);
            const lt = typeLabel(d.link_type ?? ctx?.link_type);
            return {
                title: `${t} — Checked: Link ${st}${lt ? ` (${lt})` : ""}`,
                icon: <CheckCircle2 size={16} color={TK.ok} aria-hidden />,
                node: "neutral" as const,
                tooltip: `${iso}`,
                meta: d.http ? String(d.http) : undefined,
                jump: "#context" as const,
            };
        }
        case "status_change": {
            return {
                title: `${t} — Status changed: ${statusLabel(d.from)} → ${statusLabel(d.to)}`,
                // NOTE: icon is rendered contextually in <EventRow/> for color control
                icon: null,
                node: ["removed", "broken", "not_found"].includes(String(d.to))
                    ? ("critical" as const)
                    : ("warning" as const),
                tooltip: `${iso}`,
                meta: d.last_seen ? `Last seen: ${shortDate(d.last_seen)}` : undefined,
                jump: "#context" as const,
            };
        }
        case "type_change": {
            const downgraded = weight(d.to) < weight(d.from);
            return {
                title: `${t} — Type changed: ${typeLabel(d.from)} → ${typeLabel(d.to)}`,
                icon: downgraded ? (
                    <ArrowDownRight size={16} color={TK.warn} aria-hidden />
                ) : (
                    <ArrowUpRight size={16} color={TK.ok} aria-hidden />
                ),
                node: downgraded ? ("warning" as const) : ("neutral" as const),
                tooltip: `${iso}`,
                meta: d.note as string | undefined,
                jump: "#context" as const,
            };
        }
        case "anchor_change": {
            const from = d.from ?? "";
            const to = d.to ?? "";
            const removed = !to;
            return {
                title: removed
                    ? `${t} — Anchor removed`
                    : `${t} — Anchor changed: “${from}” → “${to}”`,
                icon: removed ? (
                    <MinusCircle size={16} color={TK.warn} aria-hidden />
                ) : (
                    <TextCursorInput size={16} color={TK.warn} aria-hidden />
                ),
                node: "warning" as const,
                tooltip: `${iso}`,
                meta: removed ? (d.last_seen ? `Last seen: ${shortDate(d.last_seen)}` : undefined) : undefined,
                jump: "#context" as const,
            };
        }
        case "wr_drop": {
            return {
                title: `${t} — WR drop: ${d.from} → ${d.to} (${Number(d.to) - Number(d.from)})`,
                icon: <TrendingDown size={16} color={TK.danger} aria-hidden />,
                node: Number(d.to) - Number(d.from) <= -20 ? ("critical" as const) : ("warning" as const),
                tooltip: `${iso}`,
                meta: "Based on last successful checks",
                jump: "#trends" as const,
            };
        }
        case "wr_rise": {
            return {
                title: `${t} — WR rise: ${d.from} → ${d.to} (+${Number(d.to) - Number(d.from)})`,
                icon: <TrendingUp size={16} color={TK.ok} aria-hidden />,
                node: "neutral" as const,
                tooltip: `${iso}`,
                meta: "Based on last successful checks",
                jump: "#trends" as const,
            };
        }
        case "wr_change": {
            const delta = Number(d.to) - Number(d.from);
            const up = delta > 0;
            return {
                title: `${t} — WR ${up ? "rise" : "drop"}: ${d.from} → ${d.to} (${delta > 0 ? "+" : ""}${delta})`,
                icon: up ? (
                    <TrendingUp size={16} color={TK.ok} aria-hidden />
                ) : (
                    <TrendingDown size={16} color={TK.danger} aria-hidden />
                ),
                node: up ? ("neutral" as const) : (Math.abs(delta) >= 20 ? ("critical" as const) : ("warning" as const)),
                tooltip: `${iso}`,
                meta: "Based on last successful checks",
                jump: "#trends" as const,
            };
        }
        case "spam_change": {
            const delta = Number(d.to) - Number(d.from);
            const sev = Number(d.to) >= 61 ? "critical" : Number(d.to) > 40 ? "warning" : "neutral";
            return {
                title: `${t} — Spam score: ${d.from} → ${d.to} (${delta > 0 ? "+" : ""}${delta})`,
                icon: <AlertTriangle size={16} color={sev === "critical" ? TK.danger : sev === "warning" ? TK.warn : TK.muted} aria-hidden />,
                node: sev as "critical" | "warning" | "neutral",
                tooltip: `${iso}`,
                meta: Number(d.to) > 40 ? "Level: High (> 40)" : undefined,
                jump: "#trends" as const,
            };
        }
        case "ip_flag": {
            return {
                title: `${t} — Network flagged: ${d.asn ?? "Unknown ASN"}`,
                icon: <ShieldAlert size={16} color={TK.danger} aria-hidden />,
                node: "critical" as const,
                tooltip: `${iso}`,
                meta: d.ip ? `IP: ${d.ip}` : undefined,
                jump: "#risk" as const,
            };
        }
        case "ip_clear": {
            return {
                title: `${t} — Network cleared`,
                icon: <Shield size={16} color={TK.ok} aria-hidden />,
                node: "neutral" as const,
                tooltip: `${iso}`,
                meta: "Now considered safe",
                jump: "#risk" as const,
            };
        }
        case "first_seen": {
            return {
                title: `${t} — First seen`,
                icon: <Flag size={16} color={TK.brand} aria-hidden />,
                node: "neutral" as const,
                tooltip: `${iso}`,
                meta: undefined,
                jump: "#context" as const,
            };
        }
        default:
            return { title: `${t} — ${titleCase(ev.type)}`, icon: null, node: "neutral" as const, tooltip: `${iso}`, meta: undefined, jump: "#context" as const };
    }
}

function weight(t?: string) {
    const w: Record<string, number> = { dofollow: 3, nofollow: 2, sponsored: 1, ugc: 1 };
    return t ? w[t] ?? 0 : 0;
}

/* --------------------------------------------------------------------------
   Segmented control (filters)
----------------------------------------------------------------------------*/
const Segments: { key: TimelineSeg; label: string }[] = [
    { key: "all", label: "All" },
    { key: "status", label: "Status" },
    { key: "type", label: "Type" },
    { key: "anchor", label: "Anchor" },
    { key: "scores", label: "Scores" },
    { key: "network", label: "Network" },
];

/* --------------------------------------------------------------------------
   Timeline Component
----------------------------------------------------------------------------*/
export function TimelineSection({ events, context, onJump }: TimelineProps) {
    const [seg, setSeg] = React.useState<TimelineSeg>("all");

    const filtered = React.useMemo(() => {
        const allow = new Set(SEG_MAP[seg]);
        return [...events]
            .filter((e) => allow.has(e.type))
            .sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
    }, [events, seg]);

    return (
        <section id="timeline" aria-labelledby="timeline-title" className="w-full">
            <div className="flex items-end justify-between mb-3">
                <div>
                    <h3 id="timeline-title" className="text-[15px] font-semibold text-[#111827]">Change History</h3>
                    <p className="text-[12.5px] text-[#6B7280]">Newest first</p>
                </div>
                {/* sticky area could pin this; for demo we keep simple */}
            </div>

            {/* Segmented control */}
            <div role="tablist" aria-label="Timeline filters" className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b" style={{ borderColor: TK.borderLight }}>
                <div className="flex gap-1 p-1">
                    {Segments.map(({ key, label }) => (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={seg === key}
                            onClick={() => setSeg(key)}
                            className={cx(
                                "px-3 py-1.5 rounded-md text-sm",
                                seg === key
                                    ? "bg-[var(--seg-act,bg)] text-[#111827] shadow-sm"
                                    : "text-[#6B7280] hover:bg-[#F5F7FA]"
                            )}
                            style={seg === key ? ({
                                backgroundColor: TK.appbg,
                                border: `1px solid ${TK.borderLight}`,
                            } as React.CSSProperties) : undefined}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <ul role="list" aria-live="polite" className="mt-3">
                {filtered.map((ev, idx) => (
                    <EventRow key={idx} ev={ev} context={context} onJump={onJump} />
                ))}
                {filtered.length === 0 && (
                    <li className="text-center text-sm text-[#6B7280] py-6 border rounded-md" style={{ borderColor: TK.border }}>
                        No events in this category.
                    </li>
                )}
            </ul>
        </section>
    );
}

function EventRow({ ev, context, onJump }: { ev: TimelineEvent; context?: TimelineProps["context"]; onJump?: TimelineProps["onJump"]; }) {
    const ref = React.useRef<HTMLLIElement>(null);
    const built = buildEventLabel(ev, context);

    // Node color
    const nodeColor = built.node === "critical" ? TK.danger : built.node === "warning" ? TK.warn : TK.muted;

    const handleCopy = () => {
        copyJSON({ t: ev.t, type: ev.type, data: ev.data ?? {} });
    };

    const IconEl = () => {
        if (ev.type === "status_change") {
            const to = (ev.data?.to ?? "") as string;
            const red = ["removed", "broken", "not_found"].includes(to);
            return red ? (
                <SquareEqual size={16} color={TK.danger} aria-hidden />
            ) : (
                <BadgeCheck size={16} color={TK.warn} aria-hidden />
            );
        }
        return <>{built.icon}</>;
    };

    return (
        <li ref={ref} role="listitem" className="relative pl-8 py-3">
            {/* Rail */}
            <div className="absolute left-3 top-0 bottom-0 w-px" style={{ backgroundColor: TK.border }} />
            {/* Node */}
            <div className="absolute left-2 top-4 h-3 w-3 rounded-full" style={{ backgroundColor: nodeColor }} />

            <div
                className="bg-white border rounded-lg p-3 hover:shadow-sm focus-within:ring-2"
                style={{ borderColor: TK.border }}
            >
                <div className="flex items-center gap-2" title={built.tooltip}>
                    <IconEl />
                    <div className="text-[14.5px] font-semibold text-[#111827]">{built.title}</div>
                </div>
                {built.meta && (
                    <div className="mt-1 text-[12.5px] text-[#6B7280] tabular-nums">{built.meta}</div>
                )}
                <div className="mt-2 flex gap-2">
                    <button
                        onClick={() => onJump?.(built.jump)}
                        className="text-[13px] text-[#1090D0] hover:underline inline-flex items-center gap-1"
                        aria-label="View evidence"
                    >
                        <ExternalLink size={14} /> View evidence
                    </button>
                    <button
                        onClick={handleCopy}
                        className="text-[13px] text-[#6B7280] hover:text-[#111827] inline-flex items-center gap-1"
                        aria-label="Copy event JSON"
                        title="Copy event JSON"
                    >
                        <Copy size={14} /> Copy
                    </button>
                </div>
            </div>
        </li>
    );
}

/* --------------------------------------------------------------------------
   Demo Canvas — self-contained showcase with mock data (TEST CASES)
   - We preserve original cases and add more to cover all segments and edges
----------------------------------------------------------------------------*/
export default function TimelineDemoCanvas() {
    const mock: TimelineEvent[] = [
        // ORIGINAL CASES (kept as-is)
        { t: "2025-08-08T04:15:00Z", type: "check", data: { status: "active", link_type: "nofollow", http: "200 → 301 → 200 (HEAD+GET)" } },
        { t: "2025-08-01T03:22:10Z", type: "type_change", data: { from: "dofollow", to: "nofollow", note: "rel attribute changed" } },
        { t: "2025-07-30T02:12:00Z", type: "wr_drop", data: { from: 90, to: 78 } },
        { t: "2025-07-15T00:40:00Z", type: "anchor_change", data: { from: "best seo tools", to: "seo tools" } },
        { t: "2025-07-10T06:10:00Z", type: "spam_change", data: { from: 52, to: 66 } },
        { t: "2025-07-05T09:05:00Z", type: "ip_flag", data: { ip: "203.0.113.10", asn: "AS64500" } },
        { t: "2025-06-22T10:00:00Z", type: "check", data: { status: "active", link_type: "dofollow", http: "200 (GET)" } },
        { t: "2025-06-01T10:00:00Z", type: "first_seen" },

        // ADDITIONAL TEST CASES
        // Status change (Active -> Removed) — critical
        { t: "2025-08-09T07:30:00Z", type: "status_change", data: { from: "active", to: "removed", last_seen: "2025-08-08T04:15:00Z" } },
        // WR rise
        { t: "2025-07-22T12:00:00Z", type: "wr_rise", data: { from: 70, to: 74 } },
        // Anchor removed
        { t: "2025-07-18T11:45:00Z", type: "anchor_change", data: { from: "seo tools", to: "", last_seen: "2025-07-15T00:40:00Z" } },
        // Spam decrease back to safe
        { t: "2025-07-12T08:10:00Z", type: "spam_change", data: { from: 66, to: 18 } },
        // Network cleared
        { t: "2025-07-20T15:00:00Z", type: "ip_clear", data: {} },
    ];

    // DEV TESTS: quick assertions for filter coverage (non-blocking)
    try {
        const counts: Record<TimelineSeg, number> = {
            all: mock.length,
            status: mock.filter((e) => ["check", "status_change"].includes(e.type)).length,
            type: mock.filter((e) => e.type === "type_change").length,
            anchor: mock.filter((e) => e.type === "anchor_change").length,
            scores: mock.filter((e) => ["wr_drop", "wr_rise", "wr_change", "spam_change"].includes(e.type)).length,
            network: mock.filter((e) => ["ip_flag", "ip_clear"].includes(e.type)).length,
        } as any;
        // eslint-disable-next-line no-console
        console.log("[TimelineDemo TEST] counts", counts);
    } catch { }

    const handleJump = (anchor: "#context" | "#trends" | "#risk") => {
        const el = document.querySelector(anchor);
        if (el) {
            (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
            // brief highlight
            el.classList.add("ring-2");
            setTimeout(() => el.classList.remove("ring-2"), 700);
        }
    };

    return (
        <div className="w-full" >
            <div className=" mx-auto">

                <TimelineSection events={mock} context={{ status: "active", link_type: "nofollow" }} onJump={handleJump} />

            </div>
        </div>
    );
}