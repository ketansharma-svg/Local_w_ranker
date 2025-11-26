"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchCheck, Upload, RefreshCcw, Zap, Download, Plus, Clock,
  ChevronDown, ExternalLink, MoreHorizontal, Users, UserRound, UserPlus, Globe,
  // New icons for right-side utilities + modals
  Bell, HelpCircle, Settings, X, Link2, AlertCircle, Check, FileSpreadsheet
} from "lucide-react";

/** ------------------------------------------------------------------
 * Backlinks Indexing (Sub-panel) — Sticky Header
 * - Updated per requirements:
 *   • Left-aligned Project Access & Project selector
 *   • Filters removed from header (render in body)
 *   • Right-side utility icon cluster (Docs / Help / Notifications / Settings)
 *   • Accessible modals for Submit URLs & Bulk Upload
 * ------------------------------------------------------------------ */

// Tokens (aligned to product tokens)
const TOKENS = {
  brand: "#008CCD",
  brand600: "#007BB8",
  brand50: "#E6F6FD",
  text: "#111827",
  textMuted: "#6B7280",
  surface: "#FFFFFF",
  surfaceSubtle: "#F5F7FA",
  chipBg: "#F4F7FA",
  chipHover: "#EDF2F7",
  line: "#E5E7EB",
  focus: "#4286F5",
};

const RADIUS = 10;
const BORDER = 1;

/* -------------------- Hooks -------------------- */
function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!isOpen) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isOpen, onClose]);
  return ref;
}

