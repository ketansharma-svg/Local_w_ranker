import React, { useMemo } from "react";
import {
  Eye,
  Download,
  Link2,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  FileText,
} from "lucide-react";

/** Section 5 — Disavow Activity Monitor (Backlink Audit → Overview)
 * Tailwind-only, no UI deps. Icons: lucide-react
 * Update notes:
 * - Uses latest design tokens and Inter / Inter Fallback font stack
 * - Branded icon color (#008CCD) and metric value color (#0077ff)
 * - Pointer cursor on clickable elements
 * - Removed "Connect GSC" & "Upload to GSC" CTAs and the "You haven’t connected Google Search Console" prompt
 * - Removed header GSC status badge & the 4th "GSC Status" card
 * - No emoji
 */

const TOKENS = {
  colors: {
    brand: "#008CCD",
    metric: "#0077ff",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#E2E8F0",
    cardBg: "#FFFFFF",
    chipBg: "#F1F5F9",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#0284C7",
  },
  radii: {
    lg: "12px",
    md: "10px",
    sm: "8px",
  },
  shadow: "0 1px 2px rgba(16, 24, 40, 0.06)",
  fontStack:
    'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
};

type DisavowStats = {
  domainsDisavowed?: number;
  linksDisavowed?: number;
  lastExportAt?: string | Date;
  lastUploadAt?: string | Date;
  fileName?: string;
  fileDomains?: number;
  fileLinks?: number;
  formatValidated?: boolean;
  queueChangedCount?: number;
  uploadFailedReason?: string;
};

type GscState = {
  connected: boolean;
  error?: string;
};

type Props = {
  stats?: DisavowStats;
  gsc?: GscState;
  // Actions
  onViewQueue?: () => void;
  onExportFile?: () => void;

  // Intentionally retained in props for drop-in compatibility (unused in UI by request)
  onUploadToGSC?: () => void;
  onConnectGSC?: () => void;

  outdatedThresholdDays?: number;
  className?: string;
};

/* ---- helpers ---- */
const fmt = (n?: number) =>
  typeof n === "number" ? n.toLocaleString(undefined) : "—";

function parseDate(d?: string | Date) {
  if (!d) return undefined;
  return d instanceof Date ? d : new Date(d);
}

function fmtDate(d?: string | Date) {
  const dt = parseDate(d);
  return dt
    ? dt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
}

