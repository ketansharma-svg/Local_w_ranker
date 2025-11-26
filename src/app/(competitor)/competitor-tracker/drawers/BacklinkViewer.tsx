"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Info as InfoIcon,
  Zap,
  ClipboardList,
  Link as LinkIcon,
  AlertTriangle,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ReferenceDot,
  CartesianGrid,
} from "recharts";

/* ======================================================================
   🔍 Backlink Viewer Drawer (Competitor Tracker → Backlinks)
   - TailwindCSS + Recharts + lucide-react
   - Includes a demo wrapper with mock data so it shows immediately.
   ====================================================================== */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  divider: "#E5E7EB",
  bg: "#FFFFFF",
  brand: "#1090D0", // primary CTA
  blue: "#0077FF", // charts
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  chipBg: "#F5F7FA",
  radius: 10,
} as const;

/* ------------------------------- Types ------------------------------- */
type LinkEvent = "Broken" | "Lost" | "Recovered";

export type BacklinkViewerModel = {
  id: string;
  competitor: string;                 // "comp1.com"
  domain: string;                     // "example.com"
  faviconUrl?: string;
  linkType: "Guest Post" | "Blog" | "Directory" | "PR" | "Forum" | "Unknown";
  targetPath: string;                 // "/seo-guide"
  firstSeenISO: string;               // ISO
  status: "New" | "Active" | "Broken" | "Lost" | "Redirected";
  anchorText: string;
  placementUrl: string;
  wrScore?: number;                   // 0–100
  category?: string;                  // "Tech/Marketing"
  lastVerifiedISO?: string;           // ISO
  timeline?: Array<{ dateISO: string; active: 0 | 1; event?: LinkEvent }>;
  vefogix: {
    available: boolean;
    offers?: Array<{ kind: "Guest Post" | "Link Insertion"; priceUSD?: number }>;
  };
  permissions: {
    role: "admin" | "editor" | "viewer";
  };
};

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  data?: BacklinkViewerModel | null;
  projectId?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreateTask?: (payload: { title: string; context: Record<string, any> }) => void;
  source?: "table" | "alert";
};

/* ------------------------------ Helpers ----------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "—";
const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });

function middleTruncate(str: string, max = 56) {
  if (!str) return "—";
  if (str.length <= max) return str;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}
function statusStyle(s: BacklinkViewerModel["status"]) {
  if (s === "Broken") return { fg: TK.danger, bg: "#FEE2E2", br: "#FECACA", label: "Broken" };
  if (s === "Lost") return { fg: TK.warn, bg: "#FEF3C7", br: "#FDE68A", label: "Lost" };
  if (s === "Redirected") return { fg: "#FB923C", bg: "#FFF7ED", br: "#FED7AA", label: "Redirected" };
  return { fg: TK.success, bg: "#ECFDF5", br: "#D1FAE5", label: s || "Active" }; // New / Active
}

/* ----------------------------- Focus trap --------------------------- */
function useFocusTrap(enabled: boolean, containerRef: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const el = containerRef.current;
    const selector =
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
    const getList = () => Array.from(el.querySelectorAll<HTMLElement>(selector)).filter((n) => !n.hasAttribute("inert"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const nodes = getList();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, containerRef, onClose]);
}

function useFocusRestore(open: boolean) {
  const prevRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (open) {
      prevRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => initialFocusRef.current?.focus(), 0);
    } else {
      prevRef.current?.focus?.();
    }
  }, [open]);
  return initialFocusRef;
}

/* ------------------------- Recharts tooltip ------------------------- */
const SmartTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  const date = p?.date instanceof Date ? p.date : new Date(p?.date);
  const state = p?.active ? "Active" : "Inactive";
  const event: LinkEvent | undefined = p?.event;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <div className="text-xs font-medium text-gray-600">{date ? date.toLocaleDateString() : ""}</div>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.blue }} />
          State
        </span>
        <span className="font-semibold text-gray-900">{state}</span>
      </div>
      {event && (
        <div className="mt-1 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: event === "Broken" ? TK.danger : TK.warn }}
            />
            Change
          </span>
          <span className="font-semibold text-gray-900">{event}</span>
        </div>
      )}
    </div>
  );
};

