"use client";

import * as React from "react";
import {
  X,
  RefreshCw,
  ClipboardList,
  FlagTriangleRight,
  Shield,
  ExternalLink,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Wranker Tokens (light mode, per spec)
   ──────────────────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#1090D0",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  bg: "#FFFFFF",
  pastel: "#F5F7FA",
  success: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  emphasis: "#FB923C",
};

/* ────────────────────────────────────────────────────────────────────────────
   Types (Header-focused slice of LinkDetail)
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

export type LinkDetailHeaderData = {
  link_id: string;
  domain: string; // root
  favicon_url?: string;
  source_url?: string; // full
  status: LinkStatus;
  status_changed_at?: string; // ISO
  health_state: HealthState;
  health_reason?: string;
  link_type: LinkType;
  link_type_prev?: LinkType;
  link_type_changed_at?: string; // ISO
  disavowed?: boolean;
};

/* ────────────────────────────────────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────────────────────────────────────── */
function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export function truncateMiddle(str: string, start = 24, end = 18) {
  if (!str) return "";
  return str.length <= start + end
    ? str
    : `${str.slice(0, start)}…${str.slice(-end)}`;
}

export function extractPath(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path || "/";
  } catch {
    return url; // if not a full URL, return as-is
  }
}

export function isoToReadable(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Badge primitives (status / health / type)
   ──────────────────────────────────────────────────────────────────────────── */
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
  "status:active": {
    bg: "rgba(16,185,129,.14)",
    fg: TK.success,
    brd: "rgba(16,185,129,.35)",
  },
  "status:removed": {
    bg: "rgba(239,68,68,.14)",
    fg: TK.critical,
    brd: "rgba(239,68,68,.35)",
  },
  "status:broken": {
    bg: "rgba(239,68,68,.14)",
    fg: TK.critical,
    brd: "rgba(239,68,68,.35)",
  },
  "status:redirected": {
    bg: "rgba(251,146,60,.14)",
    fg: TK.emphasis,
    brd: "rgba(251,146,60,.35)",
  },
  "status:not_found": {
    bg: "rgba(239,68,68,.14)",
    fg: TK.critical,
    brd: "rgba(239,68,68,.35)",
  },
  "status:not_checked": {
    bg: "rgba(107,114,128,.14)",
    fg: TK.muted,
    brd: "rgba(107,114,128,.35)",
  },
  "health:healthy": {
    bg: "rgba(16,185,129,.14)",
    fg: TK.success,
    brd: "rgba(16,185,129,.35)",
  },
  "health:at_risk": {
    bg: "rgba(245,158,11,.14)",
    fg: TK.warn,
    brd: "rgba(245,158,11,.35)",
  },
  "health:toxic": {
    bg: "rgba(239,68,68,.14)",
    fg: TK.critical,
    brd: "rgba(239,68,68,.35)",
  },
  "type:default": {
    bg: "rgba(17,24,39,.06)",
    fg: TK.text,
    brd: "rgba(17,24,39,.08)",
  },
  "type:changed": {
    bg: "rgba(251,146,60,.14)",
    fg: TK.emphasis,
    brd: "rgba(251,146,60,.35)",
  },
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
        "inline-flex items-center gap-1 px-2 py-0.5 text-[12px] leading-5 rounded",
        "border",
        pulse && "animate-pulse",
      )}
      style={{
        background: tone.bg,
        color: tone.fg,
        borderColor: tone.brd,
      }}
    >
      <span className="tabular-nums">{label}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Tooltip (tiny, accessible)
   ──────────────────────────────────────────────────────────────────────────── */
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span className="relative inline-flex">
      <span className="peer focus:outline-none" tabIndex={0}>
        {children}
      </span>
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute z-[70] left-1/2 -translate-x-1/2 -translate-y-2",
          "mt-1 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0",
          "peer-hover:opacity-100 peer-focus:opacity-100",
        )}
      >
        {text}
      </span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Favicon (with fallback tile)
   ──────────────────────────────────────────────────────────────────────────── */
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
   LinkDetailHeader Component (sticky, header-only)
   ──────────────────────────────────────────────────────────────────────────── */
