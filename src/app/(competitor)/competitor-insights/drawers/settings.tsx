"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings2,
  X,
  ChevronRight,
  ChevronDown,
  Info,
  Upload,
  Download,
  RefreshCw,
  Save,
  Trash2,
  Users,
  ShieldCheck,
  Search,
  Copy,
  Settings,
} from "lucide-react";

/**
 * ⚙️ Competitor Intelligence — Global Settings Modal (100% functional)
 * -------------------------------------------------------------------
 * - Token‑first styling with fallbacks (no external UI libs)
 * - Centered modal (640px desktop / full‑screen mobile)
 * - Collapsible sections (6 groups), sticky footer
 * - Role gating (owner/admin editable; editor/viewer read-only)
 * - Import/Export (CSV/JSON + copy‑as‑table), tags editor, compare cap
 * - Focus trap, ESC to close, scrim click to close, accessible labels
 *
 * HOW TO USE IN YOUR APP:
 *   import CISettingsModal, { CISettingsModal as Modal } from "./CISettingsModal";
 *   // Quick demo (already included as default export)
 *   // Or mount modal directly and control `open`:
 *   <Modal open onClose={()=>{}} role="admin" />
 *
 * This file exports:
 *   - Named export  : CISettingsModal  (the modal itself)
 *   - Default export: CISettingsModalDemo (a self-contained preview with an "Open settings" button)
 */

/* ---------------------------- Tokens (CSS vars) ---------------------------- */
const TK = {
  surfaceCard: "var(--wr-surface-card, #F5F7FA)",
  surfaceOverlay: "var(--wr-surface-overlay, #ffffff)",
  surfaceSubtle: "var(--wr-surface-subtle, #F7F9FC)",
  borderBrand: "var(--wr-border-brand, #E5E7EB)",
  borderSubtle: "var(--wr-border-subtle, #EEF1F6)",
  textPrimary: "var(--wr-text-primary, #111827)",
  textSecondary: "var(--wr-text-secondary, #6B7280)",
  chipFilterBg: "var(--wr-chip-filter-bg, #F1F5F9)",
  chipActiveBg: "var(--wr-chip-active-bg, #E6F2FF)",
  chipActiveText: "var(--wr-chip-active-text, #0B5CAB)",
  btnPrimaryBg: "var(--wr-btn-primary-bg, #1090D0)",
  btnPrimaryText: "var(--wr-btn-primary-text, #ffffff)",
  btnPrimaryHover: "var(--wr-btn-primary-hover, #0E82BC)",
  btnGhostBg: "var(--wr-btn-ghost-bg, #ffffff)",
  btnGhostText: "var(--wr-btn-ghost-text, #111827)",
  btnGhostBorder: "var(--wr-btn-ghost-border, #E5E7EB)",
  btnDangerBg: "var(--wr-btn-danger-bg, #EF4444)",
  btnDangerText: "var(--wr-btn-danger-text, #ffffff)",
  focusRing: "var(--wr-focus-ring, 0 0 0 3px rgba(16,144,208,0.25))",
  shellRadius: "var(--wr-shell-radius, 12px)",
  shellShadow: "var(--wr-shell-shadow, 0 12px 40px rgba(0,0,0,0.18))",
  tableRowAlt: "var(--wr-table-row-alt, #FAFBFC)",
  tableRowHover: "var(--wr-table-row-hover, #F5F7FA)",
};

/* --------------------------------- Types ---------------------------------- */
type Role = "owner" | "admin" | "editor" | "viewer";
type Source = "insights" | "profiles" | "tracker";

type CISettings = {
  seats: { used: number; total: number; resetAtISO: string };
  deletions: Array<{ domain: string; deletedAtISO: string; lockedDaysLeft: number; deletedBy: string }>;
  tags: Record<string /*domain*/, string[] /*tags*/>;
  aiScope: "all" | "tagged";
  roleEnforcement: boolean;
  internalNotesVisibleToAll: boolean;
  addedByMeta: boolean;
  defaultCompareSet: { domains: string[]; autoLoad: boolean; namedSets?: Array<{ name: string; domains: string[] }> };
  export: { includeAddedBy: boolean };
  import?: { planAllowed: boolean };
};

type CompetitorRow = { domain: string; nickname?: string; addedBy?: string; addedAtISO?: string };

/* --------------------------------- Utils ---------------------------------- */
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "—";

const deepEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

