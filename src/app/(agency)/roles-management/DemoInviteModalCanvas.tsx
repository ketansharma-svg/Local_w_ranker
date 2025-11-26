import React, { useEffect, useMemo, useRef, useState } from "react";
import App from "./App";
import { set } from "date-fns";

/**
 * Wranker · Team & Roles – Invite Member Modal (Drop‑in TSX, refined)
 * -------------------------------------------------------------------
 * - Fonts: "Intern", Inter fallback
 * - Icons: Wranker branded inline SVGs (no emojis)
 * - Toggle OFF: darker border for better visibility
 * - CTAs: modular Button component (primary/outline/ghost, sm/md/lg)
 *
 * To preview quickly, this file includes:
 *  - TokensStyle (inlined CSS tokens)
 *  - Lightweight icon set (stroke-based, brand-aware)
 *  - Button component (modular CTAs)
 *  - Mock API (fetchProjects, fetchFeatureFlags, postInvites)
 *  - InviteConfirmModal + InviteMemberModal
 *  - DemoInviteModalCanvas (example host)
 *
 * In your repo, split into respective files without changing logic.
 */

/* ──────────────────────────────────────────────────────────────────────────
   1) Styles (tokens + components) — refined
   ────────────────────────────────────────────────────────────────────────── */
const TokensStyle: React.FC = () => (
  <style>{`
  :root{
    --wr-font: "Intern","Inter",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
    --wr-brand:#008ccd; --wr-brand-hover:#007db3; --wr-value-blue:#0077ff;
    --wr-good:#10b981; --wr-info:#3b82f6; --wr-warning:#f59e0b; --wr-critical:#ef4444;
    --wr-text:#111827; --wr-text-muted:#6b7280; --wr-bg:#ffffff; --wr-surface:#f9fafb;
    --wr-line:#eff0f6; --wr-line-strong:#d1d5db;
    --wr-chip:#f5f7fa; --wr-chip-hover:#e5e7eb;
    --wr-radius:6px; --wr-focus:0 0 0 2px rgba(0,140,205,.35);
  }
  html,body,#root{height:100%}
  body{font-family:var(--wr-font); color:var(--wr-text); background:var(--wr-surface);}

  /* Modal shell */
  .wr-modal-overlay{position:fixed;inset:0;background:rgba(17,24,39,.5);display:flex;align-items:center;justify-content:center;z-index:1000}
  .wr-modal{width:min(760px,96vw);max-height:92vh;background:var(--wr-bg);border-radius:var(--wr-radius);box-shadow:0 10px 30px rgba(0,0,0,.18);display:flex;flex-direction:column}
  .wr-modal-header{padding:16px 20px;border-bottom:1px solid var(--wr-line);display:flex;align-items:center;justify-content:space-between}
  .wr-modal-title{font-weight:700;font-size:16px;color:var(--wr-text);display:flex;align-items:center;gap:8px}
  .wr-modal-subtext{font-size:12px;color:var(--wr-text-muted);margin-top:4px}
  .wr-modal-body{padding:16px 20px;overflow:auto;gap:16px;display:flex;flex-direction:column}
  .wr-modal-footer{border-top:1px solid var(--wr-line);padding:12px 20px;display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:var(--wr-bg)}

  /* Buttons (modular CTAs) */
  .wr-btn{--padY:8px;--padX:12px;--font:14px;--rad:var(--wr-radius); --bdc:transparent;
    border-radius:var(--rad);padding:var(--padY) var(--padX);font-weight:700;font-size:var(--font);
    cursor:pointer;border:1px solid var(--bdc);display:inline-flex;gap:8px;align-items:center;line-height:1; user-select:none;
    transition:background .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease;
  }
  .wr-btn:focus{outline:none;box-shadow:var(--wr-focus)}
  .wr-btn[disabled], .wr-btn[aria-disabled="true"]{opacity:.6;cursor:not-allowed}
  .wr-btn-primary{background:var(--wr-brand);color:#fff;border-color:transparent}
  .wr-btn-primary:hover{background:var(--wr-brand-hover)}
  .wr-btn-outline{background:#fff;border-color:var(--wr-line);color:var(--wr-text)}
  .wr-btn-outline:hover{background:var(--wr-chip)}
  .wr-btn-ghost{background:transparent;color:var(--wr-text-muted)}
  .wr-btn-ghost:hover{background:var(--wr-chip);color:var(--wr-text)}
  .wr-btn--sm{--padY:6px;--padX:10px;--font:12px}
  .wr-btn--md{--padY:8px;--padX:12px;--font:14px}
  .wr-btn--lg{--padY:10px;--padX:14px;--font:15px}
  .wr-btn-icon{width:32px;height:32px;display:inline-grid;place-items:center;padding:0;border-radius:8px}

  /* Fields */
  .wr-field{display:flex;flex-direction:column;gap:8px}
  .wr-label{font-size:12px;color:var(--wr-text);font-weight:700}
  .wr-hint{font-size:12px;color:var(--wr-text-muted)}
  .wr-error{font-size:12px;color:var(--wr-critical)}
  .wr-mini-note{font-size:12px;color:var(--wr-text-muted)}

  /* Chips & badges */
  .wr-chiplist{display:flex;gap:8px;flex-wrap:wrap}
  .wr-chip-item{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;background:var(--wr-chip);border:1px solid var(--wr-line);border-radius:999px;font-size:12px;color:var(--wr-text)}
  .wr-chip-item button{border:none;background:transparent;cursor:pointer;color:var(--wr-text-muted)}
  .wr-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}
  .b-good{background:rgba(16,185,129,.12);color:var(--wr-good)}
  .b-warn{background:rgba(245,158,11,.12);color:var(--wr-warning)}
  .b-crit{background:rgba(239,68,68,.12);color:var(--wr-critical)}
  .b-info{background:rgba(59,130,246,.12);color:var(--wr-info)}
  .b-neutral{background:var(--wr-chip);color:var(--wr-text-muted)}

  /* Inputs */
  .wr-input,.wr-textarea,.wr-select{width:100%;border-radius:var(--wr-radius);border:1px solid var(--wr-line);background:#fff;padding:10px 12px;font-size:14px;color:var(--wr-text)}
  .wr-textarea{min-height:72px;resize:vertical}
  .wr-input:focus,.wr-textarea:focus,.wr-select:focus{outline:none;box-shadow:var(--wr-focus)}

  /* Layout helpers */
  .wr-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media (max-width:720px){.wr-row{grid-template-columns:1fr}}
  .wr-grid{border:1px solid var(--wr-line);border-radius:var(--wr-radius)}
  .wr-grid-row{display:grid;grid-template-columns:220px 120px 1fr;gap:12px;padding:10px 12px;align-items:center;border-top:1px solid var(--wr-line)}
  .wr-grid-row:first-child{border-top:none}
  .wr-row-title{display:flex;align-items:center;gap:8px;font-weight:700}
  .wr-divider{height:1px;background:var(--wr-line);margin:8px 0}

  /* Toggle (refined OFF state border) */
  .wr-toggle{display:inline-flex;align-items:center;gap:10px;cursor:pointer}
  .wr-switch{width:40px;height:22px;background:var(--wr-chip);border-radius:999px;position:relative;transition:.2s;border:1px solid var(--wr-line-strong)}
  .wr-switch.on{background:rgba(0,140,205,0.18);border-color:var(--wr-brand)}
  .wr-switch .dot{position:absolute;top:2px;left:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.12)}
  .wr-switch.on .dot{left:20px}

  /* Icons */
  .wr-icon{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:currentColor}
  .wr-icon svg{width:18px;height:18px;display:block;stroke:currentColor}
  `}</style>
);

