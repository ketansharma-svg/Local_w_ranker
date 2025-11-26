"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  // shells & actions
  X,
  Plus,
  RefreshCw,
  Upload,
  Download,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  CheckCircle2,
  Info,
  AlertTriangle,
  Settings,
  Send,
  Mail,
  Share2,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileInput,
  Calendar,
  Clock,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Globe,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Users,
  FolderSymlink,
  Webhook,
  Slack,
  Tag,
  Shield,
  LayoutTemplate,
  ListFilter,
  FilePlus2,
  Scissors,
  Wand2,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Global tokens (safe to remove if already provided globally)
   ────────────────────────────────────────────────────────────────────────── */
function GlobalTokens() {
  return (
    <style>{`
:root{
  --brand:#008CCD; --brand-600:#007BB8; --on-brand:rgba(255,255,255,0.88);
  --text-strong:#111827; --text:#374151; --text-muted:#6B7280;
  --bg-app:#F5F7FA; --bg-panel:#FFFFFF;
  --border-subtle:#EFF0F6; --border:#E5E7EB;
  --success:#34A853; --success-bg:#CBF8D7;
  --warning:#F9BB04; --warning-bg:#FCEBB8;
  --critical:#E94134; --critical-bg:#FBC4BF;
  --focus:#4286F5; --overlay:rgba(17,24,39,0.96);
  --radius:6px; --shadow-1:0 1px 3px rgba(0,0,0,0.10); --shadow-md:0 4px 6px rgba(0,0,0,0.10);
}
*{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Inter Fallback",sans-serif}
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Small UI primitives (tokenized; a11y ready)
   ────────────────────────────────────────────────────────────────────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
function Button({
  children,
  onClick,
  disabled,
  title,
  variant = "secondary",
  className = "",
  type = "button",
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "cursor-pointer inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius)] text-sm font-medium " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-600)]"
      : variant === "destructive"
      ? "border text-[var(--text)] hover:bg-[var(--critical-bg)]"
      : variant === "ghost"
      ? "text-[var(--text)] hover:bg-[var(--bg-app)]"
      : "border text-[var(--text)] hover:bg-[var(--bg-app)]";
  return (
    <button
      type={type as any}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${styles} ${className}`}
      style={
        variant === "secondary" || variant === "destructive"
          ? { borderColor: "var(--border)" }
          : undefined
      }
    >
      {children}
    </button>
  );
}

