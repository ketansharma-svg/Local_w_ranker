// "use client";
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   AlertTriangle,
//   ArrowDownRight,
//   ChevronRight,
//   Edit3,
//   Link2Off,
//   Network,
//   TrendingDown,
// } from "lucide-react";

// /**
//  * Wranker • Section B — Issue Highlights
//  * - Drop‑in React/TSX component + self‑contained demo
//  * - TailwindCSS utility classes, lucide-react icons
//  * - A11y: buttons, aria-labels, keyboard focus, Enter/Space activates
//  * - No external UI deps; tooltips via native title attr
//  */

// // ---------------------------
// // Tokens (brand-aligned)
// // ---------------------------
// const TOKENS = {
//   brand: "#1090D0",
//   text: "#111827",
//   muted: "#6B7280",
//   border: "#E5E7EB",
//   borderLight: "#EFF0F6",
//   critical: "#EF4444",
//   warning: "#FB923C",
//   good: "#10B981",
//   chipBg: (hex: string, alpha = 0.1) => `color-mix(in oklab, ${hex} ${alpha * 100}%, white)`,
// };

// // ---------------------------
// // Types (subset of LinkDetail API)
// // ---------------------------
// export type LinkType = "dofollow" | "nofollow" | "sponsored" | "ugc";
// export type LinkStatus =
//   | "active"
//   | "removed"
//   | "broken"
//   | "redirected"
//   | "not_found"
//   | "not_checked";

// export interface LinkDetail {
//   link_id: string;
//   domain: string;
//   status: LinkStatus;
//   status_changed_at?: string;
//   health_state: "healthy" | "at_risk" | "toxic";
//   link_type: LinkType;
//   link_type_prev?: LinkType;
//   link_type_changed_at?: string;
//   wr?: number;
//   wr_prev?: number;
//   wr_changed_at?: string;
//   spam?: number;
//   spam_prev?: number;
//   spam_changed_at?: string;
//   ip_risk?: boolean;
//   ip?: string;
//   asn?: string;
//   ip_risk_reasons?: string[];
//   anchor_current?: string | null;
//   anchor_prev?: string | null;
//   anchor_changed_at?: string;
//   last_checked?: string;
// }

// // ---------------------------
// // Issue chip model & helpers
// // ---------------------------
// export type Severity = "critical" | "warning" | "info";
// export type IssueIconKey =
//   | "link-off"
//   | "arrow-down-right"
//   | "edit"
//   | "trending-down"
//   | "shield-alert"
//   | "alert-triangle";

// export interface IssueChip {
//   id:
//     | "lost"
//     | "type_dg"
//     | "anchor_chg"
//     | "wr_drop"
//     | "ip_toxic"
//     | "spam_high";
//   label: string;
//   qualifier?: string;
//   severity: Severity;
//   icon: IssueIconKey;
//   ts?: string; // ISO for sorting by recency
//   target: "#context" | "#trends" | "#risk";
//   tooltip?: string;
// }

// const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
// const titleCase = (s?: string) =>
//   s ? s.replace(/(^|[_\-\s])(\w)/g, (_, a, b) => (a ? a : "") + b.toUpperCase()) : "";

// const STATUS_LABEL: Record<LinkStatus, string> = {
//   active: "Active",
//   removed: "Removed",
//   broken: "Broken (404)",
//   redirected: "Redirected",
//   not_found: "Not Found",
//   not_checked: "Not Checked",
// };

// const typeWeight: Record<LinkType, number> = {
//   dofollow: 3,
//   nofollow: 2,
//   sponsored: 1,
//   ugc: 1,
// };
// const isDowngrade = (prev?: LinkType, curr?: LinkType) =>
//   prev && curr ? typeWeight[curr] < typeWeight[prev] : false;

// function shortDate(iso?: string) {
//   if (!iso) return "";
//   const d = new Date(iso);
//   return d.toLocaleDateString(undefined, {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// function formatNetworkTooltip(detail: LinkDetail) {
//   const lines: string[] = [];
//   if (detail.ip) lines.push(`IP: ${detail.ip}`);
//   if (detail.asn) lines.push(`ASN: ${detail.asn}`);
//   if (detail.ip_risk_reasons?.length) {
//     lines.push("Reasons:");
//     for (const r of detail.ip_risk_reasons.slice(0, 3)) lines.push(`• ${r}`);
//     const more = Math.max(0, (detail.ip_risk_reasons?.length || 0) - 3);
//     if (more) lines.push(`… +${more} more`);
//   }
//   return lines.join("\n");
// }

// function spamTooltip(detail: LinkDetail) {
//   const { spam, spam_prev, spam_changed_at } = detail;
//   const prev = isNum(spam_prev) ? spam_prev : "—";
//   const curr = isNum(spam) ? spam : "—";
//   const delta = isNum(spam) && isNum(spam_prev) ? spam - spam_prev : undefined;
//   const deltaTxt = isNum(delta) && delta !== 0 ? `Δ ${delta > 0 ? "+" : ""}${delta}` : "Δ 0";
//   const dt = shortDate(spam_changed_at);
//   return `Prev: ${prev} · ${deltaTxt}${dt ? ` · ${dt}` : ""}`;
// }

// function sortIssues(list: IssueChip[]) {
//   const sevRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
//   return [...list].sort((a, b) => {
//     const sa = sevRank[a.severity];
//     const sb = sevRank[b.severity];
//     if (sa !== sb) return sa - sb;
//     const ta = a.ts ? new Date(a.ts).getTime() : 0;
//     const tb = b.ts ? new Date(b.ts).getTime() : 0;
//     return tb - ta; // recent first
//   });
// }

// function computeIssueChips(detail?: LinkDetail): IssueChip[] {
//   if (!detail) return [];
//   const issues: IssueChip[] = [];

//   // 3.1 Lost link
//   if (["removed", "broken", "not_found"].includes(detail.status)) {
//     issues.push({
//       id: "lost",
//       label: "Lost link",
//       severity: "critical",
//       icon: "link-off",
//       ts: detail.status_changed_at || detail.last_checked,
//       target: "#context",
//       tooltip: `Status: ${STATUS_LABEL[detail.status]}\nDetected: ${shortDate(
//         detail.status_changed_at || detail.last_checked
//       )}\nClick to see evidence & last-seen copy.`,
//     });
//   }

//   // 3.2 Type downgraded
//   if (isDowngrade(detail.link_type_prev, detail.link_type)) {
//     issues.push({
//       id: "type_dg",
//       label: "Type downgraded",
//       qualifier: `${titleCase(detail.link_type_prev)} → ${titleCase(detail.link_type)}`,
//       severity: "warning",
//       icon: "arrow-down-right",
//       ts: detail.link_type_changed_at,
//       target: "#context",
//       tooltip: `Changed on ${shortDate(detail.link_type_changed_at)}.`,
//     });
//   }

//   // 3.3 Anchor changed/removed
//   if (detail.anchor_prev && detail.anchor_prev !== (detail.anchor_current || "")) {
//     const removed = !detail.anchor_current;
//     issues.push({
//       id: "anchor_chg",
//       label: removed ? "Anchor removed" : "Anchor changed",
//       severity: "info",
//       icon: "edit",
//       ts: detail.anchor_changed_at,
//       target: "#context",
//       tooltip: removed
//         ? `Removed on ${shortDate(detail.anchor_changed_at)}`
//         : `Old: "${detail.anchor_prev}"\nNew: "${detail.anchor_current}"\nDetected: ${shortDate(
//             detail.anchor_changed_at
//           )}`,
//     });
//   }

//   // 3.4 WR drop ≥ 10
//   if (isNum(detail.wr) && isNum(detail.wr_prev) && detail.wr - detail.wr_prev <= -10) {
//     const d = detail.wr - detail.wr_prev; // negative
//     issues.push({
//       id: "wr_drop",
//       label: "WR drop",
//       qualifier: String(d),
//       severity: d <= -20 ? "critical" : "warning",
//       icon: "trending-down",
//       ts: detail.wr_changed_at,
//       target: "#trends",
//       tooltip: `${detail.wr_prev} → ${detail.wr} (last checks)`,
//     });
//   }

//   // 3.5 Toxic IP/ASN
//   if (detail.ip_risk) {
//     issues.push({
//       id: "ip_toxic",
//       label: "Toxic IP/ASN",
//       qualifier: detail.asn,
//       severity: "critical",
//       icon: "shield-alert",
//       ts: detail.last_checked,
//       target: "#risk",
//       tooltip: formatNetworkTooltip(detail),
//     });
//   }

//   // 3.6 Spam high (> 40)
//   if (isNum(detail.spam) && detail.spam > 40) {
//     const sev: Severity = detail.spam >= 61 ? "critical" : "warning";
//     issues.push({
//       id: "spam_high",
//       label: "Spam high",
//       qualifier: String(detail.spam),
//       severity: sev,
//       icon: "alert-triangle",
//       ts: detail.spam_changed_at,
//       target: "#trends",
//       tooltip: spamTooltip(detail),
//     });
//   }

//   return sortIssues(issues);
// }

// // ---------------------------
// // Chip UI
// // ---------------------------
// function classNames(...xs: Array<string | false | null | undefined>) {
//   return xs.filter(Boolean).join(" ");
// }

// function Chip({
//   issue,
//   onClick,
// }: {
//   issue: IssueChip;
//   onClick?: (target: IssueChip["target"], issue: IssueChip) => void;
// }) {
//   const { severity, label, qualifier, icon, tooltip } = issue;

//   const tone = useMemo(() => {
//     if (severity === "critical")
//       return {
//         border: "border-[rgba(239,68,68,0.45)]",
//         text: "text-[\#EF4444]",
//         bg: "bg-[rgba(239,68,68,0.10)]",
//         ico: TOKENS.critical,
//       };
//     if (severity === "warning")
//       return {
//         border: "border-[rgba(251,146,60,0.45)]",
//         text: "text-[\#FB923C]",
//         bg: "bg-[rgba(251,146,60,0.10)]",
//         ico: TOKENS.warning,
//       };
//     return {
//       border: "border-[rgba(245,158,11,0.40)]",
//       text: "text-[\#F59E0B]",
//       bg: "bg-[rgba(245,158,11,0.10)]",
//       ico: TOKENS.warning,
//     };
//   }, [severity]);

//   const Icon = useMemo(() => {
//     switch (icon) {
//       case "link-off":
//         return Link2Off;
//       case "arrow-down-right":
//         return ArrowDownRight;
//       case "edit":
//         return Edit3;
//       case "trending-down":
//         return TrendingDown;
//       case "shield-alert":
//         return Network; // visually close to ShieldAlert but simpler outline
//       case "alert-triangle":
//         return AlertTriangle;
//       default:
//         return AlertTriangle;
//     }
//   }, [icon]);

//   return (
//     <button
//       type="button"
//       onClick={() => onClick?.(issue.target, issue)}
//       className={classNames(
//         "group inline-flex items-center w-full sm:w-auto justify-between gap-2 rounded-full px-3 py-1.5 text-[13px]",
//         "border transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1090D0]",
//         tone.bg,
//         tone.text,
//         tone.border
//       )}
//       title={tooltip}
//       aria-label={`${label}${qualifier ? ", " + qualifier : ""}. Open ${
//         issue.target === "#context"
//           ? "Link Evidence & Context"
//           : issue.target === "#trends"
//           ? "Metrics Trends"
//           : "Risk & Network"
//       }`}
//     >
//       <span className="inline-flex items-center gap-2">
//         <Icon size={16} strokeWidth={2} color={tone.ico} />
//         <span className="font-medium">{label}</span>
//         {qualifier ? (
//           <span className="truncate max-w-[180px] font-normal opacity-90">{qualifier}</span>
//         ) : null}
//       </span>
//       <ChevronRight size={16} className="opacity-70 group-hover:opacity-100" />
//     </button>
//   );
// }

// // ---------------------------
// // Main Section Component
// // ---------------------------
// export function IssueHighlightsSection({
//   detail,
//   onNavigate,
// }: {
//   detail?: LinkDetail; // safe optional
//   onNavigate?: (target: IssueChip["target"], issue: IssueChip) => void;
// }) {
//   const chips = useMemo(() => computeIssueChips(detail), [detail]);
//   if (!chips.length) return null; // Hidden when none