/* ──────────────────────────────────────────────────────────────────────────
   2) Icon set — Wranker-styled (no emojis)
   ────────────────────────────────────────────────────────────────────────── */
type IconProps = { size?: number; className?: string; strokeWidth?: number };

const ico = (d: React.ReactNode, props: IconProps = {}) => {
  const { size = 18, className = "wr-icon", strokeWidth = 1.8 } = props;
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
        {d}
      </svg>
    </span>
  );
};

const IconClose = (p?: IconProps) => ico(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, p || {});
const IconCheck = (p?: IconProps) => ico(<polyline points="20 6 9 17 4 12" />, p || {});
const IconCheckCircle = (p?: IconProps) => ico(<><circle cx="12" cy="12" r="9"/><polyline points="16 9 11 14 8 11"/></>, p || {});
const IconAlert = (p?: IconProps) => ico(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, p || {});
const IconInfo = (p?: IconProps) => ico(<><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>, p || {});
const IconPlus = (p?: IconProps) => ico(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, p || {});
const IconUserPlus = (p?: IconProps) => ico(<><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></>, p || {});
const IconMailSend = (p?: IconProps) => ico(<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>, p || {});
const IconCopy = (p?: IconProps) => ico(<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>, p || {});
const IconSearch = (p?: IconProps) => ico(<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, p || {});
const IconLock = (p?: IconProps) => ico(<><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>, p || {});
const IconGrid = (p?: IconProps) => ico(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>, p || {});
const IconCheckBadge = (p?: IconProps) => ico(<><path d="M7.5 4.21 12 2l4.5 2.21L20 7.5l-.82 5.12L16 16.5l-4 1.5-4-1.5-3.18-3.88L4 7.5l3.5-3.29Z"/><polyline points="9 11 11 13 15 9"/></>, p || {});
const IconXCircle = (p?: IconProps) => ico(<><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>, p || {});
const IconExternal = (p?: IconProps) => ico(<><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>, p || {});