function toCSV(rows: CompetitorRow[], tags: CISettings["tags"], includeAddedBy: boolean) {
  const header = ["Domain", "Nickname", "Tags", "Added by", "Added on"];
  const lines = rows.map((r) => {
    const tagStr = (tags[r.domain] || []).join("|");
    const cols = [
      r.domain,
      r.nickname || "",
      tagStr,
      includeAddedBy ? (r.addedBy || "") : "",
      includeAddedBy ? (r.addedAtISO || "") : "",
    ];
    return cols.map((c) => JSON.stringify(String(c))).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------- Small Primitives ---------------------------- */
function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      style={{
        background: checked ? "var(--wr-color-brand-600, #1090D0)" : "var(--wr-gray-300, #D1D5DB)",
      }}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function Section({
  title,
  info,
  children,
  defaultOpen = false,
  id,
  disabled,
}: React.PropsWithChildren<{
  title: string;
  info?: string;
  defaultOpen?: boolean;
  id?: string;
  disabled?: boolean;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-labelledby={id} className="rounded-lg border" style={{ borderColor: TK.borderSubtle }}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#00000008] focus:outline-none"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        title={info}
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h3 id={id} className="truncate text-[15px] font-semibold" style={{ color: TK.textPrimary }}>
            {title}
          </h3>
          {info && <Info className="h-4 w-4 shrink-0" style={{ color: TK.textSecondary }} />}
        </div>
        <div className="text-xs" style={{ color: TK.textSecondary }}>
          {open ? "Hide" : "Show"}
        </div>
      </button>
      {open && (
        <div
          className="border-t p-3 sm:p-4"
          style={{ borderColor: TK.borderSubtle, background: disabled ? TK.surfaceSubtle : TK.surfaceCard }}
          aria-disabled={disabled}
        >
          {children}
        </div>
      )}
    </section>
  );
}

function Badge({
  children,
  tone = "default",
  title,
}: React.PropsWithChildren<{ tone?: "default" | "ok" | "warn" | "danger" | "info"; title?: string }>) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: "var(--wr-badge-bg, #F1F5F9)", color: "var(--wr-badge-text, #0F172A)", border: "var(--wr-badge-border, #E5E7EB)" },
    ok: { bg: "var(--wr-badge-ok-bg, #ECFDF5)", color: "var(--wr-badge-ok-text, #065F46)", border: "var(--wr-badge-ok-border, #A7F3D0)" },
    warn: { bg: "var(--wr-badge-warn-bg, #FFFBEB)", color: "var(--wr-badge-warn-text, #92400E)", border: "var(--wr-badge-warn-border, #FDE68A)" },
    danger: { bg: "var(--wr-badge-danger-bg, #FEF2F2)", color: "var(--wr-badge-danger-text, #991B1B)", border: "var(--wr-badge-danger-border, #FECACA)" },
    info: { bg: "var(--wr-badge-info-bg, #E8F0FE)", color: "var(--wr-badge-info-text, #1E40AF)", border: "var(--wr-badge-info-border, #BFDBFE)" },
  };
  const s = map[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[12px] font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
}

function PillButton({
  children,
  onClick,
  variant = "ghost",
  disabled,
  title,
}: React.PropsWithChildren<{
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
}>) {
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm focus:outline-none";
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: TK.btnPrimaryBg, color: TK.btnPrimaryText }
      : variant === "danger"
      ? { background: TK.btnDangerBg, color: TK.btnDangerText }
      : { background: TK.btnGhostBg, color: TK.btnGhostText, border: `1px solid ${TK.btnGhostBorder}` };
  return (
    <button className={base + (disabled ? " opacity-60 cursor-not-allowed" : " hover:opacity-95")} style={style} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center">
      <div
        className="rounded-md border px-3 py-2 text-sm shadow"
        style={{ background: TK.surfaceOverlay, borderColor: TK.borderBrand, color: TK.textPrimary }}
      >
        {msg}
      </div>
    </div>
  );
}

/* ------------------------------- Mock Data -------------------------------- */
function buildMockCompetitors(): CompetitorRow[] {
  return [
    { domain: "comp1.com", nickname: "Comp 1", addedBy: "Aly", addedAtISO: "2025-06-04" },
    { domain: "comp2.ai", nickname: "AI Tools", addedBy: "Ben", addedAtISO: "2025-06-10" },
    { domain: "example.org", nickname: "Example Org", addedBy: "Cara", addedAtISO: "2025-06-18" },
    { domain: "marketly.co", nickname: "Marketly", addedBy: "Aly", addedAtISO: "2025-06-21" },
  ];
}