//   const handleClick = (target: IssueChip["target"], issue: IssueChip) => {
//     // Default: smooth scroll to section id; also expose callback
//     try {
//       const el = document.querySelector(target) as HTMLElement | null;
//       if (el) {
//         el.scrollIntoView({ behavior: "smooth", block: "start" });
//         // brief focus for a11y
//         setTimeout(() => {
//           el.tabIndex = -1;
//           el.focus({ preventScroll: true });
//           // optional subtle highlight
//           el.classList.add("ring-2", "ring-[#1090D0]", "ring-offset-2");
//           setTimeout(() => el.classList.remove("ring-2", "ring-[#1090D0]", "ring-offset-2"), 700);
//         }, 300);
//       }
//     } catch {}
//     onNavigate?.(target, issue);
//   };

//   return (
//     <section aria-labelledby="issue-highlights" className="w-full">
//       <h3
//         id="issue-highlights"
//         className="text-[15px] font-semibold text-[#111827] mb-2"
//       >
//         Issue Highlights
//       </h3>
//       <div className="flex flex-col gap-2">
//         {chips.map((c) => (
//           <Chip key={c.id} issue={c} onClick={handleClick} />
//         ))}
//       </div>
//     </section>
//   );
// }

// // ---------------------------
// // Demo Harness (default export)
// // ---------------------------
// export default function IssueHighlightsDemo() {
//   const [variant, setVariant] = useState<"none" | "some" | "critical">("some");

//   const base: LinkDetail = {
//     link_id: "link_123",
//     domain: "example.com",
//     status: "active",
//     health_state: "at_risk",
//     link_type: "nofollow",
//     link_type_prev: "dofollow",
//     link_type_changed_at: "2025-07-30T03:10:00Z",
//     wr: 78,
//     wr_prev: 90,
//     wr_changed_at: "2025-07-30T03:10:00Z",
//     spam: 66,
//     spam_prev: 52,
//     spam_changed_at: "2025-07-30T03:10:00Z",
//     ip_risk: true,
//     ip: "203.0.113.10",
//     asn: "AS64500",
//     ip_risk_reasons: ["Known spam network", "High overlap with PBNs", "Disposable hosting"],
//     anchor_current: "seo tools",
//     anchor_prev: "best seo tools",
//     anchor_changed_at: "2025-06-29T12:00:00Z",
//     last_checked: "2025-08-08T04:15:00Z",
//   };

//   const data = useMemo<LinkDetail>(() => {
//     if (variant === "none") {
//       return { ...base, status: "active", ip_risk: false, spam: 18, wr: 90, wr_prev: 90 };
//     }
//     if (variant === "critical") {
//       return {
//         ...base,
//         status: "broken",
//         status_changed_at: "2025-08-08T04:15:00Z",
//         wr: 54,
//         wr_prev: 80,
//         spam: 72,
//         anchor_current: null,
//       };
//     }
//     return base; // "some"
//   }, [variant]);

//   return (
//     <div className=" text-[#111827]">
//       <div className=" mx-auto">


//         {/* Card container simulating the drawer body */}
//         <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5 shadow-sm">
//           <IssueHighlightsSection detail={data} />
//         </div>


//       </div>
//     </div>
//   );
// }





"use client";

