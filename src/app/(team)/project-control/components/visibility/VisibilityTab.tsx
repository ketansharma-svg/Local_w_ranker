"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  // shared actions
  X,
  Plus,
  Upload,
  RefreshCw,
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
  Settings,
  // section glyphs (brand tinted, stable lucide icons)
  ListChecks,           // Keywords & Mapping
  Sparkles,             // SERP Features & SOV
  Users,                // Competitors
  Link2,                // Off-page Signals
  Globe,                // Locale & device scope
  Tag,
  Tags,
  ShieldCheck,
  Plug,
  MonitorSmartphone,
  Sigma,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Global tokens (mapped to your v1.0 / Final tokens)
   Remove this <style> if tokens are already provided globally.
   ────────────────────────────────────────────────────────────────────────── */
function GlobalTokens() {
  return (
    <style>{`
:root{
  /* Brand & text */
  --brand:#008CCD; --brand-600:#007BB8; --on-brand:rgba(255,255,255,0.88);
  --text-strong:#111827; --text:#374151; --text-muted:#6B7280;

  /* Surfaces & borders */
  --bg-app:#F5F7FA; --bg-panel:#FFFFFF;
  --border-subtle:#EFF0F6; --border:#E5E7EB;

  /* Status palette */
  --success:#34A853; --success-bg:#CBF8D7;
  --warning:#F9BB04; --warning-bg:#FCEBB8;
  --critical:#E94134; --critical-bg:#FBC4BF;

  /* Focus / brand pastel (neutral confirmation) */
  --focus:#4286F5;
  --brand-pastel:#D9EEF8;

  /* Radius & shadows */
  --radius:6px;
  --shadow-1:0 1px 3px rgba(0,0,0,0.10);
  --shadow-md:0 4px 6px rgba(0,0,0,0.10);
}
*{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Inter Fallback",sans-serif}
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Small UI primitives (tokenized; cursor-pointer on all clickables)
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
    "inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium whitespace-nowrap";
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
   Helpers
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

const faviconFor = (domainOrUrl: string) => {
  try {
    const u = new URL(domainOrUrl.includes("http") ? domainOrUrl : `https://${domainOrUrl}`);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  } catch {
    return `https://www.google.com/s2/favicons?sz=64&domain=${domainOrUrl}`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────
   Dialog / Drawer shells (with focus trap + Esc + outside click)
   ────────────────────────────────────────────────────────────────────────── */
function useModalTrap(open: boolean, onClose: () => void, ref: React.RefObject<HTMLDivElement |null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea'
      );
      first?.focus();
    }, 0);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick, true);
    };
  }, [open, onClose, ref]);
}

function SideDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalTrap(open, onClose, ref);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute right-0 top-0 h-full bg-[var(--bg-panel)] border-l"
        style={{ width, borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h4 id="drawer-title" className="text-[16px] font-semibold text-[var(--text-strong)]">{title}</h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="h-[calc(100%-56px-64px)] overflow-auto px-4 py-4">{children}</div>
        <div className="h-[64px] px-4 py-3 border-t bg-[var(--bg-panel)] flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function CenterDialog({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalTrap(open, onClose, ref);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)", maxWidth }}
      >
        <div className="flex items-center justify-between">
          <h4 id="dlg-title" className="text-[16px] font-semibold text-[var(--text-strong)]">{title}</h4>
          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types for this tab
   ────────────────────────────────────────────────────────────────────────── */
type Device = "Desktop" | "Mobile";
type MappingMode = "manual" | "pattern" | "tag";
type ConflictPolicy = "allow" | "flag" | "lock";
type TieBreaker = "Path depth" | "Exact slug match" | "In sitemap" | "Locale match";

type KeywordTag = { id: string; name: string };
type KeywordList = {
  id: string;
  name: string;
  description?: string;
  tags: string[]; // tag ids
  locale?: string;
  device?: Device;
  archived?: boolean;
  keywords?: { kw: string; url?: string; tags?: string[] }[];
};

type MappingRules = {
  mode: MappingMode;
  conflict: ConflictPolicy;
  tieBreakers: TieBreaker[];
  propagateVariants: boolean;
};

type CannibalRules = {
  maxUrls: number;
  considerTitle: boolean;
  considerH1: boolean;
  considerCanonical: boolean;
  excludeTags: string[];
  excludeFolders: string[];
  excludePatterns: string[];
  onDetect: "flag" | "task" | "ignore";
};

type SerpFeature =
  | "Top stories"
  | "Sitelinks"
  | "People Also Ask"
  | "Video"
  | "Image pack"
  | "Local pack"
  | "Shopping"
  | "FAQ rich result";

type DetectionMethod = "parser-v2" | "light";
type PositionCurve = "exponential" | "linear";
type Attribution = "domain" | "url";

type Competitor = {
  id: string;
  domain: string;
  labels: string[];
  notes?: string;
  approved: boolean;
};

type ProviderKey = "Ahrefs" | "Google Search Console" | "CSV Upload";
type Provider = {
  id: ProviderKey;
  connected: boolean;
  lastSync?: string;
  scopes?: string[];
};

type OffpageRules = {
  includeDomains: string[];
  excludeDomains: string[];
  includeTlds: string[];
  canonWWW: boolean;
  httpHttpsSame: boolean;
  attribution: Attribution;
  freshnessOnlyNew: boolean;
};

type BucketLabel = { id: string; name: string; pattern?: string };

type LocaleRow = {
  id: string;
  code: string; // e.g., en-US
  language: string; // display label
  engine: string; // default search engine
  country: string;
  enabled: boolean;
  defaultDevice: Device;
};

/* ──────────────────────────────────────────────────────────────────────────
   Keyword dialogs / drawers
   ────────────────────────────────────────────────────────────────────────── */
