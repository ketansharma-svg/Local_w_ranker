import React from "react";

/**
 * Wranker · Invite Confirmation Modal — Refined (drop‑in)
 * -------------------------------------------------------
 * Single-file demo you can drop into a React preview canvas.
 * Contains:
 * 1) Types (invite.ts)
 * 2) Mock API (invites.ts)
 * 3) Brand tokens, Icons, UI primitives (Button, StatusDot, useCountdown, downloadCsv)
 * 4) InviteConfirmModal (component)
 * 5) Demo harness (InviteConfirmDemo) + default App export
 */

/* =============================
   1) Types — invite.ts
   ============================= */
export type SkippedReason =
  | "invalid_email"
  | "duplicate_in_batch"
  | "already_invited"
  | "already_active"
  | "domain_blocked"
  | "plan_conflict"
  | "missing_role"
  | "missing_project"
  | "unknown";

export type InviteConfirmIn = {
  success: Array<{
    email: string;
    /** Optional: short role/dashboard summary e.g., "Editor — SEO; Viewer — Content" */
    notes?: string;
  }>;
  skipped: Array<{
    email: string;
    reason: SkippedReason;
    message?: string;
    resolvable?: boolean; // UI can show quick action when true
    /** Optional: backend-supplied invite_id (preferred for POST /invites/resend) */
    invite_id?: string;
  }>;
  invite_expiry_days?: number;
};

export type InviteResendResponse = {
  last_sent_at: string; // ISO
  expires_at?: string; // ISO
  resend_cooldown_seconds: number;
};

/* ==================================
   2) Mock API — invites.ts (demo only)
   ================================== */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const addSecs = (date: Date, secs: number) => new Date(date.getTime() + secs * 1000);

const invitesApi = {
  /** Demo-friendly resend handler. In prod, prefer: POST /invites/resend { invite_id } */
  async resendInvite(_inviteIdOrEmail: string): Promise<InviteResendResponse> {
    await sleep(650);
    const now = new Date();
    return {
      last_sent_at: now.toISOString(),
      expires_at: addSecs(now, 7 * 24 * 3600).toISOString(),
      resend_cooldown_seconds: 120,
    };
  },
};

/* ==========================================================
   3) Brand tokens, Icons, UI primitives & small utilities
   ========================================================== */

/** Brand tokens (from Wranker spec) */
const WR = {
  brand: "#1090D0",
  text: "#111827",
  subtleText: "#4B5563",
  border: "#EFF0F6",
  surface: "#FFFFFF",
  success: "#28C76F",
  warn: "#FF9F43",
  danger: "#EA5455",
  neutral: "#6C757D",
};

/** ————— 3a) Icon set — Wranker-styled inline SVGs (no emojis) ————— */
type IconProps = React.SVGProps<SVGSVGElement> & { className?: string };
const iconStroke = { strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const WrIconCheckCircle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" {...iconStroke} />
    <path d="M8 12.5l2.4 2.4L16.5 9" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconAlertTriangle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M10.6 4.7l-7 12A2 2 0 005.3 20h13.4a2 2 0 001.7-3.3l-7-12a2 2 0 00-3.4 0z" stroke="currentColor" {...iconStroke} />
    <path d="M12 9v4M12 16.5h.01" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconSearch = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" {...iconStroke} />
    <path d="M20 20l-3.2-3.2" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconPlus = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconCheck = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M5.5 12.5l4 4 9-9" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconCopy = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" {...iconStroke} />
    <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" opacity="0.6" {...iconStroke} />
  </svg>
);

const WrIconDownload = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconMailArrow = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M21 8.5v7a2 2 0 01-2 2H7a2 2 0 01-2-2V8.5" stroke="currentColor" {...iconStroke} />
    <path d="M5 7l7 5 7-5" stroke="currentColor" {...iconStroke} />
    <path d="M12 3.5h6m0 0l-2.2 2m2.2-2l-2.2-2" stroke="currentColor" {...iconStroke} />
  </svg>
);