/* --------------------- Copy button with feedback -------------------- */
function CopyButton({
  text,
  label = "Copy",
  className,
  ariaLabel,
  title,
}: {
  text: string;
  label?: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={ariaLabel || label}
      title={title || label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // ignore
        }
      }}
      className={classNames(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50",
        className
      )}
      style={{ borderColor: TK.divider, color: TK.muted }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ----------------------------- Sub-UI ------------------------------- */
const Pill = ({
  color,
  children,
  title,
}: React.PropsWithChildren<{ color: string; title?: string }>) => (
  <span
    title={title}
    className="inline-flex items-center rounded-full px-2 py-[2px] text-[12px] font-medium"
    style={{ background: `${color}14`, color, border: `1px solid ${color}26` }}
  >
    {children}
  </span>
);

const TinyDonut = ({
  value = 0,
  size = 26,
  stroke = 4,
  color = TK.blue,
}: {
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
}) => {
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`WR ${v}/100`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

function DomainFavicon({ domain, faviconUrl }: { domain?: string | null; faviconUrl?: string }) {
  if (!domain) return <span className="inline-block h-4 w-4 rounded bg-gray-200" aria-hidden />;
  const letter = domain[0]?.toUpperCase() || "?";
  return faviconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={faviconUrl} alt={`${domain} favicon`} className="h-4 w-4 rounded" />
  ) : (
    <span className="grid h-4 w-4 place-items-center rounded bg-gray-200 text-[10px] font-semibold text-gray-700">
      {letter}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-[140px] text-xs text-gray-500">{label}</div>
      <div className="min-w-0 text-gray-900">{value}</div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  content,
}: {
  icon?: React.ReactNode;
  label: string;
  content: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
        {content}
      </div>
    </div>
  );
}

function buildVefogixUrl(domain: string, projectId?: string) {
  const u = new URL("https://vefogix.com/opportunity");
  u.searchParams.set("domain", domain);
  u.searchParams.set("utm_source", "wranker");
  u.searchParams.set("utm_medium", "tracker");
  u.searchParams.set("utm_campaign", "backlink_viewer");
  if (projectId) u.searchParams.set("project", projectId);
  return u.toString();
}

/* --------------------------- Skeletons/Errors ------------------------ */
function DrawerSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-5 w-2/3 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded border" style={{ borderColor: TK.border }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded border" style={{ borderColor: TK.border }} />
        ))}
      </div>
      <div className="h-[200px] rounded border" style={{ borderColor: TK.border }} />
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <div
      className="m-4 rounded-lg border p-4 text-sm"
      style={{ borderColor: "#FECACA", background: "#FEF2F2", color: "#991B1B" }}
      role="alert"
    >
      <div className="font-medium mb-1">Couldn’t load backlink details.</div>
      <div className="opacity-90">{message || "Network or server error."}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: TK.divider, background: "#fff", color: TK.text }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/* --------------------------- Main Drawer ----------------------------- */