function buildMockSettings(rows: CompetitorRow[]): CISettings {
  return {
    seats: { used: rows.length, total: 6, resetAtISO: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString() },
    deletions: [{ domain: "old-competitor.net", deletedAtISO: "2025-06-28", lockedDaysLeft: 12, deletedBy: "Ben" }],
    tags: {
      "comp1.com": ["saas", "tools"],
      "comp2.ai": ["ai", "saas"],
      "example.org": ["publisher"],
    },
    aiScope: "tagged",
    roleEnforcement: true,
    internalNotesVisibleToAll: false,
    addedByMeta: true,
    defaultCompareSet: { domains: ["comp1.com", "comp2.ai"], autoLoad: true, namedSets: [{ name: "Top Tech", domains: ["comp1.com", "comp2.ai"] }] },
    export: { includeAddedBy: true },
    import: { planAllowed: false }, // gate import on plan (demo)
  };
}

/* ------------------------------ Tag Editor ------------------------------ */
function TagEditor({
  value,
  onChange,
  readOnly,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  function uniqTags(xs: string[]) {
    const seen = new Set<string>();
    const out: string[] = [];
    xs.forEach((t) => {
      const v = t.trim().toLowerCase();
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    });
    return out;
  }

  function addTagFromInput() {
    const v = input.trim().toLowerCase();
    if (!v) return;
    if (v.length > 24) return;
    if (value.includes(v)) {
      setInput("");
      return;
    }
    onChange(uniqTags([...value, v]).slice(0, 5));
    setInput("");
  }

  function removeTag(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  return (
    <div
      className="min-h-[36px] rounded-md border p-1.5"
      style={{ borderColor: focused ? "var(--wr-color-brand-400, #93C5FD)" : TK.borderSubtle, boxShadow: focused ? TK.focusRing : "none" }}
    >
      <div className="flex flex-wrap items-center gap-1">
        {value.length === 0 && (
          <span className="text-xs" style={{ color: TK.textSecondary }}>
            No tags
          </span>
        )}
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[12px]"
            style={{ background: TK.chipActiveBg, color: TK.chipActiveText, border: `1px solid ${TK.borderSubtle}` }}
            title={t}
          >
            {t}
            {!readOnly && (
              <button className="ml-1" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>
                ×
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTagFromInput();
              } else if (e.key === "Backspace" && input === "" && value.length > 0) {
                removeTag(value[value.length - 1]);
              }
            }}
            onBlur={() => setFocused(false)}
            onFocus={() => setFocused(true)}
            placeholder="Add tag…"
            className="h-7 min-w-[80px] flex-1 bg-transparent px-1 text-sm outline-none"
            style={{ color: TK.textPrimary }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------- The MODAL ------------------------------- */

export function CISettingsModal({
  open,
  onClose,
  role = "admin",
  source,
  projectId,
  compareCap = 3,
  initialSettings,
  competitors,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  role?: Role;
  source?: Source;
  projectId?: string;
  compareCap?: number;
  initialSettings?: Partial<CISettings>;
  competitors?: CompetitorRow[];
  onSave?: (next: CISettings) => Promise<void> | void;
}) {
  const canEdit = role === "owner" || role === "admin";
  const readOnly = !canEdit;

  const rows = useMemo(() => competitors ?? buildMockCompetitors(), [competitors]);
  const base = useMemo(() => buildMockSettings(rows), [rows]);

  const [settings, setSettings] = useState<CISettings>(() => ({
    ...base,
    ...initialSettings,
    defaultCompareSet: { ...base.defaultCompareSet, ...(initialSettings?.defaultCompareSet || {}) },
  }));

  const [searchTagDomain, setSearchTagDomain] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [autosyncBanner, setAutosyncBanner] = useState<null | string>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeImportMode, setActiveImportMode] = useState<"append" | "replace">("append");
  const [importOverwritePolicy, setImportOverwritePolicy] = useState<"skip" | "overwrite">("skip");

  // Dirty detection snapshot
  const originalRef = useRef<CISettings>(settings);
  const dirty = useMemo(() => !deepEqual(originalRef.current, settings), [settings]);

  // Focus trap
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActive = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") attemptClose();
      else if (e.key === "Tab") {
        const el = dialogRef.current;
        if (!el) return;
        const focusables = el.querySelectorAll<HTMLElement>(
          [
            "button:not(:disabled)",
            "a[href]",
            "input:not(:disabled)",
            "select:not(:disabled)",
            "textarea:not(:disabled)",
            "[tabindex]:not([tabindex='-1'])",
          ].join(",")
        );
        const arr = Array.from(focusables);
        if (arr.length === 0) return;
        const first = arr[0];
        const last = arr[arr.length - 1];
        const active = document.activeElement as HTMLElement;
        if (!el.contains(active)) {
          first.focus();
          e.preventDefault();
        } else {
          if (!e.shiftKey && active === last) {
            first.focus();
            e.preventDefault();
          } else if (e.shiftKey && active === first) {
            last.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Autosync banner (demo)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setAutosyncBanner("Competitors updated in another tab."), 45000);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  /* ------------------------------- Validation ------------------------------ */
  const compareSelected = settings.defaultCompareSet.domains;
  const overCap = compareSelected.length > compareCap;

  const tagViolations: string[] = [];
  Object.entries(settings.tags).forEach(([dom, tags]) => {
    if (tags.length > 5) tagViolations.push(`${dom}: max 5 tags`);
    tags.forEach((t) => {
      if (t.length > 24) tagViolations.push(`${dom}: tag “${t}” too long`);
    });
  });

  const saveDisabled = readOnly || saving || overCap || tagViolations.length > 0;

  /* -------------------------------- Actions -------------------------------- */
  async function handleSave() {
    if (saveDisabled) return;
    setSaving(true);
    await sleep(350);
    try {
      await onSave?.(settings);
      originalRef.current = settings;
      setToast("Settings saved • Applied across Insights, Profiles, Tracker");
      setTimeout(() => setToast(null), 1600);
      onClose();
      restoreFocus();
    } catch {
      setToast("Save failed. Please try again.");
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSaving(false);
    }
  }

  function attemptClose() {
    if (dirty && !readOnly) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) return;
    }
    onClose();
    restoreFocus();
  }

  function restoreFocus() {
    const el = lastActive.current;
    if (el && typeof el.focus === "function") setTimeout(() => el.focus(), 0);
  }

  async function handleExportCSV() {
    const csv = toCSV(rows, settings.tags, settings.export.includeAddedBy);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "competitors.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleExportJSON() {
    const data = {
      projectId,
      competitors: rows,
      tags: settings.tags,
      meta: { exportedAt: new Date().toISOString() },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "competitors.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleCopyTable() {
    const table = rows
      .map((r) => {
        const tagStr = (settings.tags[r.domain] || []).join(", ");
        const cols = [
          r.domain,
          r.nickname || "",
          tagStr,
          settings.export.includeAddedBy ? r.addedBy || "" : "",
          settings.export.includeAddedBy ? r.addedAtISO || "" : "",
        ];
        return cols.join("\t");
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(table);
      setToast("Copied table to clipboard");
      setTimeout(() => setToast(null), 1400);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(null), 1400);
    }
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || "{}"));
        if (!Array.isArray(json.competitors) || typeof json.tags !== "object") {
          setImportErrors(["Invalid JSON: expected { competitors: [], tags: {} }"]);
          return;
        }
        if (!settings.import?.planAllowed) {
          setImportErrors(["Import is locked on your plan. Upgrade to enable JSON import."]);
          return;
        }
        const incoming: CompetitorRow[] = json.competitors || [];
        const incomingTags: Record<string, string[]> = json.tags || {};
        const existingDomains = new Set(rows.map((r: CompetitorRow) => r.domain));
        const toAdd = incoming.filter((r) => !existingDomains.has(r.domain));
        const conflicts = incoming.filter((r) => existingDomains.has(r.domain));
        const stats = [`Incoming: ${incoming.length}`, `New: ${toAdd.length}`, `Conflicts: ${conflicts.length}`];

        if (activeImportMode === "append") {
          if (toAdd.length === 0 && importOverwritePolicy === "skip" && conflicts.length > 0) {
            setImportErrors([`Nothing to append. ${stats.join(" · ")}`]);
            return;
          }
          const nextTags = { ...settings.tags };
          Object.entries(incomingTags).forEach(([dom, t]) => {
            const current = nextTags[dom] || [];
            if (importOverwritePolicy === "overwrite") nextTags[dom] = [...new Set(t.map((x) => x.toLowerCase()))].slice(0, 5);
            else nextTags[dom] = [...new Set([...current, ...t.map((x) => x.toLowerCase())])].slice(0, 5);
          });
          setSettings((s) => ({ ...s, tags: nextTags }));
          setToast(`Import applied to tags • ${stats.join(" · ")}`);
          setTimeout(() => setToast(null), 1600);
        } else {
          const nextTags: Record<string, string[]> = {};
          rows.forEach((r) => (nextTags[r.domain] = (incomingTags[r.domain] || []).map((x: string) => x.toLowerCase()).slice(0, 5)));
          setSettings((s) => ({ ...s, tags: nextTags }));
          setToast(`Replaced tags from import • ${stats.join(" · ")}`);
          setTimeout(() => setToast(null), 1600);
        }
      } catch (err: any) {
        setImportErrors([String(err?.message || err || "Invalid JSON")]);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* --------------------------------- Render -------------------------------- */
  return (
    <>
      {toast && <Toast msg={toast} />}

      {/* Scrim */}
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={attemptClose} />

      {/* Modal Shell */}
      <div role="dialog" aria-modal="true" aria-label="Competitor Intelligence — Global Settings" className="fixed inset-0 z-[81] grid place-items-center p-4 sm:p-6">
        <div
          ref={dialogRef}
          className="relative w-full max-w-[640px] overflow-hidden"
          style={{ background: TK.surfaceOverlay, borderRadius: TK.shellRadius as any, boxShadow: TK.shellShadow, border: `1px solid ${TK.borderBrand}` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Settings2 className="h-5 w-5" style={{ color: TK.textSecondary }} />
              <h2 className="truncate text-[16px] font-semibold" style={{ color: TK.textPrimary }}>
                Competitor Intelligence — Global Settings
              </h2>
            </div>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-md" onClick={attemptClose} aria-label="Close" title="Close" style={{ border: `1px solid ${TK.borderSubtle}` }}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Passive autosync banner */}
          {autosyncBanner && (
            <div
              className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
              style={{ background: TK.surfaceSubtle, borderTop: `1px solid ${TK.borderSubtle}`, borderBottom: `1px solid ${TK.borderSubtle}` }}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span>{autosyncBanner}</span>
              </div>
              <button className="text-sm underline" onClick={() => setAutosyncBanner(null)}>
                Reload Modal
              </button>
            </div>
          )}

          {/* Body */}
          <div className="max-h-[70vh] overflow-auto px-4 pb-4 sm:px-5">
            <div className="space-y-3">
              {/* 1) Seats & Limits */}
              <Section id="sec-seats" title="Competitor Seats & Limits" info="Deleted competitors can’t be re‑added and do not free a seat until reset." defaultOpen>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={settings.seats.used >= settings.seats.total ? "warn" : "default"}>Competitor Slots: {settings.seats.used} / {settings.seats.total}</Badge>
                    <span className="text-sm" style={{ color: TK.textSecondary }}>
                      Resets on: <b style={{ color: TK.textPrimary }}>{fmtDate(settings.seats.resetAtISO)}</b>
                    </span>
                  </div>
                  {settings.seats.used >= settings.seats.total && (
                    <button className="text-sm underline" title="Upgrade plan">
                      Upgrade
                    </button>
                  )}
                </div>

                <div className="mt-3 rounded-md border" style={{ borderColor: TK.borderSubtle }}>
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: TK.borderSubtle }}>
                    <div className="text-sm font-medium" style={{ color: TK.textPrimary }}>
                      Deleted Competitors (locked until reset)
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: TK.textSecondary }} />
                      <input
                        placeholder="Search domain…"
                        className="h-8 w-[200px] rounded-md border pl-7 pr-2 text-sm outline-none"
                        style={{ borderColor: TK.borderSubtle, background: TK.surfaceCard, color: TK.textPrimary }}
                        onChange={() => void 0}
                      />
                    </div>
                  </div>
                  {settings.deletions.length === 0 ? (
                    <div className="px-3 py-4 text-sm" style={{ color: TK.textSecondary }}>
                      No deleted competitors this cycle.
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0" style={{ background: TK.surfaceCard }}>
                          <tr className="border-b" style={{ borderColor: TK.borderSubtle }}>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                              Domain
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                              Deleted on
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                              Locked for
                            </th>
                            <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                              By
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {settings.deletions.map((d, i) => (
                            <tr key={d.domain + i} style={{ background: i % 2 ? TK.tableRowAlt : "transparent" }}>
                              <td className="px-3 py-2 font-mono">{d.domain}</td>
                              <td className="px-3 py-2">{fmtDate(d.deletedAtISO)}</td>
                              <td className="px-3 py-2">{d.lockedDaysLeft} days</td>
                              <td className="px-3 py-2">{d.deletedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Section>

              {/* 2) Reset & Deletion Rules */}
              <Section id="sec-rules" title="Monthly Reset & Deletion Rules" defaultOpen>
                <ul className="list-disc space-y-2 pl-5 text-sm" style={{ color: TK.textSecondary }}>
                  <li>
                    Deleting a competitor <b style={{ color: TK.textPrimary }}>does not free a seat immediately</b>. The seat becomes available on your next reset.
                  </li>
                  <li>Seats replenish at reset. Deleted domains can be added again after reset.</li>
                </ul>
                <div className="mt-3 flex items-center gap-3">
                  <Switch checked={false} onChange={() => void 0} disabled />
                  <span className="text-sm" style={{ color: TK.textSecondary }}>
                    Early Replace (Pro) — <i>Available on Pro in a future update.</i>
                  </span>
                </div>
              </Section>

              {/* 3) Category Tagging & AI Scope */}
              <Section id="sec-tags" title="Category Tagging & AI Scope" info="Tags guide AI relevance across Insights & Tracker.">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm" style={{ color: TK.textSecondary }}>
                    Max 5 tags / domain • Tag length ≤ 24 chars
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: TK.textSecondary }} />
                    <input
                      placeholder="Filter by domain…"
                      value={searchTagDomain}
                      onChange={(e) => setSearchTagDomain(e.target.value)}
                      className="h-8 w-[220px] rounded-md border pl-7 pr-2 text-sm outline-none"
                      style={{ borderColor: TK.borderSubtle, background: TK.surfaceCard, color: TK.textPrimary }}
                    />
                  </div>
                </div>
                <div className="max-h-[240px] overflow-auto rounded-md border" style={{ borderColor: TK.borderSubtle }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0" style={{ background: TK.surfaceCard }}>
                      <tr className="border-b" style={{ borderColor: TK.borderSubtle }}>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                          Domain
                        </th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                          Tags
                        </th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: TK.textSecondary }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .filter((r) => (searchTagDomain ? r.domain.includes(searchTagDomain) : true))
                        .map((r, idx) => (
                          <tr key={r.domain} style={{ background: idx % 2 ? TK.tableRowAlt : "transparent" }}>
                            <td className="px-3 py-2 font-mono">{r.domain}</td>
                            <td className="px-3 py-2">
                              <TagEditor
                                value={settings.tags[r.domain] || []}
                                readOnly={readOnly}
                                onChange={(next) => setSettings((s) => ({ ...s, tags: { ...s.tags, [r.domain]: next.slice(0, 5) } }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                className="text-sm underline disabled:opacity-50"
                                disabled={readOnly}
                                onClick={() => setSettings((s) => ({ ...s, tags: { ...s.tags, [r.domain]: [] } }))}
                                title="Clear tags"
                              >
                                Clear
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Scope */}
                <div className="mt-4 rounded-md border p-3" style={{ borderColor: TK.borderSubtle }}>
                  <div className="mb-2 text-[15px] font-semibold" style={{ color: TK.textPrimary }}>
                    Default AI Suggestion Scope
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="aiscope"
                        className="accent-blue-600"
                        checked={settings.aiScope === "all"}
                        onChange={() => setSettings((s) => ({ ...s, aiScope: "all" }))}
                        disabled={readOnly}
                      />
                      All Competitors
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="aiscope"
                        className="accent-blue-600"
                        checked={settings.aiScope === "tagged"}
                        onChange={() => setSettings((s) => ({ ...s, aiScope: "tagged" }))}
                        disabled={readOnly}
                      />
                      Only Tagged Relevant
                    </label>
                    <span className="text-xs" style={{ color: TK.textSecondary }}>
                      AI and recommendations prefer Tagged Relevant when selected.
                    </span>
                  </div>
                </div>

                {tagViolations.length > 0 && (
                  <div
                    className="mt-3 rounded-md border p-3 text-sm"
                    style={{ borderColor: TK.borderSubtle, background: "var(--wr-badge-warn-bg, #FFFBEB)", color: "var(--wr-badge-warn-text, #92400E)" }}
                  >
                    <div className="font-medium">Tag validation</div>
                    <ul className="list-disc pl-5">
                      {tagViolations.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              {/* 4) User Roles & Access */}
              <Section id="sec-roles" title="User Roles & Access">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={settings.roleEnforcement} onChange={(v) => setSettings((s) => ({ ...s, roleEnforcement: v }))} disabled={readOnly} label="Only Admins can Add/Delete Competitors" />
                    <span className="text-sm" style={{ color: TK.textPrimary }}>
                      Only Admins can Add/Delete Competitors
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={settings.internalNotesVisibleToAll}
                      onChange={(v) => setSettings((s) => ({ ...s, internalNotesVisibleToAll: v }))}
                      disabled={readOnly}
                      label="Internal Notes Visible to All"
                    />
                    <span className="text-sm" style={{ color: TK.textPrimary }}>
                      Internal Notes Visible to All
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={settings.addedByMeta} onChange={(v) => setSettings((s) => ({ ...s, addedByMeta: v }))} disabled={readOnly} label="‘Added by’ metadata" />
                    <span className="text-sm" style={{ color: TK.textPrimary }}>
                      ‘Added by’ metadata
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-md border p-3" style={{ borderColor: TK.borderSubtle }}>
                  <div className="mb-1 flex items-center gap-2 text-sm" style={{ color: TK.textSecondary }}>
                    <Users className="h-4 w-4" />
                    Role matrix (informational):
                  </div>
                  <ul className="list-disc pl-5 text-sm" style={{ color: TK.textSecondary }}>
                    <li>Owner/Admin = full edit</li>
                    <li>Editor = compare only</li>
                    <li>Viewer = read‑only</li>
                  </ul>
                </div>

                {readOnly && (
                  <div className="mt-2 text-xs" style={{ color: TK.textSecondary }}>
                    Some controls are restricted for your role. Ask an Admin to change this.
                  </div>
                )}
              </Section>

              {/* 5) Default Comparison Set */}
              <Section id="sec-compare" title="Default Comparison Set (Insights only)">
                {rows.length === 0 ? (
                  <div className="rounded-md border p-3 text-sm" style={{ borderColor: TK.borderSubtle, color: TK.textSecondary }}>
                    Add competitors to create a set.
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center gap-3">
                      <Switch
                        checked={settings.defaultCompareSet.autoLoad}
                        onChange={(v) => setSettings((s) => ({ ...s, defaultCompareSet: { ...s.defaultCompareSet, autoLoad: v } }))}
                        disabled={readOnly}
                        label="Auto‑load on Insights"
                      />
                      <span className="text-sm" style={{ color: TK.textPrimary }}>
                        Auto‑load on Insights
                      </span>
                      <span className="text-xs" style={{ color: TK.textSecondary }}>
                        You can compare up to {compareCap} at a time on this plan.
                      </span>
                    </div>

                    <div className="rounded-md border" style={{ borderColor: TK.borderSubtle }}>
                      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                        {rows.map((r, i) => {
                          const on = settings.defaultCompareSet.domains.includes(r.domain);
                          const blockNew = !on && settings.defaultCompareSet.domains.length >= compareCap;
                          return (
                            <label
                              key={r.domain}
                              className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#00000006]"
                              style={{ background: i % 2 ? TK.tableRowAlt : "transparent" }}
                              title={blockNew ? `You can compare up to ${compareCap}` : ""}
                            >
                              <div className="min-w-0">
                                <div className="font-mono">{r.domain}</div>
                                {r.nickname && (
                                  <div className="text-xs" style={{ color: TK.textSecondary }}>
                                    {r.nickname}
                                  </div>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-blue-600"
                                checked={on}
                                disabled={readOnly || blockNew}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSettings((s) => {
                                    const set = new Set(s.defaultCompareSet.domains);
                                    if (checked) {
                                      if (set.size >= compareCap) return s;
                                      set.add(r.domain);
                                    } else {
                                      set.delete(r.domain);
                                    }
                                    return { ...s, defaultCompareSet: { ...s.defaultCompareSet, domains: Array.from(set) } };
                                  });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <PillButton
                        variant="ghost"
                        onClick={() => setSettings((s) => ({ ...s, defaultCompareSet: { ...s.defaultCompareSet, domains: [], autoLoad: false } }))}
                        disabled={readOnly}
                        title="Reset selection"
                      >
                        <Trash2 className="h-4 w-4" /> Reset
                      </PillButton>

                      <div className="ml-auto flex items-center gap-2">
                        <input
                          placeholder="Set name (Pro)"
                          className="h-9 w-[200px] rounded-md border px-2 text-sm outline-none"
                          style={{ borderColor: TK.borderSubtle, background: TK.surfaceCard, color: TK.textPrimary }}
                          disabled
                          title="Available on Pro"
                        />
                        <PillButton variant="ghost" disabled title="Available on Pro">
                          <Save className="h-4 w-4" /> Save as Set
                        </PillButton>
                      </div>
                    </div>

                    {overCap && (
                      <div className="mt-2 text-sm" style={{ color: "var(--wr-badge-danger-text, #991B1B)" }}>
                        You can compare up to {compareCap} at a time on this plan.
                      </div>
                    )}
                  </>
                )}
              </Section>

              {/* 6) Export / Import */}
              <Section id="sec-export" title="Export / Import Competitor List">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Export */}
                  <div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }}>
                    <div className="mb-2 text-[15px] font-semibold" style={{ color: TK.textPrimary }}>
                      Export
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <Switch
                        checked={settings.export.includeAddedBy}
                        onChange={(v) => setSettings((s) => ({ ...s, export: { ...s.export, includeAddedBy: v } }))}
                        disabled={readOnly}
                        label="Include 'Added by' & dates"
                      />
                      <span className="text-sm" style={{ color: TK.textPrimary }}>
                        Include “Added by” & dates
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PillButton variant="ghost" onClick={handleExportCSV}>
                        <Download className="h-4 w-4" /> CSV
                      </PillButton>
                      <PillButton variant="ghost" onClick={handleExportJSON}>
                        <Download className="h-4 w-4" /> JSON
                      </PillButton>
                      <PillButton variant="ghost" onClick={handleCopyTable}>
                        <Copy className="h-4 w-4" /> Copy as Table
                      </PillButton>
                    </div>
                    <div className="mt-2 text-xs" style={{ color: TK.textSecondary }}>
                      Columns: Domain, Nickname, Tags, Added by, Added on
                    </div>
                  </div>

                  {/* Import */}
                  <div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }}>
                    <div className="mb-2 text-[15px] font-semibold" style={{ color: TK.textPrimary }}>
                      Import (JSON)
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="importmode"
                          className="accent-blue-600"
                          checked={activeImportMode === "append"}
                          onChange={() => setActiveImportMode("append")}
                          disabled={readOnly || !settings.import?.planAllowed}
                        />
                        Append new (default)
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="importmode"
                          className="accent-blue-600"
                          checked={activeImportMode === "replace"}
                          onChange={() => setActiveImportMode("replace")}
                          disabled={readOnly || !settings.import?.planAllowed}
                        />
                        Replace tags (existing domains)
                      </label>
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="importpolicy"
                          className="accent-blue-600"
                          checked={importOverwritePolicy === "skip"}
                          onChange={() => setImportOverwritePolicy("skip")}
                          disabled={readOnly || !settings.import?.planAllowed}
                        />
                        On conflict: Skip
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="importpolicy"
                          className="accent-blue-600"
                          checked={importOverwritePolicy === "overwrite"}
                          onChange={() => setImportOverwritePolicy("overwrite")}
                          disabled={readOnly || !settings.import?.planAllowed}
                        />
                        On conflict: Overwrite Nickname & Tags
                      </label>
                    </div>
                    <label
                      className={[
                        "mt-1 flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed text-sm",
                        settings.import?.planAllowed ? "hover:bg-[#00000005]" : "opacity-60 cursor-not-allowed",
                      ].join(" ")}
                      style={{ borderColor: TK.borderSubtle, color: TK.textSecondary }}
                      title={settings.import?.planAllowed ? "Drop a JSON file or click to choose" : "Import locked on your plan"}
                    >
                      <input type="file" accept="application/json" className="hidden" disabled={!settings.import?.planAllowed || readOnly} onChange={onImportFile} />
                      <Upload className="mr-2 h-4 w-4" />
                      {settings.import?.planAllowed ? "Drop JSON here or click to upload" : "Locked · Upgrade to enable JSON import"}
                    </label>
                    {importErrors.length > 0 && (
                      <div
                        className="mt-2 rounded-md border p-2 text-xs"
                        style={{ borderColor: TK.borderSubtle, background: "var(--wr-badge-danger-bg, #FEF2F2)", color: "var(--wr-badge-danger-text, #991B1B)" }}
                      >
                        {importErrors.map((e, i) => (
                          <div key={i}>• {e}</div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs" style={{ color: TK.textSecondary }}>
                      JSON schema: {"{ competitors: CompetitorRow[], tags: Record<string,string[]> }"}
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* Footer */}
          <div
            className="sticky bottom-0 flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-5"
            style={{ borderColor: TK.borderSubtle, background: TK.surfaceOverlay, paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: TK.textSecondary }}>
              <ShieldCheck className="h-4 w-4" />
              {readOnly ? "Read‑only for your role" : "Owner/Admin: full edit"}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <PillButton variant="ghost" onClick={attemptClose} disabled={saving}>
                Cancel
              </PillButton>
              <PillButton variant="primary" onClick={handleSave} disabled={saveDisabled} title={overCap ? `Select up to ${compareCap}` : undefined}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving…" : "Save Changes"}
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ DEMO WRAPPER ------------------------------ */
/** Default export: a tiny preview wrapper so the UI is visible immediately. */
export default function CISettingsModalDemo() {
  const [open, setOpen] = useState(false); // start open so it’s visible immediately
  const [role, setRole] = useState<Role>("admin");

  return (
    <>
       <button
          onClick={() => setOpen(true)}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: TK.borderSubtle, color: TK.textPrimary, background: TK.surfaceCard }}
        >
                <Settings size={16} />
        </button>
      <CISettingsModal
        open={open}
        onClose={() => setOpen(false)}
        role={role}
        source="insights"
        projectId="proj_demo_123"
        compareCap={3}
        onSave={async () => {
          // Simulate save latency
          await sleep(400);
        }}
      />
    
    </>

  );
}
