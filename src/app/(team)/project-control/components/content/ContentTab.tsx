"use client";

/**
 * Content & Pages — Tab 2
 * Uses Wranker token set (brand, type, spacing, radius, focus) per spec.
 * Tokens referenced: --brand, --brand-600, --on-brand, --bg-app, --bg-panel, --border, --border-subtle,
 * --text-strong, --text, --text-muted, --success, --success-bg, --warning, --warning-bg,
 * --critical, --critical-bg, --focus, --radius, --shadow-1, --shadow-md.  :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  // section glyphs
  Globe,        // Pages & Sitemaps
  Layers,       // Priority & Templates
  // actions & UI
  X,
  Plus,
  RefreshCw,
  Upload,
  Search,
  Filter,
  Download,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  ShieldOff,
  ArrowRightLeft,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Global tokens — (include once; remove if already global)
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
  --focus:#4286F5; --radius:6px;
  --shadow-1:0 1px 3px rgba(0,0,0,0.10);
  --shadow-md:0 4px 6px rgba(0,0,0,0.10);
}
*{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Inter Fallback",sans-serif}
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Small UI primitives (tokenized; pointer cursor on all clickable)
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

function FilterChip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`cursor-pointer inline-flex items-center h-8 px-3 rounded-[var(--radius)] text-xs font-medium border
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]
      ${
        active
          ? "text-[var(--brand)] bg-[color-mix(in srgb, var(--brand) 12%, white)] border-[var(--brand)]"
          : "text-[var(--text)] hover:bg-[var(--bg-app)]"
      }`}
      style={!active ? { borderColor: "var(--border)" } : undefined}
    >
      {children}
    </button>
  );
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
          className={`absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow
          transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
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
        {meta && <div className="ml-3 text-xs text-[var(--text-muted)]">{meta}</div>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types + utils
   ────────────────────────────────────────────────────────────────────────── */
type SitemapRow = {
  id: string;
  url: string;
  discovered: number;
  status: "ok" | "warning" | "error";
  lastSync?: string;
};

type CrawlStatus = "allowed" | "excluded";

type TemplateKey =
  | "Home"
  | "Category"
  | "Product"
  | "Blog Post"
  | "Landing"
  | "Docs"
  | "Location"
  | "PDP"
  | "PLP"
  | (string & {}); // allow new custom template names

type PageRow = {
  id: string;
  url: string;
  indexability: "OK" | "Noindex" | "Blocked" | "Canonicalized";
  http: "200" | "3xx" | "4xx" | "5xx";
  robots: "allow" | "block";
  canonical: "self" | "other";
  lastmod?: string;
  inSitemaps: number;
  orphan: boolean;
  discoveredAt: string;
  crawlStatus: CrawlStatus;
  canonicalTarget?: string;
  template?: TemplateKey; // membership for templates
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

const faviconFor = (url: string) => {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  } catch {
    return `https://www.google.com/s2/favicons?sz=64&domain=${url}`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────
   Import XML dialog
   ────────────────────────────────────────────────────────────────────────── */
function ImportXmlDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (where: { url?: string; fileName?: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
  }, [open, onClose]);

  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="import-xml-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center justify-between">
          <h4 id="import-xml-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Import sitemap XML</h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Sitemap URL</label>
            <input
              className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              placeholder="https://example.com/sitemap.xml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-[var(--text-muted)]">or</div>
            <label className="cursor-pointer inline-flex items-center gap-2 text-sm">
              <input
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name)}
              />
              <Upload className="h-4 w-4 text-[var(--brand)]" />
              {fileName ? `Selected: ${fileName}` : "Choose XML file"}
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onImport({ url: url.trim() || undefined, fileName });
              onClose();
            }}
            disabled={!url.trim() && !fileName}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Confirm modal (Sitemap delete)
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick, true);
    };
  }, [open, onCancel]);

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
          <Button variant="destructive" onClick={onConfirm} title="Remove sitemap source">
            <Trash2 className="h-4 w-4 text-[var(--brand)]" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Advanced Filters drawer (Pages table)
   ────────────────────────────────────────────────────────────────────────── */
type AdvFilters = {
  http: Set<PageRow["http"]>;
  indexability: Set<PageRow["indexability"]>;
  robots: Set<PageRow["robots"]>;
  canonical: "any" | "self" | "other";
  orphan: "any" | "yes" | "no";
  lastmod: "any" | "≤30d" | "≤90d" | "≤365d";
};
const defaultAdv: AdvFilters = {
  http: new Set(),
  indexability: new Set(),
  robots: new Set(),
  canonical: "any",
  orphan: "any",
  lastmod: "any",
};