/* ──────────────────────────────────────────────────────────────────────────
   3) Button (modular CTAs)
   ────────────────────────────────────────────────────────────────────────── */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};
const Button: React.FC<ButtonProps> = ({ variant="outline", size="md", iconLeft, iconRight, children, className="", ...rest }) => (
  <button className={`wr-btn wr-btn-${variant} wr-btn--${size} ${className}`} {...rest}>
    {iconLeft}{children && <span>{children}</span>}{iconRight}
  </button>
);

/* ──────────────────────────────────────────────────────────────────────────
   4) Types
   ────────────────────────────────────────────────────────────────────────── */
type DashboardKey = "seo" | "content" | "reporting" | "taskboard";
type PredefRole = "admin" | "editor" | "viewer";
type DashboardAccess = { dashboard: DashboardKey; enabled: boolean; role: PredefRole };
type InvitePayload = {
  emails: string[];
  project_ids: string[];
  access: DashboardAccess[];
  apply_same_roles_across_projects: boolean;
  message?: string;
  invite_expiry_days?: number;
};
type InviteConfirmSuccess = { email: string; notes?: string };
type InviteIssueReason =
  | "invalid_email" | "duplicate_in_batch" | "already_invited" | "already_active"
  | "domain_blocked" | "plan_conflict" | "missing_role" | "missing_project" | "unknown";
type InviteConfirmIssue = { email: string; reason: InviteIssueReason; message?: string; resolvable?: boolean };
type InviteConfirmIn = { success: InviteConfirmSuccess[]; skipped: InviteConfirmIssue[]; invite_expiry_days?: number };
type Project = { id: string; name: string; is_shared?: boolean; modules: DashboardKey[] };
type FeatureFlags = { taskboard_view_only?: boolean };
type EmailChip = { id: string; value: string; status: "valid"|"invalid"|"duplicate"|"already_invited"|"already_active"|"domain_blocked" };

/* ──────────────────────────────────────────────────────────────────────────
   5) Utils (email)
   ────────────────────────────────────────────────────────────────────────── */
const isValidEmail = (email: string) => {
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return re.test(String(email).trim());
};
const parseEmails = (input: string) => {
  if (!input) return [];
  return input.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
};
const chipStatusFromValue = (value: string): EmailChip["status"] => {
  if (!isValidEmail(value)) return "invalid";
  if (value.includes("+invited@")) return "already_invited";
  if (value.includes("+active@")) return "already_active";
  if (value.endsWith("@blocked.com")) return "domain_blocked";
  return "valid";
};