function AddKeywordsDialog({
  open,
  onClose,
  lists,
  tags,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  lists: KeywordList[];
  tags: KeywordTag[];
  onAdd: (payload: { listId: string; items: { kw: string; url?: string; tags?: string[] }[] }) => void;
}) {
  const [targetList, setTargetList] = useState(lists[0]?.id || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setTargetList(lists[0]?.id || "");
      setSelectedTags([]);
      setValue("");
    }
  }, [open, lists]);

  const parseLines = (raw: string) =>
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        // allow "keyword, url" or just "keyword"
        const m = l.split(",").map((s) => s.trim());
        return { kw: m[0], url: m[1] || undefined, tags: selectedTags };
      });

  return (
    <CenterDialog
      open={open}
      onClose={onClose}
      title="Add keywords"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const items = parseLines(value);
              if (targetList && items.length) onAdd({ listId: targetList, items });
              onClose();
            }}
            disabled={!targetList || value.trim().length === 0}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Target list</label>
            <select
              className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
              style={{ borderColor: "var(--border)" }}
              value={targetList}
              onChange={(e) => setTargetList(e.target.value)}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Attach tags (optional)</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const active = selectedTags.includes(t.id);
                return (
                  <FilterChip
                    key={t.id}
                    active={active}
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                      )
                    }
                  >
                    <Tag className="h-3.5 w-3.5 mr-1 text-[var(--brand)]" /> {t.name}
                  </FilterChip>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Paste keywords (one per line). Optional URL after comma.</label>
          <textarea
            className="w-full min-h-[180px] rounded-[var(--radius)] border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ borderColor: "var(--border)" }}
            placeholder={`keyword one, https://example.com/page-1\nkeyword two\nkeyword three, https://example.com/page-3`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="kw-help"
          />
          <div id="kw-help" className="text-xs text-[var(--text-muted)]">Example format: <code>keyword, url(optional)</code></div>
        </div>
      </div>
    </CenterDialog>
  );
}

function ImportKeywordsCsvDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: { kw: string; url?: string; tags?: string[]; locale?: string }[]) => void;
}) {
  const [csv, setCsv] = useState("");
  const parseCsv = (raw: string) => {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: { kw: string; url?: string; tags?: string[]; locale?: string }[] = [];
    for (const line of lines) {
      const cells = line.split(",").map((c) => c.trim());
      const [kw, url, tags, locale] = cells;
      if (kw) rows.push({ kw, url, tags: tags ? tags.split("|").map((t) => t.trim()) : undefined, locale });
    }
    return rows;
  };
  return (
    <CenterDialog
      open={open}
      onClose={onClose}
      title="Import CSV (keyword,url,tags,locale)"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const rows = parseCsv(csv);
              if (rows.length) onImport(rows);
              onClose();
            }}
            disabled={!csv.trim()}
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
        </>
      }
    >
      <textarea
        className="w-full min-h-[180px] rounded-[var(--radius)] border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        style={{ borderColor: "var(--border)" }}
        placeholder="keyword one, https://example.com/page, blog|how-to, en-US"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <div className="mt-2 text-xs text-[var(--text-muted)]">
        Paste CSV rows. We’ll validate and show a dry‑run preview before saving.
      </div>
    </CenterDialog>
  );
}

function ManageTagsDrawer({
  open,
  onClose,
  tags,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  tags: KeywordTag[];
  onChange: (next: KeywordTag[]) => void;
}) {
  const [local, setLocal] = useState<KeywordTag[]>(tags);
  useEffect(() => setLocal(tags), [tags, open]);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Manage tags"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onChange(local); onClose(); }}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              setLocal((prev) => [
                ...prev,
                { id: `t_${Date.now()}`, name: `tag-${prev.length + 1}` },
              ])
            }
            title="Add tag"
          >
            <Plus className="h-4 w-4 text-[var(--brand)]" /> Add tag
          </Button>
        </div>
        <ul className="space-y-2" role="list">
          {local.map((t, idx) => (
            <li key={t.id} className="rounded-[var(--radius)] border p-3 flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
              <Chip tone="neutral"><Tag className="h-3.5 w-3.5 mr-1 text-[var(--brand)]" /> {t.name}</Chip>
              <input
                className="h-9 flex-1 rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                value={t.name}
                onChange={(e) => {
                  const next = [...local]; next[idx] = { ...t, name: e.target.value }; setLocal(next);
                }}
              />
              <Button variant="ghost" onClick={() => setLocal((prev) => prev.filter((x) => x.id !== t.id))} title="Remove">
                <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
              </Button>
            </li>
          ))}
          {local.length === 0 && <li className="text-sm text-[var(--text-muted)]">No tags yet.</li>}
        </ul>
      </div>
    </SideDrawer>
  );
}

