"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  // core actions
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
  AlertTriangle,
  Settings,
  Wrench,
  Server,
  Shield,
  Calendar,
  Pause,
  Play,
  Globe,
  Bot,
  BarChart3,
  ChevronUp,
  ChevronDown,
  PlugZap, // branded section icon
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Global design tokens (safe to remove if already included globally)
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
   Tiny UI primitives (tokens + a11y)
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
      style={variant === "secondary" || variant === "destructive" ? { borderColor: "var(--border)" } : undefined}
    >
      {children}
    </button>
  );
}

type ChipTone = "neutral" | "success" | "warning" | "critical" | "info";
function Chip({ tone = "neutral", children, className = "" }: { tone?: ChipTone; children: React.ReactNode; className?: string }) {
  const base = "inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium";
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
          ${checked ? "bg-[var(--brand)]" : "bg-[var(--border)]"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className={`absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
      {label && (
        <label htmlFor={id} className="text-sm text-[var(--text)] cursor-pointer">
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
        <h3 className="text-[20px] leading-6 font-semibold text-[var(--text-strong)] truncate">{title}</h3>
        {meta && <div className="ml-3 text-xs text-[var(--text-muted)]">{meta}</div>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types & utilities
   ────────────────────────────────────────────────────────────────────────── */
type SourceKind = "GSC" | "GA4" | "Crawler";
type SourceStatus = "Connected" | "Needs re-auth" | "Error";
type SourceRow = {
  id: string;
  kind: SourceKind;
  name: string;
  status: SourceStatus;
  lastCheck?: string;
  scopes: string[];
  mapping?: string;
  errorCode?: string;
};

type NodeRow = {
  id: string;
  name: string;
  region: string;
  ua: "Desktop" | "Mobile";
  jsRendering: boolean;
  concurrency: number;
  robotsPolicy: "Respect" | "Ignore" | "Custom";
  allowPatterns: string[];
  blockPatterns: string[];
  paused?: boolean;
};

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

/* ──────────────────────────────────────────────────────────────────────────
   Dialog helpers (focus trap + outside click)
   ────────────────────────────────────────────────────────────────────────── */
function useTrap(open: boolean, onClose: () => void, ref: React.RefObject<HTMLDivElement|null>) {
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
   Drawers / Modals used across sections
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
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center justify-between">
          <h4 id="confirm-title" className="text-[16px] font-semibold text-[var(--text-strong)]">{title}</h4>
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
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 text-[var(--brand)]" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Connect source */
function ConnectSourceDrawer({
  open,
  onClose,
  onConnect,
}: {
  open: boolean;
  onClose: () => void;
  onConnect: (row: Omit<SourceRow, "id" | "lastCheck">) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [kind, setKind] = useState<SourceKind>("GSC");
  const [name, setName] = useState("My connection");
  const [scopes, setScopes] = useState<string>("readonly,webmasters");
  const [mapping, setMapping] = useState("property: example.com → site: wranker.com");

  useEffect(() => {
    if (open) {
      setKind("GSC");
      setName("My connection");
      setScopes("readonly,webmasters");
      setMapping("property: example.com → site: wranker.com");
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[460px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="connect-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Connect account</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-4">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Provider</label>
            <select
              className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
              style={{ borderColor: "var(--border)" }}
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
            >
              <option value="GSC">Google Search Console</option>
              <option value="GA4">Google Analytics 4</option>
              <option value="Crawler">Crawler</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Connection name</label>
            <input
              className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Scopes / properties</label>
            <input
              className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              placeholder="readonly,webmasters"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Project mapping</label>
            <input
              className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              value={mapping}
              onChange={(e) => setMapping(e.target.value)}
              placeholder="property: example.com → site: wranker.com"
            />
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">OAuth scopes preview</div>
            <p className="mt-1 text-sm text-[var(--text)]">
              We’ll request the provider’s read‑only scopes only. You can edit scopes later in Settings.
            </p>
          </div>
        </div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onConnect({
                kind,
                name,
                status: "Connected",
                scopes: scopes.split(",").map((s) => s.trim()).filter(Boolean),
                mapping,
              });
              onClose();
            }}
          >
            <Server className="h-4 w-4 text-[var(--on-brand)]" /> Connect
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Edit Scopes (per-source) */
function EditScopesDrawer({
  open,
  onClose,
  source,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  source: SourceRow | null;
  onSave: (id: string, scopes: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open && source) setValue(source.scopes.join(", "));
  }, [open, source]);

  if (!open || !source) return null;
  return (
    <div className="fixed inset-0 z-[96]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[460px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scopes-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="scopes-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Edit scopes — {source.name}</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <label className="text-xs text-[var(--text-muted)]">Scopes (comma‑separated)</label>
          <input
            className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ borderColor: "var(--border)" }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="text-xs text-[var(--text-muted)]">Example (GSC): webmasters.readonly</div>
        </div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(source.id, value.split(",").map((s) => s.trim()).filter(Boolean));
              onClose();
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Change Mapping (per-source) */
function ChangeMappingDrawer({
  open,
  onClose,
  source,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  source: SourceRow | null;
  onSave: (id: string, mapping: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open && source) setValue(source.mapping || "");
  }, [open, source]);

  if (!open || !source) return null;
  return (
    <div className="fixed inset-0 z-[96]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[460px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="map-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Change mapping — {source.name}</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <label className="text-xs text-[var(--text-muted)]">Project mapping</label>
          <input
            className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ borderColor: "var(--border)" }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="property: example.com → site: wranker.com"
          />
          <div className="text-xs text-[var(--text-muted)]">Define the property → site mapping summary.</div>
        </div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(source.id, value.trim());
              onClose();
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Add / Edit crawler node */
function CrawlerNodeDrawer({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (row: NodeRow) => void;
  initial?: NodeRow | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);

  const [name, setName] = useState(initial?.name || "Primary Node");
  const [region, setRegion] = useState(initial?.region || "us-east-1");
  const [ua, setUa] = useState<NodeRow["ua"]>(initial?.ua || "Desktop");
  const [jsRendering, setJsRendering] = useState<boolean>(initial?.jsRendering ?? true);
  const [concurrency, setConcurrency] = useState<number>(initial?.concurrency || 8);
  const [robotsPolicy, setRobotsPolicy] = useState<NodeRow["robotsPolicy"]>(initial?.robotsPolicy || "Respect");
  const [allowPatterns, setAllowPatterns] = useState<string>((initial?.allowPatterns || ["/"]).join(", "));
  const [blockPatterns, setBlockPatterns] = useState<string>((initial?.blockPatterns || ["/admin", "/preview"]).join(", "));
  const [paused, setPaused] = useState<boolean>(!!initial?.paused);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "Primary Node");
      setRegion(initial?.region || "us-east-1");
      setUa(initial?.ua || "Desktop");
      setJsRendering(initial?.jsRendering ?? true);
      setConcurrency(initial?.concurrency || 8);
      setRobotsPolicy(initial?.robotsPolicy || "Respect");
      setAllowPatterns((initial?.allowPatterns || ["/"]).join(", "));
      setBlockPatterns((initial?.blockPatterns || ["/admin", "/preview"]).join(", "));
      setPaused(!!initial?.paused);
    }
  }, [open, initial]);

  if (!open) return null;

  const buildRow = (): NodeRow => ({
    id: initial?.id || `node_${Date.now()}`,
    name,
    region,
    ua,
    jsRendering,
    concurrency,
    robotsPolicy,
    allowPatterns: allowPatterns.split(",").map((s) => s.trim()).filter(Boolean),
    blockPatterns: blockPatterns.split(",").map((s) => s.trim()).filter(Boolean),
    paused,
  });

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="node-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="node-title" className="text-[16px] font-semibold text-[var(--text-strong)]">
            {initial ? "Edit crawler node" : "Add crawler node"}
          </h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Node name</label>
              <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Region</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={region} onChange={(e) => setRegion(e.target.value)}>
                <option>us-east-1</option>
                <option>us-west-2</option>
                <option>eu-west-1</option>
                <option>ap-south-1</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">User agent profile</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={ua} onChange={(e) => setUa(e.target.value as any)}>
                <option>Desktop</option>
                <option>Mobile</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={jsRendering} onChange={setJsRendering} label="JS rendering" id="jsr" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Fetch concurrency</label>
              <input type="number" min={1} max={64} className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={concurrency} onChange={(e) => setConcurrency(parseInt(e.target.value || "1", 10))} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Robots policy</label>
              <select className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={robotsPolicy} onChange={(e) => setRobotsPolicy(e.target.value as any)}>
                <option>Respect</option>
                <option>Ignore</option>
                <option>Custom</option>
              </select>
            </div>
          </div>

          {robotsPolicy === "Custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Allowed patterns (comma‑sep)</label>
                <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={allowPatterns} onChange={(e) => setAllowPatterns(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Blocked patterns (comma‑sep)</label>
                <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={blockPatterns} onChange={(e) => setBlockPatterns(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Toggle checked={paused} onChange={setPaused} label="Paused" id="pausedNode" />
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Defaults reminder</div>
            <p className="mt-1 text-sm text-[var(--text)]">
              Override UA, robots policy, and concurrency here. Use “Policy defaults” to set global crawler defaults.
            </p>
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(buildRow()); onClose(); }}>
            <Wrench className="h-4 w-4" /> Save node
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Edit Blackout window */
function EditBlackoutDrawer({
  open,
  onClose,
  blackout,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  blackout: { id: string; window: string; reason?: string } | null;
  onSave: (next: { id: string; window: string; reason?: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrap(open, onClose, ref);
  const [win, setWin] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && blackout) {
      setWin(blackout.window);
      setReason(blackout.reason || "");
    }
  }, [open, blackout]);

  if (!open || !blackout) return null;
  return (
    <div className="fixed inset-0 z-[96]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[440px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blk-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="blk-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Edit blackout window</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Window (UTC)</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={win} onChange={(e) => setWin(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Reason (optional)</label>
            <input className="mt-1 h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave({ id: blackout.id, window: win, reason: reason.trim() || undefined }); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Simple toast */
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
   Main: Tab 4 — Technical
   ────────────────────────────────────────────────────────────────────────── */
export default function TechnicalTab() {
  const [toast, setToast] = useState<string | null>(null);

  /* 1) Sources & Integrations */
  const [sources, setSources] = useState<SourceRow[]>([
    {
      id: "s1",
      kind: "GSC",
      name: "GSC – wranker.com",
      status: "Connected",
      lastCheck: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      scopes: ["webmasters.readonly"],
      mapping: "property: wranker.com → site: wranker.com",
    },
    {
      id: "s2",
      kind: "GA4",
      name: "GA4 – Wranker Property",
      status: "Needs re-auth",
      lastCheck: new Date(Date.now() - 1000 * 60 * 2000).toISOString(),
      scopes: ["analytics.readonly"],
      mapping: "property: GA4‑12345 → site: wranker.com",
      errorCode: "AUTH_EXPIRED",
    },
    {
      id: "s3",
      kind: "Crawler",
      name: "Crawler – Primary",
      status: "Connected",
      lastCheck: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      scopes: ["crawler:default"],
      mapping: "node: primary → site: wranker.com",
    },
  ]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  // NEW: Scopes / Mapping drawers state
  const [scopesDrawer, setScopesDrawer] = useState<{ open: boolean; src: SourceRow | null }>({ open: false, src: null });
  const [mappingDrawer, setMappingDrawer] = useState<{ open: boolean; src: SourceRow | null }>({ open: false, src: null });

  const reauthAll = () => {
    setSources((prev) => prev.map((s) => ({ ...s, status: "Connected" as const, errorCode: undefined, lastCheck: new Date().toISOString() })));
    setToast("Re‑auth initiated for all connections");
    setTimeout(() => setToast(null), 1200);
  };
  const syncTest = () => {
    // Simulate a ping (dry run) and update lastCheck timestamps
    setSources((prev) => prev.map((s) => ({ ...s, lastCheck: new Date().toISOString() })));
    setToast("Sync test (dry‑run) completed");
    setTimeout(() => setToast(null), 1100);
  };
  const addSource = (payload: Omit<SourceRow, "id" | "lastCheck">) => {
    setSources((prev) => [{ id: `src_${Date.now()}`, lastCheck: new Date().toISOString(), ...payload }, ...prev]);
    setToast("Source connected");
    setTimeout(() => setToast(null), 1200);
  };

  // Per-card actions
  const reauthOne = (id: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Connected", errorCode: undefined, lastCheck: new Date().toISOString() } : s
      )
    );
    setToast("Re‑auth complete");
    setTimeout(() => setToast(null), 1000);
  };
  const openScopes = (src: SourceRow) => setScopesDrawer({ open: true, src });
  const saveScopes = (id: string, scopes: string[]) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, scopes } : s)));
    setToast("Scopes updated");
    setTimeout(() => setToast(null), 1000);
  };
  const openMapping = (src: SourceRow) => setMappingDrawer({ open: true, src });
  const saveMapping = (id: string, mapping: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, mapping } : s)));
    setToast("Mapping updated");
    setTimeout(() => setToast(null), 1000);
  };
  const testConnection = (id: string) => {
    // Simulate ping OK → set lastCheck; if previously error, clear
    setSources((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, lastCheck: new Date().toISOString(), status: "Connected", errorCode: undefined } : s
      )
    );
    setToast("Ping successful");
    setTimeout(() => setToast(null), 900);
  };

  /* Crawler nodes */
  const [nodes, setNodes] = useState<NodeRow[]>([
    {
      id: "n1",
      name: "Primary Node",
      region: "us-east-1",
      ua: "Desktop",
      jsRendering: true,
      concurrency: 8,
      robotsPolicy: "Respect",
      allowPatterns: ["/"],
      blockPatterns: ["/admin", "/preview"],
      paused: false,
    },
  ]);
  const [nodeDrawerOpen, setNodeDrawerOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<NodeRow | null>(null);
  const [confirmNodeDelete, setConfirmNodeDelete] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const saveNode = (row: NodeRow) => {
    setNodes((prev) => {
      const exists = prev.some((n) => n.id === row.id);
      return exists ? prev.map((n) => (n.id === row.id ? row : n)) : [row, ...prev];
    });
    setToast("Crawler node saved");
    setTimeout(() => setToast(null), 1100);
  };

  const rotateUA = (id: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ua: n.ua === "Desktop" ? "Mobile" : "Desktop" } : n))
    );
    const updated = nodes.find((n) => n.id === id);
    const nextLabel = updated?.ua === "Desktop" ? "Mobile" : "Desktop";
    setToast(`User agent rotated to ${nextLabel}`);
    setTimeout(() => setToast(null), 1000);
  };

  /* Policy defaults (light state) */
  const [gDefault, setGDefault] = useState({ defaultProperty: "wranker.com", sandbox: false, gateByRole: true });
  const [crawlerDefault, setCrawlerDefault] = useState({ ua: "Desktop", maxDepth: 3, delayMs: 300, maxUrls: 1000, blackout: "02:00–04:00 UTC" });

  /* 2) Crawl Status & Issues (policy config only) */
  const [codeMap, setCodeMap] = useState<Record<"200" | "3xx" | "4xx" | "5xx", "Info" | "Warning" | "Critical">>({
    "200": "Info",
    "3xx": "Info",
    "4xx": "Warning",
    "5xx": "Critical",
  });
  const [dupSignals, setDupSignals] = useState({ htmlHash: true, canonEq: true, titleH1: false });
  const [tieBreakers, setTieBreakers] = useState<string[]>(["Shortest path", "In sitemap"]);
  const [robotsMeta, setRobotsMeta] = useState({ obey: true, metaPrecedence: true });
  const [canonPolicy, setCanonPolicy] = useState({ crossDomain: "Valid", non200: "Critical" });
  const [routeAction, setRouteAction] = useState<"Flag" | "Create task" | "Ignore">("Flag");
  const [muteTemplates, setMuteTemplates] = useState<string[]>(["/docs", "/search"]);
  const [muteDuration, setMuteDuration] = useState<string>("14d");
  const [auditNote, setAuditNote] = useState<string>("Check redirects, robots & canonical before triaging.");
  const [ignoredIncludes, setIgnoredIncludes] = useState<string>("/preview, /tags");
  const [ignoredExcludes, setIgnoredExcludes] = useState<string>("\\.pdf$, /admin");

  /* 3) Core Web Vitals (config) */
  const [cwvSources, setCwvSources] = useState({ cruxKey: "", rumKey: "", rumSample: 10, rumGroupKey: "template", rumAnonIP: true, synthetic: false });
  const [thresholdProfile, setThresholdProfile] = useState<"Default" | "Strict" | "Relaxed" | "Custom">("Default");
  const [thresholds, setThresholds] = useState({ LCP_good: 2500, LCP_ni: 4000, INP_good: 200, INP_ni: 500, CLS_good: 0.1, CLS_ni: 0.25 });
  const [tplOverrides, setTplOverrides] = useState<{ tpl: string; profile: string }[]>([{ tpl: "Product", profile: "Strict" }, { tpl: "Blog Post", profile: "Default" }]);
  const [cwvScope, setCwvScope] = useState({ deviceDesktop: 50, deviceMobile: 50, locales: ["en-US", "en-GB"], exclude: "/auth,/preview" });

  /* 4) Site Health & Warnings (policy only) */
  type CheckRow = { id: string; name: string; group: string; severity: "Critical" | "Warning" | "Info"; autoFix: boolean; owner: string; enabled: boolean };
  const [catalog, setCatalog] = useState<CheckRow[]>([
    { id: "c1", name: "Blocked by robots.txt", group: "Robots", severity: "Warning", autoFix: false, owner: "Tech", enabled: true },
    { id: "c2", name: "Canonical to non‑200", group: "Canonicals", severity: "Critical", autoFix: false, owner: "Tech", enabled: true },
    { id: "c3", name: "Missing sitemap", group: "Sitemap", severity: "Warning", autoFix: false, owner: "Tech", enabled: true },
  ]);
  const [severityEsc, setSeverityEsc] = useState({ Critical: "Create task + Email", Warning: "Create task", Info: "Digest only" });
  const [digest, setDigest] = useState({ daily: true, weekly: false, quietHours: "22:00–07:00" });
  const [muteBy, setMuteBy] = useState({ path: "/legacy", tag: "Archived", template: "Docs", expiry: "30d", slaCriticalDays: 3 });

  /* 5) Data Retention & Sync Schedule */
  const [retention, setRetention] = useState([
    { key: "Raw crawl logs", days: 90 },
    { key: "HTML snapshots", days: 90 },
    { key: "Rendered artifacts", days: 30 },
    { key: "Issue states", days: 365 },
    { key: "Connector payloads", days: 180 },
  ]);
  const [crawlerSchedule, setCrawlerSchedule] = useState({ freq: "Weekly", concurrency: 8, maxPerRun: 15000, delayMs: 300, tz: "UTC" });
  const [connectorSchedule, setConnectorSchedule] = useState({ cadence: "Daily", backfill: "7d", quotaCap: 80 });
  const [blackouts, setBlackouts] = useState<{ id: string; window: string; reason?: string }[]>([
    { id: "b1", window: "Sat 01:00–03:00 UTC", reason: "Maintenance" },
  ]);
  const [blackoutDrawer, setBlackoutDrawer] = useState<{ open: boolean; item: { id: string; window: string; reason?: string } | null }>({ open: false, item: null });
  const [exportsCfg, setExportsCfg] = useState({ allowOnDemand: true, requireApproval: true, expireHrs: 72 });

  /* helpers */
  const providerIcon = (k: SourceKind) =>
    k === "GSC" ? <Globe className="h-4 w-4 text-[var(--brand)]" aria-hidden /> : k === "GA4" ? <BarChart3 className="h-4 w-4 text-[var(--brand)]" aria-hidden /> : <Bot className="h-4 w-4 text-[var(--brand)]" aria-hidden />;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text)]">
      <GlobalTokens />
      <div className="w-full mx-auto px-6 py-8 space-y-6">
        {/* 1) SOURCES & INTEGRATIONS */}
        <Card>
          <SectionHeader
            icon={<PlugZap className="h-5 w-5" aria-hidden />}
            title="Sources & integrations"
            meta={<span className="text-[var(--text-muted)]">Connect, scope & manage crawler</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setConnectOpen(true)} title="Connect account">
                  <Globe className="h-4 w-4 text-[var(--brand)]" /> Connect account
                </Button>
                <Button variant="secondary" onClick={() => { setEditingNode(null); setNodeDrawerOpen(true); }} title="Add crawler node">
                  <Bot className="h-4 w-4 text-[var(--brand)]" /> Add crawler node
                </Button>
                <Button variant="secondary" onClick={reauthAll} title="Re‑auth all">
                  <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Re‑auth all
                </Button>
                <Button variant="secondary" onClick={syncTest} title="Sync test (dry‑run)">
                  <Wrench className="h-4 w-4 text-[var(--brand)]" /> Sync test
                </Button>
                <Button variant="ghost" onClick={() => setToast("Open integration settings")} title="Scopes & mapping">
                  <Settings className="h-4 w-4 text-[var(--brand)]" /> Settings
                </Button>
              </>
            }
          />

          {/* Connections directory */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sources.map((s) => (
              <div key={s.id} className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }} aria-labelledby={`src-${s.id}-title`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    {providerIcon(s.kind)}
                    <h4 id={`src-${s.id}-title`} className="text-sm font-medium text-[var(--text-strong)] truncate">{s.name}</h4>
                  </div>
                  <div className="shrink-0">
                    {s.status === "Connected" ? <Chip tone="success">Connected</Chip> : s.status === "Needs re-auth" ? <Chip tone="warning">Needs re‑auth</Chip> : <Chip tone="critical">Error</Chip>}
                  </div>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Last check {rt(s.lastCheck)} • Scopes: {s.scopes.join(", ")}
                  <br />
                  {s.mapping}
                </div>

                {s.status !== "Connected" && (s.errorCode || s.status === "Needs re-auth") && (
                  <div className="mt-2 rounded-[var(--radius)] border px-3 py-2 text-sm flex items-start gap-2" style={{ background: "var(--critical-bg)", color: "var(--critical)", borderColor: "var(--border)" }} role="alert">
                    <AlertTriangle className="h-4 w-4 mt-[2px]" aria-hidden />
                    <div>There is a problem with this connection{ s.errorCode ? ` (code: ${s.errorCode})` : "" }.</div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" onClick={() => reauthOne(s.id)}>
                    <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Re‑auth
                  </Button>
                  <Button variant="ghost" onClick={() => openScopes(s)}>
                    <Settings className="h-4 w-4 text-[var(--brand)]" /> Edit scopes
                  </Button>
                  <Button variant="ghost" onClick={() => openMapping(s)}>
                    <Pencil className="h-4 w-4 text-[var(--brand)]" /> Change mapping
                  </Button>
                  <Button variant="ghost" onClick={() => testConnection(s.id)}>
                    <Wrench className="h-4 w-4 text-[var(--brand)]" /> Test connection
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDisconnect({ open: true, id: s.id, name: s.name })}>
                    <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Crawler nodes */}
          <div className="mt-6">
            <div className="text-sm font-medium text-[var(--text-strong)] mb-2">Crawler nodes</div>
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full text-sm">
                <thead className="bg-[var(--bg-app)]">
                  <tr className="text-left text-[var(--text-muted)]">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Region</th>
                    <th className="px-3 py-2 font-medium">User agent</th>
                    <th className="px-3 py-2 font-medium">JS rendering</th>
                    <th className="px-3 py-2 font-medium">Concurrency</th>
                    <th className="px-3 py-2 font-medium">Robots policy</th>
                    <th className="px-3 py-2 font-medium">Allowed</th>
                    <th className="px-3 py-2 font-medium">Blocked</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {nodes.map((n) => (
                    <tr key={n.id} className="hover:bg-[var(--bg-app)]">
                      <td className="px-3 py-2">{n.name}</td>
                      <td className="px-3 py-2">{n.region}</td>
                      <td className="px-3 py-2">{n.ua}</td>
                      <td className="px-3 py-2">{n.jsRendering ? <Chip tone="success">Enabled</Chip> : <Chip tone="neutral">Disabled</Chip>}</td>
                      <td className="px-3 py-2">{n.concurrency}</td>
                      <td className="px-3 py-2">{n.robotsPolicy}</td>
                      <td className="px-3 py-2">{n.allowPatterns.join(", ") || "—"}</td>
                      <td className="px-3 py-2">{n.blockPatterns.join(", ") || "—"}</td>
                      <td className="px-3 py-2">{n.paused ? <Chip tone="warning">Paused</Chip> : <Chip tone="success">Active</Chip>}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="ghost" onClick={() => { setEditingNode(n); setNodeDrawerOpen(true); }}>
                            <Pencil className="h-4 w-4 text-[var(--brand)]" /> Edit
                          </Button>
                          <Button variant="ghost" onClick={() => rotateUA(n.id)}>
                            <Wrench className="h-4 w-4 text-[var(--brand)]" /> Rotate UA
                          </Button>
                          {n.paused ? (
                            <Button variant="ghost" onClick={() => setNodes((prev) => prev.map((x) => (x.id === n.id ? { ...x, paused: false } : x)))}>
                              <Play className="h-4 w-4 text-[var(--brand)]" /> Resume
                            </Button>
                          ) : (
                            <Button variant="ghost" onClick={() => setNodes((prev) => prev.map((x) => (x.id === n.id ? { ...x, paused: true } : x)))}>
                              <Pause className="h-4 w-4 text-[var(--brand)]" /> Pause
                            </Button>
                          )}
                          <Button variant="ghost" onClick={() => setConfirmNodeDelete({ open: true, id: n.id, name: n.name })}>
                            <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {nodes.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-[var(--text-muted)]">No nodes yet. Click “Add crawler node”.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Policy defaults */}
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Policy defaults — GSC / GA4</div>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Default property</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={gDefault.defaultProperty} onChange={(e) => setGDefault((p) => ({ ...p, defaultProperty: e.target.value }))} />
                </div>
                <Toggle checked={gDefault.sandbox} onChange={(v) => setGDefault((p) => ({ ...p, sandbox: v }))} label="Use sandbox projects by default" id="sandbox" />
                <Toggle checked={gDefault.gateByRole} onChange={(v) => setGDefault((p) => ({ ...p, gateByRole: v }))} label="Permission gates by role" id="gate" />
              </div>
            </div>

            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Policy defaults — Crawler</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Default UA</label>
                  <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={crawlerDefault.ua} onChange={(e) => setCrawlerDefault((p) => ({ ...p, ua: e.target.value }))}>
                    <option>Desktop</option>
                    <option>Mobile</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Max depth</label>
                  <input type="number" min={0} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={crawlerDefault.maxDepth} onChange={(e) => setCrawlerDefault((p) => ({ ...p, maxDepth: parseInt(e.target.value || "0", 10) }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Delay (ms)</label>
                  <input type="number" min={0} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={crawlerDefault.delayMs} onChange={(e) => setCrawlerDefault((p) => ({ ...p, delayMs: parseInt(e.target.value || "0", 10) }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Max URLs/run</label>
                  <input type="number" min={0} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={crawlerDefault.maxUrls} onChange={(e) => setCrawlerDefault((p) => ({ ...p, maxUrls: parseInt(e.target.value || "0", 10) }))} />
                </div>
              </div>
              <div className="mt-3 text-sm">
                <label className="text-xs text-[var(--text-muted)]">Blackout window (UTC)</label>
                <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={crawlerDefault.blackout} onChange={(e) => setCrawlerDefault((p) => ({ ...p, blackout: e.target.value }))} />
              </div>
              <div className="mt-3 flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("Default crawler policy saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save defaults
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 2) CRAWL STATUS & ISSUES (POLICY) */}
        <Card>
          <SectionHeader icon={<Shield className="h-5 w-5 text-[var(--brand)]" />} title="Crawl status & issues" meta={<span className="text-[var(--text-muted)]">Classification, routing & ignore patterns</span>} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {/* Classification rules */}
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Classification rules</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                {(["200", "3xx", "4xx", "5xx"] as const).map((code) => (
                  <div key={code} className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text)]">HTTP {code}</span>
                    <select className="h-9 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={codeMap[code]} onChange={(e) => setCodeMap((m) => ({ ...m, [code]: e.target.value as any }))}>
                      <option>Info</option>
                      <option>Warning</option>
                      <option>Critical</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-sm">
                <div className="font-medium text-[var(--text-strong)]">Duplication signals</div>
                <div className="mt-2 grid gap-2">
                  <Toggle checked={dupSignals.htmlHash} onChange={(v) => setDupSignals((p) => ({ ...p, htmlHash: v }))} label="Normalized HTML hash" id="dup1" />
                  <Toggle checked={dupSignals.canonEq} onChange={(v) => setDupSignals((p) => ({ ...p, canonEq: v }))} label="Canonical target equality" id="dup2" />
                  <Toggle checked={dupSignals.titleH1} onChange={(v) => setDupSignals((p) => ({ ...p, titleH1: v }))} label="Near‑duplicate Title/H1" id="dup3" />
                </div>
                <div className="mt-3">
                  <label className="text-xs text-[var(--text-muted)]">Tie‑breakers (order)</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {tieBreakers.map((t, i) => <Chip key={`${t}-${i}`}>{t}</Chip>)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="font-medium text-[var(--text-strong)]">Robots handling</div>
                  <div className="mt-2 grid gap-2">
                    <Toggle checked={robotsMeta.obey} onChange={(v) => setRobotsMeta((p) => ({ ...p, obey: v }))} label="Obey robots.txt" id="rh1" />
                    <Toggle checked={robotsMeta.metaPrecedence} onChange={(v) => setRobotsMeta((p) => ({ ...p, metaPrecedence: v }))} label="Meta robots precedence" id="rh2" />
                  </div>
                </div>
                <div>
                  <div className="font-medium text-[var(--text-strong)]">Canonical policy</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Cross‑domain canonicals</span>
                    <select className="h-9 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={canonPolicy.crossDomain} onChange={(e) => setCanonPolicy((p) => ({ ...p, crossDomain: e.target.value }))}>
                      <option>Valid</option>
                      <option>Invalid</option>
                    </select>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Canonical → non‑200</span>
                    <select className="h-9 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" style={{ borderColor: "var(--border)" }} value={canonPolicy.non200} onChange={(e) => setCanonPolicy((p) => ({ ...p, non200: e.target.value }))}>
                      <option>Critical</option>
                      <option>Warning</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Routing & Ignore */}
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Issue routing</div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                {(["Flag", "Create task", "Ignore"] as const).map((m) => (
                  <label key={m} className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="route" checked={routeAction === m} onChange={() => setRouteAction(m)} />
                    {m}
                  </label>
                ))}
              </div>

              <div className="mt-3 text-sm">
                <label className="text-xs text-[var(--text-muted)]">Auto‑mute templates/paths</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {muteTemplates.map((t, i) => <Chip key={`${t}-${i}`}>{t}</Chip>)}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Mute duration</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={muteDuration} onChange={(e) => setMuteDuration(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Audit notes template</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={auditNote} onChange={(e) => setAuditNote(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 text-sm">
                <div className="font-medium text-[var(--text-strong)]">Ignored patterns</div>
                <div className="mt-2 grid gap-2">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Include (regex allowed)</label>
                    <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={ignoredIncludes} onChange={(e) => setIgnoredIncludes(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Exclude (regex allowed)</label>
                    <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={ignoredExcludes} onChange={(e) => setIgnoredExcludes(e.target.value)} />
                  </div>
                  <div className="rounded-[var(--radius)] border p-2 text-xs text-[var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
                    Dry‑run preview shows example matches only (no counts).
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("Crawl rules saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save rules
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 3) CORE WEB VITALS (CONFIG ONLY) */}
        <Card>
          <SectionHeader icon={<Server className="h-5 w-5 text-[var(--brand)]" />} title="Core Web Vitals (config)" meta={<span className="text-[var(--text-muted)]">Sources, thresholds, scope</span>} />
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {/* Sources */}
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Sources</div>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">CrUX API key</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={cwvSources.cruxKey} onChange={(e) => setCwvSources((p) => ({ ...p, cruxKey: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">RUM ingestion key</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvSources.rumKey} onChange={(e) => setCwvSources((p) => ({ ...p, rumKey: e.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Sampling rate %</label>
                    <input type="number" min={1} max={100} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvSources.rumSample} onChange={(e) => setCwvSources((p) => ({ ...p, rumSample: parseInt(e.target.value || "10", 10) }))} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Page group key</label>
                    <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvSources.rumGroupKey} onChange={(e) => setCwvSources((p) => ({ ...p, rumGroupKey: e.target.value }))} />
                  </div>
                </div>
                <Toggle checked={cwvSources.rumAnonIP} onChange={(v) => setCwvSources((p) => ({ ...p, rumAnonIP: v }))} label="Anonymize IPs" id="anonip" />
                <Toggle checked={cwvSources.synthetic} onChange={(v) => setCwvSources((p) => ({ ...p, synthetic: v }))} label="Enable synthetic profiles" id="syn" />
              </div>
            </div>

            {/* Threshold profiles */}
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Threshold profiles</div>
              <div className="mt-3 text-sm">
                <label className="text-xs text-[var(--text-muted)]">Profile</label>
                <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)]" style={{ borderColor: "var(--border)" }} value={thresholdProfile} onChange={(e) => setThresholdProfile(e.target.value as any)}>
                  <option>Default</option>
                  <option>Strict</option>
                  <option>Relaxed</option>
                  <option>Custom</option>
                </select>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div><label className="text-xs text-[var(--text-muted)]">LCP good (ms)</label><input type="number" className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={thresholds.LCP_good} onChange={(e) => setThresholds((p) => ({ ...p, LCP_good: parseInt(e.target.value || "2500", 10) }))} /></div>
                <div><label className="text-xs text-[var(--text-muted)]">LCP needs‑improve (ms)</label><input type="number" className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={thresholds.LCP_ni} onChange={(e) => setThresholds((p) => ({ ...p, LCP_ni: parseInt(e.target.value || "4000", 10) }))} /></div>
                <div><label className="text-xs text-[var(--text-muted)]">INP good (ms)</label><input type="number" className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={thresholds.INP_good} onChange={(e) => setThresholds((p) => ({ ...p, INP_good: parseInt(e.target.value || "200", 10) }))} /></div>
                <div><label className="text-xs text-[var(--text-muted)]">INP needs‑improve (ms)</label><input type="number" className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={thresholds.INP_ni} onChange={(e) => setThresholds((p) => ({ ...p, INP_ni: parseInt(e.target.value || "500", 10) }))} /></div>
                <div><label className="text-xs text-[var(--text-muted)]">CLS good</label><input type="number" step="0.01" className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={thresholds.CLS_good} onChange={(e) => setThresholds((p) => ({ ...p, CLS_good: parseFloat(e.target.value || "0.1") }))} /></div>
                <div><label className="text-xs text-[var(--text-muted)]">CLS needs‑improve</label><input type="number" step="0.01" className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={thresholds.CLS_ni} onChange={(e) => setThresholds((p) => ({ ...p, CLS_ni: parseFloat(e.target.value || "0.25") }))} /></div>
              </div>
              <div className="mt-3 text-sm">
                <label className="text-xs text-[var(--text-muted)]">Per‑template overrides</label>
                <div className="mt-1 space-y-2">
                  {tplOverrides.map((o, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span>{o.tpl}</span>
                      <select className="h-9 rounded-[var(--radius)] border px-2 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={o.profile} onChange={(e) => setTplOverrides((arr) => arr.map((x, idx) => (idx === i ? { ...x, profile: e.target.value } : x)))}>
                        <option>Default</option>
                        <option>Strict</option>
                        <option>Relaxed</option>
                        <option>Custom</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("CVW threshold profile saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save thresholds
                </Button>
              </div>
            </div>

            {/* Scope */}
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Scope</div>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Desktop weight %</label>
                    <input type="number" min={0} max={100} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvScope.deviceDesktop} onChange={(e) => setCwvScope((p) => ({ ...p, deviceDesktop: parseInt(e.target.value || "50", 10) }))} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Mobile weight %</label>
                    <input type="number" min={0} max={100} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvScope.deviceMobile} onChange={(e) => setCwvScope((p) => ({ ...p, deviceMobile: parseInt(e.target.value || "50", 10) }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Locales</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvScope.locales.join(", ")} onChange={(e) => setCwvScope((p) => ({ ...p, locales: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Exclude routes (comma)</label>
                  <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={cwvScope.exclude} onChange={(e) => setCwvScope((p) => ({ ...p, exclude: e.target.value }))} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("CVW scope saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save scope
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 4) SITE HEALTH & WARNINGS (POLICY) */}
        <Card>
          <SectionHeader icon={<Shield className="h-5 w-5 text-[var(--brand)]" />} title="Site health & warnings (policy)" meta={<span className="text-[var(--text-muted)]">Check catalog, severity mapping & alerts</span>} />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Check catalog</div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-[var(--bg-app)]">
                    <tr className="text-left text-[var(--text-muted)]">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Group</th>
                      <th className="px-3 py-2 font-medium">Severity</th>
                      <th className="px-3 py-2 font-medium">Auto‑fix</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium">Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {catalog.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--bg-app)]">
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2">{c.group}</td>
                        <td className="px-3 py-2">
                          <select className="h-9 rounded-[var(--radius)] border px-2 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={c.severity} onChange={(e) => setCatalog((prev) => prev.map((x) => (x.id === c.id ? { ...x, severity: e.target.value as any } : x)))}>
                            <option>Critical</option>
                            <option>Warning</option>
                            <option>Info</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">{c.autoFix ? <Chip tone="success">Yes</Chip> : <Chip tone="neutral">No</Chip>}</td>
                        <td className="px-3 py-2">{c.owner}</td>
                        <td className="px-3 py-2">
                          <Toggle checked={c.enabled} onChange={(v) => setCatalog((prev) => prev.map((x) => (x.id === c.id ? { ...x, enabled: v } : x)))} id={`en-${c.id}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("Check catalog saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save catalog
                </Button>
              </div>
            </div>

            <div className="rounded-[var(--radius)] border p-3 space-y-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="text-sm font-medium text-[var(--text-strong)]">Severity mapping & escalation</div>
                <div className="mt-2 grid gap-2 text-sm">
                  {(["Critical", "Warning", "Info"] as const).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <span>{k}</span>
                      <select className="h-9 rounded-[var(--radius)] border px-2 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={(severityEsc as any)[k]} onChange={(e) => setSeverityEsc((p) => ({ ...p, [k]: e.target.value }))}>
                        <option>Create task + Email</option>
                        <option>Create task</option>
                        <option>Email only</option>
                        <option>Digest only</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--text-strong)]">Muting & SLA</div>
                <div className="mt-2 grid gap-2 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><label className="text-xs text-[var(--text-muted)]">Mute by path</label><input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={muteBy.path} onChange={(e) => setMuteBy((p) => ({ ...p, path: e.target.value }))} /></div>
                    <div><label className="text-xs text-[var(--text-muted)]">Mute by tag</label><input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={muteBy.tag} onChange={(e) => setMuteBy((p) => ({ ...p, tag: e.target.value }))} /></div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><label className="text-xs text-[var(--text-muted)]">Mute by template</label><input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={muteBy.template} onChange={(e) => setMuteBy((p) => ({ ...p, template: e.target.value }))} /></div>
                    <div><label className="text-xs text-[var(--text-muted)]">Mute expiry</label><input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={muteBy.expiry} onChange={(e) => setMuteBy((p) => ({ ...p, expiry: e.target.value }))} /></div>
                  </div>
                  <div><label className="text-xs text-[var(--text-muted)]">SLA (days to acknowledge Critical)</label><input type="number" min={0} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={muteBy.slaCriticalDays} onChange={(e) => setMuteBy((p) => ({ ...p, slaCriticalDays: parseInt(e.target.value || "0", 10) }))} /></div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("Health policy saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save policy
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 5) DATA RETENTION & SYNC SCHEDULE */}
        <Card>
          <SectionHeader icon={<Calendar className="h-5 w-5 text-[var(--brand)]" />} title="Data retention & sync schedule" meta={<span className="text-[var(--text-muted)]">Retention windows, schedules & blackout windows</span>} />
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {/* Retention */}
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Retention policies</div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[520px] w-full text-sm">
                  <thead className="bg-[var(--bg-app)]">
                    <tr className="text-left text-[var(--text-muted)]">
                      <th className="px-3 py-2 font-medium">Entity</th>
                      <th className="px-3 py-2 font-medium">Retention (days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {retention.map((r, i) => (
                      <tr key={r.key} className="hover:bg-[var(--bg-app)]">
                        <td className="px-3 py-2">{r.key}</td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} className="h-9 w-24 rounded-[var(--radius)] border px-2 text-sm" style={{ borderColor: "var(--border)" }} value={r.days} onChange={(e) => setRetention((arr) => arr.map((x, idx) => (idx === i ? { ...x, days: parseInt(e.target.value || "0", 10) } : x)))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("Retention saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save retention
                </Button>
              </div>
            </div>

            {/* Schedules */}
            <div className="rounded-[var(--radius)] border p-3 space-y-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="text-sm font-medium text-[var(--text-strong)]">Crawler schedule</div>
                <div className="mt-2 grid gap-2 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Frequency</label>
                      <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-2 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={crawlerSchedule.freq} onChange={(e) => setCrawlerSchedule((p) => ({ ...p, freq: e.target.value }))}>
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Custom cron</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Timezone</label>
                      <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={crawlerSchedule.tz} onChange={(e) => setCrawlerSchedule((p) => ({ ...p, tz: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div><label className="text-xs text-[var(--text-muted)]">Concurrency</label><input type="number" min={1} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-2 text-sm" style={{ borderColor: "var(--border)" }} value={crawlerSchedule.concurrency} onChange={(e) => setCrawlerSchedule((p) => ({ ...p, concurrency: parseInt(e.target.value || "1", 10) }))} /></div>
                    <div><label className="text-xs text-[var(--text-muted)]">Max pages/run</label><input type="number" min={0} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-2 text-sm" style={{ borderColor: "var(--border)" }} value={crawlerSchedule.maxPerRun} onChange={(e) => setCrawlerSchedule((p) => ({ ...p, maxPerRun: parseInt(e.target.value || "0", 10) }))} /></div>
                    <div><label className="text-xs text-[var(--text-muted)]">Delay (ms)</label><input type="number" min={0} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-2 text-sm" style={{ borderColor: "var(--border)" }} value={crawlerSchedule.delayMs} onChange={(e) => setCrawlerSchedule((p) => ({ ...p, delayMs: parseInt(e.target.value || "0", 10) }))} /></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--text-strong)]">Connectors (GSC/GA4)</div>
                <div className="mt-2 grid gap-2 text-sm">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Cadence</label>
                      <select className="mt-1 h-9 w-full rounded-[var(--radius)] border px-2 text-sm cursor-pointer" style={{ borderColor: "var(--border)" }} value={connectorSchedule.cadence} onChange={(e) => setConnectorSchedule((p) => ({ ...p, cadence: e.target.value }))}>
                        <option>Hourly</option>
                        <option>Daily</option>
                        <option>Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Backfill window</label>
                      <input className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={connectorSchedule.backfill} onChange={(e) => setConnectorSchedule((p) => ({ ...p, backfill: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">API quota cap (%)</label>
                      <input type="number" min={1} max={100} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-2 text-sm" style={{ borderColor: "var(--border)" }} value={connectorSchedule.quotaCap} onChange={(e) => setConnectorSchedule((p) => ({ ...p, quotaCap: parseInt(e.target.value || "80", 10) }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button variant="primary" onClick={() => { setToast("Schedules saved"); setTimeout(() => setToast(null), 1000); }}>
                  <CheckCircle2 className="h-4 w-4" /> Save schedules
                </Button>
              </div>
            </div>

            {/* Blackouts & Exports */}
            <div className="rounded-[var(--radius)] border p-3 space-y-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="text-sm font-medium text-[var(--text-strong)]">Blackout windows (UTC)</div>
                <div className="mt-2 space-y-2">
                  {blackouts.map((b) => (
                    <div key={b.id} className="rounded-[var(--radius)] border p-2 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                      <div className="text-sm">
                        {b.window}
                        <span className="text-[var(--text-muted)]"> {b.reason ? `• ${b.reason}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => setBlackoutDrawer({ open: true, item: b })}>
                          <Pencil className="h-4 w-4 text-[var(--brand)]" /> Edit
                        </Button>
                        <Button variant="ghost" onClick={() => setBlackouts((arr) => arr.filter((x) => x.id !== b.id))}>
                          <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {blackouts.length === 0 && (
                    <div className="rounded-[var(--radius)] border p-2 text-sm text-[var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
                      No blackout windows.
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <Button variant="secondary" onClick={() => setBlackouts((arr) => [{ id: `b_${Date.now()}`, window: "Sun 02:00–03:00 UTC", reason: "" }, ...arr])}>
                    <Plus className="h-4 w-4 text-[var(--brand)]" /> Add blackout
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-[var(--text-strong)]">Exports</div>
                <div className="mt-2 grid gap-2 text-sm">
                  <Toggle checked={exportsCfg.allowOnDemand} onChange={(v) => setExportsCfg((p) => ({ ...p, allowOnDemand: v }))} label="Allow on‑demand export" id="exp1" />
                  <Toggle checked={exportsCfg.requireApproval} onChange={(v) => setExportsCfg((p) => ({ ...p, requireApproval: v }))} label="Require approval" id="exp2" />
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Export expiry (hours)</label>
                    <input type="number" min={1} className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm" style={{ borderColor: "var(--border)" }} value={exportsCfg.expireHrs} onChange={(e) => setExportsCfg((p) => ({ ...p, expireHrs: parseInt(e.target.value || "24", 10) }))} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <Button variant="primary" onClick={() => { setToast("Export policy saved"); setTimeout(() => setToast(null), 1000); }}>
                    <CheckCircle2 className="h-4 w-4" /> Save export policy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Drawers / Modals */}
      <ConnectSourceDrawer open={connectOpen} onClose={() => setConnectOpen(false)} onConnect={addSource} />
      <EditScopesDrawer open={scopesDrawer.open} onClose={() => setScopesDrawer({ open: false, src: null })} source={scopesDrawer.src} onSave={saveScopes} />
      <ChangeMappingDrawer open={mappingDrawer.open} onClose={() => setMappingDrawer({ open: false, src: null })} source={mappingDrawer.src} onSave={saveMapping} />
      <CrawlerNodeDrawer open={nodeDrawerOpen} onClose={() => setNodeDrawerOpen(false)} onSave={saveNode} initial={editingNode} />
      <EditBlackoutDrawer
        open={blackoutDrawer.open}
        onClose={() => setBlackoutDrawer({ open: false, item: null })}
        blackout={blackoutDrawer.item}
        onSave={(next) => {
          setBlackouts((arr) => arr.map((x) => (x.id === next.id ? next : x)));
          setToast("Blackout updated");
          setTimeout(() => setToast(null), 900);
        }}
      />

      <ConfirmModal
        open={confirmDisconnect.open}
        title="Disconnect source?"
        message={`You are about to disconnect “${confirmDisconnect.name ?? ""}”. This will stop future syncs until you reconnect.`}
        confirmLabel="Disconnect"
        onConfirm={() => {
          if (confirmDisconnect.id) setSources((prev) => prev.filter((s) => s.id !== confirmDisconnect.id));
          setConfirmDisconnect({ open: false });
          setToast("Source disconnected");
          setTimeout(() => setToast(null), 1000);
        }}
        onCancel={() => setConfirmDisconnect({ open: false })}
      />

      <ConfirmModal
        open={confirmNodeDelete.open}
        title="Delete crawler node?"
        message={`Delete node “${confirmNodeDelete.name ?? ""}”? Crawls will not use this node anymore.`}
        confirmLabel="Delete node"
        onConfirm={() => {
          if (confirmNodeDelete.id) setNodes((prev) => prev.filter((n) => n.id !== confirmNodeDelete.id));
          setConfirmNodeDelete({ open: false });
          setToast("Node deleted");
          setTimeout(() => setToast(null), 1000);
        }}
        onCancel={() => setConfirmNodeDelete({ open: false })}
      />

      {/* Live region + toast */}
      <p className="sr-only" aria-live="polite">{toast || ""}</p>
      <Toast text={toast} />
    </div>
  );
}