/* ──────────────────────────────────────────────────────────────────────────
   6) Mock API
   ────────────────────────────────────────────────────────────────────────── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function fetchProjects(): Promise<Project[]> {
  await sleep(250);
  return [
    { id: "p1", name: "wranker.com", modules: ["seo","content","reporting","taskboard"] },
    { id: "p2", name: "app.w3era.com", modules: ["seo","reporting"] },
    { id: "p3", name: "client.alpha", modules: ["content","reporting"] },
  ];
}
async function fetchFeatureFlags(): Promise<FeatureFlags> {
  await sleep(150);
  return { taskboard_view_only: false };
}
async function postInvites(payload: InvitePayload): Promise<InviteConfirmIn> {
  await sleep(600);
  const successes: InviteConfirmSuccess[] = [];
  const skipped: InviteConfirmIssue[] = [];
  const allOff = payload.access.every((a) => !a.enabled);

  for (const email of payload.emails) {
    let reason: InviteIssueReason | null = null;
    if (!isValidEmail(email)) reason = "invalid_email";
    else if (email.includes("+invited@")) reason = "already_invited";
    else if (email.includes("+active@")) reason = "already_active";
    else if (email.endsWith("@blocked.com")) reason = "domain_blocked";
    else if (payload.project_ids.length === 0) reason = "missing_project";
    else if (allOff) reason = "plan_conflict";

    if (reason) {
      skipped.push({
        email,
        reason,
        message: reason === "plan_conflict" ? "Selected dashboards not available for the chosen projects" : undefined,
        resolvable: ["already_invited","plan_conflict","missing_project"].includes(reason),
      });
      continue;
    }

    const pieces = payload.access.filter(a=>a.enabled).map(a=>{
      const dash = a.dashboard==="seo"?"SEO":a.dashboard==="content"?"Content":a.dashboard==="reporting"?"Reporting":"TaskBoard";
      const roleLabel = a.role[0].toUpperCase()+a.role.slice(1);
      return `${roleLabel} — ${dash}`;
    });
    successes.push({ email, notes: pieces.join("; ") || "—" });
  }
  return { success: successes, skipped, invite_expiry_days: 7 };
}

/* ──────────────────────────────────────────────────────────────────────────
   7) InviteConfirmModal — icons + CTAs refined (no emojis)
   ────────────────────────────────────────────────────────────────────────── */