type ChipTone = "neutral" | "success" | "warning" | "critical" | "info";
function Chip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: ChipTone;
  children: React.ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium";
  const toneCls =
    tone === "success"
      ? "text-[var(--success)] bg-[var(--success-bg)]"
      : tone === "warning"
      ? "text-[var(--warning)] bg-[var(--warning-bg)]"
      : tone === "critical"
      ? "text-[var(--critical)] bg-[var(--critical-bg)]"
      : tone === "info"
      ? "text-[var(--brand)] bg-[color-mix(in srgb, var(--brand) 15%, white)]"
      : "text-[var(--text)] bg-[var(--bg-app)]";
  return <span className={`${base} ${toneCls} ${className}`}>{children}</span>;
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`cursor-pointer relative h-6 w-11 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]
          ${checked ? "bg-[var(--brand)]" : "bg-[var(--border)]"} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className="text-sm text-[var(--text)] cursor-pointer"
        >
          {label}
        </label>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-1)" }}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  meta,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 text-[var(--brand)]">{icon}</div>
        <h3 className="text-[20px] leading-6 font-semibold text-[var(--text-strong)] truncate">
          {title}
        </h3>
        {meta && (
          <div className="ml-3 text-xs text-[var(--text-muted)]">{meta}</div>
        )}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Utils
   ────────────────────────────────────────────────────────────────────────── */
const rt = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

function useTrap(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick, true);
    };
  }, [open, onClose, ref]);
}

/* ──────────────────────────────────────────────────────────────────────────
   Shared dialogs
   ────────────────────────────────────────────────────────────────────────── */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onCancel, ref);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center justify-between">
          <h4
            id="confirm-title"
            className="text-[16px] font-semibold text-[var(--text-strong)]"
          >
            {title}
          </h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onCancel}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--text)]">{message}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 text-[var(--brand)]" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-[var(--radius)] bg-[var(--bg-panel)] border px-3 py-2 text-sm"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-1)" }}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */
type DeliveryChannel = "Email" | "Share link" | "Slack";
type ScheduleRow = {
  id: string;
  name: string;
  cadence: "Daily" | "Weekly" | "Monthly" | "Custom";
  cron?: string;
  time: string;
  tz: string;
  template: string;
  recipients: string[]; // addresses or lists
  channel: DeliveryChannel;
  status: "Enabled" | "Paused";
  lastEdit: string;
};

type ExportRow = {
  id: string;
  name: string;
  type: "CSV" | "XLSX" | "PDF";
  template?: string;
  requestedBy: string;
  createdAt: string;
  link?: string;
  linkExpiry?: string;
  status: "Active" | "Expired" | "Revoked";
  details?: { dateScope: string; filters: string; delivery: string; notes?: string };
};

type RuleRow = {
  id: string;
  name: string;
  when: string;
  scope: string;
  then: string[];
  channel: string;
  throttle: string;
  status: "Enabled" | "Paused";
  lastEdit: string;
};

type Branding = {
  inherit: boolean;
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  brand: string;
  brandHover: string;
  onBrand: string;
  header: string;
  footer: string;
  fromName: string;
  replyTo: string;
  senderVerified: boolean;
};

type ShareRow = {
  id: string;
  name: string;
  target: string; // template or export id
  access: "Login" | "Passcode" | "Open";
  passcode?: string;
  expiry?: string;
  createdBy: string;
  createdAt: string;
  status: "Active" | "Revoked" | "Expired";
  url: string;
};

/* ──────────────────────────────────────────────────────────────────────────
   Drawers / Modals — Report Scheduler
   ────────────────────────────────────────────────────────────────────────── */
function TemplatesManagerDrawer({
  open,
  onClose,
  templates,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  templates: { name: string; layout: "Summary" | "Full" | "Executive"; sections: string[]; branding: "Inherited" | "Local"; header: string; footer: string }[];
  onSave: (next: typeof templates) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [local, setLocal] = useState(templates);

  useEffect(() => setLocal(templates), [templates, open]);

  const addTemplate = () =>
    setLocal((prev) => [
      {
        name: `Template ${prev.length + 1}`,
        layout: "Summary",
        sections: ["Overview", "Coverage", "Tasks"],
        branding: "Inherited",
        header: "",
        footer: "",
      },
      ...prev,
    ]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="tpl-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[560px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="tpl-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Templates manager</h4>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={addTemplate}><FilePlus2 className="h-4 w-4 text-[var(--brand)]" /> New template</Button>
            <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" aria-label="Close" onClick={onClose}><X className="h-5 w-5 text-[var(--text)]" /></button>
          </div>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          {local.map((t, idx) => (
            <div key={idx} className="rounded-[var(--radius)] border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Name</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={t.name} onChange={(e) => setLocal((arr) => arr.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Layout preset</label>
                  <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={t.layout} onChange={(e) => setLocal((arr) => arr.map((x, i) => (i === idx ? { ...x, layout: e.target.value as any } : x)))} >
                    <option>Summary</option>
                    <option>Full</option>
                    <option>Executive</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs text-[var(--text-muted)]">Sections included</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {["Overview", "Coverage", "Technical", "CWV", "Competitors", "Tasks"].map((sec) => {
                    const on = t.sections.includes(sec);
                    return (
                      <button key={sec} className={`cursor-pointer h-8 px-3 rounded-[var(--radius)] text-xs border ${on ? "text-[var(--brand)] bg-[color-mix(in srgb, var(--brand) 12%, white)] border-[var(--brand)]" : "text-[var(--text)] hover:bg-[var(--bg-app)]"}`} style={!on ? { borderColor: "var(--border)" } : undefined} onClick={() => setLocal((arr) => arr.map((x, i) => (i === idx ? { ...x, sections: on ? x.sections.filter((s) => s !== sec) : [sec, ...x.sections] } : x)))} >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Branding mode</label>
                  <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={t.branding} onChange={(e) => setLocal((arr) => arr.map((x, i) => (i === idx ? { ...x, branding: e.target.value as any } : x)))} >
                    <option>Inherited</option>
                    <option>Local</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="ghost" onClick={() => alert("Static preview (placeholders)")}>
                    <Eye className="h-4 w-4 text-[var(--brand)]" /> Preview
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Header note (md)</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={t.header} onChange={(e) => setLocal((arr) => arr.map((x, i) => (i === idx ? { ...x, header: e.target.value } : x)))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Footer note (md)</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={t.footer} onChange={(e) => setLocal((arr) => arr.map((x, i) => (i === idx ? { ...x, footer: e.target.value } : x)))} />
                </div>
              </div>

              <div className="text-xs text-[var(--text-muted)]">
                Variables: <Chip tone="info">${"{projectName}"}</Chip>{" "}
                <Chip tone="info">${"{dateRange}"}</Chip>{" "}
                <Chip tone="info">${"{locale}"}</Chip>{" "}
                <Chip tone="info">${"{device}"}</Chip>
              </div>
            </div>
          ))}
          {local.length === 0 && (
            <div className="rounded-[var(--radius)] border p-6 text-sm text-[var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
              No templates yet. Click <strong>New template</strong>.
            </div>
          )}
        </div>

        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save templates
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecipientsDrawer({
  open,
  onClose,
  lists,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  lists: { listName: string; members: string[]; external: string[]; requireLogin: boolean }[];
  onSave: (next: typeof lists) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [local, setLocal] = useState(lists);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => setLocal(lists), [lists, open]);

  const addExternal = (i: number) => {
    const email = newEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setLocal((arr) => arr.map((x, idx) => (idx === i ? { ...x, external: [email, ...x.external] } : x)));
    setNewEmail("");
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="recip-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="recip-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Recipients</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          {local.map((l, i) => (
            <div key={i} className="rounded-[var(--radius)] border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-[var(--text-strong)]">{l.listName}</div>
                <Toggle checked={l.requireLogin} onChange={(v) => setLocal((arr) => arr.map((x, idx) => (idx === i ? { ...x, requireLogin: v } : x)))} label="Require login" id={`login-${i}`} />
              </div>
              <div className="text-xs text-[var(--text-muted)]">Workspace members</div>
              <div className="flex flex-wrap gap-2">
                {l.members.map((m) => <Chip key={m}>{m}</Chip>)}
              </div>

              <div className="text-xs text-[var(--text-muted)] mt-2">External emails</div>
              <div className="flex items-center gap-2">
                <input className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} placeholder="email@domain.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Button variant="secondary" onClick={() => addExternal(i)}><Plus className="h-4 w-4 text-[var(--brand)]" /> Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {l.external.map((e) => <Chip key={e} tone="info">{e}</Chip>)}
              </div>
            </div>
          ))}
        </div>

        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save recipients
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScheduleDrawer({
  open,
  onClose,
  onSave,
  initial,
  templates,
  recipientOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (row: ScheduleRow) => void;
  initial?: ScheduleRow | null;
  templates: string[];
  recipientOptions: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [name, setName] = useState(initial?.name || "Weekly Executive");
  const [cadence, setCadence] = useState<ScheduleRow["cadence"]>(initial?.cadence || "Weekly");
  const [cron, setCron] = useState<string>(initial?.cron || "0 9 * * 1");
  const [time, setTime] = useState<string>(initial?.time || "09:00");
  const [tz, setTz] = useState<string>(initial?.tz || "UTC");
  const [template, setTemplate] = useState<string>(initial?.template || templates[0] || "Default");
  const [recips, setRecips] = useState<string[]>(initial?.recipients || ["Leads"]);
  const [channel, setChannel] = useState<DeliveryChannel>(initial?.channel || "Email");
  const [postShare, setPostShare] = useState({ genLink: true, archiveCopy: true, sendSlack: false });

  useEffect(() => {
    if (open) {
      setName(initial?.name || "Weekly Executive");
      setCadence(initial?.cadence || "Weekly");
      setCron(initial?.cron || "0 9 * * 1");
      setTime(initial?.time || "09:00");
      setTz(initial?.tz || "UTC");
      setTemplate(initial?.template || templates[0] || "Default");
      setRecips(initial?.recipients || ["Leads"]);
      setChannel(initial?.channel || "Email");
      setPostShare({ genLink: true, archiveCopy: true, sendSlack: false });
    }
  }, [open, initial, templates]);

  const buildRow = (): ScheduleRow => ({
    id: initial?.id || `sch_${Date.now()}`,
    name,
    cadence,
    cron: cadence === "Custom" ? cron : undefined,
    time,
    tz,
    template,
    recipients: recips,
    channel,
    status: initial?.status || "Enabled",
    lastEdit: new Date().toISOString(),
  });

  const toggleRecipient = (label: string) =>
    setRecips((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [label, ...prev]));

  const cronPresets = [
    { label: "Mon 09:00 UTC (weekly)", value: "0 9 * * 1" },
    { label: "1st of month 08:00 UTC", value: "0 8 1 * *" },
    { label: "Daily 07:00 UTC", value: "0 7 * * *" },
  ];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="sch-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[560px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="sch-title" className="text-[16px] font-semibold text-[var(--text-strong)]">{initial ? "Edit schedule" : "Create schedule"}</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[var(--text)]" /></button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Name</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Cadence</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={cadence} onChange={(e) => setCadence(e.target.value as any)}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Time (24h)</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={time} onChange={(e) => setTime(e.target.value)} aria-describedby="time-help" />
              <div id="time-help" className="text-xs text-[var(--text-muted)] mt-1">Defaults to project timezone.</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Timezone</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={tz} onChange={(e) => setTz(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Template</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={template} onChange={(e) => setTemplate(e.target.value)}>
                {templates.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {cadence === "Custom" && (
            <div>
              <label className="text-xs text-[var(--text-muted)]">Cron</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cron} onChange={(e) => setCron(e.target.value)} aria-describedby="cron-help" />
              <div id="cron-help" className="text-xs text-[var(--text-muted)] mt-1">
                Examples:
                <ul className="list-disc ml-5">
                  {cronPresets.map((p) => (
                    <li key={p.value}>
                      <button className="underline cursor-pointer" onClick={() => setCron(p.value)}>{p.label}</button> — <code>{p.value}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--text-muted)]">Recipients</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {recipientOptions.map((r) => {
                const on = recips.includes(r);
                return (
                  <button key={r} className={`cursor-pointer h-8 px-3 rounded-[var(--radius)] text-xs border ${on ? "text-[var(--brand)] bg-[color-mix(in srgb, var(--brand) 12%, white)] border-[var(--brand)]" : "text-[var(--text)] hover:bg-[var(--bg-app)]"}`} style={!on ? { borderColor: "var(--border)" } : undefined} onClick={() => toggleRecipient(r)} >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Delivery channel</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                <option>Email</option>
                <option>Share link</option>
                <option>Slack</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={() => alert("Static dry‑run preview (placeholders only)")}>
                <Eye className="h-4 w-4 text-[var(--brand)]" /> Preview
              </Button>
              <Button variant="ghost" onClick={() => alert("Test send triggered (placeholders)")}>
                <Send className="h-4 w-4 text-[var(--brand)]" /> Send test
              </Button>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Post‑send actions</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={postShare.genLink} onChange={(e) => setPostShare((p) => ({ ...p, genLink: e.target.checked }))} />
                Generate share link
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={postShare.archiveCopy} onChange={(e) => setPostShare((p) => ({ ...p, archiveCopy: e.target.checked }))} />
                Archive a copy
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={postShare.sendSlack} onChange={(e) => setPostShare((p) => ({ ...p, sendSlack: e.target.checked }))} />
                Send to Slack channel
              </label>
            </div>
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(buildRow()); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Drawers / Modals — Exports
   ────────────────────────────────────────────────────────────────────────── */
function ManualExportDrawer({
  open,
  onClose,
  onCreate,
  templates,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (row: ExportRow) => void;
  templates: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [name, setName] = useState("Manual export");
  const [type, setType] = useState<ExportRow["type"]>("PDF");
  const [template, setTemplate] = useState(templates[0] || "Default");

  useEffect(() => {
    if (open) {
      setName("Manual export");
      setType("PDF");
      setTemplate(templates[0] || "Default");
    }
  }, [open, templates]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="manexp-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[460px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="manexp-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Run manual export</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Export name</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Format</label>
            <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={type} onChange={(e) => setType(e.target.value as any)}>
              <option>PDF</option>
              <option>CSV</option>
              <option>XLSX</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Template</label>
            <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={template} onChange={(e) => setTemplate(e.target.value)}>
              {templates.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="rounded-[var(--radius)] border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
            Preview uses placeholders only — no live metrics here.
          </div>
        </div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            onCreate({
              id: `exp_${Date.now()}`,
              name,
              type,
              template,
              requestedBy: "You",
              createdAt: new Date().toISOString(),
              link: "https://share.example.com/abc123",
              linkExpiry: "72h",
              status: "Active",
              details: { dateScope: "Last 7 days", filters: "Lists: All", delivery: "None" },
            });
            onClose();
          }}>
            <FileInput className="h-4 w-4" /> Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Drawers — Automations & Alerts
   ────────────────────────────────────────────────────────────────────────── */
function RuleBuilderDrawer({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (row: RuleRow) => void;
  initial?: RuleRow | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [name, setName] = useState(initial?.name || "Critical issue to Slack");
  const [when, setWhen] = useState(initial?.when || "Policy: Critical issue created");
  const [scope, setScope] = useState(initial?.scope || "Templates: All • Locales: en-US");
  const [then, setThen] = useState<string[]>(initial?.then || ["Slack"]);
  const [channel, setChannel] = useState(initial?.channel || "Slack");
  const [throttle, setThrottle] = useState(initial?.throttle || "1 per page/day");
  const [status] = useState<RuleRow["status"]>(initial?.status || "Enabled");
  const [dedupe, setDedupe] = useState(true);
  const [safeMode, setSafeMode] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "Critical issue to Slack");
      setWhen(initial?.when || "Policy: Critical issue created");
      setScope(initial?.scope || "Templates: All • Locales: en-US");
      setThen(initial?.then || ["Slack"]);
      setChannel(initial?.channel || "Slack");
      setThrottle(initial?.throttle || "1 per page/day");
      setDedupe(true);
      setSafeMode(false);
    }
  }, [open, initial]);

  const buildRow = (): RuleRow => ({
    id: initial?.id || `rule_${Date.now()}`,
    name,
    when,
    scope,
    then,
    channel,
    throttle,
    status,
    lastEdit: new Date().toISOString(),
  });

  const toggleThen = (t: string) =>
    setThen((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [t, ...arr]));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="rule-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[560px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="rule-title" className="text-[16px] font-semibold text-[var(--text-strong)]">{initial ? "Edit rule" : "Create rule"}</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[var(--text)]" /></button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Name</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">When (event)</label>
            <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={when} onChange={(e) => setWhen(e.target.value)}>
              <option>Policy: Critical issue created</option>
              <option>Integration: Sync failed</option>
              <option>Schedule: Export generated</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Scope (filters)</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Templates, tags, locales, devices…" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Then (actions)</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {["Email", "Slack", "Webhook", "Jira", "Internal task"].map((t) => {
                const on = then.includes(t);
                return (
                  <button key={t} className={`cursor-pointer h-8 px-3 rounded-[var(--radius)] text-xs border ${on ? "text-[var(--brand)] bg-[color-mix(in srgb, var(--brand) 12%, white)] border-[var(--brand)]" : "text-[var(--text)] hover:bg-[var(--bg-app)]"}`} style={!on ? { borderColor: "var(--border)" } : undefined} onClick={() => toggleThen(t)}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Primary channel</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option>Email</option>
                <option>Slack</option>
                <option>Webhook</option>
                <option>Jira</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Throttle</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={throttle} onChange={(e) => setThrottle(e.target.value)} placeholder="1 per page/day" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Toggle checked={dedupe} onChange={setDedupe} label="Suppress repeats in window" id="dedupe" />
            <Toggle checked={safeMode} onChange={setSafeMode} label="Safe‑mode (no real sends)" id="safemode" />
          </div>
          <div className="rounded-[var(--radius)] border p-3 text-sm" style={{ borderColor: "var(--border)", background: "#D9EEF8" /* brand pastel for neutral confirmation */ }}>
            Use <strong>Test rule</strong> to simulate payload without sending.
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="ghost" onClick={() => alert("Simulated rule fired (no sends)")}>
            <Wand2 className="h-4 w-4 text-[var(--brand)]" /> Test rule
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => { onSave(buildRow()); onClose(); }}>
              <CheckCircle2 className="h-4 w-4" /> Save rule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Channels drawer (email lists / slack / webhooks / jira) */
function ChannelsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [emailLists, setEmailLists] = useState<string[]>(["Leads", "Stakeholders"]);
  const [newList, setNewList] = useState("");
  const [slackHooks, setSlackHooks] = useState<string[]>(["#alerts", "#weekly"]);
  const [webhooks, setWebhooks] = useState<string[]>(["https://hooks.example.com/abc"]);
  const [jiraConns, setJiraConns] = useState<string[]>(["Jira Cloud – SEO"]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="channels-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="channels-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Channels</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[var(--text)]" /></button>
        </div>
        <div className="h-[calc(100%-56px)] overflow-auto px-4 py-4 space-y-4">
          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)] flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--brand)]" /> Email lists</div>
            <div className="mt-2 flex flex-wrap gap-2">{emailLists.map((l) => <Chip key={l}>{l}</Chip>)}</div>
            <div className="mt-2 flex items-center gap-2">
              <input className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} placeholder="New list name" value={newList} onChange={(e) => setNewList(e.target.value)} />
              <Button variant="secondary" onClick={() => { if (newList.trim()) setEmailLists((arr) => [newList.trim(), ...arr]); setNewList(""); }}><Plus className="h-4 w-4 text-[var(--brand)]" /> Add</Button>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)] flex items-center gap-2"><Slack className="h-4 w-4 text-[var(--brand)]" /> Slack channels</div>
            <div className="mt-2 flex flex-wrap gap-2">{slackHooks.map((h) => <Chip key={h} tone="info">{h}</Chip>)}</div>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)] flex items-center gap-2"><Webhook className="h-4 w-4 text-[var(--brand)]" /> Webhooks</div>
            <div className="mt-2 flex flex-wrap gap-2">{webhooks.map((w) => <Chip key={w} tone="info">{w}</Chip>)}</div>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)] flex items-center gap-2"><FolderSymlink className="h-4 w-4 text-[var(--brand)]" /> Jira connections</div>
            <div className="mt-2 flex flex-wrap gap-2">{jiraConns.map((j) => <Chip key={j}>{j}</Chip>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Branding — inline configuration cards (no extra drawers)
   ────────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
   Share Links — Access Policy & Generate Link
   ────────────────────────────────────────────────────────────────────────── */
function AccessPolicyDrawer({
  open,
  onClose,
  policy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  policy: { enforcePasscode: boolean; defaultExpiry: string; requireEmailCapture: boolean; legal: string };
  onSave: (next: typeof policy) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [local, setLocal] = useState(policy);

  useEffect(() => setLocal(policy), [policy, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="ap-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="ap-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Access policy</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[var(--text)]" /></button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <Toggle checked={local.enforcePasscode} onChange={(v) => setLocal((p) => ({ ...p, enforcePasscode: v }))} label="Enforce passcode for external domains" id="pol1" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Default expiry</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={local.defaultExpiry} onChange={(e) => setLocal((p) => ({ ...p, defaultExpiry: e.target.value }))} placeholder="7d" />
            </div>
            <div className="flex items-end">
              <Toggle checked={local.requireEmailCapture} onChange={(v) => setLocal((p) => ({ ...p, requireEmailCapture: v }))} label="Require email capture (open links)" id="pol2" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Legal notice</label>
            <textarea className="mt-1 w-full min-h-[120px] rounded-[var(--radius)] border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} value={local.legal} onChange={(e) => setLocal((p) => ({ ...p, legal: e.target.value }))} />
          </div>
        </div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save policy
          </Button>
        </div>
      </div>
    </div>
  );
}

function GenerateLinkDrawer({
  open,
  onClose,
  onCreate,
  templates,
  exportsList,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (row: ShareRow) => void;
  templates: string[];
  exportsList: ExportRow[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [name, setName] = useState("Executive weekly");
  const [targetType, setTargetType] = useState<"Template" | "Export">("Template");
  const [target, setTarget] = useState<string>(templates[0] || "");
  const [access, setAccess] = useState<ShareRow["access"]>("Passcode");
  const [passcode, setPasscode] = useState("1234");
  const [expiry, setExpiry] = useState("7d");

  useEffect(() => {
    if (open) {
      setName("Executive weekly");
      setTargetType("Template");
      setTarget(templates[0] || "");
      setAccess("Passcode");
      setPasscode("1234");
      setExpiry("7d");
    }
  }, [open, templates]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="gen-title">
      <div className="absolute inset-0 bg-black/30" />
      <div ref={ref} className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="gen-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Generate share link</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[var(--text)]" /></button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Name</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Target type</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={targetType} onChange={(e) => setTargetType(e.target.value as any)}>
                <option>Template</option>
                <option>Export</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Target</label>
              {targetType === "Template" ? (
                <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={target} onChange={(e) => setTarget(e.target.value)}>
                  {templates.map((t) => <option key={t}>{t}</option>)}
                </select>
              ) : (
                <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={target} onChange={(e) => setTarget(e.target.value)}>
                  {exportsList.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Access mode</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={access} onChange={(e) => setAccess(e.target.value as any)}>
                <option>Login</option>
                <option>Passcode</option>
                <option>Open</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Expiry</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="7d" />
            </div>
          </div>

          {access === "Passcode" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Passcode</label>
                <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={passcode} onChange={(e) => setPasscode(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={() => setPasscode(Math.random().toString().slice(2, 6))}>
                  <Wand2 className="h-4 w-4 text-[var(--brand)]" /> Generate
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-[var(--radius)] border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
            You can switch to <strong>Client portal</strong> later; links inherit project branding.
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            onCreate({
              id: `share_${Date.now()}`,
              name,
              target: targetType === "Template" ? target : `export:${target}`,
              access,
              passcode: access === "Passcode" ? passcode : undefined,
              expiry,
              createdBy: "You",
              createdAt: new Date().toISOString(),
              status: "Active",
              url: "https://share.example.com/xyz987",
            });
            onClose();
          }}>
            <LinkIcon className="h-4 w-4" /> Create link
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main: Tab 5 — Reporting & Automations
   ────────────────────────────────────────────────────────────────────────── */
export default function ReportingAndAutomationsTab() {
  const [toast, setToast] = useState<string | null>(null);

  /* 1) Report Scheduler */
  const [templates, setTemplates] = useState<string[]>([
    "Executive summary",
    "Full weekly",
    "Partner rollup",
  ]);
  const [templatesDrawer, setTemplatesDrawer] = useState(false);

  const [recipientLists, setRecipientLists] = useState<
    { listName: string; members: string[]; external: string[]; requireLogin: boolean }[]
  >([
    { listName: "Leads", members: ["alex@company.com", "pm@company.com"], external: [], requireLogin: true },
    { listName: "Stakeholders", members: ["cmo@company.com"], external: ["partner@example.com"], requireLogin: false },
  ]);
  const [recipientsDrawer, setRecipientsDrawer] = useState(false);

  const recipientOptions = useMemo(
    () => recipientLists.map((l) => l.listName),
    [recipientLists]
  );

  const [schedules, setSchedules] = useState<ScheduleRow[]>([
    {
      id: "sch1",
      name: "Weekly executive",
      cadence: "Weekly",
      time: "09:00",
      tz: "UTC",
      template: "Executive summary",
      recipients: ["Leads"],
      channel: "Email",
      status: "Enabled",
      lastEdit: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "sch2",
      name: "Monthly partner rollup",
      cadence: "Monthly",
      time: "08:00",
      tz: "UTC",
      template: "Partner rollup",
      recipients: ["Stakeholders"],
      channel: "Share link",
      status: "Paused",
      lastEdit: new Date(Date.now() - 1000 * 60 * 2400).toISOString(),
    },
  ]);
  const [scheduleDrawer, setScheduleDrawer] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [confirmRemoveSch, setConfirmRemoveSch] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const createOrUpdateSchedule = (row: ScheduleRow) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === row.id);
      return exists ? prev.map((s) => (s.id === row.id ? row : s)) : [row, ...prev];
    });
    setToast("Schedule saved");
    setTimeout(() => setToast(null), 1200);
  };

  /* 2) Export History */
  const [exportsList, setExportsList] = useState<ExportRow[]>([
    {
      id: "ex1",
      name: "Weekly exec – 2025‑10‑20",
      type: "PDF",
      template: "Executive summary",
      requestedBy: "Alex",
      createdAt: new Date(Date.now() - 1000 * 60 * 999).toISOString(),
      link: "https://share.example.com/ex1",
      linkExpiry: "72h",
      status: "Active",
      details: { dateScope: "Last 7 days", filters: "Lists: All", delivery: "Email: Leads" },
    },
  ]);
  const [manualExportOpen, setManualExportOpen] = useState(false);
  const [confirmDeleteExport, setConfirmDeleteExport] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  /* 3) Automations & Alerts */
  const [rules, setRules] = useState<RuleRow[]>([
    {
      id: "r1",
      name: "Critical policy → Slack",
      when: "Policy: Critical issue created",
      scope: "Templates: All • Locales: en-US",
      then: ["Slack"],
      channel: "Slack",
      throttle: "1 per page/day",
      status: "Enabled",
      lastEdit: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  ]);
  const [ruleDrawer, setRuleDrawer] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);
  const [channelsDrawer, setChannelsDrawer] = useState(false);
  const [confirmRemoveRule, setConfirmRemoveRule] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const saveRule = (row: RuleRow) => {
    setRules((prev) => {
      const exists = prev.some((r) => r.id === row.id);
      return exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev];
    });
    setToast("Rule saved");
    setTimeout(() => setToast(null), 1000);
  };

  /* 4) Branding & White‑label */
  const [branding, setBranding] = useState<Branding>({
    inherit: true,
    brand: "#008CCD",
    brandHover: "#007BB8",
    onBrand: "rgba(255,255,255,0.88)",
    header: "",
    footer: "",
    fromName: "Wranker Reports",
    replyTo: "noreply@reports.example.com",
    senderVerified: false,
  });

  /* 5) Share Links & Client Portal */
  const [portal, setPortal] = useState({ enabled: false, name: "Client portal", welcome: "Welcome!", logoInherit: true, access: "Login" as "Login" | "Passcode" | "Open", domains: "example.com", ipAllow: "" });
  const [shareLinks, setShareLinks] = useState<ShareRow[]>([
    { id: "sh1", name: "Executive weekly (template)", target: "Executive summary", access: "Passcode", passcode: "1234", expiry: "7d", createdBy: "Alex", createdAt: new Date().toISOString(), status: "Active", url: "https://share.example.com/sh1" },
  ]);
  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([]);
  const [accessPolicy, setAccessPolicy] = useState({ enforcePasscode: true, defaultExpiry: "7d", requireEmailCapture: true, legal: "By using this link you agree to the terms." });
  const [policyDrawer, setPolicyDrawer] = useState(false);
  const [genLinkDrawer, setGenLinkDrawer] = useState(false);
  const [confirmRevokeShare, setConfirmRevokeShare] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const allSharesSelected = selectedShareIds.length > 0 && selectedShareIds.length === shareLinks.length;

  /* ─────────────────────────────── UI ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text)]">
      <GlobalTokens />

      <div className="w-full mx-auto px-6 py-8 space-y-6">
        {/* ========== 1) REPORT SCHEDULER ========== */}
        <Card>
          <SectionHeader
            icon={<Calendar className="h-5 w-5" aria-hidden />}
            title="Report scheduler"
            meta={<span className="text-[var(--text-muted)]">Cadence, recipients, templates & preview</span>}
            actions={
              <>
                <Button variant="primary" onClick={() => { setEditingSchedule(null); setScheduleDrawer(true); }}>
                  <Plus className="h-4 w-4" /> Create schedule
                </Button>
                <Button variant="secondary" onClick={() => setTemplatesDrawer(true)}>
                  <LayoutTemplate className="h-4 w-4 text-[var(--brand)]" /> Templates
                </Button>
                <Button variant="secondary" onClick={() => setRecipientsDrawer(true)}>
                  <Users className="h-4 w-4 text-[var(--brand)]" /> Recipients
                </Button>
                <Button variant="secondary" onClick={() => setToast("Test send queued (placeholders)")}>
                  <Send className="h-4 w-4 text-[var(--brand)]" /> Test send
                </Button>
                <Button variant="ghost" onClick={() => setToast("Scheduler settings updated")}>
                  <Settings className="h-4 w-4 text-[var(--brand)]" /> Settings
                </Button>
              </>
            }
          />

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1080px] w-full text-sm">
              <thead className="bg-[var(--bg-app)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Cadence</th>
                  <th className="px-3 py-2 font-medium">Time & TZ</th>
                  <th className="px-3 py-2 font-medium">Template</th>
                  <th className="px-3 py-2 font-medium">Recipients</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Last edit</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-app)]">
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">
                      {s.cadence}{s.cadence === "Custom" && s.cron ? ` (${s.cron})` : ""}
                    </td>
                    <td className="px-3 py-2">{s.time} {s.tz}</td>
                    <td className="px-3 py-2">{s.template}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {s.recipients.map((r) => <Chip key={r}>{r}</Chip>)}
                      </div>
                    </td>
                    <td className="px-3 py-2">{s.channel}</td>
                    <td className="px-3 py-2">{s.status === "Enabled" ? <Chip tone="success">Enabled</Chip> : <Chip tone="warning">Paused</Chip>}</td>
                    <td className="px-3 py-2">{rt(s.lastEdit)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" onClick={() => { setEditingSchedule(s); setScheduleDrawer(true); }}>
                          <Pencil className="h-4 w-4 text-[var(--brand)]" /> Edit
                        </Button>
                        <Button variant="ghost" onClick={() => { const clone = { ...s, id: `sch_${Date.now()}`, name: `${s.name} (copy)`, lastEdit: new Date().toISOString() }; setSchedules((prev) => [clone, ...prev]); setToast("Schedule duplicated"); setTimeout(() => setToast(null), 1000); }}>
                          <Scissors className="h-4 w-4 text-[var(--brand)]" /> Duplicate
                        </Button>
                        {s.status === "Paused" ? (
                          <Button variant="ghost" onClick={() => setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "Enabled" } : x)))}>
                            <Play className="h-4 w-4 text-[var(--brand)]" /> Resume
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "Paused" } : x)))}>
                            <Pause className="h-4 w-4 text-[var(--brand)]" /> Pause
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => setConfirmRemoveSch({ open: true, id: s.id, name: s.name })}>
                          <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      No schedules yet. Click <strong>Create schedule</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========== 2) EXPORT HISTORY ========== */}
        <Card>
          <SectionHeader
            icon={<FileText className="h-5 w-5" aria-hidden />}
            title="Export history"
            meta={<span className="text-[var(--text-muted)]">When, who, what — with lifecycle controls</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setManualExportOpen(true)}>
                  <FileInput className="h-4 w-4 text-[var(--brand)]" /> Manual export
                </Button>
                <Button variant="ghost" onClick={() => setToast("Navigate to Data Retention")}>
                  <Clock className="h-4 w-4 text-[var(--brand)]" /> Retention policy
                </Button>
                <Button variant="destructive" onClick={() => { setExportsList((prev) => prev.map((e) => ({ ...e, status: e.status === "Active" ? "Revoked" : e.status }))); setToast("All active links revoked"); setTimeout(() => setToast(null), 1200); }}>
                  <LinkIcon className="h-4 w-4 text-[var(--brand)]" /> Bulk revoke links
                </Button>
              </>
            }
          />

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1080px] w-full text-sm">
              <thead className="bg-[var(--bg-app)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-3 py-2 font-medium">Export</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Template</th>
                  <th className="px-3 py-2 font-medium">Requested by</th>
                  <th className="px-3 py-2 font-medium">Created at</th>
                  <th className="px-3 py-2 font-medium">Share link</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {exportsList.map((ex) => (
                  <tr key={ex.id} className="hover:bg-[var(--bg-app)] align-top">
                    <td className="px-3 py-2">{ex.name}</td>
                    <td className="px-3 py-2">{ex.type}</td>
                    <td className="px-3 py-2">{ex.template || "—"}</td>
                    <td className="px-3 py-2">{ex.requestedBy}</td>
                    <td className="px-3 py-2">{new Date(ex.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {ex.link ? (
                        <Chip tone={ex.status === "Active" ? "success" : ex.status === "Revoked" ? "critical" : "warning"}>
                          {ex.status === "Active" ? `Active • exp ${ex.linkExpiry}` : ex.status}
                        </Chip>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {ex.status === "Active" ? <Chip tone="success">Active</Chip> : ex.status === "Revoked" ? <Chip tone="critical">Revoked</Chip> : <Chip tone="warning">Expired</Chip>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" onClick={() => window.open(ex.link || "#", "_blank")}>
                          <ExternalLink className="h-4 w-4 text-[var(--brand)]" /> Open
                        </Button>
                        <Button variant="ghost" onClick={() => { if (ex.link) navigator.clipboard.writeText(ex.link); setToast("Link copied"); setTimeout(() => setToast(null), 900); }}>
                          <Copy className="h-4 w-4 text-[var(--brand)]" /> Copy link
                        </Button>
                        {ex.status === "Active" ? (
                          <Button variant="ghost" onClick={() => setExportsList((prev) => prev.map((x) => (x.id === ex.id ? { ...x, status: "Revoked" } : x)))}>
                            <LinkIcon className="h-4 w-4 text-[var(--brand)]" /> Revoke
                          </Button>
                        ) : null}
                        <Button variant="ghost" onClick={() => setConfirmDeleteExport({ open: true, id: ex.id, name: ex.name })}>
                          <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Delete
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--text-muted)]">
                        Params: {ex.details?.dateScope} • {ex.details?.filters} • Delivery: {ex.details?.delivery}
                      </div>
                    </td>
                  </tr>
                ))}
                {exportsList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      No exports yet. Click <strong>Manual export</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========== 3) AUTOMATIONS & ALERTS ========== */}
        <Card>
          <SectionHeader
            icon={<Shield className="h-5 w-5" aria-hidden />}
            title="Automations & alerts"
            meta={<span className="text-[var(--text-muted)]">Rules, channels & testing</span>}
            actions={
              <>
                <Button variant="primary" onClick={() => { setEditingRule(null); setRuleDrawer(true); }}>
                  <Plus className="h-4 w-4" /> Create rule
                </Button>
                <Button variant="secondary" onClick={() => setChannelsDrawer(true)}>
                  <Slack className="h-4 w-4 text-[var(--brand)]" /> Channels
                </Button>
                <Button variant="secondary" onClick={() => setToast("Throttle & dedupe defaults saved")}>
                  <ListFilter className="h-4 w-4 text-[var(--brand)]" /> Throttle & dedupe
                </Button>
                <Button variant="ghost" onClick={() => setToast("Rule test executed (safe)")}>
                  <Wand2 className="h-4 w-4 text-[var(--brand)]" /> Test rule
                </Button>
              </>
            }
          />

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1080px] w-full text-sm">
              <thead className="bg-[var(--bg-app)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium">Then</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Throttle</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Last edit</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-app)]">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.when}</td>
                    <td className="px-3 py-2">{r.scope}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {r.then.map((t) => <Chip key={t}>{t}</Chip>)}
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.channel}</td>
                    <td className="px-3 py-2">{r.throttle}</td>
                    <td className="px-3 py-2">{r.status === "Enabled" ? <Chip tone="success">Enabled</Chip> : <Chip tone="warning">Paused</Chip>}</td>
                    <td className="px-3 py-2">{rt(r.lastEdit)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" onClick={() => { setEditingRule(r); setRuleDrawer(true); }}>
                          <Pencil className="h-4 w-4 text-[var(--brand)]" /> Edit
                        </Button>
                        <Button variant="ghost" onClick={() => { const clone = { ...r, id: `rule_${Date.now()}`, name: `${r.name} (copy)` }; setRules((prev) => [clone, ...prev]); setToast("Rule duplicated"); setTimeout(() => setToast(null), 900); }}>
                          <Scissors className="h-4 w-4 text-[var(--brand)]" /> Duplicate
                        </Button>
                        {r.status === "Paused" ? (
                          <Button variant="ghost" onClick={() => setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "Enabled" } : x)))}>
                            <Play className="h-4 w-4 text-[var(--brand)]" /> Resume
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "Paused" } : x)))}>
                            <Pause className="h-4 w-4 text-[var(--brand)]" /> Pause
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => setConfirmRemoveRule({ open: true, id: r.id, name: r.name })}>
                          <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      No rules yet. Click <strong>Create rule</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========== 4) BRANDING & WHITE‑LABEL ========== */}
        <Card>
          <SectionHeader
            icon={<Tag className="h-5 w-5" aria-hidden />}
            title="Branding & white‑label"
            meta={<span className="text-[var(--text-muted)]">Assets, colors, headers/footers, sender</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setBranding((b) => ({ ...b, inherit: !b.inherit }))}>
                  <Settings className="h-4 w-4 text-[var(--brand)]" /> {branding.inherit ? "Override here" : "Inherit workspace"}
                </Button>
              </>
            }
          />

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {/* Assets */}
            <div className="rounded-[var(--radius)] border p-3 space-y-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Brand assets</div>
              <div className="grid gap-2">
                <label className="text-xs text-[var(--text-muted)]">Logo (light)</label>
                <input type="file" accept=".png,.svg" className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} onChange={(e) => setBranding((b) => ({ ...b, logoLight: e.target.files?.[0]?.name || b.logoLight }))} />
                <label className="text-xs text-[var(--text-muted)]">Logo (dark)</label>
                <input type="file" accept=".png,.svg" className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} onChange={(e) => setBranding((b) => ({ ...b, logoDark: e.target.files?.[0]?.name || b.logoDark }))} />
                <label className="text-xs text-[var(--text-muted)]">Favicon</label>
                <input type="file" accept=".png,.ico,.svg" className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} onChange={(e) => setBranding((b) => ({ ...b, favicon: e.target.files?.[0]?.name || b.favicon }))} />
              </div>
              <div className="text-xs text-[var(--text-muted)]">Preview is static; no live metrics.</div>
            </div>

            {/* Colors */}
            <div className="rounded-[var(--radius)] border p-3 space-y-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Color theme</div>
              <div className="grid gap-2">
                <label className="text-xs text-[var(--text-muted)]">Primary (--brand)</label>
                <input type="text" className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" value={branding.brand} onChange={(e) => setBranding((b) => ({ ...b, brand: e.target.value }))} style={{ borderColor: "var(--border)" }} />
                <label className="text-xs text-[var(--text-muted)]">Hover (--brand-600)</label>
                <input type="text" className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" value={branding.brandHover} onChange={(e) => setBranding((b) => ({ ...b, brandHover: e.target.value }))} style={{ borderColor: "var(--border)" }} />
                <label className="text-xs text-[var(--text-muted)]">Text on brand (--on-brand)</label>
                <input type="text" className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" value={branding.onBrand} onChange={(e) => setBranding((b) => ({ ...b, onBrand: e.target.value }))} style={{ borderColor: "var(--border)" }} />
              </div>
              <Button variant="primary" onClick={() => setToast("Branding theme saved")}>
                <CheckCircle2 className="h-4 w-4" /> Save theme
              </Button>
            </div>

            {/* Header / Footer & sender */}
            <div className="rounded-[var(--radius)] border p-3 space-y-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Headers & footers</div>
              <div className="grid gap-2">
                <label className="text-xs text-[var(--text-muted)]">Header (md)</label>
                <input className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={branding.header} onChange={(e) => setBranding((b) => ({ ...b, header: e.target.value }))} />
                <label className="text-xs text-[var(--text-muted)]">Footer (md)</label>
                <input className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={branding.footer} onChange={(e) => setBranding((b) => ({ ...b, footer: e.target.value }))} />
              </div>

              <div className="text-sm font-medium text-[var(--text-strong)] mt-2">Sender identity</div>
              <div className="grid gap-2">
                <label className="text-xs text-[var(--text-muted)]">From name</label>
                <input className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={branding.fromName} onChange={(e) => setBranding((b) => ({ ...b, fromName: e.target.value }))} />
                <label className="text-xs text-[var(--text-muted)]">Reply‑to</label>
                <input className="h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={branding.replyTo} onChange={(e) => setBranding((b) => ({ ...b, replyTo: e.target.value }))} />
                <div className="flex items-center gap-2">
                  Status: {branding.senderVerified ? <Chip tone="success">Verified</Chip> : <Chip tone="warning">Pending</Chip>}
                  <Button variant="ghost" onClick={() => setBranding((b) => ({ ...b, senderVerified: true }))}><CheckCircle2 className="h-4 w-4 text-[var(--brand)]" /> Verify</Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ========== 5) SHARE LINKS & CLIENT PORTAL ========== */}
        <Card>
          <SectionHeader
            icon={<LinkIcon className="h-5 w-5" aria-hidden />}
            title="Share links & client portal"
            meta={<span className="text-[var(--text-muted)]">Portal toggle, links, and access policy</span>}
            actions={
              <>
                <Button variant="primary" onClick={() => setGenLinkDrawer(true)}>
                  <Plus className="h-4 w-4" /> Generate link
                </Button>
                <Button variant="secondary" onClick={() => setPolicyDrawer(true)}>
                  <Shield className="h-4 w-4 text-[var(--brand)]" /> Access policy
                </Button>
              </>
            }
          />

          {/* Client portal card */}
          <div className="mt-4 rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-strong)]">Client portal</div>
              <Toggle checked={portal.enabled} onChange={(v) => setPortal((p) => ({ ...p, enabled: v }))} label="Enable portal" id="portalEnable" />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Portal name</label>
                <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={portal.name} onChange={(e) => setPortal((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Welcome text</label>
                <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={portal.welcome} onChange={(e) => setPortal((p) => ({ ...p, welcome: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={portal.logoInherit} onChange={(v) => setPortal((p) => ({ ...p, logoInherit: v }))} label="Logo: inherit branding" id="portalLogo" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Access</label>
                <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={portal.access} onChange={(e) => setPortal((p) => ({ ...p, access: e.target.value as any }))}>
                  <option>Login</option>
                  <option>Passcode</option>
                  <option>Open</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Allowed domains</label>
                <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={portal.domains} onChange={(e) => setPortal((p) => ({ ...p, domains: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">IP allowlist (optional)</label>
                <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={portal.ipAllow} onChange={(e) => setPortal((p) => ({ ...p, ipAllow: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Share links directory */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-strong)]">Share links</div>
              <div className="flex items-center gap-2">
                <Button variant="destructive" disabled={selectedShareIds.length === 0} onClick={() => { setShareLinks((prev) => prev.map((s) => selectedShareIds.includes(s.id) ? { ...s, status: "Revoked" } : s)); setSelectedShareIds([]); setToast("Selected links revoked"); setTimeout(() => setToast(null), 1000); }}>
                  <LinkIcon className="h-4 w-4 text-[var(--brand)]" /> Bulk revoke
                </Button>
              </div>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-[1080px] w-full text-sm">
                <thead className="bg-[var(--bg-app)]">
                  <tr className="text-left text-[var(--text-muted)]">
                    <th className="px-3 py-2">
                      <input type="checkbox" aria-label="Select all" className="h-4 w-4 cursor-pointer" checked={allSharesSelected} onChange={() => setSelectedShareIds((ids) => (ids.length === shareLinks.length ? [] : shareLinks.map((s) => s.id)))} />
                    </th>
                    <th className="px-3 py-2 font-medium">Name / Target</th>
                    <th className="px-3 py-2 font-medium">Access</th>
                    <th className="px-3 py-2 font-medium">Passcode</th>
                    <th className="px-3 py-2 font-medium">Expiry</th>
                    <th className="px-3 py-2 font-medium">Created by</th>
                    <th className="px-3 py-2 font-medium">Created at</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {shareLinks.map((s) => {
                    const sel = selectedShareIds.includes(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-[var(--bg-app)]">
                        <td className="px-3 py-2">
                          <input type="checkbox" className="h-4 w-4 cursor-pointer" aria-label={`Select ${s.name}`} checked={sel} onChange={() => setSelectedShareIds((ids) => sel ? ids.filter((x) => x !== s.id) : [s.id, ...ids])} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline cursor-pointer">{s.name}</a>
                            <span className="text-xs text-[var(--text-muted)]">• {s.target}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2"><Chip>{s.access}</Chip></td>
                        <td className="px-3 py-2">{s.access === "Passcode" ? "Set" : "—"}</td>
                        <td className="px-3 py-2">{s.expiry || "—"}</td>
                        <td className="px-3 py-2">{s.createdBy}</td>
                        <td className="px-3 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2">{s.status === "Active" ? <Chip tone="success">Active</Chip> : s.status === "Revoked" ? <Chip tone="critical">Revoked</Chip> : <Chip tone="warning">Expired</Chip>}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="ghost" onClick={() => window.open(s.url, "_blank")}>
                              <ExternalLink className="h-4 w-4 text-[var(--brand)]" /> Open
                            </Button>
                            <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(s.url); setToast("URL copied"); setTimeout(() => setToast(null), 900); }}>
                              <Copy className="h-4 w-4 text-[var(--brand)]" /> Copy URL
                            </Button>
                            <Button variant="ghost" onClick={() => setShareLinks((prev) => prev.map((x) => (x.id === s.id ? { ...x, url: "https://share.example.com/" + Math.random().toString(36).slice(2, 8) } : x)))}>
                              <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Regenerate
                            </Button>
                            {s.access === "Passcode" ? (
                              <Button variant="ghost" onClick={() => setShareLinks((prev) => prev.map((x) => (x.id === s.id ? { ...x, passcode: Math.random().toString().slice(2, 6) } : x)))}>
                                <KeyIcon /> Set passcode
                              </Button>
                            ) : null}
                            {s.status === "Active" ? (
                              <Button variant="ghost" onClick={() => setConfirmRevokeShare({ open: true, id: s.id, name: s.name })}>
                                <LinkIcon className="h-4 w-4 text-[var(--brand)]" /> Revoke
                              </Button>
                            ) : null}
                            <Button variant="ghost" onClick={() => setShareLinks((prev) => prev.filter((x) => x.id !== s.id))}>
                              <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {shareLinks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-[var(--text-muted)]">
                        No share links yet. Click <strong>Generate link</strong>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Drawers / Modals */}
      <TemplatesManagerDrawer
        open={templatesDrawer}
        onClose={() => setTemplatesDrawer(false)}
        templates={templates.map((n) => ({ name: n, layout: "Summary" as const, sections: ["Overview", "Coverage", "Tasks"], branding: "Inherited" as const, header: "", footer: "" }))}
        onSave={(next) => { setTemplates(next.map((t) => t.name)); setToast("Report templates saved"); setTimeout(() => setToast(null), 1000); }}
      />
      <RecipientsDrawer open={recipientsDrawer} onClose={() => setRecipientsDrawer(false)} lists={recipientLists} onSave={(next) => { setRecipientLists(next); setToast("Recipients saved"); setTimeout(() => setToast(null), 1000); }} />
      <ScheduleDrawer open={scheduleDrawer} onClose={() => setScheduleDrawer(false)} onSave={createOrUpdateSchedule} initial={editingSchedule} templates={templates} recipientOptions={recipientOptions} />
      <ManualExportDrawer open={manualExportOpen} onClose={() => setManualExportOpen(false)} onCreate={(row) => { setExportsList((prev) => [row, ...prev]); setToast("Export created"); setTimeout(() => setToast(null), 1000); }} templates={templates} />
      <RuleBuilderDrawer open={ruleDrawer} onClose={() => setRuleDrawer(false)} onSave={saveRule} initial={editingRule} />
      <ChannelsDrawer open={channelsDrawer} onClose={() => setChannelsDrawer(false)} />
      <AccessPolicyDrawer open={policyDrawer} onClose={() => setPolicyDrawer(false)} policy={accessPolicy} onSave={(next) => { setAccessPolicy(next); setToast("Access policy saved"); setTimeout(() => setToast(null), 1000); }} />
      <GenerateLinkDrawer open={genLinkDrawer} onClose={() => setGenLinkDrawer(false)} onCreate={(row) => { setShareLinks((prev) => [row, ...prev]); setToast("Share link created"); setTimeout(() => setToast(null), 1000); }} templates={templates} exportsList={exportsList} />

      <ConfirmModal
        open={confirmRemoveSch.open}
        title="Remove schedule?"
        message={`You are about to remove “${confirmRemoveSch.name ?? ""}”. This stops future sends.`}
        confirmLabel="Remove schedule"
        onConfirm={() => {
          if (confirmRemoveSch.id) setSchedules((prev) => prev.filter((s) => s.id !== confirmRemoveSch.id));
          setConfirmRemoveSch({ open: false });
          setToast("Schedule removed");
          setTimeout(() => setToast(null), 1000);
        }}
        onCancel={() => setConfirmRemoveSch({ open: false })}
      />

      <ConfirmModal
        open={confirmDeleteExport.open}
        title="Delete export?"
        message={`Delete “${confirmDeleteExport.name ?? ""}”? This may be irreversible per retention policy.`}
        confirmLabel="Delete export"
        onConfirm={() => {
          if (confirmDeleteExport.id) setExportsList((prev) => prev.filter((e) => e.id !== confirmDeleteExport.id));
          setConfirmDeleteExport({ open: false });
          setToast("Export deleted");
          setTimeout(() => setToast(null), 1000);
        }}
        onCancel={() => setConfirmDeleteExport({ open: false })}
      />

      <ConfirmModal
        open={confirmRemoveRule.open}
        title="Remove rule?"
        message={`Remove “${confirmRemoveRule.name ?? ""}”? You can recreate it later.`}
        confirmLabel="Remove rule"
        onConfirm={() => {
          if (confirmRemoveRule.id) setRules((prev) => prev.filter((r) => r.id !== confirmRemoveRule.id));
          setConfirmRemoveRule({ open: false });
          setToast("Rule removed");
          setTimeout(() => setToast(null), 1000);
        }}
        onCancel={() => setConfirmRemoveRule({ open: false })}
      />

      <ConfirmModal
        open={confirmRevokeShare.open}
        title="Revoke link?"
        message={`Revoke “${confirmRevokeShare.name ?? ""}”? The URL will stop working immediately.`}
        confirmLabel="Revoke link"
        onConfirm={() => {
          if (confirmRevokeShare.id) setShareLinks((prev) => prev.map((s) => (s.id === confirmRevokeShare.id ? { ...s, status: "Revoked" } : s)));
          setConfirmRevokeShare({ open: false });
          setToast("Link revoked");
          setTimeout(() => setToast(null), 1000);
        }}
        onCancel={() => setConfirmRevokeShare({ open: false })}
      />

      {/* Live region + toast */}
      <p className="sr-only" aria-live="polite">{toast || ""}</p>
      <Toast text={toast} />
    </div>
  );
}

/* Small inline icon helper */
function KeyIcon() {
  return <span className="inline-flex items-center gap-1"><Shield className="h-4 w-4 text-[var(--brand)]" /> </span>;
}