function MappingSettingsDrawer({
  open,
  onClose,
  rules,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  rules: MappingRules;
  onSave: (next: MappingRules) => void;
}) {
  const [local, setLocal] = useState<MappingRules>(rules);
  useEffect(() => setLocal(rules), [rules, open]);

  const moveTie = (i: number, dir: -1 | 1) => {
    const next = [...local.tieBreakers];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setLocal((p) => ({ ...p, tieBreakers: next }));
  };

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="URL mapping defaults"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode */}
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-medium text-[var(--text-strong)]">Primary mapping mode</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            {([
              ["manual", "Manual (single canonical URL)"],
              ["pattern", "Pattern‑based (regex/path rules)"],
              ["tag", "Prefer page with tag X"],
            ] as [MappingMode, string][]).map(([v, label]) => (
              <label key={v} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mapmode"
                  checked={local.mode === v}
                  onChange={() => setLocal((p) => ({ ...p, mode: v }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Conflict */}
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-medium text-[var(--text-strong)]">Conflict policy</div>
          <div className="mt-2 grid sm:grid-cols-3 gap-2 text-sm">
            {([
              ["allow", "Allow many (no flags)"],
              ["flag", "Flag conflicts"],
              ["lock", "Lock to 1 URL"],
            ] as [ConflictPolicy, string][]).map(([v, label]) => (
              <label key={v} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="conflict"
                  checked={local.conflict === v}
                  onChange={() => setLocal((p) => ({ ...p, conflict: v }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Tie-breakers */}
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-medium text-[var(--text-strong)]">Tie‑breakers (ordered)</div>
          <ul className="mt-2 space-y-2" role="list">
            {local.tieBreakers.map((tb, i) => (
              <li key={tb} className="flex items-center justify-between rounded-[var(--radius)] border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                <div className="text-sm">{tb}</div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => moveTie(i, -1)} title="Move up">
                    <ChevronUp className="h-4 w-4 text-[var(--brand)]" />
                  </Button>
                  <Button variant="ghost" onClick={() => moveTie(i, +1)} title="Move down">
                    <ChevronDown className="h-4 w-4 text-[var(--brand)]" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <Toggle
              checked={local.propagateVariants}
              onChange={(v) => setLocal((p) => ({ ...p, propagateVariants: v }))}
              label="Apply mapping to phrase variants"
            />
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

function CannibalizationDrawer({
  open,
  onClose,
  rules,
  tags,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  rules: CannibalRules;
  tags: KeywordTag[];
  onSave: (next: CannibalRules) => void;
}) {
  const [local, setLocal] = useState<CannibalRules>(rules);
  useEffect(() => setLocal(rules), [rules, open]);

  const toggleTag = (id: string) =>
    setLocal((p) => ({
      ...p,
      excludeTags: p.excludeTags.includes(id)
        ? p.excludeTags.filter((x) => x !== id)
        : [...p.excludeTags, id],
    }));

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Cannibalization detection"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save rules
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Thresholds</div>
          <div className="mt-2 flex items-center gap-2">
            <label>Max mapped URLs per keyword</label>
            <input
              type="number"
              min={1}
              className="h-9 w-24 rounded-[var(--radius)] border px-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              value={local.maxUrls}
              onChange={(e) => setLocal((p) => ({ ...p, maxUrls: Math.max(1, Number(e.target.value || 1)) }))}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Toggle checked={local.considerTitle} onChange={(v) => setLocal((p) => ({ ...p, considerTitle: v }))} label="Title similarity" />
            <Toggle checked={local.considerH1} onChange={(v) => setLocal((p) => ({ ...p, considerH1: v }))} label="H1 similarity" />
            <Toggle checked={local.considerCanonical} onChange={(v) => setLocal((p) => ({ ...p, considerCanonical: v }))} label="Canonical target equality" />
          </div>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Exclusions</div>
          <div className="mt-2">
            <div className="text-xs text-[var(--text-muted)]">Tags</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {tags.map((t) => (
                <FilterChip key={t.id} active={local.excludeTags.includes(t.id)} onClick={() => toggleTag(t.id)}>
                  <Tag className="h-3.5 w-3.5 mr-1 text-[var(--brand)]" /> {t.name}
                </FilterChip>
              ))}
            </div>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-[var(--text-muted)]">Folders / subpaths</div>
              <textarea
                className="w-full min-h-[72px] rounded-[var(--radius)] border px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="/blog\n/docs"
                value={local.excludeFolders.join("\n")}
                onChange={(e) => setLocal((p) => ({ ...p, excludeFolders: e.target.value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) }))}
              />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Specific patterns</div>
              <textarea
                className="w-full min-h-[72px] rounded-[var(--radius)] border px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="*?ref=\n*?utm_*"
                value={local.excludePatterns.join("\n")}
                onChange={(e) => setLocal((p) => ({ ...p, excludePatterns: e.target.value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) }))}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Action on detection</div>
          <div className="mt-2 grid sm:grid-cols-3 gap-2">
            {(["flag", "task", "ignore"] as CannibalRules["onDetect"][]).map((v) => (
              <label key={v} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="candetect"
                  checked={local.onDetect === v}
                  onChange={() => setLocal((p) => ({ ...p, onDetect: v }))}
                />
                {v === "flag" ? "Flag in editor" : v === "task" ? "Create task" : "Ignore"}
              </label>
            ))}
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SERP Features & SOV drawers
   ────────────────────────────────────────────────────────────────────────── */
function ManageFeaturesDrawer({
  open,
  onClose,
  allFeatures,
  selected,
  setSelected,
  method,
  setMethod,
}: {
  open: boolean;
  onClose: () => void;
  allFeatures: SerpFeature[];
  selected: Set<SerpFeature>;
  setSelected: (s: Set<SerpFeature>) => void;
  method: DetectionMethod;
  setMethod: (m: DetectionMethod) => void;
}) {
  const toggle = (f: SerpFeature) => {
    const next = new Set(selected);
    next.has(f) ? next.delete(f) : next.add(f);
    setSelected(next);
  };
  const applyPreset = (preset: "Core" | "All rich results" | "Minimal") => {
    const next = new Set<SerpFeature>();
    if (preset === "Core") ["Sitelinks", "People Also Ask", "FAQ rich result"].forEach((f) => next.add(f as SerpFeature));
    if (preset === "All rich results") allFeatures.forEach((f) => next.add(f));
    if (preset === "Minimal") ["Sitelinks"].forEach((f) => next.add(f as SerpFeature));
    setSelected(next);
  };

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Feature set"
      footer={<Button variant="primary" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Done</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => applyPreset("Core")} title="Apply Core preset">Core</Button>
          <Button variant="secondary" onClick={() => applyPreset("All rich results")} title="Apply All rich results preset">All rich results</Button>
          <Button variant="secondary" onClick={() => applyPreset("Minimal")} title="Apply Minimal preset">Minimal</Button>
        </div>
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-medium text-[var(--text-strong)]">Tracked features</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-2" role="list">
            {allFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <input
                  id={`feat-${f}`}
                  type="checkbox"
                  checked={selected.has(f)}
                  onChange={() => toggle(f)}
                  className="cursor-pointer"
                />
                <label htmlFor={`feat-${f}`} className="text-sm cursor-pointer">{f}</label>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-medium text-[var(--text-strong)]">Detection method</div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            {(["parser-v2", "light"] as DetectionMethod[]).map((m) => (
              <label key={m} className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="detect" checked={method === m} onChange={() => setMethod(m)} />
                {m === "parser-v2" ? "Parser v2 (default)" : "Light mode"}
              </label>
            ))}
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

function SovFormulaDrawer({
  open,
  onClose,
  curve,
  setCurve,
  mobileWeight,
  setMobileWeight,
  attribution,
  setAttribution,
  selectedLists,
  setSelectedLists,
  lists,
  includeFeatures,
  setIncludeFeatures,
}: {
  open: boolean;
  onClose: () => void;
  curve: PositionCurve;
  setCurve: (c: PositionCurve) => void;
  mobileWeight: number; // 0..100
  setMobileWeight: (n: number) => void;
  attribution: Attribution;
  setAttribution: (a: Attribution) => void;
  selectedLists: Set<string>;
  setSelectedLists: (s: Set<string>) => void;
  lists: KeywordList[];
  includeFeatures: boolean;
  setIncludeFeatures: (b: boolean) => void;
}) {
  const desktop = 100 - mobileWeight;
  const toggleList = (id: string) => {
    const next = new Set(selectedLists);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedLists(next);
  };
  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="SOV configuration"
      footer={<Button variant="primary" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Save</Button>}
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Position curve</div>
          <div className="mt-2 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="radio" name="curve" checked={curve === "exponential"} onChange={() => setCurve("exponential")} />
              Exponential
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="radio" name="curve" checked={curve === "linear"} onChange={() => setCurve("linear")} />
              Linear
            </label>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Device weighting</div>
          <div className="mt-2">
            <label className="text-xs text-[var(--text-muted)]">Mobile {mobileWeight}% (Desktop {desktop}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={mobileWeight}
              onChange={(e) => setMobileWeight(Number(e.target.value))}
              className="w-full"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={mobileWeight}
              aria-valuetext={`Mobile ${mobileWeight} percent`}
            />
          </div>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Attribution</div>
          <div className="mt-2 flex items-center gap-3">
            {(["domain", "url"] as Attribution[]).map((a) => (
              <label key={a} className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="attr" checked={attribution === a} onChange={() => setAttribution(a)} />
                {a === "domain" ? "Domain‑level" : "URL‑level"}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Keyword scope (lists)</div>
          <ul className="mt-2 space-y-2" role="list">
            {lists.map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLists.has(l.id)}
                  onChange={() => toggleList(l.id)}
                  className="cursor-pointer"
                />
                <span>{l.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">SERP feature inclusion</div>
          <Toggle
            checked={includeFeatures}
            onChange={setIncludeFeatures}
            label="Include feature impressions in SOV"
          />
        </div>
      </div>
    </SideDrawer>
  );
}

function SearchScopeDrawer({
  open,
  onClose,
  locales,
  setLocales,
  deviceProfiles,
  setDeviceProfiles,
}: {
  open: boolean;
  onClose: () => void;
  locales: LocaleRow[];
  setLocales: (next: LocaleRow[]) => void;
  deviceProfiles: { id: Device; userAgent: string; enabled: boolean; note?: string }[];
  setDeviceProfiles: (next: { id: Device; userAgent: string; enabled: boolean; note?: string }[]) => void;
}) {
  const moveLocale = (i: number, dir: -1 | 1) => {
    const next = [...locales];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setLocales(next);
  };
const addLocale = () => {
  setLocales([
    ...locales,
    {
      id: `loc_${Date.now()}`,
      code: "en-GB",
      language: "English (UK)",
      engine: "google.co.uk",
      country: "GB",
      enabled: true,
      defaultDevice: "Desktop",
    },
  ]);
};

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Search scope (engines, locales, devices)"
      footer={<Button variant="primary" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Save</Button>}
      width={520}
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <div className="font-medium text-[var(--text-strong)]">Locales</div>
          <Button variant="secondary" onClick={addLocale} title="Add locale"><Plus className="h-4 w-4 text-[var(--brand)]" /> Add locale</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[840px]">
            <thead className="bg-[var(--bg-app)]">
              <tr className="text-left text-[var(--text-muted)]">
                <th className="px-3 py-2">Locale</th>
                <th className="px-3 py-2">Language</th>
                <th className="px-3 py-2">Search engine</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Default device</th>
                <th className="px-3 py-2">Order</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {locales.map((l, i) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">{l.code}</td>
                  <td className="px-3 py-2">{l.language}</td>
                  <td className="px-3 py-2">
                    <input
                      className="h-9 w-full rounded-[var(--radius)] border px-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      style={{ borderColor: "var(--border)" }}
                      value={l.engine}
                      onChange={(e) => {
                        const next = [...locales]; next[i] = { ...l, engine: e.target.value }; setLocales(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">{l.country}</td>
                  <td className="px-3 py-2">
                    <Toggle
                      checked={l.enabled}
                      onChange={(v) => { const next = [...locales]; next[i] = { ...l, enabled: v }; setLocales(next); }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-9 rounded-[var(--radius)] border px-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
                      style={{ borderColor: "var(--border)" }}
                      value={l.defaultDevice}
                      onChange={(e) => {
                        const next = [...locales]; next[i] = { ...l, defaultDevice: e.target.value as Device }; setLocales(next);
                      }}
                    >
                      <option>Desktop</option>
                      <option>Mobile</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" onClick={() => moveLocale(i, -1)} title="Move up"><ChevronUp className="h-4 w-4 text-[var(--brand)]" /></Button>
                      <Button variant="ghost" onClick={() => moveLocale(i, +1)} title="Move down"><ChevronDown className="h-4 w-4 text-[var(--brand)]" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {locales.length === 0 && (
                <tr><td className="px-3 py-6 text-[var(--text-muted)]" colSpan={7}>No locales yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 font-medium text-[var(--text-strong)]">Device profiles</div>
        <div className="space-y-2">
          {deviceProfiles.map((p, i) => (
            <div key={p.id} className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4 text-[var(--brand)]" aria-label="Device profile" />
                  <div className="font-medium">{p.id}</div>
                  <Toggle checked={p.enabled} onChange={(v) => {
                    const next = [...deviceProfiles]; next[i] = { ...p, enabled: v }; setDeviceProfiles(next);
                  }} label="Enabled" />
                </div>
                <input
                  className="h-9 w-[60%] rounded-[var(--radius)] border px-2 text-xs focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  style={{ borderColor: "var(--border)" }}
                  value={p.userAgent}
                  onChange={(e) => {
                    const next = [...deviceProfiles]; next[i] = { ...p, userAgent: e.target.value }; setDeviceProfiles(next);
                  }}
                  title="User‑Agent"
                />
              </div>
              <div className="mt-2">
                <input
                  className="h-9 w-full rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Note (e.g., 'Primary reporting device')"
                  value={p.note || ""}
                  onChange={(e) => {
                    const next = [...deviceProfiles]; next[i] = { ...p, note: e.target.value }; setDeviceProfiles(next);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SideDrawer>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Competitors dialogs
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
  useModalTrap(open, onCancel, ref);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="absolute left-1/2 top-1/2 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border bg-[var(--bg-panel)] p-4"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-[16px] font-semibold text-[var(--text-strong)]">{title}</h4>
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
            <Trash2 className="h-4 w-4 text-[var(--brand)]" /> {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddCompetitorDialog({
  open,
  onClose,
  onAdd,
  limitReached,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: Competitor) => void;
  limitReached: boolean;
}) {
  const [domain, setDomain] = useState("");
  const [approved, setApproved] = useState(true);
  const [label, setLabel] = useState("Direct");
  const disabled = limitReached || !domain.trim();
  return (
    <CenterDialog
      open={open}
      onClose={onClose}
      title="Add competitor"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            onAdd({ id: `c_${Date.now()}`, domain: domain.trim(), labels: [label], approved, notes: "" });
            onClose();
          }} disabled={disabled} title={limitReached ? "Limit reached" : undefined}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]">Domain</label>
          <input
            className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ borderColor: "var(--border)" }}
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Label</label>
            <select
              className="h-10 w-full rounded-[var(--radius)] border px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
              style={{ borderColor: "var(--border)" }}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            >
              <option>Direct</option>
              <option>Content peer</option>
              <option>Marketplace</option>
            </select>
          </div>
          <div className="flex items-end">
            <Toggle checked={approved} onChange={setApproved} label="Approved for reporting" />
          </div>
        </div>
        {limitReached && <div className="text-xs text-[var(--text-muted)]">Limit reached. Remove one to add another.</div>}
      </div>
    </CenterDialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Off‑page: Providers & rules drawers
   ────────────────────────────────────────────────────────────────────────── */
function ProviderScopesDrawer({
  open,
  onClose,
  provider,
}: {
  open: boolean;
  onClose: () => void;
  provider?: Provider;
}) {
  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={`Scopes — ${provider?.id ?? ""}`}
      footer={<Button variant="primary" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Done</Button>}
    >
      <div className="text-sm">
        <div className="text-[var(--text-strong)] font-medium">Authorized scopes</div>
        <ul className="mt-2 space-y-2 list-disc pl-5">
          {(provider?.scopes || ["read:links", "read:domains"]).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </SideDrawer>
  );
}

function OffpageRulesDrawer({
  open,
  onClose,
  rules,
  setRules,
  buckets,
  setBuckets,
}: {
  open: boolean;
  onClose: () => void;
  rules: OffpageRules;
  setRules: (r: OffpageRules) => void;
  buckets: BucketLabel[];
  setBuckets: (b: BucketLabel[]) => void;
}) {
  const [local, setLocal] = useState<OffpageRules>(rules);
  const [localBuckets, setLocalBuckets] = useState<BucketLabel[]>(buckets);
  useEffect(() => { setLocal(rules); setLocalBuckets(buckets); }, [open, rules, buckets]);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Ingestion rules & buckets"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => { setRules(local); setBuckets(localBuckets); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
        </>
      }
      width={520}
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Include / Exclude</div>
          <div className="mt-2 grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--text-muted)]">Include domains</div>
              <textarea
                className="w-full min-h-[72px] rounded-[var(--radius)] border px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="partner.com\nnews.example"
                value={local.includeDomains.join("\n")}
                onChange={(e) => setLocal((p) => ({ ...p, includeDomains: e.target.value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) }))}
              />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Exclude domains</div>
              <textarea
                className="w-full min-h-[72px] rounded-[var(--radius)] border px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                style={{ borderColor: "var(--border)" }}
                placeholder="spam.tld\nexample.bad"
                value={local.excludeDomains.join("\n")}
                onChange={(e) => setLocal((p) => ({ ...p, excludeDomains: e.target.value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) }))}
              />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-[var(--text-muted)]">Include TLDs</div>
            <input
              className="h-9 w-full rounded-[var(--radius)] border px-3 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              placeholder=".com,.co.uk,.de"
              value={local.includeTlds.join(",")}
              onChange={(e) => setLocal((p) => ({ ...p, includeTlds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
            />
          </div>
          <div className="mt-2 grid sm:grid-cols-2 gap-3">
            <Toggle checked={local.canonWWW} onChange={(v) => setLocal((p) => ({ ...p, canonWWW: v }))} label="Canonicalize www / non‑www" />
            <Toggle checked={local.httpHttpsSame} onChange={(v) => setLocal((p) => ({ ...p, httpHttpsSame: v }))} label="Treat http/https as same" />
            <Toggle checked={local.freshnessOnlyNew} onChange={(v) => setLocal((p) => ({ ...p, freshnessOnlyNew: v }))} label="Only new since last sync" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-[var(--text-muted)]">Attribution mode</div>
            <div className="mt-1 flex items-center gap-3">
              {(["domain", "url"] as Attribution[]).map((a) => (
                <label key={a} className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="attr-off" checked={local.attribution === a} onChange={() => setLocal((p) => ({ ...p, attribution: a }))} />
                  {a === "domain" ? "Domain" : "URL"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="font-medium text-[var(--text-strong)]">Link buckets (labels)</div>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" onClick={() => setLocalBuckets((b) => [...b, { id: `b_${Date.now()}`, name: "New bucket" }])}>
              <Plus className="h-4 w-4 text-[var(--brand)]" /> Add bucket
            </Button>
          </div>
          <ul className="mt-2 space-y-2" role="list">
            {localBuckets.map((b, i) => (
              <li key={b.id} className="rounded-[var(--radius)] border p-2 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                <Chip tone="neutral">{b.name}</Chip>
                <input
                  className="h-8 flex-1 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  style={{ borderColor: "var(--border)" }}
                  value={b.name}
                  onChange={(e) => {
                    const next = [...localBuckets]; next[i] = { ...b, name: e.target.value }; setLocalBuckets(next);
                  }}
                />
                <input
                  className="h-8 flex-1 rounded-[var(--radius)] border px-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Auto‑label rule (domain pattern)"
                  value={b.pattern || ""}
                  onChange={(e) => {
                    const next = [...localBuckets]; next[i] = { ...b, pattern: e.target.value }; setLocalBuckets(next);
                  }}
                />
                <Button variant="ghost" onClick={() => setLocalBuckets((prev) => prev.filter((x) => x.id !== b.id))} title="Remove">
                  <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                </Button>
              </li>
            ))}
            {localBuckets.length === 0 && <li className="text-[var(--text-muted)]">No buckets yet.</li>}
          </ul>
        </div>
      </div>
    </SideDrawer>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main: Tab 3 — Visibility (settings only)
   ────────────────────────────────────────────────────────────────────────── */
export default function VisibilityTab() {
  const [toast, setToast] = useState<string | null>(null);
  const announce = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  /* ====== 1) KEYWORDS & MAPPING ====== */
  const [tags, setTags] = useState<KeywordTag[]>([
    { id: "t1", name: "blog" },
    { id: "t2", name: "pricing" },
    { id: "t3", name: "how-to" },
  ]);
  const [lists, setLists] = useState<KeywordList[]>([
    { id: "l1", name: "Core terms", description: "Primary targets", tags: ["t2"], locale: "en-US", device: "Desktop", keywords: [] },
    { id: "l2", name: "How-to", description: "Tutorial/guide searches", tags: ["t1", "t3"], locale: "en-US", device: "Mobile", keywords: [] },
  ]);
  const [rules, setRules] = useState<MappingRules>({
    mode: "manual",
    conflict: "flag",
    tieBreakers: ["Exact slug match", "In sitemap", "Locale match", "Path depth"],
    propagateVariants: true,
  });
  const [cannibal, setCannibal] = useState<CannibalRules>({
    maxUrls: 2,
    considerTitle: true,
    considerH1: true,
    considerCanonical: true,
    excludeTags: [],
    excludeFolders: [],
    excludePatterns: [],
    onDetect: "flag",
  });

  const [addKwOpen, setAddKwOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [cannibalOpen, setCannibalOpen] = useState(false);

  const archiveList = (id: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, archived: true } : l)));
    announce("List archived. Undo");
  };
  const undoArchiveList = (id: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, archived: false } : l)));

  /* ====== 2) SERP FEATURES & SOV ====== */
  const allFeatures: SerpFeature[] = [
    "Top stories",
    "Sitelinks",
    "People Also Ask",
    "Video",
    "Image pack",
    "Local pack",
    "Shopping",
    "FAQ rich result",
  ];
  const [selectedFeatures, setSelectedFeatures] = useState<Set<SerpFeature>>(new Set(["Sitelinks", "People Also Ask", "FAQ rich result"]));
  const [detectMethod, setDetectMethod] = useState<DetectionMethod>("parser-v2");
  const [curve, setCurve] = useState<PositionCurve>("exponential");
  const [mobileWeight, setMobileWeight] = useState(40);
  const [attribution, setAttribution] = useState<Attribution>("domain");
  const [scopeLists, setScopeLists] = useState<Set<string>>(new Set([lists[0].id]));
  const [includeFeatures, setIncludeFeatures] = useState(true);
  const [featureDrawerOpen, setFeatureDrawerOpen] = useState(false);
  const [sovDrawerOpen, setSovDrawerOpen] = useState(false);
  const [scopeDrawerOpen, setScopeDrawerOpen] = useState(false);

  /* shared scope state */
  const [locales, setLocales] = useState<LocaleRow[]>([
    { id: "loc1", code: "en-US", language: "English (US)", engine: "google.com", country: "US", enabled: true, defaultDevice: "Desktop" },
    { id: "loc2", code: "en-GB", language: "English (UK)", engine: "google.co.uk", country: "GB", enabled: false, defaultDevice: "Mobile" },
  ]);
  const [deviceProfiles, setDeviceProfiles] = useState<{ id: Device; userAgent: string; enabled: boolean; note?: string }[]>([
    { id: "Desktop", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...", enabled: true, note: "Primary reporting device" },
    { id: "Mobile", userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel)...", enabled: true },
  ]);

  /* ====== 3) COMPETITORS ====== */
  const COMP_LIMIT = 10;
  const [comps, setComps] = useState<Competitor[]>([
    { id: "c1", domain: "example-competitor.com", labels: ["Direct"], approved: true, notes: "" },
  ]);
  const [addCompOpen, setAddCompOpen] = useState(false);
  const [removeComp, setRemoveComp] = useState<Competitor | null>(null);

  /* ====== 4) OFF-PAGE SIGNALS ====== */
  const [providers, setProviders] = useState<Provider[]>([
    { id: "Ahrefs", connected: false },
    { id: "Google Search Console", connected: true, lastSync: new Date(Date.now() - 1000 * 60 * 280).toISOString(), scopes: ["webmasters.readonly"] },
    { id: "CSV Upload", connected: false },
  ]);
  const [scopesOpen, setScopesOpen] = useState<{ open: boolean; provider?: Provider }>({ open: false });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [offRules, setOffRules] = useState<OffpageRules>({
    includeDomains: [],
    excludeDomains: [],
    includeTlds: [],
    canonWWW: true,
    httpHttpsSame: true,
    attribution: "domain",
    freshnessOnlyNew: true,
  });
  const [buckets, setBuckets] = useState<BucketLabel[]>([
    { id: "b1", name: "PR" },
    { id: "b2", name: "Partner" },
  ]);

  /* ====== 5) LOCALE & DEVICE SCOPE ====== */
  const [scopePaneOpen, setScopePaneOpen] = useState(false);

  /* ─────────────────────────────── UI ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text)]">
      <GlobalTokens />

      <div className="w-full mx-auto px-6 py-8 space-y-6">
        {/* ================= 1) KEYWORDS & MAPPING ================= */}
        <Card>
          <SectionHeader
            icon={<ListChecks className="h-5 w-5" aria-hidden />}
            title="Keywords & mapping"
            meta={<span className="text-[var(--text-muted)]">Lists, tags, URL mapping & cannibalization rules</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setAddKwOpen(true)} title="Add keywords">
                  <Plus className="h-4 w-4 text-[var(--brand)]" /> Add keywords
                </Button>
                <Button variant="secondary" onClick={() => setImportCsvOpen(true)} title="Import CSV">
                  <Upload className="h-4 w-4 text-[var(--brand)]" /> Import CSV
                </Button>
                <Button variant="secondary" onClick={() => setTagsOpen(true)} title="Manage tags">
                  <Tags className="h-4 w-4 text-[var(--brand)]" /> Manage tags
                </Button>
                <Button variant="secondary" onClick={() => setMapDrawerOpen(true)} title="Mapping defaults">
                  <Settings className="h-4 w-4 text-[var(--brand)]" /> Settings
                </Button>
                <Button variant="secondary" onClick={() => setCannibalOpen(true)} title="Cannibalization detection">
                  <ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> Rules
                </Button>
              </>
            }
          />

          {/* Lists directory */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead className="bg-[var(--bg-app)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-3 py-2">List</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Tags</th>
                  <th className="px-3 py-2">Default locale</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {lists.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.name}</td>
                    <td className="px-3 py-2">{l.description || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {l.tags.map((tid) => {
                          const t = tags.find((x) => x.id === tid);
                          return <Chip key={tid} tone="neutral">{t?.name || tid}</Chip>;
                        })}
                        {l.tags.length === 0 && <span className="text-[var(--text-muted)]">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">{l.locale || "—"}</td>
                    <td className="px-3 py-2">{l.device || "—"}</td>
                    <td className="px-3 py-2">{l.archived ? <Chip tone="critical">Archived</Chip> : <Chip tone="success">Active</Chip>}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => announce("Exported template CSV")} title="Export template CSV">
                          <Download className="h-4 w-4 text-[var(--brand)]" /> Export template CSV
                        </Button>
                        {!l.archived ? (
                          <Button variant="ghost" onClick={() => archiveList(l.id)} title="Archive">
                            <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Archive
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => undoArchiveList(l.id)} title="Undo archive">
                            <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> Undo
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {lists.length === 0 && (
                  <tr>
                    <td className="px-3 py-8 text-center text-[var(--text-muted)]" colSpan={7}>
                      No lists yet. Click <strong>Add keywords</strong> or <strong>Import CSV</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ================= 2) SERP FEATURES & SOV ================= */}
        <Card>
          <SectionHeader
            icon={<Sparkles className="h-5 w-5" aria-hidden />}
            title="SERP features & SOV"
            meta={<span className="text-[var(--text-muted)]">Tracking configuration only</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setFeatureDrawerOpen(true)} title="Manage feature set">
                  <Sparkles className="h-4 w-4 text-[var(--brand)]" /> Feature set
                </Button>
                <Button variant="secondary" onClick={() => setSovDrawerOpen(true)} title="SOV formula">
                  <Sigma className="h-4 w-4 text-[var(--brand)]" /> SOV formula
                </Button>
                <Button variant="secondary" onClick={() => setScopeDrawerOpen(true)} title="Search scope">
                  <Globe className="h-4 w-4 text-[var(--brand)]" /> Search scope
                </Button>
              </>
            }
          />

          {/* Small readable summary (no metrics) */}
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-medium text-[var(--text-strong)]">Features enabled</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from(selectedFeatures).map((f) => <Chip key={f} tone="neutral">{f}</Chip>)}
                {selectedFeatures.size === 0 && <span className="text-[var(--text-muted)]">None</span>}
              </div>
            </div>
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-medium text-[var(--text-strong)]">SOV settings</div>
              <div className="mt-1 text-[var(--text)]">Curve: {curve}, Detection: {detectMethod}</div>
              <div className="text-[var(--text)]">Attribution: {attribution}, Mobile: {mobileWeight}%, Desktop: {100 - mobileWeight}%</div>
              <div className="text-[var(--text)]">Include features in SOV: {includeFeatures ? "Yes" : "No"}</div>
            </div>
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-medium text-[var(--text-strong)]">Scope</div>
              <div className="mt-1 text-[var(--text)]">Lists: {Array.from(scopeLists).length}</div>
              <div className="text-[var(--text)]">Locales enabled: {locales.filter((l) => l.enabled).length}</div>
              <div className="text-[var(--text)]">Device profiles: {deviceProfiles.filter((d) => d.enabled).map((d) => d.id).join(", ")}</div>
            </div>
          </div>
        </Card>

        {/* ================= 3) COMPETITORS ================= */}
        <Card>
          <SectionHeader
            icon={<Users className="h-5 w-5" aria-hidden />}
            title="Competitors"
            meta={<span className="text-[var(--text-muted)]">Up to {COMP_LIMIT} domains</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setAddCompOpen(true)} title="Add competitor" disabled={comps.length >= COMP_LIMIT}>
                  <Plus className="h-4 w-4 text-[var(--brand)]" /> Add competitor
                </Button>
                <Button variant="secondary" onClick={() => announce("Bulk import ready")}>
                  <Upload className="h-4 w-4 text-[var(--brand)]" /> Bulk import
                </Button>
              </>
            }
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead className="bg-[var(--bg-app)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-3 py-2">Domain</th>
                  <th className="px-3 py-2">Label(s)</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Approved for reporting</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {comps.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={faviconFor(c.domain)} alt="" className="h-4 w-4 rounded-sm" />
                        <span>{c.domain}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.labels.map((l) => <Chip key={l} tone="neutral">{l}</Chip>)}
                        {c.labels.length === 0 && <span className="text-[var(--text-muted)]">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="h-9 w-full rounded-[var(--radius)] border px-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                        style={{ borderColor: "var(--border)" }}
                        placeholder="Contact notes"
                        value={c.notes || ""}
                        onChange={(e) => setComps((prev) => prev.map((x) => (x.id === c.id ? { ...x, notes: e.target.value } : x)))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Toggle
                        checked={c.approved}
                        onChange={(v) => { setComps((prev) => prev.map((x) => (x.id === c.id ? { ...x, approved: v } : x))); announce("Approval updated"); }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => setComps((prev) => prev.map((x) => (x.id === c.id ? { ...x, labels: x.labels.includes("Direct") ? ["Content peer"] : ["Direct"] } : x)))} title="Rename label">
                          <Pencil className="h-4 w-4 text-[var(--brand)]" /> Rename label
                        </Button>
                        <Button variant="ghost" onClick={() => setRemoveComp(c)} title="Remove">
                          <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {comps.length === 0 && (
                  <tr>
                    <td className="px-3 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      No competitors yet. Click <strong>Add competitor</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ================= 4) OFF‑PAGE SIGNALS (configuration only) ================= */}
        <Card>
          <SectionHeader
            icon={<Link2 className="h-5 w-5" aria-hidden />}
            title="Off‑page signals"
            meta={<span className="text-[var(--text-muted)]">Providers & ingestion rules</span>}
            actions={
              <>
                <Button variant="secondary" onClick={() => setRulesOpen(true)} title="Sync preferences / filters">
                  <Settings className="h-4 w-4 text-[var(--brand)]" /> Sync preferences
                </Button>
              </>
            }
          />

          {/* Provider connections */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {providers.map((p) => (
              <div key={p.id} className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-[var(--brand)]" aria-label="Provider" />
                    <div className="font-medium text-sm text-[var(--text-strong)]">{p.id}</div>
                  </div>
                  {p.connected ? <Chip tone="success">Connected</Chip> : <Chip tone="warning">Not connected</Chip>}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">Last sync: {p.connected ? rt(p.lastSync) : "—"}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" onClick={() => setProviders((prev) => prev.map((x) => (x.id === p.id ? { ...x, connected: true, lastSync: new Date().toISOString() } : x)))} title="Re‑auth / Connect">
                    <RefreshCw className="h-4 w-4 text-[var(--brand)]" /> {p.connected ? "Re‑auth" : "Connect"}
                  </Button>
                  <Button variant="ghost" onClick={() => setScopesOpen({ open: true, provider: p })} title="View scopes">
                    <ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> View scopes
                  </Button>
                  {p.connected && (
                    <Button variant="ghost" onClick={() => setProviders((prev) => prev.map((x) => (x.id === p.id ? { ...x, connected: false } : x)))} title="Disconnect">
                      <Trash2 className="h-4 w-4 text-[var(--brand)]" /> Disconnect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ================= 5) LOCALE & DEVICE SCOPE (if enabled) ================= */}
        <Card>
          <SectionHeader
            icon={<Globe className="h-5 w-5" aria-hidden />}
            title="Locale & device scope"
            meta={<span className="text-[var(--text-muted)]">Define enabled locales and device profiles</span>}
            actions={
              <Button variant="secondary" onClick={() => setScopePaneOpen(true)} title="Manage scope">
                <Settings className="h-4 w-4 text-[var(--brand)]" /> Manage
              </Button>
            }
          />

          {/* Compact non-metric summary */}
          <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-medium text-[var(--text-strong)]">Locales</div>
              <div className="mt-1">{locales.map((l) => (
                <div key={l.id} className="flex items-center gap-2">
                  <Chip tone={l.enabled ? "success" : "neutral"}>{l.code}</Chip>
                  <span className="text-[var(--text-muted)]">{l.engine}</span>
                </div>
              ))}</div>
            </div>
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-medium text-[var(--text-strong)]">Default devices</div>
              <ul className="mt-1 space-y-1">
                {locales.map((l) => (
                  <li key={l.id}>{l.code}: <span className="text-[var(--text)]">{l.defaultDevice}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-medium text-[var(--text-strong)]">Profiles</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {deviceProfiles.map((d) => <Chip key={d.id} tone={d.enabled ? "success" : "neutral"}>{d.id}</Chip>)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== Drawers / Dialogs ===== */}
      <AddKeywordsDialog
        open={addKwOpen}
        onClose={() => setAddKwOpen(false)}
        lists={lists}
        tags={tags}
        onAdd={({ listId, items }) => {
          setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, keywords: [...(l.keywords || []), ...items] } : l)));
          announce("Keywords added");
        }}
      />
      <ImportKeywordsCsvDialog
        open={importCsvOpen}
        onClose={() => setImportCsvOpen(false)}
        onImport={(rows) => { announce(`Parsed ${rows.length} row(s)`); }}
      />
      <ManageTagsDrawer open={tagsOpen} onClose={() => setTagsOpen(false)} tags={tags} onChange={(next) => { setTags(next); announce("Tags updated"); }} />
      <MappingSettingsDrawer open={mapDrawerOpen} onClose={() => setMapDrawerOpen(false)} rules={rules} onSave={(next) => { setRules(next); announce("Mapping defaults saved"); }} />
      <CannibalizationDrawer open={cannibalOpen} onClose={() => setCannibalOpen(false)} rules={cannibal} tags={tags} onSave={(next) => { setCannibal(next); announce("Cannibalization rules saved"); }} />

      <ManageFeaturesDrawer
        open={featureDrawerOpen}
        onClose={() => { setFeatureDrawerOpen(false); announce("Feature set saved"); }}
        allFeatures={allFeatures}
        selected={selectedFeatures}
        setSelected={setSelectedFeatures}
        method={detectMethod}
        setMethod={setDetectMethod}
      />
      <SovFormulaDrawer
        open={sovDrawerOpen}
        onClose={() => { setSovDrawerOpen(false); announce("SOV formula saved"); }}
        curve={curve}
        setCurve={setCurve}
        mobileWeight={mobileWeight}
        setMobileWeight={setMobileWeight}
        attribution={attribution}
        setAttribution={setAttribution}
        selectedLists={scopeLists}
        setSelectedLists={setScopeLists}
        lists={lists}
        includeFeatures={includeFeatures}
        setIncludeFeatures={setIncludeFeatures}
      />
      <SearchScopeDrawer
        open={scopeDrawerOpen}
        onClose={() => { setScopeDrawerOpen(false); announce("Search scope updated"); }}
        locales={locales}
        setLocales={setLocales}
        deviceProfiles={deviceProfiles}
        setDeviceProfiles={setDeviceProfiles}
      />

      <AddCompetitorDialog open={addCompOpen} onClose={() => setAddCompOpen(false)} onAdd={(c) => { setComps((prev) => [...prev, c]); announce("Competitor added"); }} limitReached={comps.length >= COMP_LIMIT} />
      <ConfirmModal
        open={!!removeComp}
        title="Remove competitor?"
        message={`This will remove ${removeComp?.domain} from the directory.`}
        confirmLabel="Remove"
        onConfirm={() => { if (removeComp) setComps((prev) => prev.filter((x) => x.id !== removeComp.id)); setRemoveComp(null); announce("Competitor removed"); }}
        onCancel={() => setRemoveComp(null)}
      />

      <ProviderScopesDrawer open={scopesOpen.open} onClose={() => setScopesOpen({ open: false })} provider={scopesOpen.provider} />
      <OffpageRulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} rules={offRules} setRules={(r) => { setOffRules(r); announce("Ingestion rules saved"); }} buckets={buckets} setBuckets={(b) => { setBuckets(b); announce("Buckets updated"); }} />

      {/* Locale & Device Scope manager (same as SearchScopeDrawer but accessible in final section) */}
      <SearchScopeDrawer
        open={scopePaneOpen}
        onClose={() => { setScopePaneOpen(false); announce("Scope saved"); }}
        locales={locales}
        setLocales={setLocales}
        deviceProfiles={deviceProfiles}
        setDeviceProfiles={setDeviceProfiles}
      />

      {/* Live region & toast */}
      <p className="sr-only" aria-live="polite">{toast || ""}</p>
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-[var(--radius)] border px-3 py-2 text-sm"
          style={{ background: "var(--brand-pastel)", borderColor: "var(--border)", boxShadow: "var(--shadow-1)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