type ConfirmProps = {
  open: boolean;
  data: InviteConfirmIn | null;
  onClose: () => void;
  onInviteMore: () => void;
  onViewPending?: (emails: string[]) => void;
};
const InviteConfirmModal: React.FC<ConfirmProps> = ({ open, data, onClose, onInviteMore, onViewPending }) => {
  if (!open || !data) return null;
  const { success, skipped, invite_expiry_days } = data;

  const badgeForIssue = (isFailed: boolean) => (
    <span className={`wr-badge ${isFailed ? "b-crit" : "b-warn"}`}>
      {isFailed ? <IconXCircle/> : <IconAlert/>}
      {isFailed ? "Failed" : "Skipped"}
    </span>
  );

  const copy = (list: string[]) => navigator.clipboard.writeText(list.join(", "));

  const humanizeIssue = (reason: InviteIssueReason) => {
    switch (reason) {
      case "invalid_email": return "Invalid email format";
      case "duplicate_in_batch": return "Duplicate in this batch";
      case "already_invited": return "Invite already pending";
      case "already_active": return "Already a member";
      case "domain_blocked": return "Email domain not allowed";
      case "plan_conflict": return "Selected dashboards not available for project";
      case "missing_role": return "Missing role for selected dashboard";
      case "missing_project": return "No project selected";
      default: return "Unknown issue";
    }
  };

  return (
    <div className="wr-modal-overlay" role="dialog" aria-modal="true">
      <div className="wr-modal" style={{ width: "min(840px, 96vw)" }}>
        <div className="wr-modal-header">
          <div>
            <div className="wr-modal-title">
              <IconCheckBadge/> Invitations Sent
            </div>
            <div className="wr-modal-subtext">
              Here’s a summary of your recent invite(s).
              {typeof invite_expiry_days === "number" && <> Invite links expire in {invite_expiry_days} days.</>}
            </div>
          </div>
          <Button aria-label="Close" className="wr-btn-icon wr-btn-ghost" onClick={onClose}>
            <IconClose/>
          </Button>
        </div>

        <div className="wr-modal-body" style={{ gap: 16 }}>
          <div className="wr-row">
            <div className="wr-grid" style={{ padding: 12 }}>
              <div className="wr-row" style={{ gridTemplateColumns: "1fr" }}>
                <div className="wr-row-title">
                  <span className="wr-badge b-good"><IconCheckCircle/> Successful Invites</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{success.length}</div>
                <div className="wr-mini-note">team member(s) invited</div>
              </div>
            </div>

            {skipped.length > 0 && (
              <div className="wr-grid" style={{ padding: 12 }}>
                <div className="wr-row" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="wr-row-title"><span className="wr-badge b-warn"><IconAlert/> Failed / Skipped</span></div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{skipped.length}</div>
                  <div className="wr-mini-note">need review</div>
                </div>
              </div>
            )}
          </div>

          <div className="wr-grid" role="table" aria-label="Successful invites">
            <div className="wr-grid-row" style={{ gridTemplateColumns: "2fr 120px 1fr", fontWeight: 700 }}>
              <div>Email</div><div>Status</div><div>Notes</div>
            </div>
            {success.map((row) => (
              <div className="wr-grid-row" key={row.email} style={{ gridTemplateColumns: "2fr 120px 1fr" }}>
                <div title="Click to copy" style={{ cursor: "copy" }} onClick={() => navigator.clipboard.writeText(row.email)}>{row.email}</div>
                <div><span className="wr-badge b-good"><IconCheckCircle/> Invited</span></div>
                <div>{row.notes || "—"}</div>
              </div>
            ))}
            {success.length > 0 && (
              <div className="wr-grid-row" style={{ gridTemplateColumns: "1fr" }}>
                <Button variant="outline" size="sm" iconLeft={<IconCopy/>} onClick={() => copy(success.map(s=>s.email))}>
                  Copy all emails
                </Button>
              </div>
            )}
          </div>

          {skipped.length > 0 && (
            <div className="wr-grid" style={{ marginTop: 12 }}>
              <div className="wr-grid-row" style={{ gridTemplateColumns: "2fr 140px 1fr", fontWeight: 700 }}>
                <div>Email</div><div>Status</div><div>Error Message</div>
              </div>
              {skipped.map((row) => {
                const failed = ["invalid_email","domain_blocked","missing_project"].includes(row.reason);
                return (
                  <div className="wr-grid-row" key={row.email} style={{ gridTemplateColumns: "2fr 140px 1fr" }}>
                    <div title="Click to copy" style={{ cursor: "copy" }} onClick={() => navigator.clipboard.writeText(row.email)}>{row.email}</div>
                    <div>{badgeForIssue(failed)}</div>
                    <div>{row.message || humanizeIssue(row.reason)}</div>
                  </div>
                );
              })}
              <div className="wr-grid-row" style={{ gridTemplateColumns: "1fr" }}>
                <Button variant="outline" size="sm" iconLeft={<IconCopy/>} onClick={() => copy(skipped.map(s=>s.email))}>
                  Copy failed emails
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="wr-modal-footer">
          <Button variant="outline" size="md" iconLeft={<IconSearch/>} onClick={()=>onViewPending?.(success.map(s=>s.email))}>
            View Pending Invitations
          </Button>
          <Button variant="outline" size="md" iconLeft={<IconUserPlus/>} onClick={onInviteMore}>
            Invite More Members
          </Button>
          <Button variant="primary" size="md" iconLeft={<IconCheck/>} onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   8) InviteMemberModal — fonts, icons, toggles, CTAs refined
   ────────────────────────────────────────────────────────────────────────── */
type MemberModalProps = {
  open: boolean;
  onClose: () => void;
  onViewPending?: (emails: string[]) => void;
};

const InviteMemberModal: React.FC<MemberModalProps> = ({ open, onClose, onViewPending }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [flags, setFlags] = useState<FeatureFlags>({ taskboard_view_only: false });
  const [loading, setLoading] = useState(true);

  const [chips, setChips] = useState<EmailChip[]>([]);
  const [dupHint, setDupHint] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [access, setAccess] = useState<DashboardAccess[]>([
    { dashboard: "seo",        enabled: true,  role: "viewer" },
    { dashboard: "content",    enabled: true,  role: "viewer" },
    { dashboard: "reporting",  enabled: true,  role: "viewer" },
    { dashboard: "taskboard",  enabled: false, role: "editor" },
  ]);
  const [applySameToAll, setApplySameToAll] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmData, setConfirmData] = useState<InviteConfirmIn | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPage, setShowPage] = useState(false);
  

  useEffect(() => {
    if (!open) return;
    let mounted = true; setLoading(true);
    Promise.all([fetchProjects(), fetchFeatureFlags()]).then(([p, f]) => {
      if (!mounted) return;
      setProjects(p); setFlags(f); setLoading(false);
    });
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => { if (!open) return; setTimeout(()=> inputRef.current?.focus?.(), 50); }, [open]);

  const DASH_LABEL: Record<DashboardKey,string> = { seo: "SEO", content: "Content", reporting: "Reporting", taskboard: "TaskBoard" };
  const ROLE_LABEL: Record<PredefRole,string> = { admin: "Admin", editor: "Editor", viewer: "Viewer" };

  const planLocks = useMemo(() => {
    const selected = projects.filter(p => selectedProjectIds.includes(p.id));
    const lock: Record<DashboardKey, boolean> = { seo:false, content:false, reporting:false, taskboard:false };
    if (selected.length === 0) return lock;
    (["seo","content","reporting","taskboard"] as DashboardKey[]).forEach((d)=>{
      for (const proj of selected) { if (!proj.modules.includes(d)) { lock[d] = true; break; } }
    });
    return lock;
  }, [projects, selectedProjectIds]);

  const rows = useMemo(() => access.map((row) => {
    const lockedByPlan = planLocks[row.dashboard];
    const roleChoices = row.dashboard==="seo" ? ["admin","editor","viewer"]
      : row.dashboard==="content" ? ["editor","viewer"]
      : row.dashboard==="taskboard" ? (flags.taskboard_view_only ? ["admin","editor","viewer"] : ["admin","editor"])
      : ["viewer"];
    return { ...row, lockedByPlan, roleChoices, roleLocked: row.dashboard==="reporting", adminHidden: row.dashboard==="content" };
  }), [access, flags.taskboard_view_only, planLocks]);

  const validEmails = chips.filter(c => c.status==="valid").map(c=>c.value);
  const hasAtLeastOneDashboard = access.some(a => a.enabled && !planLocks[a.dashboard]);
  const canSubmit = validEmails.length>0 && selectedProjectIds.length>0 && hasAtLeastOneDashboard && message.length<=300;

  const onTextInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const el = e.currentTarget;
    if ((e.key==="Enter"||e.key===","||e.key===";") && el.value.trim()) {
      e.preventDefault(); addEmailsFromString(el.value); el.value="";
    }
    if (e.key==="Backspace" && !el.value) setChips(prev=>prev.slice(0, Math.max(0, prev.length-1)));
    if ((e.ctrlKey||e.metaKey) && e.key==="Enter") { e.preventDefault(); submit(); }
  };

  const addEmailsFromString = (input: string) => {
    const emails = parseEmails(input); if (!emails.length) return;
    setChips(prev => {
      const exists = new Set(prev.map(c=>c.value.toLowerCase()));
      let dupCount=0; const newChips: EmailChip[]=[];
      for (const email of emails){
        const key=email.toLowerCase();
        if(exists.has(key)){ dupCount++; continue; }
        exists.add(key);
        newChips.push({ id:`${email}-${Math.random().toString(36).slice(2)}`, value:email, status:chipStatusFromValue(email) });
      }
      if (dupCount>0) setDupHint(dupCount);
      return [...prev, ...newChips];
    });
  };

  const removeChip = (id: string) => setChips(prev=>prev.filter(c=>c.id!==id));
  const onToggleDashboard = (d: DashboardKey, enabled: boolean) => setAccess(prev=>prev.map(r=> r.dashboard===d? ({...r, enabled}) : r));

  const roleChoicesFor = (d: DashboardKey, f: FeatureFlags) =>
    d==="seo" ? ["admin","editor","viewer"]
    : d==="content" ? ["editor","viewer"]
    : d==="reporting" ? ["viewer"]
    : (f.taskboard_view_only? ["admin","editor","viewer"] : ["admin","editor"]);

  const onChangeRole = (d: DashboardKey, role: PredefRole) => {
    setAccess(prev=>prev.map(r=> r.dashboard===d? ({...r, role}) : r));
    if (applySameToAll) {
      setAccess(prev=> prev.map(r=>{
        if(!r.enabled) return r;
        const allowed = roleChoicesFor(r.dashboard, flags) as PredefRole[];
        const newRole = (allowed as string[]).includes(role) ? role : r.role;
        return {...r, role:newRole};
      }));
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    const payload: InvitePayload = {
      emails: validEmails,
      project_ids: selectedProjectIds,
      access,
      apply_same_roles_across_projects: true,
      message: message.trim() || undefined,
    };
    const result = await postInvites(payload);
    setConfirmData(result);
    setShowPage(true);
  };

  
  const closeConfirm = () => {
    setShowConfirm(false);
    // setConfirmData(null);
    setShowPage(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="wr-modal-overlay"
        role="dialog" aria-modal="true"
        onKeyDown={(e)=>{ if(e.key==="Escape") onClose(); if((e.ctrlKey||e.metaKey)&&e.key==="Enter") submit(); }}
      >
        <div className="wr-modal">
          <div className="wr-modal-header">
            <div> 
              <div className="wr-modal-title"><IconUserPlus/> Invite New Member(s)</div>
              <div className="wr-modal-subtext">Paste emails, choose projects, set access &amp; roles. Reporting is view‑only in Phase 1.</div>
            </div>
            <Button aria-label="Close" className="wr-btn-icon wr-btn-ghost" onClick={onClose}><IconClose/></Button>
          </div>

          <div className="wr-modal-body">
            {loading ? (
              <div className="wr-mini-note">Loading projects &amp; settings…</div>
            ) : (
              <>
                {/* Emails */}
                <div className="wr-field">
                  <label className="wr-label">Email(s)</label>
                  <div className="wr-chiplist" aria-live="polite">
                    {chips.map(chip=>(
                      <span key={chip.id} className="wr-chip-item" aria-label={`${chip.value} — status: ${chip.status}`}>
                        {chip.value}
                        {chip.status!=="valid" && (
                          <span className="wr-badge b-warn" title={chip.status.replace("_"," ")}>
                            <IconAlert/>{chip.status==="invalid"?"Invalid": chip.status==="already_invited"?"Already Invited": chip.status==="already_active"?"User Exists": chip.status==="domain_blocked"?"Domain Blocked":"Duplicate"}
                          </span>
                        )}
                        <button aria-label={`Remove ${chip.value}`} onClick={()=>removeChip(chip.id)}><IconClose/></button>
                      </span>
                    ))}
                    <input ref={inputRef} className="wr-input" placeholder="Type or paste emails, then press Enter…" onKeyDown={onTextInputKeyDown} />
                  </div>
                  <div className="wr-hint">You can invite multiple users at once. Separate emails with commas or line breaks.</div>
                  {dupHint>0 && (<div className="wr-mini-note">Removed duplicates: {dupHint}</div>)}
                </div>

                {/* Projects */}
                <div className="wr-field">
                  <label className="wr-label">Projects</label>
                  <div className="wr-chiplist">
                    {projects.map(p=>{
                      const selected = selectedProjectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          className="wr-chip-item"
                          onClick={()=>{
                            setSelectedProjectIds(prev => selected ? prev.filter(id=>id!==p.id) : [...prev, p.id]);
                          }}
                          aria-pressed={selected}
                          title={p.name}
                        >
                          {p.name}
                          {p.is_shared && <span className="wr-badge b-neutral"><IconInfo/>Shared</span>}
                          {selected && <IconCheck/>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="wr-hint">User will only see dashboards for the projects they are added to.</div>
                  {selectedProjectIds.length===0 && (<div className="wr-error">Select at least one project.</div>)}
                </div>

                {/* Access & Roles */}
                <div className="wr-field">
                  <label className="wr-label">Dashboard Access &amp; Roles</label>
                  <div className="wr-grid" role="table" aria-label="Dashboard access matrix">
                    <div className="wr-grid-row" role="row" style={{fontWeight:700}}>
                      <div>Dashboard</div><div>Access</div><div>Role</div>
                    </div>

                    {rows.map(r=>{
                      const disabled = r.lockedByPlan;
                      const canToggle = !disabled;
                      const canChangeRole = !r.roleLocked && r.enabled && !disabled;
                      return (
                        <div key={r.dashboard} className="wr-grid-row" role="row">
                          <div className="wr-row-title">
                            <IconGrid/>{DASH_LABEL[r.dashboard]}
                            {disabled && (<span className="wr-mini-note" style={{display:"inline-flex",alignItems:"center",gap:6}}><IconLock/> Locked — Not in plan</span>)}
                          </div>

                          {/* Toggle */}
                          <div>
                            <label className="wr-toggle" aria-disabled={!canToggle}>
                              <div
                                className={`wr-switch ${r.enabled && !disabled ? "on":""}`}
                                role="switch"
                                aria-label={`${DASH_LABEL[r.dashboard]} access`}
                                aria-checked={r.enabled && !disabled}
                                onClick={()=> canToggle && onToggleDashboard(r.dashboard, !r.enabled)}
                              >
                                <span className="dot"/>
                              </div>
                              <span>{r.enabled && !disabled ? "Enabled" : "Disabled"}</span>
                            </label>
                          </div>

                          {/* Role select */}
                          <div>
                            <select
                              className="wr-select"
                              aria-label={`${DASH_LABEL[r.dashboard]} role`}
                              disabled={!canChangeRole}
                              value={r.role}
                              onChange={(e)=> onChangeRole(r.dashboard, e.target.value as PredefRole)}
                            >
                              {r.roleChoices.map(role => (<option key={role} value={role}>{ROLE_LABEL[role as PredefRole]}</option>))}
                            </select>
                            {r.roleLocked && <div className="wr-mini-note">Reporting is view‑only in Phase 1</div>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Apply same role toggle */}
                    <div className="wr-grid-row" style={{ gridTemplateColumns: "1fr" }}>
                      <label className="wr-toggle">
                        <div className={`wr-switch ${applySameToAll? "on":""}`} role="switch" aria-checked={applySameToAll} onClick={()=> setApplySameToAll(s=>!s)}>
                          <span className="dot"/>
                        </div>
                        <span>Apply same role to all enabled dashboards</span>
                      </label>
                    </div>

                    {!hasAtLeastOneDashboard && (
                      <div className="wr-grid-row" style={{ gridTemplateColumns: "1fr" }}>
                        <div className="wr-error">Select at least one dashboard to grant access.</div>
                      </div>
                    )}
                    {(planLocks.seo||planLocks.content||planLocks.reporting||planLocks.taskboard) && (
                      <div className="wr-grid-row" style={{ gridTemplateColumns: "1fr" }}>
                        <div className="wr-badge b-warn"><IconAlert/> Some selected projects don’t include certain dashboards. Those rows are locked for this invite.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Welcome note */}
                <div className="wr-field">
                  <label className="wr-label">Welcome note (optional)</label>
                  <textarea className="wr-textarea" maxLength={300} value={message} onChange={(e)=> setMessage(e.target.value)} placeholder='E.g., "Welcome aboard! You’ll find SEO & Reporting access in your project."' />
                  <div className="wr-mini-note">{message.length}/300</div>
                </div>
              </>
            )}
          </div>

          <div className="wr-modal-footer">
            <Button variant="outline" size="md" iconLeft={<IconClose/>} onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              size="md"
              aria-disabled={!canSubmit}
              disabled={!canSubmit}
              title={!canSubmit? "Add valid emails, select projects & at least one dashboard" : "Send invitations"}
              iconLeft={<IconMailSend/>}
              onClick={submit}
            >
              Send Invites
            </Button>

      {showPage && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            zIndex: 1001, 
          }}
          onClick={() => setShowPage(false)} // Close popup on background click
        >
            <App onClose={() => setShowPage(false)} />

        </div>
      )}


          </div>
        </div>
      </div>

      <InviteConfirmModal
        open={showConfirm}
        data={confirmData}
        onClose={closeConfirm}
        onInviteMore={()=>{
          setShowConfirm(false);
          setConfirmData(null);
          setChips([]);
          setMessage("");
          setTimeout(()=> inputRef.current?.focus?.(), 50);
        }}
        onViewPending={onViewPending}
      />
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   9) Demo canvas (optional host for quick preview)
   ────────────────────────────────────────────────────────────────────────── */
const DemoInviteModalCanvas: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
<>
      <TokensStyle />
      {/* <h2 style={{ marginBottom: 16, fontFamily: 'var(--wr-font)' }}>Team &amp; Roles — Invite Member Modal (Demo)</h2> */}
      <Button variant="primary" size="md" iconLeft={<IconUserPlus/>} onClick={()=> setOpen(true)}>Invite Member</Button>
        {/* <p className="wr-mini-note" style={{ marginTop: 8 }}>
          Tip: Try emails like <code>alice@example.com</code>, <code>bob+invited@example.com</code>, <code>carol+active@example.com</code>, <code>foo@blocked.com</code>. Also test project plan locks by selecting different projects.
        </p> */}
      <InviteMemberModal
        open={open}
        onClose={()=> setOpen(false)}
        onViewPending={(emails)=>{ console.log("Deep-link to Pending with emails:", emails); alert(`Navigate to Pending Invitations tab with emails:\n${emails.join(", ")}`); }}
      />
</>
  );
};

export default DemoInviteModalCanvas;
