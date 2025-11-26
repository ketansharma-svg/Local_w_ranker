// src/components/team/InviteConfirmationModal.tsx
"use client"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { resendInvite, selectResendCooldowns, type InviteConfirmIn } from "@/src/redux/reducer/teamReducer"

/* ===========================
   Small UI primitives (kept)
   =========================== */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "destructive"
    loading?: boolean
  }
>(function Button({ className = "", variant = "primary", loading = false, disabled, children, ...rest }, ref) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
  const styles: Record<string, string> = {
    primary: "bg-[#008CCD] text-white hover:bg-[#007DB3] focus:ring-[#008CCD]",
    secondary: "border border-[#EFF0F6] text-[#111827] hover:bg-[#F5F7FA] focus:ring-[#CBD5E1]",
    ghost: "text-[#111827] hover:bg-[#F5F7FA] focus:ring-[#CBD5E1]",
    destructive: "bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444]",
  }
  return (
    <button ref={ref} className={`${base} ${styles[variant]} ${className}`} disabled={loading || disabled} {...rest}>
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3A5 5 0 007 12H4z" />
        </svg>
      )}
      {children}
    </button>
  )
})
export const Badge: React.FC<{
  tone?: "good" | "warn" | "critical" | "neutral" | "brand"
  children: React.ReactNode
  className?: string
}> = ({ tone = "neutral", children, className = "" }) => {
  const map: Record<string, string> = {
    brand: "bg-[#E6F4FA] text-[#008CCD]",
    good: "bg-[#ECFDF5] text-[#10B981]",
    warn: "bg-[#FFFBEB] text-[#F59E0B]",
    critical: "bg-[#FEF2F2] text-[#EF4444]",
    neutral: "bg-[#F5F7FA] text-[#374151]",
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${map[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function downloadCsv(filename: string, rows: Array<Record<string, string>>) {
  if (!rows.length) return
  const header = Object.keys(rows[0])
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`
  const body = rows.map((r) => header.map((h) => esc(r[h] ?? "")).join(",")).join("\n")
  const csv = `${header.map(esc).join(",")}\n${body}`
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.setAttribute("download", filename)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* ===========================
   InviteConfirmModal
   =========================== */
type Props = {
  open: boolean
  data: InviteConfirmIn | null
  onClose: () => void
  onViewPending: (emails: string[]) => void
  onInviteMore: (prefillFailed: boolean) => void
  onOpenAccessEditor: (email: string) => void
  onEditAndReinvite: (failedEmails: string[]) => void
}

export const InviteConfirmModal: React.FC<Props> = ({
  open,
  data,
  onClose,
  onViewPending,
  onInviteMore,
  onOpenAccessEditor,
  onEditAndReinvite,
}) => {
  
  const dispatch = useDispatch()
  const globalCooldowns = useSelector(selectResendCooldowns)

  const [localCooldowns, setLocalCooldowns] = React.useState<Record<string, number>>({})
  const [toasts, setToasts] = React.useState<Array<{ id: string; text: string }>>([])
  const issuesRef = React.useRef<HTMLDivElement | null>(null)

  const success = data?.success ?? []
  const skipped = data?.skipped ?? []
  const hasIssues = skipped.length > 0

  // auto-scroll to issues when open & issues exist
  React.useEffect(() => {
    if (open && skipped.length)
      setTimeout(() => issuesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }, [open, skipped.length])

  // tick local cooldowns while modal is open
  React.useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setLocalCooldowns((prev) => {
        const next: Record<string, number> = {}
        Object.entries(prev).forEach(([k, v]) => {
          if (v > 1) next[k] = v - 1
        })
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  /* Helpers */
  const addToast = (text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500)
  }
  const copyEmails = (emails: string[]) => {
    navigator.clipboard?.writeText(emails.join("\n")).then(() => addToast(`Copied ${emails.length} email(s)`))
  }
  const exportSuccessCsv = () => {
    const rows = success.map((s) => ({ email: s.email, status: "Invited", notes: s.notes ?? "" }))
    downloadCsv("wranker-invite-success.csv", rows)
    addToast("Export ready (success list)")
  }
  const exportIssuesCsv = () => {
    const rows = skipped.map((s) => ({
      email: s.email,
      status: reasonBadgeText(s.reason),
      message: reasonToMessage(s.reason, s.message),
    }))
    downloadCsv("wranker-invite-issues.csv", rows)
    addToast("Export ready (issues list)")
  }

  const readCooldown = (key: string) => {
    return localCooldowns[key] ?? globalCooldowns[key] ?? 0
  }
  const canResend = (key: string) => readCooldown(key) <= 0

  /* Resend handler uses reducer thunk; updates local cooldown on success */
  const handleResend = async (email: string, invite_id?: string) => {
    const key = invite_id ?? email
    if (!canResend(key)) return
    try {
      const res = await (dispatch(resendInvite({ invite_id, email }) as any) as any).unwrap()
      const seconds = res?.cooldown ?? res?.resend_cooldown_seconds ?? res?.cooldown_seconds ?? 120
      setLocalCooldowns((prev) => ({ ...prev, [key]: seconds }))
      addToast(`Invite resent to ${email}`)
    } catch {
      addToast("Could not resend. Try again.")
    }
  }

  const expiryLine =
    typeof data?.invite_expiry_days === "number" && data.invite_expiry_days > 0
      ? `Invite links expire in ${data.invite_expiry_days} day${data.invite_expiry_days === 1 ? "" : "s"}.`
      : undefined

  return (
    <div
      className="fixed inset-0 z-[70] h-screen flex items-center justify-center bg-black/40 overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div className="relative z-[71] mx-4 w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-[#EFF0F6] px-6 py-4">
          <h2 id="invite-confirm-title" className="text-lg font-semibold">
            🎉 Invitations Sent!
          </h2>
          <p className="mt-1 text-sm text-[#4B5563]">
            Here’s a summary of your recent invite(s). {expiryLine ? <span className="ml-2">{expiryLine}</span> : null}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-[#EFF0F6] bg-[#ECFDF5] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-[#065F46]">✅ Successful Invites</div>
                  <div className="mt-1 text-2xl font-bold text-[#065F46]">{success.length}</div>
                  <div className="mt-1 text-xs text-[#065F46]/80">team member(s) invited</div>
                </div>
              </div>
            </div>

            {hasIssues && (
              <div className="rounded-md border border-[#EFF0F6] bg-[#FFFBEB] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#92400E]">⚠️ Failed / Skipped</div>
                    <div className="mt-1 text-2xl font-bold text-[#92400E]">{skipped.length}</div>
                    <div className="mt-1 text-xs text-[#92400E]/80">need review</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Successful table (UI identical) */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#111827]">Successful</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => copyEmails(success.map((s) => s.email))}>
                  Copy all emails
                </Button>
                <Button variant="secondary" onClick={exportSuccessCsv}>
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-[#EFF0F6]">
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
                      <tr key={row.email} className="border-t border-[#EFF0F6]">
                        <td
                          className="cursor-pointer px-4 py-2 text-[#111827] hover:underline"
                          title="Click to copy"
                          onClick={() => copyEmails([row.email])}
                        >
                          {row.email}
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone="good">Invited</Badge>
                        </td>
                        <td className="px-4 py-2 text-[#4B5563]">{row.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issues table (UI identical) */}
          {hasIssues && (
            <div className="mt-8" ref={issuesRef}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111827]">Issues</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => copyEmails(skipped.map((s) => s.email))}>
                    Copy failed emails
                  </Button>
                  <Button variant="secondary" onClick={exportIssuesCsv}>
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-[#EFF0F6]">
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
                      const key = row.invite_id ?? row.email
                      const cd = readCooldown(key)
                      const canResendNow = row.reason === "already_invited" && cd <= 0
                      return (
                        <tr key={row.email} className="border-t border-[#EFF0F6] align-middle">
                          <td
                            className="cursor-pointer px-4 py-2 text-[#111827] hover:underline"
                            title="Click to copy"
                            onClick={() => copyEmails([row.email])}
                          >
                            {row.email}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              tone={
                                row.reason === "invalid_email" || row.reason === "domain_blocked" ? "critical" : "warn"
                              }
                            >
                              {reasonBadgeText(row.reason)}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-[#4B5563]">{reasonToMessage(row.reason, row.message)}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.reason === "already_invited" && (
                                <Button
                                  variant="secondary"
                                  disabled={!canResendNow}
                                  onClick={() => handleResend(row.email, row.invite_id)}
                                  title={!canResendNow ? `Try again in ${formatSecs(cd)}` : "Resend invite"}
                                >
                                  {canResendNow ? "Resend" : `Resend (${formatSecs(cd)})`}
                                </Button>
                              )}

                              {row.reason === "already_active" && (
                                <Button variant="secondary" onClick={() => onOpenAccessEditor(row.email)}>
                                  Open Access Editor
                                </Button>
                              )}

                              {canOpenEditReinvite(row.reason) && (
                                <Button variant="secondary" onClick={() => onEditAndReinvite([row.email])}>
                                  Edit & Re-invite
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-[72] flex flex-wrap items-center justify-between gap-2 border-t border-[#EFF0F6] bg-white px-6 py-3">
          <div className="text-sm text-[#6B7280]" aria-live="polite">
            {success.length} sent{hasIssues ? ` · ${skipped.length} need review` : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onViewPending(success.map((s) => s.email))}>
              🔍 View Pending Invitations
            </Button>
            <Button variant="secondary" onClick={() => onInviteMore(hasIssues)}>
              ➕ Invite More Members
            </Button>
            <Button variant="primary" onClick={onClose}>
              ✅ Done
            </Button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto rounded-md bg-black/80 px-3 py-2 text-xs text-white shadow">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===========================
   Helpers (kept)
   =========================== */
function reasonBadgeText(reason: string) {
  switch (reason) {
    case "invalid_email":
      return "Failed"
    case "domain_blocked":
      return "Failed"
    case "plan_conflict":
    case "missing_role":
    case "missing_project":
      return "Failed"
    default:
      return "Skipped"
  }
}
function reasonToMessage(reason: string, serverMsg?: string) {
  if (serverMsg) return serverMsg
  switch (reason) {
    case "invalid_email":
      return "Invalid email format"
    case "duplicate_in_batch":
      return "Duplicate in this batch"
    case "already_invited":
      return "Invite already pending"
    case "already_active":
      return "Already a member"
    case "domain_blocked":
      return "Email domain not allowed"
    case "plan_conflict":
      return "Selected dashboards not available for project"
    case "missing_role":
      return "Missing role for selected dashboard"
    case "missing_project":
      return "No project selected"
    default:
      return "Unknown reason"
  }
}
function canOpenEditReinvite(reason: string) {
  return ["invalid_email", "domain_blocked", "plan_conflict", "missing_role", "missing_project"].includes(reason)
}
function formatSecs(s: number) {
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0")
  const ss = (s % 60).toString().padStart(2, "0")
  return `${mm}:${ss}`
}