import * as React from "react";
import {
  X,
  RefreshCw,
  ClipboardList,
  FlagTriangleRight,
  Shield,
  ExternalLink,
  Activity,
  ShieldAlert,
  Network as NetworkIcon,
  Clock,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Link2Off,
  ArrowDownRight,
  Edit3,
  Globe2,
  TextCursorInput,
  LayoutPanelLeft,
  Newspaper,
  GitCommit,
  MoveRight,
  AlertTriangle,
  Copy,
  FileText,
  BadgeCheck,
  MinusCircle,
  SquareEqual,
  ArrowUpRight,
  ShieldCheck,
  ListTree,
  ChevronRight,
  Check,
  Eye,
  Server,
  Link2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

/* ────────────────────────────────────────────────────────────────────────────
   Design Tokens (latest / unified)
   ──────────────────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  brandHover: "#007DB8",
  brandIcon: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  bg: "#FFFFFF",
  appBg: "#F5F7FA",
  success: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  accent: "#FB923C",
  pastelBrand: "#D2EFFF",
  radius: 12,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */
export type LinkStatus =
  | "active"
  | "removed"
  | "broken"
  | "redirected"
  | "not_found"
  | "not_checked";
export type HealthState = "healthy" | "at_risk" | "toxic";
export type LinkType = "dofollow" | "nofollow" | "sponsored" | "ugc";

export type MetricPoint = { t: string; v: number };

export type LinkDetailFull = {
  link_id: string;
  domain: string;
  favicon_url?: string;
  source_url?: string;
  status: LinkStatus;
  status_changed_at?: string;
  health_state: HealthState;
  health_reason?: string;
  link_type: LinkType;
  link_type_prev?: LinkType;
  link_type_changed_at?: string;
  disavowed?: boolean;

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

  target_url?: string;
  anchor_current?: string | null;
  anchor_prev?: string | null;
  anchor_changed_at?: string | null;
  location?: "in_content" | "sidebar" | "footer" | "navigation" | "unknown";
  http_chain?: { code: string; url?: string; at?: string }[];

  host?: string;
  events?: TimelineEvent[];
};

export type RelatedLink = {
  id?: string;
  path: string;
  source_url?: string;
  status: LinkStatus;
  type: LinkType;
  wr: number;
  last_checked?: string;
  type_prev?: LinkType;
  type_changed_at?: string;
  wr_prev?: number;
};

/* ────────────────────────────────────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────────────────────────────────────── */
function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n?: number) => (Number.isFinite(n as number) ? Math.round(n as number) : null);
function delta(curr?: number | null, prev?: number | null) {
  if (curr == null || prev == null) return { d: 0, dir: "flat" as const };
  const d = Math.round(curr - prev);
  return { d, dir: d > 0 ? "up" : d < 0 ? "down" : ("flat" as const) };
}
const spamLevel = (v?: number) => (v == null ? "—" : v <= 20 ? "Low" : v <= 40 ? "Medium" : "High");
const spamColor = (v?: number) => (v == null ? TK.muted : v <= 20 ? TK.success : v <= 40 ? TK.warn : TK.critical);
const fmtShort = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
};
function isoToReadable(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
const daysSince = (iso?: string | null) => {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
};
export function truncateMiddle(str: string, start = 24, end = 18) {
  if (!str) return "";
  return str.length <= start + end ? str : `${str.slice(0, start)}…${str.slice(-end)}`;
}
function extractPath(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path || "/";
  } catch {
    return url;
  }
}
const STATUS_LABEL: Record<LinkStatus, string> = {
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
const typeWeight: Record<LinkType, number> = { dofollow: 3, nofollow: 2, sponsored: 1, ugc: 1 };
const isDowngrade = (prev?: LinkType, curr?: LinkType) => (prev && curr ? typeWeight[curr] < typeWeight[prev] : false);

/* ────────────────────────────────────────────────────────────────────────────
   UI Primitives — Buttons, Badges, Tooltip/Popover, Donut
   ──────────────────────────────────────────────────────────────────────────── */
function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus-visible:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 select-none";
  const sizes =
    {
      sm: "h-8 px-2.5 text-[13px]",
      md: "h-9 px-3 text-sm",
      lg: "h-10 px-4 text-[15px]",
    }[size] || "h-9 px-3 text-sm";

  const variantClasses =
    {
      primary: "hover:brightness-95",
      outline: "border hover:bg-sky-50",
      danger: "border hover:bg-red-50",
      ghost: "hover:bg-black/5",
    }[variant] || "hover:brightness-95";

  // Inline styles to ensure colors are visible regardless of Tailwind JIT
  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? { backgroundColor: TK.brand, color: "#FFFFFF", borderColor: "transparent" }
      : variant === "outline"
      ? { backgroundColor: "#FFFFFF", color: TK.brand, borderColor: TK.brand }
      : variant === "danger"
      ? { backgroundColor: "#FFFFFF", color: TK.critical, borderColor: TK.critical }
      : { color: TK.text };

  return (
    <button
      className={cx(base, sizes, variantClasses, className)}
      style={{ ...variantStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

const badgeToneMap: Record<
  | "status:active"
  | "status:removed"
  | "status:broken"
  | "status:redirected"
  | "status:not_found"
  | "status:not_checked"
  | "health:healthy"
  | "health:at_risk"
  | "health:toxic"
  | "type:default"
  | "type:changed",
  { bg: string; fg: string; brd: string }
> = {
  "status:active": { bg: "rgba(16,185,129,.14)", fg: TK.success, brd: "rgba(16,185,129,.35)" },
  "status:removed": { bg: "rgba(239,68,68,.14)", fg: TK.critical, brd: "rgba(239,68,68,.35)" },
  "status:broken": { bg: "rgba(239,68,68,.14)", fg: TK.critical, brd: "rgba(239,68,68,.35)" },
  "status:redirected": { bg: "rgba(251,146,60,.14)", fg: TK.accent, brd: "rgba(251,146,60,.35)" },
  "status:not_found": { bg: "rgba(239,68,68,.14)", fg: TK.critical, brd: "rgba(239,68,68,.35)" },
  "status:not_checked": { bg: "rgba(107,114,128,.14)", fg: TK.muted, brd: "rgba(107,114,128,.35)" },
  "health:healthy": { bg: "rgba(16,185,129,.14)", fg: TK.success, brd: "rgba(16,185,129,.35)" },
  "health:at_risk": { bg: "rgba(245,158,11,.14)", fg: TK.warn, brd: "rgba(245,158,11,.35)" },
  "health:toxic": { bg: "rgba(239,68,68,.14)", fg: TK.critical, brd: "rgba(239,68,68,.35)" },
  "type:default": { bg: "rgba(17,24,39,.06)", fg: TK.text, brd: "rgba(17,24,39,.08)" },
  "type:changed": { bg: "rgba(251,146,60,.14)", fg: TK.accent, brd: "rgba(251,146,60,.35)" },
};
function PillBadge({
  label,
  toneKey,
  pulse,
  ariaLabel,
  title,
}: {
  label: string;
  toneKey: keyof typeof badgeToneMap;
  pulse?: boolean;
  ariaLabel?: string;
  title?: string;
}) {
  const tone = badgeToneMap[toneKey];
  return (
    <span
      role="status"
      aria-label={ariaLabel || label}
      title={title}
      className={cx(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[12px] leading-5 rounded border",
        pulse && "animate-pulse"
      )}
      style={{ background: tone.bg, color: tone.fg, borderColor: tone.brd }}
    >
      <span className="tabular-nums">{label}</span>
    </span>
  );
}

/** Smart popover */
function SmartPopover({
  open,
  anchorX,
  anchorY,
  containerRef,
  children,
  preferAbove = false,
}: {
  open: boolean;
  anchorX: number;
  anchorY: number;
  containerRef: any;
  children: React.ReactNode;
  preferAbove?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ left: -9999, top: -9999 });
  React.useEffect(() => {
    if (!open || !containerRef.current || !ref.current) return;
    const cont = containerRef.current.getBoundingClientRect();
    const tip = ref.current.getBoundingClientRect();
    const left = Math.min(Math.max(anchorX - tip.width / 2, 8), cont.width - tip.width - 8);
    let top = anchorY + 12;
    if (preferAbove) top = anchorY - tip.height - 12;
    top = Math.min(Math.max(top, 8), cont.height - tip.height - 8);
    setPos({ left, top });
  }, [open, anchorX, anchorY, containerRef, preferAbove]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-md border bg-white p-3 text-xs shadow-lg"
      style={{
        left: pos.left,
        top: pos.top,
        borderColor: TK.border,
        color: TK.text,
        maxWidth: 320,
        pointerEvents: "none",
      }}
      role="dialog"
    >
      {children}
    </div>
  );
}

function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  const [p, setP] = React.useState({ x: 0, y: 0 });
  return (
    <span ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Info: ${label}`}
        onMouseEnter={(e) => {
          const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          setP({ x: e.clientX - r.left, y: 0 });
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={(e) => {
          const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          setP({ x: r.width - 16, y: 0 });
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
        title={typeof children === "string" ? (children as string) : undefined}
      >
        <Info size={16} color={TK.brandIcon} />
      </button>
      <SmartPopover open={open} anchorX={p.x} anchorY={p.y} containerRef={containerRef} preferAbove>
        <div className="text-[12px] leading-5">{children}</div>
      </SmartPopover>
    </span>
  );
}

function TinyDonut({ value, size = 28 }: { value: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp01(value / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={TK.border} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={TK.brand}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${c * v} ${c * (1 - v)}`}
      />
    </svg>
  );
}

function Favicon({ domain, src }: { domain: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={16}
        height={16}
        className="rounded"
        style={{ width: 16, height: 16 }}
      />
    );
  }
  const letter = (domain?.[0] || "?").toUpperCase();
  return (
    <span
      aria-hidden
      className="grid h-4 w-4 place-items-center rounded"
      style={{ background: "#F3F4F6", color: TK.muted }}
    >
      <span className="text-[10px] font-semibold">{letter}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Drawer Header (REFINED)
   - Added breadcrumb just above backlink URL (Top-left)
   - Re-Check Now CTA text visibility fixed
   ──────────────────────────────────────────────────────────────────────────── */
function DrawerHeader({
  data,
  onClose,
  onRecheck,
  onCreateTask,
  onFlag,
  onOpenDisavow,
}: {
  data: LinkDetailFull;
  onClose: () => void;
  onRecheck?: (linkId: string) => Promise<void> | void;
  onCreateTask?: (payload: { linkId: string; domain: string; sourceUrl?: string }) => void;
  onFlag?: (linkId: string) => void;
  onOpenDisavow?: (domain: string) => void;
}) {
  const [pending, setPending] = React.useState(false);
  const pathFull = extractPath(data.source_url);
  const pathShort = truncateMiddle(pathFull);

  const statusMap: Record<LinkStatus, { label: string; tone: keyof typeof badgeToneMap }> = {
    active: { label: "Active", tone: "status:active" },
    removed: { label: "Removed", tone: "status:removed" },
    broken: { label: "Broken (404)", tone: "status:broken" },
    redirected: { label: "Redirected", tone: "status:redirected" },
    not_found: { label: "Not Found", tone: "status:not_found" },
    not_checked: { label: "Not Checked", tone: "status:not_checked" },
  };
  const healthMap: Record<HealthState, { label: string; tone: keyof typeof badgeToneMap }> = {
    healthy: { label: "Healthy", tone: "health:healthy" },
    at_risk: { label: "At Risk", tone: "health:at_risk" },
    toxic: { label: "Toxic", tone: "health:toxic" },
  };
  const typeChanged = data.link_type_prev && data.link_type_prev !== data.link_type;
  const typeTone: keyof typeof badgeToneMap = typeChanged ? "type:changed" : "type:default";

  const recentStatusChange = React.useMemo(() => {
    if (!data.status_changed_at) return false;
    const changed = new Date(data.status_changed_at).getTime();
    return Date.now() - changed < 24 * 60 * 60 * 1000;
  }, [data.status_changed_at]);

  async function handleRecheck() {
    if (pending) return;
    try {
      setPending(true);
      await onRecheck?.(data.link_id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="group"
      aria-label="Backlink header"
      className="sticky top-0 z-[62] w-full border-b bg-white"
      style={{ borderColor: TK.borderLight }}
    >
      <div className="flex items-center gap-3 px-4 py-3 md:px-5" style={{ height: 68 }}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="-ml-1 grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Identity + breadcrumb + backlink URL */}
        <div className="min-w-0 flex-1">
          {/* Domain */}
          <div className="flex items-center gap-2 min-w-0">
            <Favicon domain={data.domain} src={data.favicon_url} />
            <a
              href={`https://${data.domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate text-[14px] font-semibold hover:underline"
              aria-label={`Open domain ${data.domain} in a new tab`}
              title={data.domain}
              style={{ color: TK.brand }}
            >
              {data.domain}
              <ExternalLink size={14} className="opacity-60" />
            </a>
            {data.disavowed && (
              <PillBadge
                label="Disavowed"
                toneKey="status:removed"
                ariaLabel="Disavowed domain"
                title="Domain is in Disavow list"
              />
            )}
          </div>

          {/* Breadcrumb — placed just above Backlink URL (top left) */}
          <div className="mt-1 flex items-center gap-1 text-[12px]">
            <Link2 size={14} color={TK.brandIcon} />
            <span style={{ color: TK.text }}>Backlinks</span>
            <ChevronRight size={14} color={TK.muted} />
            <span style={{ color: TK.text }}>Monitor</span>
            <ChevronRight size={14} color={TK.muted} />
            <span className="font-medium" style={{ color: TK.text }}>
              Backlink Detail
            </span>
          </div>

          {/* Backlink URL (path) */}
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open source URL in a new tab"
              className="block truncate text-[13px] hover:underline"
              title={data.source_url}
              style={{ color: TK.muted }}
            >
              {pathShort}
            </a>
          )}
        </div>

        {/* Badges */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <PillBadge
            label={statusMap[data.status].label}
            toneKey={statusMap[data.status].tone}
            pulse={recentStatusChange}
            ariaLabel={`Status: ${statusMap[data.status].label}`}
            title={`Last change: ${isoToReadable(data.status_changed_at)}${
              data.status_changed_at ? ` • ${data.status_changed_at}` : ""
            }`}
          />
          <PillBadge
            label={healthMap[data.health_state].label}
            toneKey={healthMap[data.health_state].tone}
            ariaLabel={`Health: ${healthMap[data.health_state].label}`}
            title={data.health_reason || ""}
          />
          <PillBadge
            label={typeChanged ? `${data.link_type.toUpperCase()} (changed)` : data.link_type.toUpperCase()}
            toneKey={typeTone}
            ariaLabel={`Link Type: ${data.link_type}`}
            title={
              typeChanged
                ? `Changed from ${data.link_type_prev?.toUpperCase()} on ${isoToReadable(
                    data.link_type_changed_at
                  )}${data.link_type_changed_at ? ` • ${data.link_type_changed_at}` : ""}`
                : ""
            }
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Re-Check Now — text visibility ensured (white on brand) */}
          <Button size="lg" onClick={handleRecheck} disabled={pending} className="min-w-[156px]">
            {pending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <RefreshCw size={16} color="#FFFFFF" />
            )}
            <span className="whitespace-nowrap">Re‑Check Now</span>
          </Button>

          <button
            onClick={() => onCreateTask?.({ linkId: data.link_id, domain: data.domain, sourceUrl: data.source_url })}
            className="grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline cursor-pointer"
            aria-label="Create Task"
            title="Create Task"
          >
            <ClipboardList size={18} color={TK.brandIcon} />
          </button>

          <button
            onClick={() => onFlag?.(data.link_id)}
            className="grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline cursor-pointer"
            aria-label="Flag for Review"
            title="Flag for Review"
          >
            <FlagTriangleRight size={18} color={TK.brandIcon} />
          </button>

          <button
            onClick={() => onOpenDisavow?.(data.domain)}
            className="grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline cursor-pointer"
            aria-label="Disavow"
            title={data.disavowed ? "Open Disavow Monitor (already added)" : "Open Disavow Monitor"}
          >
            <Shield size={18} color={TK.brandIcon} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: A — Summary Cards
   ──────────────────────────────────────────────────────────────────────────── */
function CardShell({
  title,
  tooltip,
  icon,
  children,
  onClick,
}: {
  title: string;
  tooltip: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <section
      className="relative flex flex-col border bg-white shadow-sm"
      style={{ borderColor: TK.border, borderRadius: TK.radius }}
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span
            className="grid size-6 place-items-center rounded"
            style={{ background: TK.pastelBrand, border: `1px solid ${TK.borderLight}` }}
          >
            {icon}
          </span>
          <h3 className="text-sm font-medium" style={{ color: TK.text }}>
            {title}
          </h3>
          <InfoTooltip label={title}>{tooltip}</InfoTooltip>
        </div>
      </header>
      <button
        type="button"
        onClick={onClick}
        className="text-left"
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        {children}
      </button>
    </section>
  );
}

function SparkArea({
  points,
  color = TK.brand,
  height = 56,
  label = "WR",
}: {
  points: MetricPoint[];
  color?: string;
  height?: number;
  label?: string;
}) {
  const data = (points || []).map((p) => ({ date: p.t, value: p.v }));
  const ref = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = React.useState<{ open: boolean; x: number; y: number; idx: number }>(
    { open: false, x: 0, y: 0, idx: -1 }
  );
  if (!data.length) return <div style={{ height }} />;
  return (
    <div ref={ref} className="relative px-3 pb-3">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
            onMouseMove={(s: any) => {
              const i = s?.activeTooltipIndex;
              if (i == null || i < 0) return;
              const x = s?.activeCoordinate?.x ?? s?.chartX ?? 0;
              setHover((prev) =>
                prev.idx === i ? { ...prev, open: true } : { open: true, x, y: 6, idx: i }
              );
            }}
            onMouseLeave={() => setHover({ open: false, x: 0, y: 0, idx: -1 })}
          >
            <defs>
              <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#kpiSparkFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <SmartPopover
        open={hover.open && hover.idx >= 0}
        anchorX={hover.x}
        anchorY={hover.y}
        containerRef={ref}
        preferAbove
      >
        {hover.idx >= 0 && (
          <div className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            <div>
              <div className="mb-1 font-medium">
                {label} {Math.round(data[hover.idx].value)}
              </div>
              <div className="text-[12px]" style={{ color: TK.muted }}>
                {data[hover.idx].date}
              </div>
            </div>
          </div>
        )}
      </SmartPopover>
    </div>
  );
}

function SparkLine({
  points,
  color = "#374151",
  height = 56,
  label = "Spam",
}: {
  points: MetricPoint[];
  color?: string;
  height?: number;
  label?: string;
}) {
  const data = (points || []).map((p) => ({ date: p.t, value: p.v }));
  const ref = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = React.useState<{ open: boolean; x: number; y: number; idx: number }>(
    { open: false, x: 0, y: 0, idx: -1 }
  );
  if (!data.length) return <div style={{ height }} />;
  return (
    <div ref={ref} className="relative px-3 pb-3">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
            onMouseMove={(s: any) => {
              const i = s?.activeTooltipIndex;
              if (i == null || i < 0) return;
              const x = s?.activeCoordinate?.x ?? s?.chartX ?? 0;
              setHover((prev) =>
                prev.idx === i ? { ...prev, open: true } : { open: true, x, y: 6, idx: i }
              );
            }}
            onMouseLeave={() => setHover({ open: false, x: 0, y: 0, idx: -1 })}
          >
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SmartPopover
        open={hover.open && hover.idx >= 0}
        anchorX={hover.x}
        anchorY={hover.y}
        containerRef={ref}
        preferAbove
      >
        {hover.idx >= 0 && (
          <div className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            <div>
              <div className="mb-1 font-medium">
                {label} {Math.round(data[hover.idx].value)}
              </div>
              <div className="text-[12px]" style={{ color: TK.muted }}>
                {data[hover.idx].date}
              </div>
            </div>
          </div>
        )}
      </SmartPopover>
    </div>
  );
}

function SummaryCards({ detail }: { detail: LinkDetailFull }) {
  const wrVal = pct(detail.wr);
  const wrPrev = pct(detail.wr_prev);
  const wrDelta = delta(wrVal, wrPrev);
  const spamVal = pct(detail.spam);
  const spamPrev = pct(detail.spam_prev);
  const spamDelta = delta(spamVal, spamPrev);
  const overdue = daysSince(detail.last_checked) > 14;

  return (
    <section aria-labelledby="summary-cards" className="w-full">
      <h3 id="summary-cards" className="sr-only">
        Summary
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* WR Score */}
        <CardShell
          title="WR Score"
          icon={<Activity size={14} color={TK.brandIcon} />}
          tooltip={
            <>
              Website Reputation (0–100). Prev: {wrPrev ?? "—"} • Δ{" "}
              {wrPrev != null && wrVal != null ? (wrDelta.d > 0 ? "+" : "") + wrDelta.d : "—"} •{" "}
              {fmtShort(detail.wr_changed_at)}
            </>
          }
          onClick={() =>
            document.querySelector("#trends")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <div className="mt-2 flex items-center gap-3 px-4 pb-2">
            <TinyDonut value={wrVal ?? 0} />
            <div className="flex items-center gap-2">
              <div
                className="text-3xl font-semibold leading-tight tabular-nums"
                style={{ color: TK.brand }}
              >
                {wrVal == null ? "—" : wrVal}
              </div>
              {wrPrev != null && wrVal != null ? (
                wrDelta.dir === "up" ? (
                  <TrendingUp size={18} color={TK.success} />
                ) : wrDelta.dir === "down" ? (
                  <TrendingDown size={18} color={TK.critical} />
                ) : (
                  <Minus size={18} color={TK.muted} />
                )
              ) : (
                <Minus size={18} color={TK.muted} />
              )}
            </div>
          </div>
          {detail.wr_series && detail.wr_series.length >= 3 && (
            <SparkArea points={detail.wr_series} color={TK.brand} label="WR" />
          )}
        </CardShell>

        {/* Spam Score */}
        <CardShell
          title="Spam Score"
          icon={<ShieldAlert size={14} color={TK.brandIcon} />}
          tooltip={
            <>
              Risk heuristic (0–100). Level:{" "}
              <b style={{ color: spamColor(spamVal ?? undefined) }}>
                {spamLevel(spamVal ?? undefined)}
              </b>
              . Prev: {spamPrev ?? "—"} • Δ{" "}
              {spamPrev != null && spamVal != null
                ? (spamDelta.d > 0 ? "+" : "") + spamDelta.d
                : "—"}{" "}
              • {fmtShort(detail.spam_changed_at)}
            </>
          }
          onClick={() =>
            document.querySelector("#trends")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <div className="mt-2 flex items-center gap-2 px-4 pb-2">
            <div
              className="text-3xl font-semibold leading-tight tabular-nums"
              style={{ color: TK.brand }}
            >
              {spamVal == null ? "—" : spamVal}
            </div>
            <span
              className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-medium border"
              style={{
                background: TK.appBg,
                color: spamColor(spamVal ?? undefined),
                borderColor: TK.borderLight,
              }}
            >
              {spamLevel(spamVal ?? undefined)}
            </span>
          </div>
          {detail.spam_series && detail.spam_series.length >= 3 && (
            <SparkLine points={detail.spam_series} color="#374151" label="Spam" />
          )}
        </CardShell>

        {/* IP / Network */}
        <CardShell
          title="IP / Network"
          icon={<NetworkIcon size={14} color={TK.brandIcon} />}
          tooltip={
            detail.ip_risk ? (
              <>
                <div className="mb-1 font-medium" style={{ color: TK.critical }}>
                  Network flagged
                </div>
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
          onClick={() => document.querySelector("#risk")?.scrollIntoView({ behavior: "smooth" })}
        >
          <div className="mt-2 px-4 pb-4">
            <div className="flex items-center gap-2">
              <div
                className="text-lg font-semibold"
                style={{ color: detail.ip_risk ? TK.critical : TK.success }}
              >
                {detail.ip_risk ? "Flagged" : "Safe"}
              </div>
              {detail.asn && detail.ip_risk && (
                <span className="text-[12px]" style={{ color: TK.muted }}>
                  {detail.asn}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: TK.muted }}>
              {detail.ip_risk
                ? "Review reasons & co‑links in Risk section"
                : "No suspicious signals detected"}
            </div>
          </div>
        </CardShell>

        {/* Last Checked / First Seen */}
        <CardShell
          title="Last Checked / First Seen"
          icon={<Clock size={14} color={TK.brandIcon} />}
          tooltip={
            <>
              Last Checked: {detail.last_checked ?? "—"}
              <br />
              First Seen: {detail.first_seen ?? "—"}
            </>
          }
          onClick={() =>
            document.querySelector("#timeline")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <div className="mt-2 flex flex-wrap items-center gap-2 px-4 pb-4">
            <div className="text-[16px] font-semibold" style={{ color: TK.text }}>
              {fmtShort(detail.last_checked)} / {fmtShort(detail.first_seen)}
            </div>
            {daysSince(detail.last_checked) !== Infinity && overdue && (
              <span
                className="px-2 py-[2px] text-[11.5px] rounded-full border"
                style={{
                  color: TK.warn,
                  borderColor: `${TK.warn}66`,
                  background: `${TK.warn}14`,
                }}
              >
                Overdue
              </span>
            )}
            {detail.index_status && detail.index_status !== "unknown" && (
              <span
                className="ml-auto rounded-full border px-2 py-[2px] text-[11.5px]"
                style={{
                  color: detail.index_status === "indexed" ? TK.success : TK.muted,
                  borderColor: TK.borderLight,
                  background: TK.appBg,
                }}
              >
                {detail.index_status === "indexed" ? "Indexed" : "Not Indexed"}
              </span>
            )}
          </div>
        </CardShell>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: B — Issue Highlights
   ──────────────────────────────────────────────────────────────────────────── */
type Severity = "critical" | "warning" | "info";
type IssueChip = {
  id:
    | "lost"
    | "type_dg"
    | "anchor_chg"
    | "wr_drop"
    | "ip_toxic"
    | "spam_high";
  label: string;
  qualifier?: string;
  severity: Severity;
  icon:
    | "link-off"
    | "arrow-down-right"
    | "edit"
    | "trending-down"
    | "shield-alert"
    | "alert-triangle";
  ts?: string;
  target: "#context" | "#trends" | "#risk";
  tooltip?: string;
};
function computeIssueChips(detail?: LinkDetailFull): IssueChip[] {
  if (!detail) return [];
  const list: IssueChip[] = [];
  if (["removed", "broken", "not_found"].includes(detail.status)) {
    list.push({
      id: "lost",
      label: "Lost link",
      severity: "critical",
      icon: "link-off",
      ts: detail.status_changed_at || detail.last_checked || undefined,
      target: "#context",
      tooltip: `Status: ${STATUS_LABEL[detail.status]}\nDetected: ${fmtShort(
        detail.status_changed_at || detail.last_checked || undefined
      )}`,
    });
  }
  if (isDowngrade(detail.link_type_prev, detail.link_type)) {
    list.push({
      id: "type_dg",
      label: "Type downgraded",
      qualifier: `${TYPE_LABEL[detail.link_type_prev!]} → ${
        TYPE_LABEL[detail.link_type]
      }`,
      severity: "warning",
      icon: "arrow-down-right",
      ts: detail.link_type_changed_at || undefined,
      target: "#context",
      tooltip: `Changed on ${fmtShort(detail.link_type_changed_at)}`,
    });
  }
  if (detail.anchor_prev && detail.anchor_prev !== (detail.anchor_current || "")) {
    const removed = !detail.anchor_current;
    list.push({
      id: "anchor_chg",
      label: removed ? "Anchor removed" : "Anchor changed",
      severity: "info",
      icon: "edit",
      ts: detail.anchor_changed_at || undefined,
      target: "#context",
      tooltip: removed
        ? `Removed on ${fmtShort(detail.anchor_changed_at)}`
        : `Old: "${detail.anchor_prev}"\nNew: "${detail.anchor_current}"`,
    });
  }
  if (detail.wr != null && detail.wr_prev != null && detail.wr - detail.wr_prev <= -10) {
    const d = detail.wr - detail.wr_prev;
    list.push({
      id: "wr_drop",
      label: "WR drop",
      qualifier: String(d),
      severity: d <= -20 ? "critical" : "warning",
      icon: "trending-down",
      ts: detail.wr_changed_at || undefined,
      target: "#trends",
      tooltip: `${detail.wr_prev} → ${detail.wr}`,
    });
  }
  if (detail.ip_risk) {
    list.push({
      id: "ip_toxic",
      label: "Toxic IP/ASN",
      qualifier: detail.asn,
      severity: "critical",
      icon: "shield-alert",
      ts: detail.last_checked || undefined,
      target: "#risk",
      tooltip: `${detail.ip ? `IP: ${detail.ip}\n` : ""}${
        detail.asn ? `ASN: ${detail.asn}` : ""
      }`,
    });
  }
  if (detail.spam != null && detail.spam > 40) {
    list.push({
      id: "spam_high",
      label: "Spam high",
      qualifier: String(detail.spam),
      severity: detail.spam >= 61 ? "critical" : "warning",
      icon: "alert-triangle",
      ts: detail.spam_changed_at || undefined,
      target: "#trends",
      tooltip: `Prev: ${detail.spam_prev ?? "—"} • Δ ${
        detail.spam_prev != null ? detail.spam - detail.spam_prev : "—"
      }`,
    });
  }
  const sevRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  return list.sort((a, b) => {
    const sa = sevRank[a.severity];
    const sb = sevRank[b.severity];
    if (sa !== sb) return sa - sb;
    const ta = a.ts ? new Date(a.ts).getTime() : 0;
    const tb = b.ts ? new Date(b.ts).getTime() : 0;
    return tb - ta;
  });
}
function IssueHighlights({ detail }: { detail?: LinkDetailFull }) {
  const chips = React.useMemo(() => computeIssueChips(detail), [detail]);
  if (!chips.length) return null;
  const iconFor = (k: IssueChip["icon"]) =>
    k === "link-off"
      ? Link2Off
      : k === "arrow-down-right"
      ? ArrowDownRight
      : k === "edit"
      ? Edit3
      : k === "trending-down"
      ? TrendingDown
      : k === "shield-alert"
      ? NetworkIcon
      : AlertTriangle;

  return (
    <section aria-labelledby="issue-highlights" className="w-full">
      <h3
        id="issue-highlights"
        className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[color:var(--wr-text,#111827)]"
      >
        <AlertTriangle size={16} color={TK.brandIcon} /> Issue Highlights
      </h3>
      <div className="flex flex-col gap-2">
        {chips.map((c) => {
          const tone =
            c.severity === "critical"
              ? {
                  border: "border-[rgba(239,68,68,0.45)]",
                  text: "text-[var(--wr-critical)]",
                  bg: "bg-[rgba(239,68,68,0.10)]",
                  ico: TK.critical,
                }
              : c.severity === "warning"
              ? {
                  border: "border-[rgba(251,146,60,0.45)]",
                  text: "text-[var(--wr-warn)]",
                  bg: "bg-[rgba(251,146,60,0.10)]",
                  ico: TK.warn,
                }
              : {
                  border: "border-[rgba(245,158,11,0.40)]",
                  text: "text-[var(--wr-warn)]",
                  bg: "bg-[rgba(245,158,11,0.10)]",
                  ico: TK.warn,
                };
          const Icon = iconFor(c.icon);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                const el = document.querySelector(c.target) as HTMLElement | null;
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cx(
                "group inline-flex w-full items-center justify-between gap-2 rounded-full px-3 py-1.5 text-[13px] border transition-shadow focus:outline-none focus-visible:ring-2",
                tone.bg,
                tone.border,
                "cursor-pointer"
              )}
              title={c.tooltip}
              aria-label={`${c.label}${c.qualifier ? ", " + c.qualifier : ""}`}
              style={
                {
                  ["--wr-critical" as any]: TK.critical,
                  ["--wr-warn" as any]: TK.warn,
                } as React.CSSProperties
              }
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={16} strokeWidth={2} color={tone.ico} />
                <span className="font-medium" style={{ color: TK.text }}>
                  {c.label}
                </span>
                {c.qualifier ? (
                  <span
                    className="max-w-[180px] truncate font-normal opacity-90"
                    style={{ color: TK.muted }}
                  >
                    {c.qualifier}
                  </span>
                ) : null}
              </span>
              <ChevronRight size={16} className="opacity-70 group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: C — Link Evidence & Context
   ──────────────────────────────────────────────────────────────────────────── */
function statusHueForCode(code?: string) {
  if (!code) return { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" };
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return { text: TK.success, bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)" };
  if (n >= 300 && n < 400) return { text: TK.accent, bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.35)" };
  if (n >= 400) return { text: TK.critical, bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.35)" };
  return { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" };
}
function hostLabel(u?: string) {
  try {
    if (!u) return "";
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function pathFromUrl(u?: string) {
  try {
    if (!u) return "";
    const { pathname, search, hash } = new URL(u);
    return `${pathname}${search}${hash}` || "/";
  } catch {
    return u || "";
  }
}
function Pill({
  children,
  hue,
}: {
  children: React.ReactNode;
  hue: { text: string; bg: string; border: string };
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
      style={{ color: hue.text, background: hue.bg, borderColor: hue.border }}
    >
      {children}
    </span>
  );
}
function Label({ icon: Icon, children, id }: { icon: any; children: React.ReactNode; id?: string }) {
  return (
    <div
      className="flex items-center gap-2 text-[13px] font-medium text-[color:var(--wr-muted,#6B7280)]"
      id={id}
    >
      {Icon ? <Icon size={16} className="shrink-0" color={TK.brandIcon} /> : null}
      <span>{children}</span>
    </div>
  );
}
function HttpChain({
  hops,
  lastChecked,
}: {
  hops?: LinkDetailFull["http_chain"];
  lastChecked?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  if (!hops || hops.length === 0)
    return (
      <div className="text-[13px] text-[color:var(--wr-muted,#6B7280)]">
        No HTTP data available.
      </div>
    );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {hops.map((h, i) => {
          const hue = statusHueForCode(h.code);
          return (
            <React.Fragment key={i}>
              <span
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[12px]"
                style={{ color: hue.text, background: hue.bg, borderColor: hue.border }}
                onClick={() => setOpen(true)}
                title={`${h.code || "?"}${h.at ? ` • ${h.at}` : ""}`}
              >
                <GitCommit size={14} />
                <span className="font-medium">{h.code || "—"}</span>
                <span className="text-[color:var(--wr-muted,#6B7280)]">
                  {hostLabel(h.url)}
                </span>
              </span>
              {i < hops.length - 1 && (
                <MoveRight size={16} className="text-[color:var(--wr-muted,#6B7280)]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {open && (
        <div className="relative mt-3" role="dialog" aria-label="Redirect chain details">
          <div
            className="absolute z-[50] w-full rounded-md border bg-white p-3 shadow-lg"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="mb-2 text-[12px] text-[color:var(--wr-muted,#6B7280)]">
              Last checked: {fmtShort(lastChecked || undefined)}
            </div>
            <ul className="max-h-64 space-y-2 overflow-auto pr-1">
              {hops.map((h, i) => {
                const hue = statusHueForCode(h.code);
                return (
                  <li key={i} className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: hue.text }}>
                      <GitCommit size={14} />
                      <span className="font-semibold">{h.code || "?"}</span>
                      <span className="text-[color:var(--wr-muted,#6B7280)]">
                        {h.at || ""}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="truncate text-[13px]" title={h.url}>
                        {h.url || "—"}
                      </div>
                      {h.url && (
                        <button
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                          style={{ borderColor: TK.borderLight }}
                          onClick={() => navigator.clipboard.writeText(h.url!)}
                          aria-label="Copy URL"
                        >
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function SectionContext({ detail }: { detail: LinkDetailFull }) {
  const anchorChanged = !!(
    detail.anchor_prev && detail.anchor_prev !== (detail.anchor_current || "")
  );
  const anchorRemoved = !detail.anchor_current && !!detail.anchor_prev;
  const locationKey: NonNullable<LinkDetailFull["location"]> =
    detail.location ?? "unknown";
  const locHue =
    locationKey === "in_content"
      ? { text: TK.success, bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)" }
      : locationKey === "unknown"
      ? { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" }
      : { text: TK.warn, bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" };
  const httpFinal =
    detail.http_chain && detail.http_chain.length > 0
      ? detail.http_chain[detail.http_chain.length - 1]
      : undefined;
  const finalBadgeHue = httpFinal
    ? statusHueForCode(httpFinal.code)
    : { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" };
  const finalBadgeLabel = httpFinal
    ? parseInt(httpFinal.code || "", 10) >= 200 &&
      parseInt(httpFinal.code || "", 10) < 300
      ? "Active"
      : parseInt(httpFinal.code || "", 10) >= 300 &&
        parseInt(httpFinal.code || "", 10) < 400
      ? "Redirected"
      : parseInt(httpFinal.code || "", 10) >= 400
      ? "Broken"
      : "Unknown"
    : "Unknown";

  return (
    <section id="context" className="scroll-mt-20">
      <h3
        className="mb-3 flex items-center gap-2 text-[16px] font-semibold text-[color:var(--wr-text,#111827)]"
      >
        <Globe2 size={16} color={TK.brandIcon} /> Link Evidence & Context
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr]">
        {/* Left */}
        <div className="space-y-3">
          {/* Target Page */}
          <div
            className="rounded-[12px] border bg-white p-4"
            style={{ borderColor: TK.border }}
          >
            <div className="flex items-center justify-between">
              <Label icon={Globe2}>Target Page (your site)</Label>
              {detail.target_url && (
                <a
                  href={`/analyzer?url=${encodeURIComponent(detail.target_url)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center gap-1 text-[13px] hover:underline"
                  style={{ color: TK.brand }}
                >
                  Open Analyzer <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="mt-2">
              <span
                className="text-[14px] font-semibold text-[color:var(--wr-text,#111827)]"
                title={detail.target_url}
              >
                {truncateMiddle(pathFromUrl(detail.target_url), 32, 24) || "—"}
              </span>
              <div className="mt-1 text-[12px] text-[color:var(--wr-muted,#6B7280)]">
                Target on your site
              </div>
            </div>
          </div>

          {/* Anchor Text */}
          <div
            className="rounded-[12px] border bg-white p-4"
            style={{ borderColor: TK.border }}
          >
            <div className="flex items-center justify-between">
              <Label icon={TextCursorInput}>Anchor Text (current)</Label>
              {anchorRemoved && (
                <Pill
                  hue={{
                    text: TK.critical,
                    bg: "rgba(239,68,68,0.10)",
                    border: "rgba(239,68,68,0.35)",
                  }}
                >
                  Removed
                </Pill>
              )}
            </div>
            <div className="mt-2">
              {!anchorRemoved ? (
                <div className="text-[14px] font-semibold text-[color:var(--wr-text,#111827)]">
                  {detail.anchor_current || "—"}
                </div>
              ) : (
                <div className="text-[13px] text-[color:var(--wr-muted,#6B7280)]">
                  Anchor absent on last check.
                </div>
              )}
              {anchorChanged && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[color:var(--wr-muted,#6B7280)]">
                  <AlertTriangle size={14} color={TK.accent} />
                  <span>
                    Changed: <span className="line-through">"{detail.anchor_prev}"</span> →{" "}
                    <span className="ml-1">
                      "{detail.anchor_current || "(removed)"}"
                    </span>
                    {detail.anchor_changed_at
                      ? ` · ${fmtShort(detail.anchor_changed_at)}`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-3">
          {/* Link Location */}
          <div
            className="rounded-[12px] border bg-white p-4"
            style={{ borderColor: TK.border }}
          >
            <div className="flex items-center justify-between">
              <Label icon={LayoutPanelLeft}>Link Location</Label>
              <Pill hue={locHue}>
                {locationKey === "in_content"
                  ? "In‑content paragraph"
                  : locationKey === "sidebar"
                  ? "Sidebar"
                  : locationKey === "footer"
                  ? "Footer"
                  : locationKey === "navigation"
                  ? "Navigation/Header"
                  : "Unknown"}
              </Pill>
            </div>
            <div className="mt-2 text-[12px]" style={{ color: TK.muted }}>
              {locationKey === "in_content"
                ? "Detected inside <article> near paragraph text."
                : locationKey === "sidebar"
                ? "Likely inside an <aside>/sidebar region."
                : locationKey === "footer"
                ? "Detected near <footer>."
                : locationKey === "navigation"
                ? "Detected within nav/menu region."
                : "Client‑rendered page or insufficient signals."}
            </div>
          </div>

          {/* HTTP Status & Redirect Chain */}
          <div
            className="rounded-[12px] border bg-white p-4"
            style={{ borderColor: TK.border }}
          >
            <div className="flex items-center justify-between">
              <Label icon={GitCommit}>HTTP Status & Redirect Chain</Label>
              <Pill hue={finalBadgeHue}>{finalBadgeLabel}</Pill>
            </div>
            <div className="mt-3">
              <HttpChain hops={detail.http_chain} lastChecked={detail.last_checked} />
            </div>
          </div>
        </div>
      </div>

      {/* Content snippet */}
      <div
        className="mt-3 rounded-[12px] border bg-white p-4"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center justify-between">
          <Label icon={Newspaper}>Content snippet (last seen)</Label>
          <div className="text-[12px]" style={{ color: TK.muted }}>
            Phase‑2
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="line-clamp-3 text-[13px]" style={{ color: TK.muted }}>
            No snapshot available. Try Re‑check to capture.
          </p>
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-[12px] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
            style={{ borderColor: TK.borderLight }}
            onClick={() => navigator.clipboard.writeText("No snapshot available")}
          >
            <FileText size={14} /> Copy
          </button>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: D — Timeline
   ──────────────────────────────────────────────────────────────────────────── */
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
  t: string;
  type: EventType;
  data?: Record<string, any>;
}
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
function titleCase(s?: string) {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function weight(t?: string) {
  const w: Record<string, number> = { dofollow: 3, nofollow: 2, sponsored: 1, ugc: 1 };
  return t ? w[t] ?? 0 : 0;
}
function TimelineSection({
  events = [],
  context,
}: {
  events?: TimelineEvent[];
  context?: { status?: string; link_type?: string };
}) {
  const [seg, setSeg] = React.useState<TimelineSeg>("all");
  const filtered = React.useMemo(() => {
    const allow = new Set(SEG_MAP[seg]);
    return [...events]
      .filter((e) => allow.has(e.type))
      .sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  }, [events, seg]);

  function build(ev: TimelineEvent) {
    const t = fmtShort(ev.t);
    const d = ev.data || {};
    switch (ev.type) {
      case "check": {
        const st =
          STATUS_LABEL[(d.status ?? context?.status) as LinkStatus] ||
          titleCase(d.status);
        const lt =
          TYPE_LABEL[(d.link_type ?? context?.link_type) as LinkType] ||
          titleCase(d.link_type);
        return {
          title: `${t} — Checked: Link ${st}${lt ? ` (${lt})` : ""}`,
          icon: <BadgeCheck size={16} color={TK.success} />,
          node: "neutral" as const,
          meta: d.http,
          jump: "#context" as const,
        };
      }
      case "status_change": {
        const red = ["removed", "broken", "not_found"].includes(String(d.to));
        return {
          title: `${t} — Status changed: ${titleCase(d.from)} → ${titleCase(d.to)}`,
          icon: red ? <SquareEqual size={16} color={TK.critical} /> : <BadgeCheck size={16} color={TK.warn} />,
          node: red ? ("critical" as const) : ("warning" as const),
          meta: d.last_seen ? `Last seen: ${fmtShort(d.last_seen)}` : undefined,
          jump: "#context" as const,
        };
      }
      case "type_change": {
        const downgraded = weight(d.to) < weight(d.from);
        return {
          title: `${t} — Type changed: ${titleCase(d.from)} → ${titleCase(d.to)}`,
          icon: downgraded ? <ArrowDownRight size={16} color={TK.warn} /> : <ArrowUpRight size={16} color={TK.success} />,
          node: downgraded ? ("warning" as const) : ("neutral" as const),
          meta: d.note,
          jump: "#context" as const,
        };
      }
      case "anchor_change": {
        const removed = !d.to;
        return {
          title: removed
            ? `${t} — Anchor removed`
            : `${t} — Anchor changed: “${d.from}” → “${d.to}”`,
          icon: removed ? <MinusCircle size={16} color={TK.warn} /> : <TextCursorInput size={16} color={TK.warn} />,
          node: "warning" as const,
          meta: removed
            ? d.last_seen
              ? `Last seen: ${fmtShort(d.last_seen)}`
              : undefined
            : undefined,
          jump: "#context" as const,
        };
      }
      case "wr_drop": {
        return {
          title: `${t} — WR drop: ${d.from} → ${d.to} (${Number(d.to) - Number(d.from)})`,
          icon: <TrendingDown size={16} color={TK.critical} />,
          node:
            Number(d.to) - Number(d.from) <= -20
              ? ("critical" as const)
              : ("warning" as const),
          meta: "Based on last checks",
          jump: "#trends" as const,
        };
      }
      case "wr_rise": {
        return {
          title: `${t} — WR rise: ${d.from} → ${d.to} (+${Number(d.to) - Number(d.from)})`,
          icon: <TrendingUp size={16} color={TK.success} />,
          node: "neutral" as const,
          meta: "Based on last checks",
          jump: "#trends" as const,
        };
      }
      case "wr_change": {
        const dd = Number(d.to) - Number(d.from);
        const up = dd > 0;
        return {
          title: `${t} — WR ${up ? "rise" : "drop"}: ${d.from} → ${d.to} (${
            up ? "+" : ""
          }${dd})`,
          icon: up ? (
            <TrendingUp size={16} color={TK.success} />
          ) : (
            <TrendingDown size={16} color={TK.critical} />
          ),
          node: up ? ("neutral" as const) : Math.abs(dd) >= 20 ? ("critical" as const) : ("warning" as const),
          meta: "Based on last checks",
          jump: "#trends" as const,
        };
      }
      case "spam_change": {
        const dd = Number(d.to) - Number(d.from);
        const sev = Number(d.to) >= 61 ? "critical" : Number(d.to) > 40 ? "warning" : "neutral";
        return {
          title: `${t} — Spam score: ${d.from} → ${d.to} (${
            dd > 0 ? "+" : ""
          }${dd})`,
          icon: (
            <AlertTriangle
              size={16}
              color={sev === "critical" ? TK.critical : sev === "warning" ? TK.warn : TK.muted}
            />
          ),
          node: sev as "critical" | "warning" | "neutral",
          meta: Number(d.to) > 40 ? "Level: High (> 40)" : undefined,
          jump: "#trends" as const,
        };
      }
      case "ip_flag":
        return {
          title: `${t} — Network flagged: ${d.asn ?? "Unknown ASN"}`,
          icon: <ShieldAlert size={16} color={TK.critical} />,
          node: "critical" as const,
          meta: d.ip ? `IP: ${d.ip}` : undefined,
          jump: "#risk" as const,
        };
      case "ip_clear":
        return {
          title: `${t} — Network cleared`,
          icon: <Shield size={16} color={TK.success} />,
          node: "neutral" as const,
          meta: "Now considered safe",
          jump: "#risk" as const,
        };
      case "first_seen":
        return {
          title: `${t} — First seen`,
          icon: <FlagTriangleRight size={16} color={TK.brand} />,
          node: "neutral" as const,
          meta: undefined,
          jump: "#context" as const,
        };
      default:
        return {
          title: `${t} — ${titleCase(ev.type)}`,
          icon: null,
          node: "neutral" as const,
          meta: undefined,
          jump: "#context" as const,
        };
    }
  }

  return (
    <section id="timeline" aria-labelledby="timeline-title" className="w-full">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 id="timeline-title" className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Change History
          </h3>
          <p className="text-[12.5px]" style={{ color: TK.muted }}>
            Newest first
          </p>
        </div>
      </div>

      <div
        className="sticky top-0 z-10 border-b bg-white/85 backdrop-blur"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="flex gap-1 p-1">
          {(["all", "status", "type", "anchor", "scores", "network"] as TimelineSeg[]).map(
            (key) => (
              <button
                key={key}
                role="tab"
                aria-selected={seg === key}
                onClick={() => setSeg(key)}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm",
                  seg === key ? "shadow-sm" : "hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                )}
                style={
                  seg === key
                    ? ({
                        backgroundColor: TK.appBg,
                        border: `1px solid ${TK.borderLight}`,
                        color: TK.text,
                      } as React.CSSProperties)
                    : ({ color: TK.muted } as React.CSSProperties)
                }
              >
                {titleCase(key)}
              </button>
            )
          )}
        </div>
      </div>

      <ul role="list" className="mt-3">
        {filtered.map((ev, idx) => {
          const b = build(ev);
          const nodeColor = b.node === "critical" ? TK.critical : b.node === "warning" ? TK.warn : TK.muted;
          return (
            <li key={idx} className="relative py-3 pl-8">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ backgroundColor: TK.border }} />
              <div className="absolute left-2 top-4 h-3 w-3 rounded-full" style={{ backgroundColor: nodeColor }} />
              <div
                className="rounded-lg border bg-white p-3 hover:shadow-sm focus-within:ring-2"
                style={{ borderColor: TK.border }}
              >
                <div className="flex items-center gap-2">
                  {b.icon}
                  <div className="text-[14.5px] font-semibold" style={{ color: TK.text }}>
                    {b.title}
                  </div>
                </div>
                {b.meta && (
                  <div className="mt-1 tabular-nums text-[12.5px]" style={{ color: TK.muted }}>
                    {b.meta}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <a
                    href={b.jump}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.querySelector(b.jump) as HTMLElement | null;
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 text-[13px] hover:underline"
                    style={{ color: TK.brand }}
                  >
                    <ExternalLink size={14} /> View evidence
                  </a>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        JSON.stringify({ t: ev.t, type: ev.type, data: ev.data ?? {} }, null, 2)
                      )
                    }
                    className="inline-flex cursor-pointer items-center gap-1 text-[13px] hover:text-[color:var(--wr-text,#111827)]"
                    style={{ color: TK.muted }}
                    title="Copy event JSON"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li
            className="rounded-md border py-6 text-center text-sm"
            style={{ borderColor: TK.border, color: TK.muted }}
          >
            No events in this category.
          </li>
        )}
      </ul>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: E — Metrics Trends (smart popovers on hover)  ✅
   ──────────────────────────────────────────────────────────────────────────── */
function MetricsTrends({ detail }: { detail: LinkDetailFull }) {
  const wrS = React.useMemo(() => (detail.wr_series || []).slice(-6), [detail.wr_series]);
  const spS = React.useMemo(() => (detail.spam_series || []).slice(-6), [detail.spam_series]);

  const mkData = (arr: MetricPoint[], label: string) =>
    arr.map((p, i) => ({ ...p, idx: i, label }));

  const WR = mkData(wrS, "WR");
  const SP = mkData(spS, "Spam");

  const WRRef = React.useRef<HTMLDivElement>(null);
  const SPRef = React.useRef<HTMLDivElement>(null);

  const [wHover, setWHover] = React.useState<{ open: boolean; x: number; y: number; idx: number }>(
    { open: false, x: 0, y: 0, idx: -1 }
  );
  const [sHover, setSHover] = React.useState<{ open: boolean; x: number; y: number; idx: number }>(
    { open: false, x: 0, y: 0, idx: -1 }
  );

  const wrD = delta(detail.wr, detail.wr_prev);
  const spD = delta(detail.spam, detail.spam_prev);

  return (
    <section id="trends" className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[16px] font-semibold" style={{ color: TK.text }}>
          <Activity size={16} color={TK.brandIcon} /> Metrics Trends
        </h3>
        <div className="flex items-center gap-1 text-[12px]" style={{ color: TK.muted }}>
          <Info size={14} color={TK.brandIcon} /> Deltas based on last successful checks.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* WR */}
        <div className="rounded-[12px] border bg-white p-3" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px]" style={{ color: TK.muted }}>
              WR Score
            </div>
            <div className="flex items-center gap-1 text-[12px]" style={{ color: TK.text }}>
              <span className="tabular-nums font-semibold" style={{ color: TK.brand }}>
                {detail.wr != null ? Math.round(detail.wr) : "—"}
              </span>
              <span className="ml-1 inline-flex items-center gap-0.5">
                {wrD.dir === "up" ? (
                  <ArrowUpRight size={14} color={TK.success} />
                ) : wrD.dir === "down" ? (
                  <ArrowDownRight size={14} color={TK.critical} />
                ) : (
                  <Minus size={14} color={TK.muted} />
                )}
                <span
                  className="tabular-nums"
                  style={{
                    color:
                      wrD.dir === "up" ? TK.success : wrD.dir === "down" ? TK.critical : TK.muted,
                  }}
                >
                  {wrD.dir === "flat" ? "—" : wrD.d > 0 ? `+${wrD.d}` : `${wrD.d}`}
                </span>
              </span>
            </div>
          </div>
          <div ref={WRRef} className="relative h-[72px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={WR}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                onMouseMove={(s: any) => {
                  if (!s?.isTooltipActive || s.activeTooltipIndex == null)
                    return setWHover((h) => ({ ...h, open: false }));
                  const i = s.activeTooltipIndex;
                  const x = s?.activeCoordinate?.x ?? s?.chartX ?? 0;
                  setWHover((prev) =>
                    prev.idx === i ? { ...prev, open: true } : { open: true, x, y: 6, idx: i }
                  );
                }}
                onMouseLeave={() => setWHover({ open: false, x: 0, y: 0, idx: -1 })}
              >
                <YAxis domain={[0, 100]} hide />
                <XAxis dataKey="t" hide />
                <Bar
                  dataKey="v"
                  fill={TK.brand}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={() =>
                    document.querySelector("#timeline")?.scrollIntoView({ behavior: "smooth" })
                  }
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Smart Popover on hover (with dot) */}
            <SmartPopover
              open={wHover.open && wHover.idx >= 0}
              anchorX={wHover.x}
              anchorY={wHover.y}
              containerRef={WRRef}
              preferAbove
            >
              {wHover.idx >= 0 && (
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: TK.brand }}
                  />
                  <div>
                    <div className="font-medium">WR {Math.round(WR[wHover.idx].v)}</div>
                    <div className="text-[12px]" style={{ color: TK.muted }}>
                      {fmtShort(WR[wHover.idx].t)}
                    </div>
                  </div>
                </div>
              )}
            </SmartPopover>
          </div>
        </div>

        {/* Spam */}
        <div className="rounded-[12px] border bg-white p-3" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px]" style={{ color: TK.muted }}>
              Spam Score
            </div>
            <div className="flex items-center gap-1 text-[12px]" style={{ color: TK.text }}>
              <span className="tabular-nums font-semibold" style={{ color: TK.brand }}>
                {detail.spam != null ? Math.round(detail.spam) : "—"}
              </span>
              <span className="ml-1 inline-flex items-center gap-0.5">
                {spD.dir === "up" ? (
                  <ArrowUpRight size={14} color={TK.success} />
                ) : spD.dir === "down" ? (
                  <ArrowDownRight size={14} color={TK.critical} />
                ) : (
                  <Minus size={14} color={TK.muted} />
                )}
                <span
                  className="tabular-nums"
                  style={{
                    color:
                      spD.dir === "up" ? TK.success : spD.dir === "down" ? TK.critical : TK.muted,
                  }}
                >
                  {spD.dir === "flat" ? "—" : spD.d > 0 ? `+${spD.d}` : `${spD.d}`}
                </span>
              </span>
            </div>
          </div>
          <div ref={SPRef} className="relative h-[72px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={SP}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                onMouseMove={(s: any) => {
                  if (!s?.isTooltipActive || s.activeTooltipIndex == null)
                    return setSHover((h) => ({ ...h, open: false }));
                  const i = s.activeTooltipIndex;
                  const x = s?.activeCoordinate?.x ?? s?.chartX ?? 0;
                  setSHover((prev) =>
                    prev.idx === i ? { ...prev, open: true } : { open: true, x, y: 6, idx: i }
                  );
                }}
                onMouseLeave={() => setSHover({ open: false, x: 0, y: 0, idx: -1 })}
              >
                <YAxis domain={[0, 100]} hide />
                <XAxis dataKey="t" hide />
                <Bar
                  dataKey="v"
                  fill="#374151"
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={() =>
                    document.querySelector("#timeline")?.scrollIntoView({ behavior: "smooth" })
                  }
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Smart Popover on hover (with dot) */}
            <SmartPopover
              open={sHover.open && sHover.idx >= 0}
              anchorX={sHover.x}
              anchorY={sHover.y}
              containerRef={SPRef}
              preferAbove
            >
              {sHover.idx >= 0 && (
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: "#374151" }}
                  />
                  <div>
                    <div className="font-medium">
                      Spam {Math.round(SP[sHover.idx].v)}
                    </div>
                    <div className="text-[12px]" style={{ color: TK.muted }}>
                      {fmtShort(SP[sHover.idx].t)}
                    </div>
                  </div>
                </div>
              )}
            </SmartPopover>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: F — Risk & Network (CTAs refined per spec) ✅
   ──────────────────────────────────────────────────────────────────────────── */
function RiskNetwork({
  detail,
  colinks = [],
  onDisavow,
  onWhitelist,
}: {
  detail: LinkDetailFull;
  colinks?: { domain: string; note?: string }[];
  onDisavow?: (domain: string) => void;
  onWhitelist?: (payload: {
    scope: "domain" | "ip" | "asn";
    value: string;
    until?: string;
    reason?: string;
  }) => void;
}) {
  const [toast, setToast] = React.useState("");
  const [showWL, setShowWL] = React.useState(false);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  const reasons = detail.ip_risk_reasons || [];
  const showReasons = reasons.slice(0, 3);
  const moreCount = Math.max(0, reasons.length - 3);

  return (
    <section id="risk" aria-labelledby="risk-title" className="scroll-mt-24">
      <div className="mb-3 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <NetworkIcon size={16} color={TK.brandIcon} />
          <h3 id="risk-title" className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Risk & Network
          </h3>
        </div>
        <span className="text-xs" style={{ color: TK.muted }}>
          Network identity, risk status, co-links & decisive actions.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr]">
        {/* Identity + Risk */}
        <div className="space-y-3">
          {/* Identity */}
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
            <div className="mb-3 flex items-center gap-2">
              <Server className="h-4 w-4" color={TK.brandIcon} />
              <span className="text-sm font-semibold" style={{ color: TK.text }}>
                Network
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div>
                  <dt className="text-xs" style={{ color: TK.muted }}>
                    IP Address
                  </dt>
                  <dd className="font-mono text-[15px]" style={{ color: TK.text }}>
                    {detail.ip || "—"}
                  </dd>
                </div>
                <div className="flex gap-1">
                  {detail.ip && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(detail.ip!);
                        setToast("Copied to clipboard");
                      }}
                      className="h-9 w-9 cursor-pointer rounded-lg border hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                      style={{ borderColor: TK.borderLight }}
                      aria-label={`Copy IP ${detail.ip}`}
                    >
                      <Copy className="mx-auto h-4 w-4" color={TK.muted} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div>
                  <dt className="text-xs" style={{ color: TK.muted }}>
                    ASN
                  </dt>
                  <dd className="text-[15px]" style={{ color: TK.text }}>
                    {detail.asn || "—"}
                  </dd>
                </div>
                <div className="flex gap-1">
                  {detail.asn && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(detail.asn!);
                        setToast("Copied to clipboard");
                      }}
                      className="h-9 w-9 cursor-pointer rounded-lg border hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                      style={{ borderColor: TK.borderLight }}
                      aria-label={`Copy ASN ${detail.asn}`}
                    >
                      <Copy className="mx-auto h-4 w-4" color={TK.muted} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <dt className="text-xs" style={{ color: TK.muted }}>
                  Host (reverse/provider)
                </dt>
                <dd className="truncate text-[15px]" style={{ color: TK.text }}>
                  {detail.host || "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Risk */}
          <div
            className="rounded-xl border bg-white p-4"
            style={{
              borderColor: TK.border,
              boxShadow: detail.ip_risk ? `inset 4px 0 0 ${TK.critical}` : undefined,
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {detail.ip_risk ? (
                  <ShieldAlert className="h-4 w-4" color={TK.critical} />
                ) : (
                  <ShieldCheck className="h-4 w-4" color={TK.success} />
                )}
                <span className="text-sm font-semibold" style={{ color: TK.text }}>
                  Risk Status
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                style={{
                  borderColor: detail.ip_risk ? TK.critical : TK.success,
                  background: detail.ip_risk ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)",
                  color: detail.ip_risk ? TK.critical : TK.success,
                }}
                title={
                  detail.ip_risk
                    ? `Detected ${fmtShort(detail.last_checked || undefined)}`
                    : "No network risk flagged"
                }
              >
                {detail.ip_risk ? "Flagged" : "Safe"}
              </span>
            </div>

            {detail.ip_risk ? (
              <ul className="mb-2 list-disc space-y-1 pl-5 text-sm" style={{ color: TK.text }}>
                {showReasons.length === 0 && <li>Reason not specified</li>}
                {showReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
                {moreCount > 0 && <li style={{ color: TK.muted }}>+{moreCount} more</li>}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: TK.muted }}>
                No suspicious network patterns detected.
              </p>
            )}

            <p className="mt-2 text-xs" style={{ color: TK.muted }}>
              Risk evaluates network patterns across recent crawls. It doesn’t judge page content.
            </p>
          </div>
        </div>

        {/* Co‑links + CTAs */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTree className="h-4 w-4" color={TK.brandIcon} />
                <span className="text-sm font-semibold" style={{ color: TK.text }}>
                  Co‑links from same IP/ASN
                </span>
              </div>
            </div>
            {colinks.length === 0 ? (
              <p className="text-sm" style={{ color: TK.muted }}>
                No suspicious co‑links found.
              </p>
            ) : (
              <ul className="space-y-2">
                {colinks.slice(0, 3).map((c) => (
                  <li key={c.domain}>
                    <button
                      onClick={() => alert(`Filter main table by domain: ${c.domain}`)}
                      className="group inline-flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-2 py-1 text-left hover:border-[color:var(--wr-border,#E5E7EB)] hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                      aria-label={`View domain ${c.domain}`}
                    >
                      <span
                        className="truncate underline-offset-2 group-hover:underline"
                        style={{ color: TK.brand }}
                      >
                        {c.domain}
                      </span>
                      <div className="ml-2 flex items-center gap-2">
                        {c.note && (
                          <span className="text-xs" style={{ color: TK.muted }}>
                            {c.note}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4" color={TK.muted} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions — CTA text visibility fixed */}
          <div className="rounded-xl border bg-white p-3" style={{ borderColor: TK.border }}>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {detail.disavowed && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                    style={{
                      borderColor: TK.critical,
                      background: "rgba(239,68,68,0.10)",
                      color: TK.critical,
                    }}
                  >
                    <Shield className="h-3.5 w-3.5" /> Already disavowed
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {/* Disavow Domain — red border + red text + red icon */}
                <Button
                  size="lg"
                  variant="danger"
                  className="min-w-[160px]"
                  onClick={() =>
                    onDisavow ? onDisavow(detail.domain) : alert(`Open Disavow Monitor for ${detail.domain}`)
                  }
                >
                  <Shield size={16} />
                  Disavow Domain
                </Button>

                {/* Whitelist — brand button with white text */}
                <Button
                  size="lg"
                  variant="primary"
                  className="min-w-[140px]"
                  onClick={() => setShowWL(true)}
                >
                  <Check size={16} color="#FFFFFF" />
                  Whitelist
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 z-[71] rounded-lg border bg-white px-3 py-2 text-sm shadow-md"
          style={{ borderColor: TK.border }}
        >
          {toast}
        </div>
      )}

      {/* Whitelist Dialog */}
      {showWL && (
        <WhitelistDialog
          open={showWL}
          onClose={() => setShowWL(false)}
          domain={detail.domain}
          ip={detail.ip}
          asn={detail.asn}
          onConfirm={onWhitelist}
        />
      )}
    </section>
  );
}

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
  onConfirm?: (payload: {
    scope: "domain" | "ip" | "asn";
    value: string;
    until?: string;
    reason?: string;
  }) => void;
}) {
  const [scope, setScope] = React.useState<"domain" | "ip" | "asn">("domain");
  const [until, setUntil] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");

  if (!open) return null;
  const value = scope === "domain" ? domain : scope === "ip" ? ip : asn;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-title"
    >
      <div
        className="w-[92vw] max-w-xl rounded-xl border bg-white p-5 shadow-xl"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="wl-title" className="text-base font-semibold" style={{ color: TK.text }}>
            Whitelist network signals
          </h2>
          <button
            onClick={onClose}
            className="h-9 w-9 cursor-pointer rounded-lg border hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
            aria-label="Close"
            style={{ borderColor: TK.borderLight }}
          >
            <X className="mx-auto h-5 w-5" color={TK.muted} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Scope */}
          <div>
            <div className="mb-2 text-sm font-medium" style={{ color: TK.text }}>
              Scope
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "domain", label: `Domain${domain ? ` (${domain})` : ""}` },
                { key: "ip", label: `IP${ip ? ` (${ip})` : ""}` },
                { key: "asn", label: `ASN${asn ? ` (${asn})` : ""}` },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  onClick={() => setScope(o.key)}
                  className={cx(
                    "h-10 rounded-lg border text-sm cursor-pointer",
                    scope === o.key
                      ? "bg-[rgba(0,140,205,0.10)] text-[color:var(--wr-brand,#008CCD)]"
                      : "hover:bg-[color:var(--wr-appBg,#F5F7FA)]"
                  )}
                  style={{
                    borderColor: scope === o.key ? TK.brand : TK.border,
                    color: scope === o.key ? TK.brand : TK.text,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Duration
              </label>
              <select
                className="w-full rounded-lg border p-2 text-sm"
                style={{ borderColor: TK.border }}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "indef") setUntil("");
                  else if (v === "30")
                    setUntil(new Date(Date.now() + 30 * 86400000).toISOString());
                  else if (v === "90")
                    setUntil(new Date(Date.now() + 90 * 86400000).toISOString());
                }}
              >
                <option value="indef">Indefinite</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Until (ISO, optional)
              </label>
              <input
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                placeholder="2025-12-01T00:00:00Z"
                className="w-full rounded-lg border p-2 text-sm"
                style={{ borderColor: TK.border }}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-lg border p-2 text-sm"
              placeholder="e.g., Known partner network; suppress false positives"
              style={{ borderColor: TK.border }}
            />
          </div>

          <p className="text-xs" style={{ color: TK.muted }}>
            Whitelist suppresses network warnings for this project. Monitoring continues; scores
            aren’t automatically boosted.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!value) return onClose();
              onConfirm?.({
                scope,
                value,
                until: until || undefined,
                reason: reason || undefined,
              });
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Section: G — Related Links
   ──────────────────────────────────────────────────────────────────────────── */
function RelatedLinks({
  domain,
  items,
  onOpenLinkDetail,
  onOpenSource,
  onViewAll,
}: {
  domain: string;
  items: RelatedLink[];
  onOpenLinkDetail?: (id: string) => void;
  onOpenSource?: (url: string) => void;
  onViewAll?: (domain: string) => void;
}) {
  const sorted = React.useMemo(() => {
    const statusRank: Record<LinkStatus, number> = {
      removed: 3,
      broken: 3,
      not_found: 3,
      redirected: 2,
      active: 1,
      not_checked: 0,
    };
    const s = [...items].sort((a, b) => {
      const at = a.last_checked ? new Date(a.last_checked).getTime() : -1;
      const bt = b.last_checked ? new Date(b.last_checked).getTime() : -1;
      if (bt !== at) return bt - at;
      const sr = statusRank[b.status] - statusRank[a.status];
      if (sr !== 0) return sr;
      return b.wr - a.wr;
    });
    return s.slice(0, 5);
  }, [items]);

  const statusHue = (s: LinkStatus) =>
    s === "active"
      ? TK.success
      : s === "redirected"
      ? TK.warn
      : s === "not_checked"
      ? TK.muted
      : TK.critical;
  const isOverdue = (iso?: string) =>
    iso ? Date.now() - new Date(iso).getTime() > 14 * 86400000 : false;

  return (
    <section id="related-links" aria-labelledby="related-links-title" className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3
          id="related-links-title"
          className="flex items-center gap-2 text-[16px] font-semibold"
          style={{ color: TK.text }}
        >
          <Globe2 size={16} color={TK.brandIcon} /> Related Links (same domain)
        </h3>
        <span className="text-[12px]" style={{ color: TK.muted }}>
          Max 5 rows • Sorted by latest checks
        </span>
      </div>

      <div className="rounded-lg border bg-white" style={{ borderColor: TK.border }}>
        {sorted.length === 0 ? (
          <div className="flex items-center gap-3 p-5" style={{ color: TK.muted }}>
            <Globe2 size={18} />
            <div>
              <div className="text-[14px]">No other links from this domain.</div>
              <button
                className="text-[13px] underline cursor-pointer"
                onClick={() => onViewAll?.(domain)}
                style={{ color: TK.brand }}
              >
                Open main table for {domain}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Table (≥sm) */}
            <div className="hidden sm:block">
              <table className="w-full text-[13px]">
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{ color: TK.muted, borderColor: TK.borderLight }}
                  >
                    <th className="py-2 pl-4">Source Path</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">WR</th>
                    <th className="py-2 pr-4">Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, idx) => (
                    <tr
                      key={idx}
                      tabIndex={0}
                      className="group cursor-pointer border-b last:border-b-0 focus:outline-none"
                      style={{ borderColor: TK.borderLight }}
                      onClick={() =>
                        r.id
                          ? onOpenLinkDetail?.(r.id)
                          : r.source_url
                          ? onOpenSource?.(r.source_url)
                          : undefined
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          r.id
                            ? onOpenLinkDetail?.(r.id)
                            : r.source_url && onOpenSource?.(r.source_url);
                        }
                      }}
                    >
                      <td className="py-3 pl-4 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block max-w-[420px] truncate underline-offset-2 group-hover:underline"
                            title={r.source_url || r.path}
                            style={{ color: TK.brand }}
                          >
                            {truncateMiddle(r.path)}
                          </span>
                          {r.source_url && (
                            <button
                              className="opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
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
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
                          style={{
                            borderColor: `${statusHue(r.status)}22`,
                            background: `${statusHue(r.status)}14`,
                            color: statusHue(r.status),
                          }}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
                          style={{
                            borderColor: `${TK.brand}22`,
                            background: `${TK.brand}14`,
                            color:
                              r.type_prev && r.type_prev !== r.type ? TK.warn : TK.brand,
                          }}
                          title={
                            r.type_prev &&
                            r.type_prev !== r.type &&
                            r.type_changed_at
                              ? `Changed from ${TYPE_LABEL[r.type_prev]} to ${TYPE_LABEL[r.type]} on ${fmtShort(
                                  r.type_changed_at
                                )}`
                              : TYPE_LABEL[r.type]
                          }
                        >
                          {TYPE_LABEL[r.type]}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <div
                          className="flex items-center gap-2"
                          title={`WR ${r.wr}${
                            typeof r.wr_prev === "number"
                              ? ` · Prev ${r.wr_prev} · Δ ${r.wr - (r.wr_prev ?? 0)}`
                              : ""
                          }`}
                        >
                          <TinyDonut value={r.wr} size={18} />
                          <span className="text-[13px] tabular-nums">
                            {Math.round(r.wr)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span title={r.last_checked || undefined}>{fmtShort(r.last_checked)}</span>
                          {isOverdue(r.last_checked) && (
                            <span
                              className="rounded-full border px-2 py-0.5 text-[11px]"
                              style={{
                                borderColor: `${TK.warn}55`,
                                color: TK.warn,
                                background: `${TK.warn}14`,
                              }}
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

            {/* Mobile list */}
            <div className="divide-y sm:hidden" style={{ borderColor: TK.borderLight }}>
              {sorted.map((r, idx) => (
                <button
                  key={idx}
                  className="w-full cursor-pointer p-3 text-left hover:bg-[color:var(--wr-appBg,#F5F7FA)] focus:outline-none"
                  onClick={() =>
                    r.id
                      ? onOpenLinkDetail?.(r.id)
                      : r.source_url
                      ? onOpenSource?.(r.source_url)
                      : undefined
                  }
                >
                  <div
                    className="truncate underline-offset-2"
                    title={r.source_url || r.path}
                    style={{ color: TK.brand }}
                  >
                    {truncateMiddle(r.path)}
                  </div>
                  <div
                    className="mt-1 flex flex-wrap items-center gap-2 text-[12px]"
                    style={{ color: TK.muted }}
                  >
                    <span style={{ color: statusHue(r.status) }}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    •
                    <span className={r.type_prev && r.type_prev !== r.type ? "text-amber-500" : ""}>
                      {TYPE_LABEL[r.type]}
                    </span>
                    •<span className="tabular-nums">WR {Math.round(r.wr)}</span>•
                    <span>{fmtShort(r.last_checked)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          className="inline-flex cursor-pointer items-center gap-1 text-[13px] hover:underline"
          onClick={() => onViewAll?.(domain)}
          style={{ color: TK.brand }}
        >
          View all from this domain <Eye size={16} />
        </button>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main — Complete Drawer
   ──────────────────────────────────────────────────────────────────────────── */
export default function IssueHighlightsDemo({
  open = true,
  onClose = () => {},
  detail: _detail,
  related = [],
  colinks = [],
  onRecheck,
  onCreateTask,
  onFlag,
  onOpenDisavow,
  onOpenLinkDetail,
  onOpenSource,
  onViewAll,
  onWhitelist,
}: {
  open?: boolean;
  onClose?: () => void;
  detail?: LinkDetailFull;
  related?: RelatedLink[];
  colinks?: { domain: string; note?: string }[];
  onRecheck?: (linkId: string) => Promise<void> | void;
  onCreateTask?: (payload: { linkId: string; domain: string; sourceUrl?: string }) => void;
  onFlag?: (linkId: string) => void;
  onOpenDisavow?: (domain: string) => void;
  onOpenLinkDetail?: (id: string) => void;
  onOpenSource?: (url: string) => void;
  onViewAll?: (domain: string) => void;
  onWhitelist?: (payload: {
    scope: "domain" | "ip" | "asn";
    value: string;
    until?: string;
    reason?: string;
  }) => void;
}) {
  // Demo fallback
  const demoWR: MetricPoint[] = Array.from({ length: 6 }).map((_, i) => ({
    t: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
    v: 65 + (i % 3 === 0 ? 8 : i % 2 ? 4 : -2),
  }));
  const demoSpam: MetricPoint[] = Array.from({ length: 6 }).map((_, i) => ({
    t: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
    v: 18 + (i % 3 === 0 ? 6 : i % 2 ? -3 : 2),
  }));

  const detail: LinkDetailFull =
    _detail || ({
      link_id: "lnk_12345",
      domain: "example-news.site",
      source_url:
        "https://example-news.site/articles/2025/08/08/ai-content-seo-best-practices?utm_source=wranker&utm_medium=ref",
      status: "active",
      status_changed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      health_state: "at_risk",
      health_reason: "At Risk due to WR drop (−12) and anchor change",
      link_type: "nofollow",
      link_type_prev: "dofollow",
      link_type_changed_at: "2025-07-30T10:12:00Z",
      disavowed: false,
      wr: 78,
      wr_prev: 90,
      wr_changed_at: "2025-07-30T10:05:00Z",
      wr_series: demoWR,
      spam: 22,
      spam_prev: 28,
      spam_changed_at: "2025-07-30T10:05:00Z",
      spam_series: demoSpam,
      ip_risk: true,
      ip: "203.0.113.10",
      asn: "AS64500",
      ip_risk_reasons: ["Known spam network", "High overlap with PBNs", "Disposable hosting"],
      last_checked: "2025-08-08T04:15:00Z",
      first_seen: "2025-05-12T10:12:00Z",
      index_status: "indexed",
      target_url: "https://yoursite.com/blog/seo-guide/how-to-rank",
      anchor_current: "seo tools",
      anchor_prev: "best seo tools",
      anchor_changed_at: "2025-06-29T12:00:00Z",
      location: "in_content",
      http_chain: [
        { code: "301", url: "http://example-news.site/a", at: "2025-08-08T04:15:00Z" },
        { code: "200", url: "https://example-news.site/a", at: "2025-08-08T04:15:02Z" },
      ],
      host: "edge-203-0-113-10.isp.example",
      events: [
        {
          t: "2025-08-09T07:30:00Z",
          type: "status_change",
          data: { from: "active", to: "active", last_seen: "2025-08-08T04:15:00Z" },
        },
        {
          t: "2025-08-08T04:15:00Z",
          type: "check",
          data: { status: "active", link_type: "nofollow", http: "301 → 200 (GET)" },
        },
        {
          t: "2025-08-01T03:22:10Z",
          type: "type_change",
          data: { from: "dofollow", to: "nofollow", note: "rel attribute changed" },
        },
        { t: "2025-07-30T02:12:00Z", type: "wr_drop", data: { from: 90, to: 78 } },
        {
          t: "2025-07-15T00:40:00Z",
          type: "anchor_change",
          data: { from: "best seo tools", to: "seo tools" },
        },
        { t: "2025-07-10T06:10:00Z", type: "spam_change", data: { from: 28, to: 22 } },
      ],
    } as LinkDetailFull);

  const demoRelated: RelatedLink[] = [
    {
      id: "lnk_r1",
      path: extractPath("https://example-news.site/articles/2025/08/07/ai-agents-overview"),
      source_url: "https://example-news.site/articles/2025/08/07/ai-agents-overview",
      status: "active",
      type: "nofollow",
      wr: 74,
      wr_prev: 79,
      last_checked: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: "lnk_r2",
      path: extractPath("https://example-news.site/tech/2025/07/30/search-updates"),
      source_url: "https://example-news.site/tech/2025/07/30/search-updates",
      status: "redirected",
      type: "dofollow",
      wr: 68,
      wr_prev: 71,
      last_checked: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "lnk_r3",
      path: extractPath("https://example-news.site/opinion/2025/07/15/content-farms"),
      source_url: "https://example-news.site/opinion/2025/07/15/content-farms",
      status: "broken",
      type: "nofollow",
      wr: 51,
      wr_prev: 54,
      last_checked: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: "lnk_r4",
      path: extractPath("https://example-news.site/blog/how-to-use-seo-tools"),
      source_url: "https://example-news.site/blog/how-to-use-seo-tools",
      status: "active",
      type: "ugc",
      wr: 56,
      wr_prev: 57,
      last_checked: new Date(Date.now() - 7 * 86400000).toISOString(),
      type_prev: "nofollow",
      type_changed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "lnk_r5",
      path: extractPath("https://example-news.site/resources/2025/06/24/checklist"),
      source_url: "https://example-news.site/resources/2025/06/24/checklist",
      status: "not_checked",
      type: "nofollow",
      wr: 48,
      last_checked: undefined,
    },
  ];

  const relatedList =
    (related && related.length > 0 ? related : demoRelated).map((r) => ({
      ...r,
      path: r.path || extractPath(r.source_url),
    })) || [];

  return (
    <div
      className="relative w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
        ["--wr-brand" as any]: TK.brand,
        ["--wr-muted" as any]: TK.muted,
        ["--wr-border" as any]: TK.border,
        ["--wr-borderLight" as any]: TK.borderLight,
        ["--wr-text" as any]: TK.text,
        ["--wr-appBg" as any]: TK.appBg,
      }}
    >
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-[60] bg-black/35" onClick={onClose} aria-hidden />}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="fixed right-0 top-0 z-[61] h-full max-w-full bg-white shadow-xl outline-none"
          style={{ width: "min(1280px, 92vw)", borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}
        >
          <DrawerHeader
            data={detail}
            onClose={onClose}
            onRecheck={onRecheck}
            onCreateTask={onCreateTask}
            onFlag={onFlag}
            onOpenDisavow={onOpenDisavow}
          />

          {/* Scrollable body */}
          <div
            className="h-[calc(100%-68px)] space-y-6 overflow-y-auto px-5 py-4"
            style={{ background: TK.appBg }}
          >
            {/* Summary (KPI) */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <h2
                className="mb-3 flex items-center gap-2 text-[16px] font-semibold"
                style={{ color: TK.text }}
              >
                <Activity size={16} color={TK.brandIcon} /> Link Detail — Section A: Summary Cards
              </h2>
              <SummaryCards detail={detail} />
            </div>

            {/* Issue Highlights */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <IssueHighlights detail={detail} />
            </div>

            {/* Link Evidence & Context */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <SectionContext detail={detail} />
            </div>

            {/* Change History */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <TimelineSection
                events={detail.events}
                context={{ status: detail.status, link_type: detail.link_type }}
              />
            </div>

            {/* Metrics Trends (smart popovers on hover) */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <MetricsTrends detail={detail} />
            </div>

            {/* Risk & Network (CTAs fixed) */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <RiskNetwork
                detail={detail}
                colinks={colinks}
                onDisavow={onOpenDisavow}
                onWhitelist={onWhitelist}
              />
            </div>

            {/* Related Links */}
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: TK.border }}>
              <RelatedLinks
                domain={detail.domain}
                items={relatedList}
                onOpenLinkDetail={onOpenLinkDetail}
                onOpenSource={onOpenSource}
                onViewAll={onViewAll}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