export function LinkDetailHeader({
  data,
  onClose,
  onRecheck,
  onCreateTask,
  onFlag,
  onOpenDisavow,
}: {
  data: LinkDetailHeaderData;
  onClose: () => void;
  onRecheck?: (linkId: string) => Promise<void> | void;
  onCreateTask?: (payload: { linkId: string; domain: string; sourceUrl?: string }) => void;
  onFlag?: (linkId: string) => void;
  onOpenDisavow?: (domain: string) => void;
}) {
  const [pending, setPending] = React.useState(false);

  const pathFull = extractPath(data.source_url);
  const pathShort = truncateMiddle(pathFull);

  const statusMap: Record<LinkStatus, { label: string; tone: keyof typeof badgeToneMap }>
    = {
    active: { label: "Active", tone: "status:active" },
    removed: { label: "Removed", tone: "status:removed" },
    broken: { label: "Broken (404)", tone: "status:broken" },
    redirected: { label: "Redirected", tone: "status:redirected" },
    not_found: { label: "Not Found", tone: "status:not_found" },
    not_checked: { label: "Not Checked", tone: "status:not_checked" },
  };

  const healthMap: Record<HealthState, { label: string; tone: keyof typeof badgeToneMap }>
    = {
    healthy: { label: "Healthy", tone: "health:healthy" },
    at_risk: { label: "At Risk", tone: "health:at_risk" },
    toxic: { label: "Toxic", tone: "health:toxic" },
  };

  const typeChanged = data.link_type_prev && data.link_type_prev !== data.link_type;
  const typeTone: keyof typeof badgeToneMap = typeChanged ? "type:changed" : "type:default";

  const recentStatusChange = React.useMemo(() => {
    if (!data.status_changed_at) return false;
    const changed = new Date(data.status_changed_at).getTime();
    const now = Date.now();
    return now - changed < 24 * 60 * 60 * 1000; // 24h
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

        {/* Identity cluster */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <Favicon domain={data.domain} src={data.favicon_url} />
            <a
              href={`https://${data.domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate text-[14px] font-semibold text-sky-700 hover:underline"
              aria-label={`Open domain ${data.domain} in a new tab`}
              style={{ color: TK.brand }}
              title={data.domain}
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
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open source URL in a new tab"
              className="block truncate text-[13px] text-slate-600 hover:underline"
              title={data.source_url}
              style={{ color: TK.muted }}
            >
              {pathShort}
            </a>
          )}
        </div>

        {/* Badges cluster */}
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
            label={
              typeChanged
                ? `${data.link_type.toUpperCase()} (changed)`
                : data.link_type.toUpperCase()
            }
            toneKey={typeTone}
            ariaLabel={`Link Type: ${data.link_type}`}
            title={
              typeChanged
                ? `Changed from ${data.link_type_prev?.toUpperCase()} on ${isoToReadable(
                    data.link_type_changed_at,
                  )}${data.link_type_changed_at ? ` • ${data.link_type_changed_at}` : ""}`
                : ""
            }
          />
        </div>

        {/* Actions cluster */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRecheck}
            disabled={pending}
            className={cx(
              "hidden h-9 items-center gap-2 rounded px-3 text-sm font-medium text-white md:inline-flex",
              "shadow-sm transition-colors",
            )}
            style={{ backgroundColor: TK.brand }}
            aria-label="Re-check now"
            title="Re-check now"
          >
            {pending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <RefreshCw size={16} />
            )}
            Re‑check now
          </button>

          <Tooltip text="Create Task">
            <button
              onClick={() => onCreateTask?.({ linkId: data.link_id, domain: data.domain, sourceUrl: data.source_url })}
              className="grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline"
              aria-label="Create Task"
            >
              <ClipboardList size={18} />
            </button>
          </Tooltip>

          <Tooltip text="Flag for Review">
            <button
              onClick={() => onFlag?.(data.link_id)}
              className="grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline"
              aria-label="Flag for Review"
            >
              <FlagTriangleRight size={18} />
            </button>
          </Tooltip>

          <Tooltip text={data.disavowed ? "Open Disavow Monitor (already added)" : "Open Disavow Monitor"}>
            <button
              onClick={() => onOpenDisavow?.(data.domain)}
              className="grid h-9 w-9 place-items-center rounded hover:bg-black/5 focus-visible:outline"
              aria-label="Disavow"
            >
              <Shield size={18} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