function daysSince(d?: string | Date) {
  const dt = parseDate(d);
  if (!dt) return undefined;
  const ms = Date.now() - dt.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* --- small primitives --- */
function StatCard({
  title,
  value,
  subtext,
  tooltip,
  Icon,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  tooltip?: string;
  Icon?: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}) {
  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{
        borderColor: TOKENS.colors.border,
        background: TOKENS.colors.cardBg,
        boxShadow: TOKENS.shadow,
      }}
      title={tooltip ?? title}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={16} color={TOKENS.colors.brand} /> : null}
        <div
          className="text-[13.5px] font-semibold"
          style={{ color: TOKENS.colors.text }}
        >
          {title}
        </div>
      </div>
      <div
        className="mt-1 text-[30px] font-extrabold leading-none"
        style={{ color: TOKENS.colors.metric }}
      >
        {value}
      </div>
      {subtext && (
        <div
          className="mt-1 text-[12.5px]"
          style={{ color: TOKENS.colors.textMuted }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}

function AlertBanner({
  severity,
  title,
  message,
}: {
  severity: "error" | "warn" | "info";
  title: string;
  message?: string;
}) {
  const map = {
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-600",
      Icon: AlertOctagon,
    },
    warn: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
      Icon: AlertTriangle,
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconColor: "text-blue-600",
      Icon: Info,
    },
  } as const;
  const { bg, border, iconColor, Icon } = map[severity];

  return (
    <div className={classNames("flex items-start gap-3 rounded-lg border px-3 py-2.5", bg, border)}>
      <Icon size={18} className={iconColor} />
      <div className="flex-1">
        <div
          className="text-[14px] font-semibold"
          style={{ color: TOKENS.colors.text }}
        >
          {title}
        </div>
        {message && (
          <div
            className="mt-0.5 text-[13px]"
            style={{ color: TOKENS.colors.textMuted }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

/* --- main component --- */
export default function DisavowActivityMonitor({
  stats,
  gsc,
  onViewQueue,
  onExportFile,
  // retained for compatibility but not used in UI:
  onUploadToGSC: _onUploadToGSC,
  onConnectGSC: _onConnectGSC,
  outdatedThresholdDays = 30,
  className,
}: Props) {
  const {
    domainsDisavowed = 24,
    linksDisavowed = 78,
    lastExportAt,
    lastUploadAt,
    fileName = "disavow_latest.txt",
    fileDomains = 24,
    fileLinks = 78,
    formatValidated = true,
    queueChangedCount = 0,
    uploadFailedReason,
  } = stats ?? {};

  const lastExportDays = daysSince(lastExportAt);
  const isOutdated =
    typeof lastExportDays === "number" && lastExportDays > outdatedThresholdDays;
  const hasQueueChanges = (queueChangedCount ?? 0) > 0;
  const uploadFailed = Boolean(uploadFailedReason);

  const lastExportBadge =
    isOutdated && lastExportDays !== undefined
      ? `${fmtDate(lastExportAt)} • ${lastExportDays}d ago`
      : fmtDate(lastExportAt);

  const fileBadges = useMemo(() => {
    const items: Array<{ label: string; color: string }> = [];
    if (isOutdated) items.push({ label: "Update recommended", color: TOKENS.colors.warning });
    if (hasQueueChanges) items.push({ label: "Changes not exported", color: TOKENS.colors.brand });
    return items;
  }, [isOutdated, hasQueueChanges]);

  return (
    <section className={className} style={{ fontFamily: TOKENS.fontStack }}>
      {/* Header row: title (GSC status badge removed by request) */}
      <div className="mb-3 flex items-center gap-2">
        <Link2 size={18} color={TOKENS.colors.brand} aria-hidden="true" />
        <h3
          className="text-[18px] font-semibold"
          style={{ color: TOKENS.colors.text }}
        >
          Disavow Activity Monitor
        </h3>
      </div>

      {/* Conditional alerts (no CTAs) */}
      <div className="flex flex-col gap-2">
        {isOutdated && (
          <AlertBanner
            severity="warn"
            title="Your disavow file may be outdated."
            message={`Last export was ${lastExportDays} day${lastExportDays === 1 ? "" : "s"} ago.`}
          />
        )}

        {hasQueueChanges && (
          <AlertBanner
            severity="info"
            title="New entries since the last export."
            message={`${queueChangedCount} item${queueChangedCount === 1 ? "" : "s"} pending. Export recommended.`}
          />
        )}

        {uploadFailed && (
          <AlertBanner
            severity="error"
            title="Last upload to GSC failed."
            message={uploadFailedReason}
          />
        )}
      </div>

      {/* Stat cards (4th GSC Status card removed) */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Domains Disavowed"
          value={fmt(domainsDisavowed)}
          subtext="Across all tabs"
          tooltip="Count of domains currently disavowed for this project."
          Icon={Link2}
        />
        <StatCard
          title="Links Disavowed"
          value={fmt(linksDisavowed)}
          subtext="Manually + auto disavowed"
          tooltip="Count of individual backlinks disavowed."
          Icon={Link2}
        />
        <StatCard
          title="Last File Export"
          value={lastExportBadge ?? "—"}
          subtext={isOutdated ? `Outdated (>${outdatedThresholdDays}d)` : "Generated for GSC"}
          tooltip="Date of the most recent disavow .txt file export."
          Icon={FileText}
        />
      </div>

      {/* File status box */}
      <div
        className="mt-3 rounded-xl border p-4 shadow-sm"
        style={{
          borderColor: TOKENS.colors.border,
          background: TOKENS.colors.cardBg,
          boxShadow: TOKENS.shadow,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} color={TOKENS.colors.brand} />
            <div
              className="text-[15px] font-semibold"
              style={{ color: TOKENS.colors.text }}
            >
              Disavow File Status
            </div>
          </div>

          {/* badges */}
          <div className="flex flex-wrap items-center gap-2">
            {fileBadges.map((b) => (
              <span
                key={b.label}
                className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{
                  background: TOKENS.colors.chipBg,
                  color: b.color,
                  border: `1px solid ${TOKENS.colors.border}`,
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: TOKENS.colors.border }}
          >
            <div className="text-[12px]" style={{ color: TOKENS.colors.textMuted }}>
              File Name
            </div>
            <div
              className="mt-0.5 text-[14px] font-medium"
              style={{ color: TOKENS.colors.text }}
            >
              {fileName}
            </div>
          </div>

          <div
            className="rounded-lg border p-3"
            style={{ borderColor: TOKENS.colors.border }}
          >
            <div className="text-[12px]" style={{ color: TOKENS.colors.textMuted }}>
              Entries
            </div>
            <div
              className="mt-0.5 text-[14px] font-medium"
              style={{ color: TOKENS.colors.text }}
            >
              {fmt(fileLinks)} links from {fmt(fileDomains)} domains
            </div>
          </div>

          <div
            className="rounded-lg border p-3"
            style={{ borderColor: TOKENS.colors.border }}
          >
            <div className="text-[12px]" style={{ color: TOKENS.colors.textMuted }}>
              Last Exported
            </div>
            <div
              className="mt-0.5 text-[14px] font-medium"
              style={{ color: TOKENS.colors.text }}
            >
              {fmtDate(lastExportAt)}
            </div>
          </div>

          <div
            className="rounded-lg border p-3"
            style={{ borderColor: TOKENS.colors.border }}
          >
            <div className="text-[12px]" style={{ color: TOKENS.colors.textMuted }}>
              Last Uploaded
            </div>
            <div
              className="mt-0.5 text-[14px] font-medium"
              style={{ color: TOKENS.colors.text }}
            >
              {fmtDate(lastUploadAt)}
              <span
                className="ml-2 text-[12px]"
                style={{ color: TOKENS.colors.textMuted }}
              >
                {gsc?.connected ? "(manual)" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]"
            style={{
              borderColor: TOKENS.colors.border,
              background: TOKENS.colors.chipBg,
              color: formatValidated ? TOKENS.colors.success : TOKENS.colors.danger,
            }}
            title={formatValidated ? "GSC-ready format" : "Invalid format"}
          >
            <CheckCircle2 size={14} />
            {formatValidated ? "Format Validated — GSC-ready" : "Format Not Valid"}
          </span>
        </div>
      </div>

      {/* Actions row (CTAs trimmed as requested) */}
      <div className="mt-3 flex flex-col items-stretch justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewQueue}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              borderColor: TOKENS.colors.border,
              background: TOKENS.colors.cardBg,
              color: TOKENS.colors.text,
            }}
            title="Open full disavow queue"
          >
            <Eye size={16} color={TOKENS.colors.brand} />
            <span>View Disavow Queue</span>
          </button>

          <button
            type="button"
            onClick={onExportFile}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              background: TOKENS.colors.brand,
              color: "#fff",
            }}
            title="Export disavow file (.txt)"
          >
            <Download size={16} color="#fff" />
            <span>Export File</span>
          </button>
        </div>

        {/* Right-side actions removed per request (Connect GSC & Upload to GSC) */}
        <div className="hidden sm:flex" />
      </div>
    </section>
  );
}

/* Named export for convenience */
export { DisavowActivityMonitor };