export function BacklinkViewerDrawer({
  open,
  onClose,
  data,
  projectId,
  loading,
  error,
  onRetry,
  onCreateTask,
  source = "table",
}: DrawerProps) {
  function useFocusTrap(
  isOpen: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onClose?: () => void
) {
  // your focus trap logic
}

const drawerRef = useRef<HTMLDivElement | null>(null);
useFocusTrap(open, drawerRef, onClose);

  const closeBtnRef = useFocusRestore(open);

  useEffect(() => {
    if (!open || !data) return;
    console.info("drawer_open", {
      id: data.id,
      domain: data.domain,
      competitor: data.competitor,
      source,
      projectId,
      role: data.permissions?.role,
    });
  }, [open, data, source, projectId]);

  const wrHigh = (data?.wrScore ?? 0) >= 70;
  const statusC = statusStyle((data?.status as any) || "Active");

  // Timeline: use provided or synthesize
  const timeline = useMemo(() => {
    if (!data) return [];
    if (data.timeline?.length) {
      return data.timeline
        .map((t) => ({ date: new Date(t.dateISO), active: Number(!!t.active), event: t.event }))
        .sort((a, b) => +a.date - +b.date);
    }
    // Fallback: last 30 days, mark recent change if Broken/Lost
    const out: { date: Date; active: number; event?: LinkEvent }[] = [];
    const today = new Date();
    const first = data.firstSeenISO ? new Date(data.firstSeenISO) : new Date(today);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (d < first) continue;
      const brokeOrLost = data.status === "Broken" || data.status === "Lost";
      const active = brokeOrLost && i < 2 ? 0 : 1;
      out.push({
        date: new Date(d.toDateString()),
        active,
        event: i === 1 && brokeOrLost ? (data.status === "Broken" ? "Broken" : "Lost") : undefined,
      });
    }
    return out;
  }, [data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Backlink Viewer Drawer">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-xl sm:w-[480px]"
        style={{ borderLeft: `1px solid ${TK.border}` }}
      >
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] font-semibold text-gray-900">
                Backlink Details — {data?.domain ?? "—"}
              </h2>
              {(data?.wrScore ?? 0) >= 70 && (
                <span
                  title="High WR domain"
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px]"
                  style={{ borderColor: "#FEE2E2", background: "#FEF2F2", color: "#DC2626" }}
                >
                  <Flame className="h-3.5 w-3.5" aria-hidden /> High WR
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Competitor: <span className="font-medium text-gray-700">{data?.competitor || "—"}</span>
            </div>
          </div>
          {/* <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button> */}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <DrawerSkeleton />
          ) : error ? (
            <ErrorBlock message={error} onRetry={onRetry} />
          ) : (
            <>
              {/* A) Key Summary */}
              <section className="p-4 pt-3">
                <div className="rounded-lg border p-3" style={{ borderColor: TK.border }}>
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <SummaryRow
                      label="Referring Domain"
                      value={
                        <a
                          href={data?.domain ? `https://${data.domain}` : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classNames(
                            "inline-flex items-center gap-2 underline",
                            data?.domain ? "text-blue-700" : "pointer-events-none text-gray-400 no-underline"
                          )}
                          title={data?.domain ? `Open ${data.domain}` : "Domain unavailable"}
                        >
                          <DomainFavicon domain={data?.domain} faviconUrl={data?.faviconUrl} />
                          {data?.domain ?? "—"}
                          {data?.domain && <ExternalLink className="h-3.5 w-3.5 text-gray-400" aria-hidden />}
                        </a>
                      }
                    />
                    <SummaryRow
                      label="Link Type"
                      value={<Pill color={TK.brand} title="Link attribute">{data?.linkType ?? "—"}</Pill>}
                    />
                    <SummaryRow
                      label="Target Competitor Page"
                      value={
                        data?.targetPath ? (
                          <a
                            href={`https://${data?.competitor || ""}${data?.targetPath || ""}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[12px] underline"
                            style={{ color: TK.blue, wordBreak: "break-all" }}
                            title={`Open ${data?.targetPath}`}
                          >
                            {data.targetPath}{" "}
                            <ExternalLink className="ml-1 inline h-3.5 w-3.5 text-gray-400 align-middle" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )
                      }
                    />
                    <SummaryRow label="First Seen" value={fmtDate(data?.firstSeenISO)} />
                    <SummaryRow
                      label="Status"
                      value={
                        <span
                          className="inline-flex items-center rounded-full px-2 py-[2px] text-[12px] font-medium"
                          style={{
                            background: statusC.bg,
                            color: statusC.fg,
                            border: `1px solid ${statusC.br}`,
                          }}
                          title={`Last checked ${fmtDate(data?.lastVerifiedISO)}`}
                        >
                          {statusC.label}
                        </span>
                      }
                    />
                    <SummaryRow
                      label="Vefogix"
                      value={
                        data?.vefogix?.available ? (
                          <Pill color={TK.warn} title="Available in Vefogix marketplace">✅ Available</Pill>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-[2px] text-[12px] font-medium"
                            style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}
                            title="Not listed in Vefogix"
                          >
                            Not listed
                          </span>
                        )
                      }
                    />
                    {data?.vefogix?.offers?.length ? (
                      <div className="md:col-span-2">
                        <div className="text-xs text-gray-500">Available:</div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          {data.vefogix.offers.map((o, i) => (
                            <span
                              key={`${o.kind}-${i}`}
                              className="inline-flex items-center rounded-full border px-2 py-[2px]"
                              style={{ borderColor: TK.border, background: TK.chipBg, color: TK.text }}
                              title="Vefogix offering"
                            >
                              {o.kind}
                              {o.priceUSD ? <span className="ml-1 text-gray-500">– ${o.priceUSD}</span> : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* B) Link Metadata */}
              <section className="px-4 pb-1">
                <div className="rounded-lg border p-3" style={{ borderColor: TK.border }}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <MetaRow
                      icon={<LinkIcon className="h-4 w-4 text-gray-500" aria-hidden />}
                      label="Anchor Text"
                      content={
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate" title={data?.anchorText ?? ""}>
                            “{data?.anchorText ?? "—"}”
                          </span>
                          {data?.anchorText && (
                            <CopyButton
                              text={data.anchorText}
                              ariaLabel="Copy anchor text"
                              title="Copy anchor text"
                            />
                          )}
                        </div>
                      }
                    />
                    <MetaRow
                      icon={<ExternalLink className="h-4 w-4 text-gray-500" aria-hidden />}
                      label="Placement URL"
                      content={
                        <div className="flex items-center justify-between gap-2">
                          {data?.placementUrl ? (
                            <a
                              href={data.placementUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate underline"
                              style={{ color: TK.blue }}
                              title={data.placementUrl}
                            >
                              {middleTruncate(data.placementUrl, 54)}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                          <div className="flex items-center gap-1">
                            {data?.placementUrl && (
                              <CopyButton
                                text={data.placementUrl}
                                ariaLabel="Copy placement URL"
                                title="Copy placement URL"
                              />
                            )}
                          </div>
                        </div>
                      }
                    />
                    <MetaRow
                      icon={<InfoIcon className="h-4 w-4 text-gray-500" aria-hidden />}
                      label="WR Score"
                      content={
                        <div className="flex items-center gap-2" title={`WR Score ${data?.wrScore ?? 0}/100`}>
                          <TinyDonut value={data?.wrScore ?? 0} />
                          <span className="tabular-nums">{data?.wrScore ?? "—"}</span>
                          {(data?.wrScore ?? 0) >= 70 && (
                            <Flame className="ml-1 h-4 w-4 text-red-500" aria-label="High WR" aria-details="High WR" />
                          )}
                        </div>
                      }
                    />
                    <MetaRow
                      icon={<AlertTriangle className="h-4 w-4 text-gray-500" aria-hidden />}
                      label="Topical Category"
                      content={
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-[2px] text-xs"
                          style={{ borderColor: TK.border, background: TK.chipBg }}
                          title="Topical inferred via classifier"
                        >
                          {data?.category ?? "—"}
                        </span>
                      }
                    />
                    <MetaRow
                      icon={<InfoIcon className="h-4 w-4 text-gray-500" aria-hidden />}
                      label="Last Verified"
                      content={<span title="Last validation of link presence">{fmtDate(data?.lastVerifiedISO)}</span>}
                    />
                  </div>
                </div>
              </section>

              {/* C) Timeline chart */}
              <section className="p-4 pt-3">
                <div className="rounded-lg border p-3" style={{ borderColor: TK.border }}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Link Timeline</div>
                    <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <InfoIcon className="h-3.5 w-3.5" aria-hidden /> Hover points for state changes
                    </div>
                  </div>
                  <div className="h-[200px] w-full">
                    {!timeline.length ? (
                      <div
                        className="flex h-full items-center justify-center rounded border border-dashed text-sm text-gray-500"
                        style={{ borderColor: TK.border }}
                      >
                        No timeline available for this link yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeline} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                          <defs>
                            <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={TK.blue} stopOpacity={0.16} />
                              <stop offset="95%" stopColor={TK.blue} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke={TK.divider} strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(v) => fmtShort(new Date(v))}
                            tick={{ fontSize: 12, fill: TK.muted }}
                            axisLine={{ stroke: TK.divider }}
                            tickLine={false}
                            minTickGap={20}
                          />
                          <YAxis hide domain={[0, 1]} />
                          <RTooltip content={<SmartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="active"
                            stroke={TK.blue}
                            strokeWidth={2}
                            fill="url(#activeFill)"
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                          />
                          {timeline.map((t, i) =>
                            t.event ? (
                              <ReferenceDot
                                key={`evt-${i}`}
                                // x={t.date}
                                y={t.active}
                                r={4}
                                fill={t.event === "Broken" ? TK.danger : TK.warn}
                                stroke="#fff"
                                strokeWidth={1}
                              />
                            ) : null
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer actions (sticky) */}
        {!loading && !error && (
          <div className="sticky bottom-0 border-t bg-white px-4 py-3" style={{ borderColor: TK.border }}>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Primary CTA logic */}
              {data?.vefogix?.available ? (
                <ActionButton
                  icon={<Zap className="h-4 w-4" aria-hidden />}
                  label="Open in Vefogix"
                  variant="primary"
                  disabled={data?.permissions.role === "viewer"}
                  disabledTitle="Insufficient permissions"
                  onClick={() => {
                    const url = buildVefogixUrl(data.domain, projectId);
                    window.open(url, "_blank", "noopener,noreferrer");
                    console.info("cta_click", { id: data.id, domain: data.domain, action: "vefogix", projectId });
                  }}
                />
              ) : null}

              {/* Secondary actions */}
              <ActionButton
                icon={<ClipboardList className="h-4 w-4" aria-hidden />}
                label="Create Task"
                variant={data?.vefogix?.available ? "outline" : "primary"}
                disabled={data?.permissions.role === "viewer"}
                disabledTitle="Insufficient permissions"
                onClick={() => {
                  if (!data) return;
                  (onCreateTask || console.info)({
                    title: `Acquire link on ${data.domain} (${data.linkType})`,
                    context: {
                      domain: data.domain,
                      linkType: data.linkType,
                      anchorText: data.anchorText,
                      placementUrl: data.placementUrl,
                      competitor: data.competitor,
                      targetPath: data.targetPath,
                      wrScore: data.wrScore,
                      category: data.category,
                      status: data.status,
                    },
                  });
                  console.info("cta_click", { id: data.id, domain: data.domain, action: "task" });
                }}
              />

              <ActionButton
                icon={<ExternalLink className="h-4 w-4" aria-hidden />}
                label="Visit Link"
                variant="outline"
                disabled={!data?.placementUrl}
                disabledTitle={!data?.placementUrl ? "Link unavailable" : undefined}
                onClick={() => {
                  if (data?.placementUrl) {
                    window.open(data.placementUrl, "_blank", "noopener,noreferrer");
                    console.info("cta_click", { id: data.id, domain: data.domain, action: "visit" });
                  }
                }}
              />

              {/* <ActionButton label="Close" variant="ghost" onClick={onClose} /> */}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* --------------------------- Action Button --------------------------- */
function ActionButton({
  icon,
  label,
  onClick,
  variant = "primary",
  disabled,
  disabledTitle,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  disabledTitle?: string;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500";
  const cls =
    variant === "primary"
      ? "text-white hover:opacity-95"
      : variant === "outline"
      ? "border text-gray-800 hover:bg-gray-50"
      : "text-gray-700 hover:bg-gray-50";
  const style =
    variant === "primary"
      ? { backgroundColor: TK.brand }
      : variant === "outline"
      ? { borderColor: TK.border, background: "#fff" }
      : { background: "transparent" };
  return (
    <button
      type="button"
      className={classNames(base, cls, disabled ? "opacity-60 cursor-not-allowed" : "")}
      style={style as React.CSSProperties}
      onClick={!disabled ? onClick : undefined}
      aria-disabled={disabled}
      title={disabled ? disabledTitle : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ======================================================================
   DEMO WRAPPER (mock data) — Default export
   - Renders a button to open the drawer and wires deterministic mock data.
   - Remove this wrapper in production and import BacklinkViewerDrawer instead.
   ====================================================================== */

const BASE_TODAY_ISO = "2025-07-12T00:00:00.000Z"; // deterministic for SSR/CSR
const BASE_TODAY = new Date(BASE_TODAY_ISO);

function daysAgoIso(days: number) {
  const d = new Date(BASE_TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeMockTimeline(): Array<{ dateISO: string; active: 0 | 1; event?: LinkEvent }> {
  // Active most days, with a "Lost" 8 days ago and "Recovered" 6 days ago
  const out: Array<{ dateISO: string; active: 0 | 1; event?: LinkEvent }> = [];
  for (let i = 29; i >= 0; i--) {
    const iso = daysAgoIso(i);
    if (i === 8) out.push({ dateISO: iso, active: 0, event: "Lost" });
    else if (i === 6) out.push({ dateISO: iso, active: 1, event: "Recovered" });
    else out.push({ dateISO: iso, active: i < 8 && i > 6 ? 0 : 1 });
  }
  return out;
}

function makeMockBacklink(): BacklinkViewerModel {
  return {
    id: "mock-1",
    competitor: "comp1.com",
    domain: "example.com",
    faviconUrl: "",
    linkType: "Guest Post",
    targetPath: "/seo-guide",
    firstSeenISO: daysAgoIso(12),
    status: "Active",
    anchorText: "best SEO guide tools",
    placementUrl: "https://example.com/blog/best-seo-guide?ref=wranker",
    wrScore: 72,
    category: "Tech/Marketing",
    lastVerifiedISO: daysAgoIso(0),
    timeline: makeMockTimeline(),
    vefogix: {
      available: true,
      offers: [
        { kind: "Guest Post", priceUSD: 120 },
        { kind: "Link Insertion", priceUSD: 80 },
      ],
    },
    permissions: {
      role: "admin",
    },
  };
}

/**
 * Default export: a tiny demo scaffold so you immediately see the drawer.
 * - Click the button to open/close
 * - Uses deterministic mock data above
 */
export default function BacklinkViewerDrawerDemo() {
  const [open, setOpen] = useState(true);
  const data = useMemo(() => makeMockBacklink(), []);
  return (
<>
<BacklinkViewerDrawer
        open={open}
        onClose={() => setOpen(false)}
        data={data}
        projectId="demo-project-123"
        source="table"
        onCreateTask={(payload) => {
          console.info("Create Task (mock):", payload);
          alert(`Task created:\n${payload.title}`);
        }}
      />
</>
  );
}