function AdvancedFiltersDrawer({
  open,
  onClose,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initial: AdvFilters;
  onApply: (next: AdvFilters) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState<AdvFilters>(initial);

  useEffect(() => setLocal(initial), [initial, open]);

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
  }, [open, onClose]);

  if (!open) return null;

  const toggleSet = <T,>(s: Set<T>, v: T) => {
    const next = new Set(s);
    next.has(v) ? next.delete(v) : next.add(v);
    return next;
  };

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="adv-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="adv-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Advanced filters</h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-[var(--text-strong)]">HTTP status</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["200", "3xx", "4xx", "5xx"] as PageRow["http"][]).map((v) => (
                <FilterChip
                  key={v}
                  active={local.http.has(v)}
                  onClick={() => setLocal((p) => ({ ...p, http: toggleSet(p.http, v) }))}
                >
                  {v}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-[var(--text-strong)]">Indexability</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["OK", "Noindex", "Blocked", "Canonicalized"] as PageRow["indexability"][]).map((v) => (
                <FilterChip
                  key={v}
                  active={local.indexability.has(v)}
                  onClick={() =>
                    setLocal((p) => ({ ...p, indexability: toggleSet(p.indexability, v) }))
                  }
                >
                  {v}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-[var(--text-strong)]">Robots</div>
            <div className="mt-2 flex items-center gap-2">
              {(["allow", "block"] as PageRow["robots"][]).map((v) => (
                <FilterChip
                  key={v}
                  active={local.robots.has(v)}
                  onClick={() => setLocal((p) => ({ ...p, robots: toggleSet(p.robots, v) }))}
                >
                  {v}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-[var(--text-strong)]">Canonical</div>
            <div className="mt-2 flex items-center gap-2">
              {(["any", "self", "other"] as AdvFilters["canonical"][]).map((v) => (
                <FilterChip
                  key={v}
                  active={local.canonical === v}
                  onClick={() => setLocal((p) => ({ ...p, canonical: v }))}
                >
                  {v}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-[var(--text-strong)]">Orphan</div>
            <div className="mt-2 flex items-center gap-2">
              {(["any", "yes", "no"] as AdvFilters["orphan"][]).map((v) => (
                <FilterChip
                  key={v}
                  active={local.orphan === v}
                  onClick={() => setLocal((p) => ({ ...p, orphan: v }))}
                >
                  {v}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-[var(--text-strong)]">Last‑mod window</div>
            <div className="mt-2 flex items-center gap-2">
              {(["any", "≤30d", "≤90d", "≤365d"] as AdvFilters["lastmod"][]).map((v) => (
                <FilterChip
                  key={v}
                  active={local.lastmod === v}
                  onClick={() => setLocal((p) => ({ ...p, lastmod: v }))}
                >
                  {v}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
          <Button variant="ghost" onClick={() => setLocal(defaultAdv)}>Reset</Button>
          <Button variant="primary" onClick={() => onApply(local)}>Apply filters</Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Add Pages dialog (paste URLs)
   ────────────────────────────────────────────────────────────────────────── */
function AddPagesDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (urls: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");

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
  }, [open, onClose]);

  if (!open) return null;

  const parseUrls = (raw: string) =>
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => !!l)
      .filter((l) => /^https?:\/\//i.test(l));

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="add-pages-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center justify-between">
          <h4 id="add-pages-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Add pages (paste URLs)</h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="mt-4">
          <textarea
            className="w-full min-h-[180px] rounded-[var(--radius)] border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ borderColor: "var(--border)" }}
            placeholder="https://example.com/page-1\nhttps://example.com/page-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            One URL per line. Non‑HTTP lines are ignored.
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const urls = parseUrls(value);
              if (urls.length) onAdd(urls);
              onClose();
            }}
            disabled={parseUrls(value).length === 0}
          >
            <Plus className="h-4 w-4" />
            Add pages
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Set Canonical dialog (bulk/single)
   ────────────────────────────────────────────────────────────────────────── */
function SetCanonicalDialog({
  open,
  onClose,
  onApply,
  initialValue = "",
  count = 0,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (canonicalUrl: string) => void;
  initialValue?: string;
  count?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue || "");
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
  }, [open, onClose, initialValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="canon-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center justify-between">
          <h4 id="canon-title" className="text-[16px] font-semibold text-[var(--text-strong)]">
            Set canonical {count > 1 ? `for ${count} pages` : ""}
          </h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Canonical target URL</label>
          <input
            className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ borderColor: "var(--border)" }}
            placeholder="https://example.com/canonical-target"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="text-xs text-[var(--text-muted)]">
            Leaves canonical as <em>self</em> if left blank.
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onApply(value.trim()); onClose(); }}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Page details drawer (read-only summary)
   ────────────────────────────────────────────────────────────────────────── */
function PageDetailsDrawer({
  page,
  onClose,
  onRefetch,
}: {
  page: PageRow;
  onClose: () => void;
  onRefetch: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
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
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="page-details-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <h4 id="page-details-title" className="text-[16px] font-semibold text-[var(--text-strong)] truncate">
              Page details
            </h4>
            <div className="text-xs text-[var(--text-muted)]">Opened from Pages & sitemaps</div>
          </div>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px)] overflow-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <img src={faviconFor(page.url)} alt="" className="h-4 w-4 rounded-sm" />
            <a href={page.url} target="_blank" rel="noreferrer" className="text-sm hover:underline cursor-pointer">
              {page.url}
            </a>
            <button
              className="ml-auto inline-flex items-center gap-1 text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded cursor-pointer"
              onClick={() => navigator.clipboard.writeText(page.url)}
              title="Copy URL"
            >
              <Copy className="h-3.5 w-3.5 text-[var(--brand)]" /> Copy
            </button>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Coverage</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Indexability: {page.indexability}</div>
              <div>HTTP: {page.http}</div>
              <div>Robots: {page.robots}</div>
              <div>Canonical: {page.canonical}</div>
              <div>Lastmod: {page.lastmod || "—"}</div>
              <div>In sitemap(s): {page.inSitemaps}</div>
              <div>Orphan: {page.orphan ? "Yes" : "No"}</div>
              <div>Discovered: {rt(page.discoveredAt)}</div>
              <div>Crawl status: {page.crawlStatus === "excluded" ? "Excluded" : "Allowed"}</div>
              <div>Template: {page.template || "—"}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => onRefetch(page.id)}>
              <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Re‑fetch
            </Button>
            <Button variant="primary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Templates: Manage / Configure / View Pages / Create
   ────────────────────────────────────────────────────────────────────────── */
function ManageTemplatesDrawer({
  open,
  onClose,
  templates,
  onSave,
  onOpenCreate, // NEW: "Create New Template" entry point
}: {
  open: boolean;
  onClose: () => void;
  templates: { key: TemplateKey; enabled: boolean; priority: "High" | "Med" | "Low" }[];
  onSave: (next: { key: TemplateKey; enabled: boolean; priority: "High" | "Med" | "Low" }[]) => void;
  onOpenCreate: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState(templates);
  useEffect(() => setLocal(templates), [templates, open]);
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
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[480px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-templates-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="manage-templates-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Manage templates</h4>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onOpenCreate} title="Create New Template">
              <Plus className="h-4 w-4 text-[var(--brand)]" /> Create New Template
            </Button>
            <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5 text-[var(--text)]" />
            </button>
          </div>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-3">
          {local.map((t, i) => (
            <div key={String(t.key)} className="rounded-[var(--radius)] border p-3 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">{t.key}</div>
              <div className="flex items-center gap-3">
                <select
                  className="h-8 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                  value={t.priority}
                  onChange={(e) => {
                    const next = [...local];
                    next[i] = { ...t, priority: e.target.value as any };
                    setLocal(next);
                  }}
                >
                  <option>High</option>
                  <option>Med</option>
                  <option>Low</option>
                </select>
                <Toggle
                  checked={t.enabled}
                  onChange={(v) => {
                    const next = [...local];
                    next[i] = { ...t, enabled: v };
                    setLocal(next);
                  }}
                  label="Enabled"
                />
              </div>
            </div>
          ))}
          {local.length === 0 && (
            <div className="rounded-[var(--radius)] border p-4 text-sm text-[var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
              No templates yet. Use “Create New Template”.
            </div>
          )}
        </div>
        <div className="h-[64px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function ConfigureRulesDrawer({
  open,
  onClose,
  template,
  onSave,
  pages,
  initialRules,
}: {
  open: boolean;
  onClose: () => void;
  template: TemplateKey | null;
  onSave: (cfg: { include: string[]; exclude: string[] }) => void;
  pages: PageRow[];
  initialRules?: { include: string[]; exclude: string[] };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [include, setInclude] = useState<string[]>(initialRules?.include ?? ["/product", "/category"]);
  const [exclude, setExclude] = useState<string[]>(initialRules?.exclude ?? ["?utm_"]);
  const [newInc, setNewInc] = useState("");
  const [newExc, setNewExc] = useState("");

  useEffect(() => {
    setInclude(initialRules?.include ?? ["/product", "/category"]);
    setExclude(initialRules?.exclude ?? ["?utm_"]);
  }, [initialRules, open, template]);

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
  }, [open, onClose]);

  const matches = useMemo(() => {
    if (!template) return [];
    const ok = (u: string) =>
      (include.length === 0 || include.some((p) => u.includes(p))) &&
      (exclude.length === 0 || !exclude.some((p) => u.includes(p)));
    return pages.filter((p) => ok(p.url)).slice(0, 10);
  }, [template, include, exclude, pages]);

  if (!open || !template) return null;

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[480px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-rules-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="cfg-rules-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Configure rules — {template}</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-4">
          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Include patterns</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="/product"
                value={newInc}
                onChange={(e) => setNewInc(e.target.value)}
              />
              <Button variant="secondary" onClick={() => { if (newInc.trim()) setInclude((prev) => [newInc.trim(), ...prev]); setNewInc(""); }}>
                <Plus className="h-4 w-4 text-[var(--brand)]" /> Add
              </Button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {include.map((p, i) => (
                <Chip key={i} tone="neutral">
                  {p}
                </Chip>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Exclude patterns</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="?utm_"
                value={newExc}
                onChange={(e) => setNewExc(e.target.value)}
              />
              <Button variant="secondary" onClick={() => { if (newExc.trim()) setExclude((prev) => [newExc.trim(), ...prev]); setNewExc(""); }}>
                <Plus className="h-4 w-4 text-[var(--brand)]" /> Add
              </Button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {exclude.map((p, i) => (
                <Chip key={i} tone="neutral">
                  {p}
                </Chip>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Preview matches</div>
            <ul className="mt-2 space-y-1 text-sm">
              {matches.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <img src={faviconFor(p.url)} alt="" className="h-4 w-4 rounded-sm" />
                  <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline cursor-pointer">
                    {p.url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="text-[var(--text-muted)]">No matches with current patterns.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave({ include, exclude }); onClose(); }}>
            Save rules
          </Button>
        </div>
      </div>
    </div>
  );
}

/** View Pages for a template — with shift/remove/include/exclude + crawl status **/
function ViewTemplatePagesDrawer({
  open,
  onClose,
  template,
  pages,
  templates,
  onShiftTemplate,
  onRemoveFromTemplate,
  onInclude,
  onExclude,
}: {
  open: boolean;
  onClose: () => void;
  template: TemplateKey | null;
  pages: PageRow[];
  templates: TemplateKey[];
  onShiftTemplate: (pageId: string, nextTpl: TemplateKey) => void;
  onRemoveFromTemplate: (pageId: string) => void;
  onInclude: (pageId: string) => void;
  onExclude: (pageId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
  }, [open, onClose]);

  if (!open || !template) return null;

  const scoped = pages.filter((p) => p.template === template);

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-pages-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="tpl-pages-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Pages — {template}</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px)] overflow-auto px-4 py-4 space-y-3">
          {scoped.map((p) => (
            <div key={p.id} className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <img src={faviconFor(p.url)} alt="" className="h-4 w-4 rounded-sm" />
                <a href={p.url} target="_blank" rel="noreferrer" className="text-sm hover:underline cursor-pointer">
                  {p.url.replace(/^https?:\/\//, "")}
                </a>
              </div>

              {/* Actions: icons with full-name titles (tooltips) */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {/* Crawl Status chip */}
                <Chip tone={p.crawlStatus === "allowed" ? "success" : "warning"}>
                  {p.crawlStatus === "allowed" ? "Allowed" : "Excluded"}
                </Chip>

                {/* Include / Exclude */}
                <Button
                  variant="ghost"
                  onClick={() => onInclude(p.id)}
                  disabled={p.crawlStatus === "allowed"}
                  title="Include to Crawl"
                >
                  <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
                  Include to Crawl
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onExclude(p.id)}
                  disabled={p.crawlStatus !== "allowed"}
                  title="Exclude from Crawl"
                >
                  <ShieldOff className="h-4 w-4 text-[var(--brand)]" />
                  Exclude from Crawl
                </Button>

                {/* Shift to another template */}
                <div className="inline-flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-[var(--brand)]" aria-label="Shift to another template" aria-hidden />
                  <select
                    title="Shift to another template"
                    className="h-9 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    value={String(template)}
                    onChange={(e) => onShiftTemplate(p.id, e.target.value as TemplateKey)}
                  >
                    {templates.map((t) => (
                      <option key={String(t)} value={String(t)}>{String(t)}</option>
                    ))}
                  </select>
                </div>

                {/* Remove from template */}
                <Button
                  variant="ghost"
                  onClick={() => onRemoveFromTemplate(p.id)}
                  title="Remove from template"
                >
                  <Trash2 className="h-4 w-4 text-[var(--brand)]" />
                  Remove
                </Button>

                {/* Open + Copy (utility) */}
                <Button variant="ghost" onClick={() => window.open(p.url, "_blank")} title="Open URL">
                  <ExternalLink className="h-4 w-4 text-[var(--brand)]" />
                  Open
                </Button>
                <Button variant="ghost" onClick={() => navigator.clipboard.writeText(p.url)} title="Copy URL">
                  <Copy className="h-4 w-4 text-[var(--brand)]" />
                  Copy
                </Button>
              </div>
            </div>
          ))}

          {scoped.length === 0 && (
            <div className="rounded-[var(--radius)] border p-4 text-sm text-[var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
              No pages matched this template.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Create New Template drawer **/
function CreateTemplateDrawer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (tpl: { key: TemplateKey; priority: "High" | "Med" | "Low"; enabled: boolean; rules: { include: string[]; exclude: string[] } }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<"High" | "Med" | "Low">("Med");
  const [enabled, setEnabled] = useState(true);
  const [include, setInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [inc, setInc] = useState("");
  const [exc, setExc] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(""); setPriority("Med"); setEnabled(true);
    setInclude([]); setExclude([]); setInc(""); setExc("");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick, true);
    return () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("mousedown", onClick, true); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[96]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[520px] bg-[var(--bg-panel)] border-l"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog" aria-modal="true" aria-labelledby="create-tpl-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="create-tpl-title" className="text-[16px] font-semibold text-[var(--text-strong)]">Create New Template</h4>
          <button className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Template name</label>
            <input
              className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              placeholder="e.g., Comparison"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="space-y-1 flex-1">
              <label className="text-xs text-[var(--text-muted)]">Priority</label>
              <select
                className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
                style={{ borderColor: "var(--border)" }}
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option>High</option>
                <option>Med</option>
                <option>Low</option>
              </select>
            </div>
            <div className="pt-6">
              <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
            </div>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Include patterns (optional)</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="/compare"
                value={inc}
                onChange={(e) => setInc(e.target.value)}
              />
              <Button variant="secondary" onClick={() => { if (inc.trim()) setInclude((p) => [inc.trim(), ...p]); setInc(""); }}>
                <Plus className="h-4 w-4 text-[var(--brand)]" /> Add
              </Button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">{include.map((p, i) => <Chip key={i} tone="neutral">{p}</Chip>)}</ul>
          </div>

          <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Exclude patterns (optional)</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="?ref="
                value={exc}
                onChange={(e) => setExc(e.target.value)}
              />
              <Button variant="secondary" onClick={() => { if (exc.trim()) setExclude((p) => [exc.trim(), ...p]); setExc(""); }}>
                <Plus className="h-4 w-4 text-[var(--brand)]" /> Add
              </Button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">{exclude.map((p, i) => <Chip key={i} tone="neutral">{p}</Chip>)}</ul>
          </div>
        </div>

        <div className="h-[64px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!name.trim()) return;
              onCreate({ key: name.trim(), priority, enabled, rules: { include, exclude } });
              onClose();
            }}
          >
            <Plus className="h-4 w-4" />
            Create template
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main: Tab 2 — Content & Pages (focused on crawling & page settings)
   ────────────────────────────────────────────────────────────────────────── */
export default function ContentAndPagesTab() {
  /* ====== SECTION 1: Pages & Sitemaps ====== */
  const [domain] = useState("https://wranker.com");
  const [importOpen, setImportOpen] = useState(false);
  const [addPagesOpen, setAddPagesOpen] = useState(false);
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "inmap" | "notinmap" | "errors">("all");
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState<AdvFilters>(defaultAdv);

  const [sitemaps, setSitemaps] = useState<SitemapRow[]>([
    {
      id: "sm1",
      url: "https://wranker.com/sitemap.xml",
      discovered: 245,
      status: "ok",
      lastSync: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    },
    {
      id: "sm2",
      url: "https://wranker.com/blog-sitemap.xml",
      discovered: 98,
      status: "warning",
      lastSync: new Date(Date.now() - 1000 * 60 * 2500).toISOString(),
    },
  ]);
  const [confirmDeleteSm, setConfirmDeleteSm] = useState<{ open: boolean; id?: string; url?: string }>({ open: false });

  const [pages, setPages] = useState<PageRow[]>([
    {
      id: "pg1",
      url: "https://wranker.com/",
      indexability: "OK",
      http: "200",
      robots: "allow",
      canonical: "self",
      lastmod: "2025-10-09",
      inSitemaps: 1,
      orphan: false,
      discoveredAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      crawlStatus: "allowed",
      template: "Home",
    },
    {
      id: "pg2",
      url: "https://wranker.com/blog/how-to-choose",
      indexability: "Noindex",
      http: "200",
      robots: "allow",
      canonical: "self",
      lastmod: "2025-09-10",
      inSitemaps: 1,
      orphan: false,
      discoveredAt: new Date(Date.now() - 1000 * 60 * 3500).toISOString(),
      crawlStatus: "allowed",
      template: "Blog Post",
    },
    {
      id: "pg3",
      url: "https://wranker.com/category/tools",
      indexability: "Blocked",
      http: "200",
      robots: "block",
      canonical: "self",
      lastmod: "2025-07-12",
      inSitemaps: 0,
      orphan: true,
      discoveredAt: new Date(Date.now() - 1000 * 60 * 2200).toISOString(),
      crawlStatus: "allowed",
      template: "Category",
    },
    {
      id: "pg4",
      url: "https://wranker.com/blog/old-release-2019",
      indexability: "Canonicalized",
      http: "200",
      robots: "allow",
      canonical: "other",
      lastmod: "2023-02-01",
      inSitemaps: 1,
      orphan: false,
      discoveredAt: new Date(Date.now() - 1000 * 60 * 5600).toISOString(),
      crawlStatus: "allowed",
      canonicalTarget: "https://wranker.com/blog/2019-rollup",
      template: "Blog Post",
    },
  ]);

  const [templateRules, setTemplateRules] = useState<Record<string, { include: string[]; exclude: string[] }>>({});

  /* Filters for Pages table */
  const sourceFiltered = pages.filter((p) => {
    if (sourceFilter === "errors") return p.indexability !== "OK" || p.http !== "200";
    if (sourceFilter === "inmap") return p.inSitemaps > 0;
    if (sourceFilter === "notinmap") return p.inSitemaps === 0;
    return true;
  });

  const passesAdvFilters = (p: PageRow) => {
    if (adv.http.size && !adv.http.has(p.http)) return false;
    if (adv.indexability.size && !adv.indexability.has(p.indexability)) return false;
    if (adv.robots.size && !adv.robots.has(p.robots)) return false;
    if (adv.canonical !== "any" && p.canonical !== adv.canonical) return false;
    if (adv.orphan === "yes" && !p.orphan) return false;
    if (adv.orphan === "no" && p.orphan) return false;
    if (adv.lastmod !== "any" && p.lastmod) {
      const days = (from: string) => Math.floor((Date.now() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
      const d = days(p.lastmod);
      if (adv.lastmod === "≤30d" && d > 30) return false;
      if (adv.lastmod === "≤90d" && d > 90) return false;
      if (adv.lastmod === "≤365d" && d > 365) return false;
    }
    return true;
  };

  const pagesFiltered = sourceFiltered.filter(passesAdvFilters);

  /* Sort for Pages table */
  type SortKey = keyof PageRow | "host" | "path";
  const [sortKey, setSortKey] = useState<SortKey>("url");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const sortedPages = [...pagesFiltered].sort((a, b) => {
    const v = (k: SortKey, row: PageRow) =>
      k === "host" || k === "path"
        ? (() => {
            try {
              const u = new URL(row.url);
              return k === "host" ? u.hostname : u.pathname;
            } catch {
              return row.url;
            }
          })()
        : (row as any)[k];
    const A = v(sortKey, a);
    const B = v(sortKey, b);
    if (A < B) return sortDir === "asc" ? -1 : 1;
    if (A > B) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const allSelected =
    selectedPageIds.length > 0 && selectedPageIds.length === sortedPages.length;
  const toggleSelectAll = () =>
    setSelectedPageIds((ids) =>
      ids.length === sortedPages.length ? [] : sortedPages.map((p) => p.id)
    );
  const toggleRow = (id: string) =>
    setSelectedPageIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  const [toast, setToast] = useState<string | null>(null);
  const [detailsPage, setDetailsPage] = useState<PageRow | null>(null);

  const syncNow = async () => {
    setSyncing(true);
    setToast("Sync started…");
    await new Promise((r) => setTimeout(r, 900));
    setSitemaps((prev) => prev.map((s) => ({ ...s, lastSync: new Date().toISOString() })));
    setToast("Synced all sitemap sources");
    setSyncing(false);
    setTimeout(() => setToast(null), 1500);
  };

  const importXml = (payload: { url?: string; fileName?: string }) => {
    const pretty = payload.url ?? payload.fileName ?? "sitemap.xml";
    setSitemaps((prev) => [
      {
        id: `sm_${Date.now()}`,
        url: payload.url || `uploaded://${pretty}`,
        discovered: 0,
        status: "ok",
        lastSync: new Date().toISOString(),
      },
      ...prev,
    ]);
    setToast(`Imported ${pretty}`);
    setTimeout(() => setToast(null), 1200);
  };

  const hasExcluded = pages.some((p) => p.crawlStatus === "excluded");

  /* Bulk actions */
  const withSelected = (fn: (p: PageRow) => PageRow) => {
    setPages((prev) => prev.map((p) => (selectedPageIds.includes(p.id) ? fn(p) : p)));
  };
  const bulkRefetch = () => {
    withSelected((p) => ({ ...p, discoveredAt: new Date().toISOString() }));
    setToast(`Re‑fetched ${selectedPageIds.length} page(s)`);
    setTimeout(() => setToast(null), 1200);
  };
  const bulkInclude = () => {
    withSelected((p) => ({ ...p, crawlStatus: "allowed" }));
    setToast(`Included ${selectedPageIds.length} page(s)`);
    setTimeout(() => setToast(null), 1200);
  };
  const bulkExclude = () => {
    withSelected((p) => ({ ...p, crawlStatus: "excluded" }));
    setToast(`Excluded ${selectedPageIds.length} page(s)`);
    setTimeout(() => setToast(null), 1200);
  };
  const [canonOpen, setCanonOpen] = useState(false);
  const applyBulkCanonical = (target: string) => {
    withSelected((p) =>
      target
        ? { ...p, canonical: "other", canonicalTarget: target }
        : { ...p, canonical: "self", canonicalTarget: undefined }
    );
    setToast("Canonical updated");
    setTimeout(() => setToast(null), 1000);
  };

  /* Single-row helpers */
  const refetchOne = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, discoveredAt: new Date().toISOString() } : p))
    );
    setToast("Re‑fetched");
    setTimeout(() => setToast(null), 800);
  };
  const includeOne = (id: string) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, crawlStatus: "allowed" } : p)));
  const excludeOne = (id: string) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, crawlStatus: "excluded" } : p)));
  const removeOne = (id: string) =>
    setPages((prev) => prev.filter((p) => p.id !== id));

  /* Add pages */
  const onAddPages = (urls: string[]) => {
    const existing = new Set(pages.map((p) => p.url));
    const toAdd = urls.filter((u) => !existing.has(u));
    const newRows: PageRow[] = toAdd.map((u, i) => ({
      id: `pg_${Date.now()}_${i}`,
      url: u,
      indexability: "OK",
      http: "200",
      robots: "allow",
      canonical: "self",
      lastmod: undefined,
      inSitemaps: 0,
      orphan: true,
      discoveredAt: new Date().toISOString(),
      crawlStatus: "allowed",
    }));
    if (newRows.length) setPages((prev) => [...newRows, ...prev]);
    setToast(`Added ${newRows.length} page(s)`);
    setTimeout(() => setToast(null), 1000);
  };

  /* ====== SECTION 2: Priority / Templates ====== */
  const [siteType, setSiteType] = useState<"ecom" | "saas" | "content" | "local" | "other">("content");
  const [templatesState, setTemplatesState] = useState<
    { key: TemplateKey; priority: "High" | "Med" | "Low"; enabled: boolean }[]
  >([
    { key: "Home", priority: "High", enabled: true },
    { key: "Category", priority: "High", enabled: true },
    { key: "Product", priority: "High", enabled: true },
    { key: "Blog Post", priority: "Med", enabled: true },
    { key: "Landing", priority: "Med", enabled: true },
    { key: "Docs", priority: "Low", enabled: false },
    { key: "Location", priority: "Low", enabled: false },
    { key: "PDP", priority: "High", enabled: true },
  ]);
  const templateKeys = templatesState.map((t) => t.key);
  const countFor = (tk: TemplateKey) => pages.filter((p) => p.template === tk).length;

  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>("Product");

  const [manageOpen, setManageOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configTpl, setConfigTpl] = useState<TemplateKey | null>(null);
  const [viewTplOpen, setViewTplOpen] = useState(false);
  const [viewTpl, setViewTpl] = useState<TemplateKey | null>(null);
  const [createTplOpen, setCreateTplOpen] = useState(false);

  /* Template actions used by drawers */
  const shiftTemplate = (pageId: string, nextTpl: TemplateKey) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, template: nextTpl } : p)));
  };
  const removeFromTemplate = (pageId: string) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, template: undefined } : p)));
  };

  /* ─────────────────────────────── UI ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text)]">
      <GlobalTokens />

      <div className="w-full mx-auto px-6 py-8 space-y-6">
        {/* ========== 1) PAGES & SITEMAPS ========== */}
        <Card>
          <SectionHeader
            icon={<Globe className="h-5 w-5" aria-hidden />}
            title="Pages & sitemaps"
            meta={<span className="text-[var(--text-muted)]">XML import & sync</span>}
            actions={
              <>
                <FilterChip active={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>All</FilterChip>
                <FilterChip active={sourceFilter === "inmap"} onClick={() => setSourceFilter("inmap")}>In sitemap</FilterChip>
                <FilterChip active={sourceFilter === "notinmap"} onClick={() => setSourceFilter("notinmap")}>Not in sitemap</FilterChip>
                <FilterChip active={sourceFilter === "errors"} onClick={() => setSourceFilter("errors")}>Errors</FilterChip>

                <Toggle checked={autoDiscover} onChange={setAutoDiscover} label="Auto‑discover" id="autoDiscover" />
                <Button variant="secondary" onClick={syncNow} disabled={syncing} title="Fetch all sitemap sources">
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : "text-[var(--brand)]"}`} />
                  {syncing ? "Syncing…" : "Sync now"}
                </Button>
                <Button variant="primary" onClick={() => setImportOpen(true)} title="Import XML from URL or file">
                  <Upload className="h-4 w-4" />
                  Import XML
                </Button>
              </>
            }
          />

          {/* Domain / favicon */}
          <div className="mt-4 flex items-center gap-3">
            <img src={faviconFor(domain)} alt="Site favicon" className="h-5 w-5 rounded-sm" />
            <a
              href={domain}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--text-strong)] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              {domain.replace(/^https?:\/\//, "")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Sitemap Sources */}
          <div className="mt-4">
            <div className="text-sm font-medium text-[var(--text-strong)] mb-2">Sitemap sources</div>
            <div className="grid gap-3 md:grid-cols-2">
              {sitemaps.map((s) => (
                <div
                  key={s.id}
                  className="rounded-[var(--radius)] border p-3 flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <a className="text-sm text-[var(--text)] hover:underline cursor-pointer" href={s.url} target="_blank" rel="noreferrer">
                      {s.url}
                    </a>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {s.discovered} discovered • Last sync {rt(s.lastSync)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "ok" ? <Chip tone="success">OK</Chip> : s.status === "warning" ? <Chip tone="warning">Warning</Chip> : <Chip tone="critical">Error</Chip>}
                    <Button variant="ghost" onClick={() => window.open("https://validator.w3.org/", "_blank")} title="Validate sitemap">
                      <Search className="h-4 w-4 text-[var(--brand)]" /> Validate
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDeleteSm({ open: true, id: s.id, url: s.url })}
                      title="Remove sitemap"
                    >
                      <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
              {sitemaps.length === 0 && (
                <div className="rounded-[var(--radius)] border p-6 text-sm text-[var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
                  No sitemaps yet. Click <strong>Import XML</strong> or enable Auto‑discover.
                </div>
              )}
            </div>
          </div>

          {/* Bulk actions + table controls */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={bulkRefetch} disabled={selectedPageIds.length === 0}>
                <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Re‑fetch
              </Button>
              <Button variant="secondary" onClick={bulkInclude} disabled={selectedPageIds.length === 0}>
                Include
              </Button>
              <Button variant="secondary" onClick={bulkExclude} disabled={selectedPageIds.length === 0}>
                Exclude
              </Button>
              <Button variant="secondary" onClick={() => setCanonOpen(true)} disabled={selectedPageIds.length === 0}>
                Set canonical
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setToast("Exported CSV")}>
                <Download className="h-4 w-4 text-[var(--brand)]" /> Export CSV
              </Button>
              <Button variant="ghost" onClick={() => setAddPagesOpen(true)}>
                <Plus className="h-4 w-4 text-[var(--brand)]" /> Add pages
              </Button>
              <Button variant="ghost" onClick={() => setAdvOpen(true)}>
                <Filter className="h-4 w-4 text-[var(--brand)]" /> Advanced filters
              </Button>
            </div>
          </div>

          {/* Pages Table (single-line cells, horizontal slider on narrow) */}
          <div className="mt-3 overflow-x-auto rounded-[var(--radius)] border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full min-w-[1200px] whitespace-nowrap text-sm" role="table" aria-label="Pages coverage table">
              <thead className="bg-[var(--bg-app)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all pages"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer h-4 w-4"
                    />
                  </th>
                  {(
                    [
                      ["url", "URL (sticky)"],
                      ["indexability", "Indexability"],
                      ["http", "HTTP"],
                      ["robots", "Robots"],
                      ["canonical", "Canonical"],
                      ["lastmod", "Lastmod"],
                      ["inSitemaps", "In sitemap(s)"],
                      ["orphan", "Orphan"],
                      ["discoveredAt", "Discovered"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-3 py-2 font-medium select-none"
                      aria-sort={
                        sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                      }
                    >
                      <button
                        className="cursor-pointer inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
                        onClick={() => toggleSort(key)}
                      >
                        {label}
                        {sortKey === key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : null}
                      </button>
                    </th>
                  ))}
                  {hasExcluded && <th className="px-3 py-2 font-medium">Crawl status</th>}
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {sortedPages.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-app)]">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.url}`}
                        checked={selectedPageIds.includes(p.id)}
                        onChange={() => toggleRow(p.id)}
                        className="cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={faviconFor(p.url)} alt="" className="h-4 w-4 rounded-sm" />
                        <a className="hover:underline cursor-pointer" href={p.url} target="_blank" rel="noreferrer">
                          {p.url.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {p.indexability === "OK" ? (
                        <Chip tone="success" aria-label="Indexability: OK">
                          OK
                        </Chip>
                      ) : p.indexability === "Noindex" ? (
                        <Chip tone="warning" aria-label="Indexability: Noindex">Noindex</Chip>
                      ) : p.indexability === "Blocked" ? (
                        <Chip tone="critical" aria-label="Indexability: Blocked by robots">
                          Blocked
                        </Chip>
                      ) : (
                        <Chip tone="warning" aria-label="Indexability: Canonicalized">Canonicalized</Chip>
                      )}
                    </td>
                    <td className="px-3 py-2">{p.http}</td>
                    <td className="px-3 py-2">{p.robots}</td>
                    <td className="px-3 py-2">{p.lastmod || "—"}</td>
                    <td className="px-3 py-2">{p.inSitemaps}</td>
                    <td className="px-3 py-2">{p.orphan ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{rt(p.discoveredAt)}</td>
                    {hasExcluded && (
                      <td className="px-3 py-2">
                        {p.crawlStatus === "excluded" ? (
                          <Chip tone="warning">Excluded</Chip>
                        ) : (
                          <Chip tone="success">Allowed</Chip>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto">
                        <Button variant="ghost" onClick={() => refetchOne(p.id)} title="Re‑fetch this page">
                          <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Re‑fetch
                        </Button>
                        {p.crawlStatus === "excluded" ? (
                          <Button variant="ghost" onClick={() => includeOne(p.id)} title="Include to Crawl">
                            <ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> Include
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => excludeOne(p.id)} title="Exclude from Crawl">
                            <ShieldOff className="h-4 w-4 text-[var(--brand)]" /> Exclude
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => setCanonOpen(true)}
                          title="Set canonical"
                        >
                          Set canonical
                        </Button>
                        <Button variant="ghost" onClick={() => removeOne(p.id)} title="Remove page from list">
                          <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                        </Button>
                        <Button variant="ghost" onClick={() => setDetailsPage(p)} title="Page details">
                          <FileText className="h-4 w-4 text-[var(--brand)]" /> Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedPages.length === 0 && (
                  <tr>
                    <td colSpan={hasExcluded ? 12 : 11} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      No pages match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========== 2) PRIORITY / TEMPLATES (drawers wired; create/manage/view) ========== */}
        <Card>
          <SectionHeader
            icon={<Layers className="h-5 w-5" aria-hidden />}
            title="Priority & templates"
            actions={
              <>
                <label className="text-sm text-[var(--text)]">Site type</label>
                <select
                  className="h-10 rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                  value={siteType}
                  onChange={(e) => setSiteType(e.target.value as any)}
                  title="Site type"
                >
                  <option value="ecom">eCommerce</option>
                  <option value="saas">SaaS</option>
                  <option value="content">Content</option>
                  <option value="local">Local</option>
                  <option value="other">Other</option>
                </select>
                <Button variant="secondary" onClick={() => setManageOpen(true)} title="Manage templates">
                  <Pencil className="h-4 w-4 text-[var(--brand)]" /> Manage templates
                </Button>
                <Button variant="primary" onClick={() => setCreateTplOpen(true)} title="Create New Template">
                  <Plus className="h-4 w-4" /> Create New Template
                </Button>
              </>
            }
          />

          {/* Template cards */}
          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {templatesState.map((t) => (
              <button
                key={String(t.key)}
                className={`cursor-pointer rounded-[var(--radius)] border p-3 text-left hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${activeTemplate === t.key ? "border-[var(--brand)]" : ""}`}
                style={{ borderColor: activeTemplate === t.key ? "var(--brand)" : "var(--border)" }}
                aria-pressed={activeTemplate === t.key}
                onClick={() => setActiveTemplate(t.key)}
                title={`Template: ${String(t.key)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[var(--text-strong)] font-medium">{t.key}</div>
                  <Chip tone={t.priority === "High" ? "warning" : t.priority === "Med" ? "neutral" : "success"} className="whitespace-nowrap">
                    {t.priority}
                  </Chip>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {t.enabled ? `${countFor(t.key)} matched page(s)` : "Disabled"}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfigTpl(t.key);
                      setConfigOpen(true);
                    }}
                    title="Configure rules"
                  >
                    <Pencil className="h-4 w-4 text-[var(--brand)]" /> Configure rules
                  </Button>
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewTpl(t.key);
                      setViewTplOpen(true);
                    }}
                    title="View pages"
                  >
                    View pages
                  </Button>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Dialogs / Drawers */}
      <ImportXmlDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={importXml} />
      <AddPagesDialog open={addPagesOpen} onClose={() => setAddPagesOpen(false)} onAdd={onAddPages} />
      <AdvancedFiltersDrawer open={advOpen} onClose={() => setAdvOpen(false)} initial={adv} onApply={(next) => { setAdv(next); setAdvOpen(false); }} />
      <SetCanonicalDialog open={canonOpen} onClose={() => setCanonOpen(false)} onApply={applyBulkCanonical} count={selectedPageIds.length} />

      {detailsPage && (
        <PageDetailsDrawer
          page={detailsPage}
          onClose={() => setDetailsPage(null)}
          onRefetch={refetchOne}
        />
      )}

      <ManageTemplatesDrawer
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        templates={templatesState.map((t) => ({ key: t.key, enabled: t.enabled, priority: t.priority }))}
        onSave={(next) => {
          setTemplatesState((prev) =>
            prev.map((p) => {
              const found = next.find((n) => n.key === p.key)!;
              return { ...p, enabled: found.enabled, priority: found.priority };
            })
          );
        }}
        onOpenCreate={() => setCreateTplOpen(true)}
      />

      <ConfigureRulesDrawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        template={configTpl}
        onSave={(cfg) => {
          if (configTpl) {
            setTemplateRules((prev) => ({ ...prev, [String(configTpl)]: cfg }));
          }
          setConfigOpen(false);
        }}
        pages={pages}
        initialRules={configTpl ? templateRules[String(configTpl)] : undefined}
      />

      <ViewTemplatePagesDrawer
        open={viewTplOpen}
        onClose={() => setViewTplOpen(false)}
        template={viewTpl}
        pages={pages}
        templates={templateKeys}
        onShiftTemplate={shiftTemplate}
        onRemoveFromTemplate={removeFromTemplate}
        onInclude={(id) => includeOne(id)}
        onExclude={(id) => excludeOne(id)}
      />

      <CreateTemplateDrawer
        open={createTplOpen}
        onClose={() => setCreateTplOpen(false)}
        onCreate={(tpl) => {
          setTemplatesState((prev) => [...prev, { key: tpl.key, priority: tpl.priority, enabled: tpl.enabled }]);
          if (tpl.rules) {
            setTemplateRules((prev) => ({ ...prev, [String(tpl.key)]: { include: tpl.rules.include, exclude: tpl.rules.exclude } }));
          }
        }}
      />

      <ConfirmModal
        open={confirmDeleteSm.open}
        title="Remove sitemap source?"
        message={`You are about to remove “${confirmDeleteSm.url ?? ""}”. This won't delete existing pages, but it will stop syncing this source.`}
        confirmLabel="Remove sitemap"
        onConfirm={() => {
          if (confirmDeleteSm.id)
            setSitemaps((prev) => prev.filter((s) => s.id !== confirmDeleteSm.id));
          setConfirmDeleteSm({ open: false });
        }}
        onCancel={() => setConfirmDeleteSm({ open: false })}
      />

      {/* Toast / live region */}
      <p className="sr-only" aria-live="polite">
        {toast || ""}
      </p>
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-[var(--radius)] bg-[var(--bg-panel)] border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-1)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