const WrIconClock = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" {...iconStroke} />
    <path d="M12 7v5l3 2" stroke="currentColor" {...iconStroke} />
  </svg>
);

/** ————— 3b) Buttons — modular CTAs ————— */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { className = "", variant = "primary", size = "md", loading = false, disabled, iconLeft, iconRight, children, ...rest },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes: Record<NonNullable<BtnProps["size"]>, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-3.5 py-2",
  };
  const styles: Record<NonNullable<BtnProps["variant"]>, string> = {
    primary: `bg-[${WR.brand}] text-white hover:opacity-95 focus:ring-[${WR.brand}]`,
    secondary: `border border-[${WR.border}] text-[${WR.text}] bg-white hover:bg-[#F5F7FA] focus:ring-[#CBD5E1]`,
    ghost: `text-[${WR.text}] hover:bg-[#F5F7FA] focus:ring-[#CBD5E1]`,
    destructive: `bg-[${WR.danger}] text-white hover:opacity-95 focus:ring-[${WR.danger}]`,
  };
  return (
    <button
      ref={ref}
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
      disabled={loading || disabled}
      {...rest}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3A5 5 0 007 12H4z" />
        </svg>
      ) : (
        iconLeft ?? null
      )}
      <span>{children}</span>
      {iconRight ?? null}
    </button>
  );
});

/** ————— 3c) StatusDot — colored dot + label (no bg fills) ————— */
export const StatusDot: React.FC<{
  color?: "success" | "warn" | "danger" | "neutral" | "brand";
  label: string;
  className?: string;
}> = ({ color = "neutral", label, className = "" }) => {
  const map: Record<string, string> = {
    brand: WR.brand,
    success: WR.success,
    warn: WR.warn,
    danger: WR.danger,
    neutral: WR.neutral,
  };
  const c = map[color];
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-[${WR.text}] ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: c, boxShadow: `0 0 0 1px rgba(0,0,0,0.04)` }}
      />
      <span className="text-[#111827]">{label}</span>
    </span>
  );
};