function useStickyShadow(offset = 2) {
  const [shadow, setShadow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShadow(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return shadow;
}

function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement>, onEscape: () => void) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const SEL =
      'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(SEL)).filter(el => !el.hasAttribute("inert"));
    // initial focus
    const els = getFocusable();
    (els[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const list = getFocusable();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef, onEscape]);

  // Freeze body scroll while active
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function getFavicon(project: string) {
  try {
    const host = project.includes("://") ? new URL(project).hostname : project;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return `https://www.google.com/s2/sfavicons?domain=${project}&sz=64`;
  }
}

/* -------------------- Primitives -------------------- */
function IconOnlyButton({
  title,
  onClick,
  tone = "neutral",
  children,
}: React.PropsWithChildren<{
  title: string;
  onClick?: () => void;
  tone?: "neutral" | "danger";
}>) {
  const [hover, setHover] = useState(false);
  const border = tone === "danger" ? "#E94134" : TOKENS.line;
  const bg = hover ? TOKENS.chipHover : TOKENS.chipBg;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="cursor-pointer"
      style={{
        height: 36,
        width: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${border}`,
        background: bg,
      }}
    >
      {children}
    </button>
  );
}

function OutlineButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-10 px-3 text-[14px] font-medium rounded-md cursor-pointer"
      style={{ color: TOKENS.brand, background: hover ? TOKENS.brand50 : TOKENS.surface, border: `${BORDER}px solid ${TOKENS.brand}` }}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

function PrimaryButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-10 px-3 text-white text-[14px] font-medium rounded-md cursor-pointer"
      style={{ background: hover ? TOKENS.brand600 : TOKENS.brand }}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

function PillChip({ label, active, onToggle }: { label: string; active?: boolean; onToggle?: () => void }) {
  const [hover, setHover] = useState(false);
  const bg = active ? TOKENS.brand50 : hover ? TOKENS.chipHover : TOKENS.chipBg;
  const border = active ? TOKENS.brand : TOKENS.line;
  const color = active ? TOKENS.brand : TOKENS.text;
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium rounded-full cursor-pointer"
      style={{ background: bg, border: `${BORDER}px solid ${border}`, color }}
      aria-pressed={!!active}
    >
      <span>{label}</span>
    </button>
  );
}

/** NOTE: FiltersButton is kept exported in case you want it in the BODY. */
export function FiltersButton({ count = 0, onClick }: { count?: number; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-9 px-3 text-[13px] font-medium rounded-full cursor-pointer"
      style={{ background: hover ? TOKENS.brand50 : TOKENS.surface, border: `${BORDER}px solid ${TOKENS.brand}`, color: TOKENS.brand }}
      aria-label={count > 0 ? `Filters (${count} active)` : "Filters"}
      title={count > 0 ? `Filters (${count} active)` : "Filters"}
    >
      {/* icon intentionally omitted here to avoid reimport noise; add back if desired */}
      <span className="hidden sm:inline">Filters</span>
      {count > 0 && (
        <span
          className="inline-flex items-center justify-center text-[11px] leading-none min-w-[18px] h-[18px] rounded-full px-1"
          style={{ background: TOKENS.brand, color: "#fff" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ProjectAccess({
  value = { mine: true, shared: true },
  onChange,
}: {
  value?: { mine: boolean; shared: boolean };
  onChange?: (v: { mine: boolean; shared: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const [hover, setHover] = useState(false);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center justify-start gap-2 h-9 px-2.5 text-[13px] rounded-md cursor-pointer text-left"
        style={{
          border: `${BORDER}px solid ${TOKENS.line}`,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          color: TOKENS.text,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Project Access"
      >
        <Users size={16} style={{ color: TOKENS.brand }} />
        <span>Project Access</span>
        <ChevronDown size={16} className="text-[#94A3B8]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[240px] bg-white shadow-lg text-left"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.line}` }}
        >
          <button
            className="w-full flex items-center justify-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer text-left"
            onClick={() => onChange?.({ ...value, mine: !value.mine })}
            role="menuitemcheckbox"
            aria-checked={value.mine}
          >
            <UserRound size={16} style={{ color: TOKENS.brand }} />
            <span className="flex-1">My projects</span>
            <input type="checkbox" readOnly checked={value.mine} />
          </button>
          <button
            className="w-full flex items-center justify-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer text-left"
            onClick={() => onChange?.({ ...value, shared: !value.shared })}
            role="menuitemcheckbox"
            aria-checked={value.shared}
          >
            <UserPlus size={16} style={{ color: TOKENS.brand }} />
            <span className="flex-1">Shared with me</span>
            <input type="checkbox" readOnly checked={value.shared} />
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectChip({ projectName, onProjectChange }: { projectName: string; onProjectChange?: (next: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const fav = getFavicon(projectName);
  const projects = [projectName, "wranker.com", "vefogix.com", "site-demo.dev"];
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center justify-start gap-2 h-9 px-2.5 rounded-md cursor-pointer text-left"
        style={{ background: hover ? TOKENS.chipHover : TOKENS.chipBg, border: `${BORDER}px solid ${TOKENS.line}` }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Select Project"
      >
        <img src={fav} alt={`${projectName} favicon`} className="h-4 w-4 rounded-sm" loading="lazy" decoding="async" />
        <span className="text-[13px] font-medium text-[#0F2B46]">{projectName}</span>
        <ExternalLink size={16} className="text-[#94A3B8]" />
        <ChevronDown size={16} className="text-[#94A3B8]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[260px] bg-white shadow-lg text-left"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.line}` }}
        >
          {projects.map((p) => {
            const f = getFavicon(p);
            return (
              <button
                key={p}
                className="w-full flex items-center justify-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer text-left"
                onClick={() => {
                  onProjectChange?.(p);
                  setOpen(false);
                }}
                title={p}
                role="menuitemradio"
                aria-checked={p === projectName}
              >
                <img src={f} alt="" className="h-4 w-4 rounded-sm" />
                <span className="flex-1 truncate">{p}</span>
                {p === projectName ? <span className="text-[11px] text-[#64748B]">current</span> : null}
              </button>
            );
          })}
          <div className="px-3 py-2 border-t" style={{ borderColor: TOKENS.line }}>
            <a
              href={`https://${projectName}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-[#0F2B46] hover:underline cursor-pointer"
              title="Open project"
            >
              <Globe size={16} className="text-[#64748B]" />
              <span>Open project</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreMenu({ onExport, onRetryFailed, onDocs }: { onExport?: () => void; onRetryFailed?: () => void; onDocs?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const Item = ({
    label,
    icon: Icon,
    onClick,
  }: {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    onClick?: () => void;
  }) => (
    <button
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer text-left"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      role="menuitem"
    >
      <Icon size={16} className="text-gray-600" />
      <span>{label}</span>
    </button>
  );
  return (
    <div className="relative" ref={ref}>
      <IconOnlyButton title="More" onClick={() => setOpen((s) => !s)}>
        <MoreHorizontal className="size-4" />
      </IconOnlyButton>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[220px] bg-white shadow-lg text-left"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.line}` }}
          role="menu"
        >
          <Item label="Export Report" icon={Download} onClick={onExport} />
          <Item label="Retry Failed URLs" icon={RefreshCcw} onClick={onRetryFailed} />
          <Item label="API Docs" icon={ExternalLink} onClick={onDocs} />
        </div>
      )}
    </div>
  );
}

/* -------------------- Modal shells & specific modals -------------------- */

function ModalShell({
  open,
  onClose,
  children,
  title,
  icon: Icon,
  labelledById,
  describedById,
  widthClass = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  icon?: React.ComponentType<{ size?: number ,color:any;}>;
  labelledById: string;
  describedById?: string;
  widthClass?: string;
}) {
  const panelRef = useRef<HTMLDivElement |any>(null);
  useFocusTrap(open, panelRef, onClose);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      aria-describedby={describedById}
      onClick={onClose}
      style={{ background: "rgba(17, 24, 39, 0.45)" }}
    >
      <div
        ref={panelRef}
        className={`w-full ${widthClass} rounded-xl bg-white shadow-2xl outline-none`}
        style={{ border: `${BORDER}px solid ${TOKENS.line}` }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: TOKENS.line }}>
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg" style={{ background: TOKENS.brand50, border: `${BORDER}px solid ${TOKENS.line}` }}>
              {Icon ? <Icon size={18} color={TOKENS.brand} /> : <Check size={18} color={TOKENS.brand} />}
            </div>
            <h2 id={labelledById} className="text-[16px] md:text-[18px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </h2>
          </div>
          <IconOnlyButton title="Close" onClick={onClose}>
            <X className="size-4" />
          </IconOnlyButton>
        </div>

        {/* Content */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function SubmitUrlsModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (urls: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [boost, setBoost] = useState<boolean>(false);

  const { valid, invalid, uniqueCount } = useMemo(() => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(lines));
    const urlRe = /^https?:\/\/.+/i;
    const valid = uniq.filter((u) => urlRe.test(u));
    const invalid = uniq.filter((u) => !urlRe.test(u));
    return { valid, invalid, uniqueCount: uniq.length };
  }, [text]);

  const handleSubmit = () => {
    if (valid.length === 0) return;
    // Consumers can read the "boost" toggle via a separate event if needed; here we just pass URLs.
    onSubmit?.(valid);
    onClose();
  };

  const pasteExamples = () => {
    setText([
      "https://example.com/article-1",
      "https://example.com/post-2",
      "https://blog.example.com/entry-3",
      "https://another-site.org/page",
    ].join("\n"));
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Submit URLs"
      icon={Link2}
      labelledById="submit-urls-title"
      describedById="submit-urls-desc"
      widthClass="max-w-3xl"
    >
      <div id="submit-urls-desc" className="text-[13px] mb-3" style={{ color: TOKENS.textMuted }}>
        Paste one URL per line. Non-HTTP(S) lines are flagged automatically.
      </div>

      <div className="grid gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://your-domain.com/path-1
https://your-domain.com/path-2"
          className="w-full min-h-[180px] rounded-md border p-3 text-[13px] outline-none"
          style={{ borderColor: TOKENS.line }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="inline-flex items-center gap-1">
              <Check size={14} className="text-green-600" />
              <strong>{valid.length}</strong> valid
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertCircle size={14} className="text-amber-600" />
              <strong>{invalid.length}</strong> invalid
            </span>
            <span className="text-[#94A3B8]">({uniqueCount} unique)</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer select-none">
              <input type="checkbox" checked={boost} onChange={(e) => setBoost(e.target.checked)} />
              <span>Send to “Boost” after submission</span>
            </label>
            <button
              type="button"
              onClick={pasteExamples}
              className="text-[13px] underline"
              style={{ color: TOKENS.brand }}
              title="Paste examples"
            >
              Paste examples
            </button>
            <button
              type="button"
              onClick={() => setText("")}
              className="text-[13px] underline"
              style={{ color: TOKENS.textMuted }}
              title="Clear"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-md text-[14px]"
            style={{ background: TOKENS.chipBg, border: `${BORDER}px solid ${TOKENS.line}` }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={valid.length === 0}
            className="h-10 px-4 rounded-md text-white text-[14px]"
            style={{ background: valid.length ? TOKENS.brand : "#94A3B8" }}
          >
            Submit {valid.length > 0 ? `(${valid.length})` : ""}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++; // escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      // handle CRLF
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }
  // flush last
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function BulkUploadModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (urls: string[], file?: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnIndex, setColumnIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const urlCandidates = useMemo(() => {
    if (!rows.length) return [];
    const header = rows[0].map((h) => (h ?? "").toLowerCase().trim());
    let idx = 0;
    const urlHeaderIndex = header.findIndex((h) => ["url", "link", "target", "page"].includes(h));
    if (urlHeaderIndex >= 0) idx = urlHeaderIndex;
    return rows.slice(1).map((r) => (r[idx] ?? "").trim());
  }, [rows]);

  const { valid, invalid, uniqueCount } = useMemo(() => {
    const urlRe = /^https?:\/\/.+/i;
    const uniq = Array.from(new Set(urlCandidates.filter(Boolean)));
    const valid = uniq.filter((u) => urlRe.test(u));
    const invalid = uniq.filter((u) => !urlRe.test(u));
    return { valid, invalid, uniqueCount: uniq.length };
  }, [urlCandidates]);

  const onPick = async (f: File) => {
    setError(null);
    setFile(f);
    const txt = await f.text();
    // If TXT, treat as one-URL-per-line
    if (/\.txt$/i.test(f.name)) {
      const lines = txt.split(/\r?\n/).map((l) => [l]);
      setRows([["url"], ...lines]);
      setColumnIndex(0);
      return;
    }
    // CSV with basic RFC4180 parsing
    const parsed = parseCSV(txt);
    if (parsed.length === 0) {
      setRows([]);
      setError("The file appears to be empty.");
      return;
    }
    setRows(parsed);
    setColumnIndex(0);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void onPick(f);
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) void onPick(f);
  };

  const downloadTemplate = () => {
    const csv = ["url", "https://example.com/article-1", "https://example.com/article-2"].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    if (!valid.length) return;
    onSubmit?.(valid, file ?? undefined);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Bulk Upload"
      icon={Upload}
      labelledById="bulk-upload-title"
      describedById="bulk-upload-desc"
      widthClass="max-w-3xl"
    >
      <div id="bulk-upload-desc" className="text-[13px] mb-3" style={{ color: TOKENS.textMuted }}>
        Upload a CSV (with a <code className="px-1 rounded-sm" style={{ background: TOKENS.surfaceSubtle, border: `${BORDER}px solid ${TOKENS.line}` }}>url</code> column) or a TXT with one URL per line.
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="grid place-items-center rounded-md border-2 border-dashed p-8 mb-3 text-center"
        style={{ borderColor: TOKENS.line, background: TOKENS.chipBg }}
      >
        <FileSpreadsheet className="mb-2" />
        <p className="text-[13px]" style={{ color: TOKENS.textMuted }}>
          Drag & drop your CSV/TXT here
        </p>
        <div className="mt-3">
          <label className="inline-flex items-center gap-2 h-10 px-3 rounded-md cursor-pointer" style={{ border: `${BORDER}px solid ${TOKENS.brand}`, color: TOKENS.brand, background: TOKENS.brand50 }}>
            <Upload size={16} />
            <span>Choose file</span>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={onFileChange} />
          </label>
        </div>
        <button type="button" onClick={downloadTemplate} className="mt-3 underline text-[13px]" style={{ color: TOKENS.brand }}>
          Download CSV template
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md border p-3 text-[13px]" style={{ borderColor: "#FECACA", background: "#FEF2F2", color: "#7F1D1D" }}>
          <AlertCircle size={16} />
          <div>{error}</div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-3">
          {/* Column picker (only if more than 1 column) */}
          {rows[0].length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[13px]" style={{ color: TOKENS.textMuted }}>
                URL column:
              </label>
              <select
                className="h-9 rounded-md border px-2 text-[13px] outline-none"
                style={{ borderColor: TOKENS.line }}
                value={columnIndex}
                onChange={(e) => setColumnIndex(Number(e.target.value))}
              >
                {rows[0].map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-md border overflow-hidden" style={{ borderColor: TOKENS.line }}>
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border-b" style={{ borderColor: TOKENS.line }}>
                    Preview (first 10)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice(1, 11)
                  .map((r, idx) => (r[columnIndex] ?? "").trim())
                  .map((cell, i) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 border-b truncate" style={{ borderColor: TOKENS.line }}>
                        {cell || <span className="text-[#94A3B8]">—</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Check size={14} className="text-green-600" />
                <strong>{valid.length}</strong> valid
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertCircle size={14} className="text-amber-600" />
                <strong>{invalid.length}</strong> invalid
              </span>
              <span className="text-[#94A3B8]">({uniqueCount} unique)</span>
            </div>
            {file && <div className="text-[#94A3B8]">File: <span className="font-mono">{file.name}</span></div>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-md text-[14px]"
              style={{ background: TOKENS.chipBg, border: `${BORDER}px solid ${TOKENS.line}` }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={valid.length === 0}
              className="h-10 px-4 rounded-md text-white text-[14px]"
              style={{ background: valid.length ? TOKENS.brand : "#94A3B8" }}
            >
              Upload {valid.length > 0 ? `(${valid.length})` : ""}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* -------------------- Public component -------------------- */
export function BacklinksIndexingSubpanelHeader({
  projectName = "w3era.com",
  subtitle = "Submit, boost, and track indexing status across sources",
  lastSync = new Date(),
  // filtersCount removed from visual header per requirement; keep prop if you want to pass down to body
  filtersCount = 0,
  onSubmitUrls,
  onBulkUpload,
  onRetryFailed,
  onReboost,
  onExport,
  onOpenFilters, // not used in header anymore
  onProjectChange,
  onOpenDocs,
}: {
  projectName?: string;
  subtitle?: string;
  lastSync?: Date;
  filtersCount?: number;
  onSubmitUrls?: (urls?: string[]) => void; // now receives URLs if provided
  onBulkUpload?: (urls?: string[], file?: File) => void; // now receives parsed URLs + original file
  onRetryFailed?: () => void;
  onReboost?: () => void;
  onExport?: () => void;
  onOpenFilters?: () => void;
  onProjectChange?: (project: string) => void;
  onOpenDocs?: () => void;
}) {
  const hasShadow = useStickyShadow(2);
  const lastSyncLabel = lastSync.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // demo chip state (can be lifted)
  const [chipQueued, setQueued] = useState(true);
  const [chipDiscovered, setDiscovered] = useState(true);
  const [chipIndexed, setIndexed] = useState(false);
  const [chipFailed, setFailed] = useState(false);
  const [chipBoosted, setBoosted] = useState(false);
  const [access, setAccess] = useState<{ mine: boolean; shared: boolean }>({ mine: true, shared: true });

  // modal state
  const [showSubmit, setShowSubmit] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b bg-white"
      style={{
        borderColor: TOKENS.line,
        boxShadow: hasShadow ? "0 1px 10px rgba(16,24,40,0.08)" : "none",
        fontFamily:
          'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
      aria-label="Backlinks Indexing sub-panel header"
    >
      <div className="mx-auto w-full px-5 py-3 md:py-4">
        {/* Row 1 — Title + meta */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg" style={{ background: TOKENS.brand50, border: `${BORDER}px solid ${TOKENS.line}` }}>
              <SearchCheck size={18} style={{ color: TOKENS.brand }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[18px] md:text-[20px] font-semibold" style={{ color: TOKENS.text }}>
                  Backlinks Indexing
                </h1>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
                  style={{ background: TOKENS.surfaceSubtle, border: `${BORDER}px solid ${TOKENS.line}`, color: TOKENS.textMuted }}
                >
                  SUBPANEL
                </span>
              </div>
              <p className="mt-0.5 hidden sm:block text-[13px]" style={{ color: TOKENS.textMuted }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textMuted }}>
            <Clock className="size-4" />
            <span>Last Sync: {lastSyncLabel}</span>
          </div>
        </div>

        {/* Row 2 — Left-aligned access + project + chips | Right: actions + required icons */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* Left: access + project + quick chips (LEFT-ALIGNED) */}
          <div className="flex items-center gap-2">
            <ProjectAccess value={access} onChange={(v) => setAccess(v)} />
            <ProjectChip projectName={projectName} onProjectChange={onProjectChange} />

            <div className="hidden md:flex items-center gap-1.5">
              <PillChip label="Queued" active={chipQueued} onToggle={() => setQueued((s) => !s)} />
              <PillChip label="Discovered" active={chipDiscovered} onToggle={() => setDiscovered((s) => !s)} />
              <PillChip label="Indexed" active={chipIndexed} onToggle={() => setIndexed((s) => !s)} />
              <PillChip label="Failed" active={chipFailed} onToggle={() => setFailed((s) => !s)} />
              <PillChip label="Boosted" active={chipBoosted} onToggle={() => setBoosted((s) => !s)} />
            </div>

            {/* ⛔ Filters removed from header by request — render <FiltersButton /> in the body section instead */}
          </div>

          {/* Right: primary actions + required utility icons */}
          <div className="flex items-center gap-2">
            {/* Desktop / tablet */}
            <div className="hidden sm:flex items-center gap-2">
              <OutlineButton title="Bulk Upload" icon={Upload} onClick={() => setShowBulk(true)} />
              <OutlineButton title="Retry Failed" icon={RefreshCcw} onClick={onRetryFailed} />
              <OutlineButton title="Re‑Boost" icon={Zap} onClick={onReboost} />
              <OutlineButton title="Export Report" icon={Download} onClick={onExport} />
              <PrimaryButton title="Submit URLs" icon={Plus} onClick={() => setShowSubmit(true)} />
            </div>

            {/* Required icons (right side) */}
            <div className="hidden sm:flex items-center gap-2 pl-1">
              <IconOnlyButton title="Docs" onClick={onOpenDocs}>
                <ExternalLink className="size-4" />
              </IconOnlyButton>
              <IconOnlyButton title="Help">
                <HelpCircle className="size-4" />
              </IconOnlyButton>
              <IconOnlyButton title="Notifications">
                <Bell className="size-4" />
              </IconOnlyButton>
              <IconOnlyButton title="Settings">
                <Settings className="size-4" />
              </IconOnlyButton>
              <MoreMenu onExport={onExport} onRetryFailed={onRetryFailed} onDocs={onOpenDocs} />
            </div>

            {/* Mobile overflow */}
            <div className="flex sm:hidden items-center gap-2">
              <PrimaryButton title="Submit URLs" icon={Plus} onClick={() => setShowSubmit(true)} />
              <MoreMenu onExport={onExport} onRetryFailed={onRetryFailed} onDocs={onOpenDocs} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SubmitUrlsModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmit={(urls) => {
          // Bubble up if parent needs these URLs
          onSubmitUrls?.(urls);
        }}
      />
      <BulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onSubmit={(urls, file) => {
          onBulkUpload?.(urls, file);
        }}
      />
    </header>
  );
}

export default BacklinksIndexingSubpanelHeader;