/** ————— 3d) Hooks & utils ————— */
export function useCountdown(initialSeconds: number, isActive: boolean) {
  const [secs, setSecs] = React.useState(initialSeconds);
  React.useEffect(() => {
    if (!isActive) return;
    setSecs(initialSeconds);
  }, [initialSeconds, isActive]);

  React.useEffect(() => {
    if (!isActive || secs <= 0) return;
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [isActive, secs]);

  const mm = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");

  return { secs, mm, ss, active: isActive && secs > 0 };
}

export function downloadCsv(filename: string, rows: Array<Record<string, string>>) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]);
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => header.map((h) => esc(r[h] ?? "")).join(",")).join("\n");
  const csv = `${header.map(esc).join(",")}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ==================================================
   4) Invite Confirmation Modal — component
   ================================================== */

type InviteConfirmModalProps = {
  open: boolean;
  data: InviteConfirmIn | null;
  onClose: () => void;
  /** Jump to Pending tab with success emails pre-filtered */
  onViewPending: (emails: string[]) => void;
  /** Re-open Invite modal. If prefillFailed=true, prefill with failed/skipped emails */
  onInviteMore: (prefillFailed: boolean) => void;
  /** Open Members table filtered by email & open Access Drawer */
  onOpenAccessEditor: (email: string) => void;
  /** Re-open Invite modal prefilled with failed emails & last settings (caller supplies) */
  onEditAndReinvite: (failedEmails: string[]) => void;
};

type RowCooldown = { secs: number; until: number };

export const InviteConfirmModal: React.FC<InviteConfirmModalProps> = ({
  open,
  data,
  onClose,
  onViewPending,
  onInviteMore,
  onOpenAccessEditor,
  onEditAndReinvite,
}) => {
  const [cooldowns, setCooldowns] = React.useState<Record<string, RowCooldown>>({});
  const [toasts, setToasts] = React.useState<Array<{ id: string; text: string }>>([]);
  const issuesRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (open && data?.skipped?.length) {
      setTimeout(() => issuesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [open, data?.skipped?.length]);

  React.useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      setCooldowns((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const [email, cd] of Object.entries(prev)) {
          const remaining = Math.max(0, Math.ceil((cd.until - now) / 1000));
          if (remaining > 0) next[email] = { secs: remaining, until: cd.until };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const success = data?.success ?? [];
  const skipped = data?.skipped ?? [];
  const hasIssues = skipped.length > 0;

  const addToast = (text: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };

  const copyEmails = (emails: string[]) => {
    navigator.clipboard?.writeText(emails.join("\n")).then(() => addToast(`Copied ${emails.length} email(s)`));
  };

  const exportSuccessCsv = () => {
    const rows = success.map((s) => ({ email: s.email, status: "Invited", notes: s.notes ?? "" }));
    downloadCsv("wranker-invite-success.csv", rows);
    addToast("Export ready (success list)");
  };

  const exportIssuesCsv = () => {
    const rows = skipped.map((s) => ({
      email: s.email,
      status: reasonBadgeText(s.reason),
      message: reasonToMessage(s.reason, s.message),
    }));
    downloadCsv("wranker-invite-issues.csv", rows);
    addToast("Export ready (issues list)");
  };

  const canResend = (email: string) => !cooldowns[email];

  const handleResend = async (email: string, invite_id?: string) => {
    if (!canResend(email)) return;
    try {
      const res = await invitesApi.resendInvite(invite_id ?? email);
      const until = Date.now() + res.resend_cooldown_seconds * 1000;
      setCooldowns((prev) => ({ ...prev, [email]: { secs: res.resend_cooldown_seconds, until } }));
      addToast(`Invite resent to ${email}`);
    } catch (e) {
      addToast("Could not resend. Try again.");
    }
  };

  const expiryLine =
    typeof data?.invite_expiry_days === "number" && data.invite_expiry_days > 0
      ? `Invite links expire in ${data.invite_expiry_days} day${data.invite_expiry_days === 1 ? "" : "s"}.`
      : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-confirm-title"
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ fontFamily: `"intern", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial` }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal shell */}
      <div className="relative z-[71] mx-4 w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-[rgb(239,240,246)]">
        {/* Header */}
        <div className="border-b border-[rgb(239,240,246)] px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ color: WR.brand, background: "rgba(16,144,208,0.08)" }}
              aria-hidden="true"
            >
              <WrIconCheckCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 id="invite-confirm-title" className="text-lg font-semibold text-[#111827]">
                Invitations Sent
              </h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                Here’s a summary of your recent invite(s).
                {expiryLine ? <span className="ml-2">{expiryLine}</span> : null}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-[rgb(239,240,246)] bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-[#111827]">
                  <span className="inline-flex h-5 w-5 items-center justify-center text-[color:var(--ok,#28C76F)]" style={{ color: WR.success }}>
                    <WrIconCheckCircle className="h-4 w-4" />
                  </span>
                  Successful Invites
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">{success.length}</span>
                <StatusDot color="success" label="Invited" />
              </div>
              <div className="mt-1 text-xs text-[#6B7280]">team member(s)</div>
            </div>

            {hasIssues && (
              <div className="rounded-md border border-[rgb(239,240,246)] bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#111827]">
                    <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: WR.warn }}>
                      <WrIconAlertTriangle className="h-4 w-4" />
                    </span>
                    Needs Review
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#111827]">{skipped.length}</span>
                  <StatusDot color="warn" label="Skipped/Failed" />
                </div>
                <div className="mt-1 text-xs text-[#6B7280]">invites requiring attention</div>
              </div>
            )}
          </div>

          {/* Success table */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#111827]">Successful</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => copyEmails(success.map((s) => s.email))} iconLeft={<WrIconCopy className="h-4 w-4" />}>
                  Copy emails
                </Button>
                <Button variant="secondary" size="sm" onClick={exportSuccessCsv} iconLeft={<WrIconDownload className="h-4 w-4" />}>
                  Export CSV
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-[rgb(239,240,246)]">
              <table className="w-full text-left">
                <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {success.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-[#6B7280]">
                        No successful invites in this batch.
                      </td>
                    </tr>
                  ) : (
                    success.map((row) => (
                      <tr key={row.email} className="border-t border-[rgb(239,240,246)]">
                        <td
                          className="cursor-pointer px-4 py-2 text-[#111827] hover:underline"
                          title="Click to copy"
                          onClick={() => copyEmails([row.email])}
                        >
                          {row.email}
                        </td>
                        <td className="px-4 py-2">
                          <StatusDot color="success" label="Invited" />
                        </td>
                        <td className="px-4 py-2 text-[#4B5563]">{row.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issues table */}
          {hasIssues && (
            <div className="mt-8" ref={issuesRef}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111827]">Issues</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyEmails(skipped.map((s) => s.email))} iconLeft={<WrIconCopy className="h-4 w-4" />}>
                    Copy failed emails
                  </Button>
                  <Button variant="secondary" size="sm" onClick={exportIssuesCsv} iconLeft={<WrIconDownload className="h-4 w-4" />}>
                    Export CSV
                  </Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-md border border-[rgb(239,240,246)]">
                <table className="w-full text-left">
                  <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                    <tr>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Error Message</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {skipped.map((row) => {
                      const cd = cooldowns[row.email];
                      const canResendNow = row.reason === "already_invited" && (!cd || cd.secs <= 0);
                      const tone =
                        row.reason === "invalid_email" ||
                        row.reason === "domain_blocked" ||
                        row.reason === "plan_conflict" ||
                        row.reason === "missing_role" ||
                        row.reason === "missing_project"
                          ? ("danger" as const)
                          : row.reason === "unknown"
                          ? ("neutral" as const)
                          : ("warn" as const);
                      return (
                        <tr key={row.email} className="border-t border-[rgb(239,240,246)] align-middle">
                          <td
                            className="cursor-pointer px-4 py-2 text-[#111827] hover:underline"
                            title="Click to copy"
                            onClick={() => copyEmails([row.email])}
                          >
                            {row.email}
                          </td>
                          <td className="px-4 py-2">
                            <StatusDot color={tone} label={reasonBadgeText(row.reason)} />
                          </td>
                          <td className="px-4 py-2 text-[#4B5563]">{reasonToMessage(row.reason, row.message)}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.reason === "already_invited" && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={!canResendNow}
                                  onClick={() => handleResend(row.email, row.invite_id)}
                                  title={!canResendNow ? `Try again in ${formatSecs(cd?.secs ?? 0)}` : "Resend invite"}
                                  iconLeft={<WrIconMailArrow className="h-4 w-4" />}
                                >
                                  {canResendNow ? "Resend" : (
                                    <span className="inline-flex items-center gap-1">
                                      Resend <span className="inline-flex items-center gap-1 text-[#6B7280]"><WrIconClock className="h-4 w-4" />{formatSecs(cd?.secs ?? 0)}</span>
                                    </span>
                                  )}
                                </Button>
                              )}
                              {row.reason === "already_active" && (
                                <Button variant="secondary" size="sm" onClick={() => onOpenAccessEditor(row.email)}>
                                  Open Access Editor
                                </Button>
                              )}
                              {canOpenEditReinvite(row.reason) && (
                                <Button variant="secondary" size="sm" onClick={() => onEditAndReinvite([row.email])}>
                                  Edit &amp; Re‑invite
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-[72] flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(239,240,246)] bg-white px-6 py-3">
          <div className="text-sm text-[#6B7280]" aria-live="polite">
            {success.length} sent{hasIssues ? ` · ${skipped.length} need review` : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => onViewPending(success.map((s) => s.email))}
              iconLeft={<WrIconSearch className="h-4 w-4" />}
            >
              View Pending Invitations
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onInviteMore(hasIssues /* prefill failed when true */)}
              iconLeft={<WrIconPlus className="h-4 w-4" />}
            >
              Invite More Members
            </Button>
            <Button variant="primary" size="md" onClick={onClose} iconLeft={<WrIconCheck className="h-4 w-4" />}>
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Toaster */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto rounded-md bg-black/80 px-3 py-2 text-xs text-white shadow">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
};

// ——— helpers ———
function reasonBadgeText(reason: SkippedReason) {
  switch (reason) {
    case "invalid_email":
      return "Failed";
    case "duplicate_in_batch":
      return "Skipped";
    case "already_invited":
      return "Skipped";
    case "already_active":
      return "Skipped";
    case "domain_blocked":
      return "Failed";
    case "plan_conflict":
      return "Failed";
    case "missing_role":
      return "Failed";
    case "missing_project":
      return "Failed";
    default:
      return "Skipped";
  }
}

function reasonToMessage(reason: SkippedReason, serverMsg?: string) {
  if (serverMsg) return serverMsg;
  switch (reason) {
    case "invalid_email":
      return "Invalid email format";
    case "duplicate_in_batch":
      return "Duplicate in this batch";
    case "already_invited":
      return "Invite already pending";
    case "already_active":
      return "Already a member";
    case "domain_blocked":
      return "Email domain not allowed";
    case "plan_conflict":
      return "Selected dashboards not available for project";
    case "missing_role":
      return "Missing role for selected dashboard";
    case "missing_project":
      return "No project selected";
    default:
      return "Unknown reason";
  }
}

function canOpenEditReinvite(reason: SkippedReason) {
  return ["invalid_email", "domain_blocked", "plan_conflict", "missing_role", "missing_project"].includes(reason);
}

function formatSecs(s: number) {
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/* ==================================
   5) Demo Harness — InviteConfirmDemo
   ================================== */
const sampleData: InviteConfirmIn = {
  success: [
    { email: "john@agency.com", notes: "Viewer — Reporting" },
    { email: "jane@agency.com", notes: "Editor — SEO; Viewer — Content" },
    { email: "alex@company.com", notes: "Admin — TaskBoard" },
    { email: "nina@org.org", notes: "Viewer — All" },
  ],
  skipped: [
    { email: "steve@agency.com", reason: "already_invited", message: "Invite already pending", resolvable: true, invite_id: "inv_123" },
    { email: "ali@client.com", reason: "invalid_email", message: "Invalid email format", resolvable: true },
  ],
  invite_expiry_days: 7,
};

export const InviteConfirmDemo: React.FC = () => {
  const [open, setOpen] = React.useState(true);

  return (
<>
      {/* <h3 className="text-base font-semibold text-[#111827]">Final Invite Confirmation Modal — Demo</h3>
      <p className="text-sm text-[#4B5563]">Click the button to open a prefilled confirmation modal.</p> */}
      {/* <Button onClick={() => setOpen(true)} variant="primary" size="md" iconLeft={<WrIconCheckCircle className="h-4 w-4" />}>
        Open Confirmation
      </Button> */}

      <InviteConfirmModal
        open={open}
        data={sampleData}
        onClose={() => setOpen(false)}
        onViewPending={(emails) => {
          console.log("View Pending for emails:", emails);
          alert(`Would navigate to Pending tab with ${emails.length} success email(s)`);
          setOpen(false);
        }}
        onInviteMore={(prefillFailed) => {
          console.log("Invite More clicked. Prefill failed?", prefillFailed);
          alert(prefillFailed ? "Reopen Invite modal prefilled with failed emails" : "Reopen empty Invite modal");
          setOpen(false);
        }}
        onOpenAccessEditor={(email) => {
          console.log("Open Access Editor for:", email);
          alert(`Open Members table filtered by ${email} & open Access Drawer`);
          setOpen(false);
        }}
        onEditAndReinvite={(failedEmails) => {
          console.log("Edit & Re-invite for:", failedEmails);
          alert(`Reopen Invite modal with: ${failedEmails.join(", ")}`);
          setOpen(false);
        }}
      />
    </>
  );
};

/* Default export for canvas preview */
export default function App({ onClose }: { onClose: () => void }) {
  return (

      <InviteConfirmDemo />
  );
}
