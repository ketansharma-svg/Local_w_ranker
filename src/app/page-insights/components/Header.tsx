"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardPlus,
  Clock,
  Download,
  ExternalLink as ExternalLinkIcon,
  FileSpreadsheet,
  FileText,
  Grid3X3,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Upload,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Laptop,
  Smartphone,
  Tablet as TabletIcon,
  Globe,
} from "lucide-react";

/**
 * Wranker – Page Insights Panel
 * Header (refined) with live demo wrapper
 * - Inter / Inter Fallback fonts
 * - Branded (#008CCD) section icon
 * - Uses favicon in the Project chip
 * - Pointer cursor for interactive elements
 * - Modular chips + toggle switches (reference pattern)
 * - “Create project” button added (same style as Create task original)
 * - “Create task” now shows only icon; full label reveals on hover
 * - Tab navigation removed
 * - “Columns” & “Advanced Filters” icons removed from header bar
 */

/* -----------------------------------------------------------------------------
 * Tokens
 * ---------------------------------------------------------------------------*/
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastelBrand: "#D9EEF8",
  valueBlue: "#4286F5",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  textDarkerMuted: "#374151",
};
const RADIUS = 8;
const BORDER = 2;

/* -----------------------------------------------------------------------------
 * Hooks / utils
 * ---------------------------------------------------------------------------*/
function useOutsideClose(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!isOpen) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen, onClose]);
  return ref;
}

function formatStamp(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
function daysBetween(a?: string, b?: string) {
  if (!a || !b) return 0;
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/* -----------------------------------------------------------------------------
 * Tiny primitives
 * ---------------------------------------------------------------------------*/
function IconOnlyButton({
  title,
  onClick,
  disabled,
  children,
  badge,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      className="relative"
      style={{
        height: 36,
        width: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${TOKENS.borderLight}`,
        background: disabled ? "#F3F4F6" : hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: disabled ? "#9CA3AF" : TOKENS.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          aria-label={`${badge} applied`}
          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full text-[11px] leading-5 text-white text-center"
          style={{ background: "#EF4444" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** Solid primary button (original pattern) */
function PrimaryButton({
  title,
  children,
  onClick,
  disabled,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      className="inline-flex items-center gap-2 h-9 px-3 text-white"
      style={{
        background: disabled ? "#9CA3AF" : hover ? TOKENS.brandHover : TOKENS.brand,
        borderRadius: RADIUS,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

/** Primary button with label revealed on hover (for “Create Task”) */
function RevealPrimaryButton({
  icon,
  label,
  title,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      className="group inline-flex items-center h-9 pl-3 pr-2 text-white overflow-hidden"
      style={{
        gap: 8,
        background: disabled ? "#9CA3AF" : hover ? TOKENS.brandHover : TOKENS.brand,
        borderRadius: RADIUS,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color .15s ease",
      }}
    >
      {icon}
      <span
        className="text-sm font-medium whitespace-nowrap overflow-hidden"
        style={{
          maxWidth: hover ? 140 : 0,
          opacity: hover ? 1 : 0,
          transition: "max-width .18s ease, opacity .18s ease",
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** Modular chip button */
function ChipButton({
  title,
  children,
  onClick,
  active,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px]"
      style={{
        border: `${BORDER}px solid ${TOKENS.borderLight}`,
        borderRadius: RADIUS,
        background: active ? TOKENS.brand : hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: active ? "#FFFFFF" : TOKENS.text,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/** Toggle switch (reference style) */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full inline-flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-50"
      style={{ cursor: "pointer" }}
      title={label}
    >
      <span>{label}</span>
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: checked ? TOKENS.brand : "#D1D5DB" }}
      >
        <span
          className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * Context chips
 * ---------------------------------------------------------------------------*/
function ProjectChip({
  projectName = "wranker.com",
  faviconUrl,
}: {
  projectName?: string;
  faviconUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Select Project"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 px-3 py-1.5"
        style={{
          border: `${BORDER}px solid ${TOKENS.borderLight}`,
          borderRadius: RADIUS,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          cursor: "pointer",
        }}
      >
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt={`${projectName} favicon`}
            className="h-4 w-4 rounded"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className="inline-flex h-4 w-4 rounded bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#008CCD,#4286F5)]" />
        )}
        <span className="text-[14px] font-medium" style={{ color: "#1E3A8A" }}>
          {projectName}
        </span>
        <ExternalLinkIcon size={16} className="text-[#9CA3AF]" />
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[260px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
        >
          {["wranker.com (current)", "w3era.com", "vefogix.com", "—", "Open Project Settings", "Open in new tab"].map(
            (l, i) =>
              l === "—" ? (
                <div key={i} className="my-1" style={{ borderTop: `${BORDER}px solid ${TOKENS.borderLight}` }} />
              ) : (
                <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ cursor: "pointer" }}>
                  {l}
                </button>
              )
          )}
          <div className="p-2" style={{ borderTop: `${BORDER}px solid ${TOKENS.borderLight}` }}>
            <PrimaryButton title="Create Project">
              <Plus className="size-4" />
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectAccess() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [myProjects, setMyProjects] = useState(true);
  const [sharedWithMe, setSharedWithMe] = useState(true);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Project Access"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px]"
        style={{
          border: `${BORDER}px solid ${TOKENS.borderLight}`,
          borderRadius: RADIUS,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          color: TOKENS.text,
          cursor: "pointer",
        }}
      >
        <span>Project Access</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[240px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
        >
          <ToggleSwitch checked={myProjects} onChange={setMyProjects} label="My projects" />
          <ToggleSwitch checked={sharedWithMe} onChange={setSharedWithMe} label="Shared with me" />
        </div>
      )}
    </div>
  );
}

function SectionChip() {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState("All Sections");
  const ref = useOutsideClose(open, () => setOpen(false));
  const folders = ["All Sections", "/blog/", "/product/", "/services/", "/landing/"];
  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Section / Directory" onClick={() => setOpen((s) => !s)}>
        <Layers className="size-4 text-[#9CA3AF]" />
        <span>{folder}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ChipButton>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[220px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
        >
          {folders.map((f) => (
            <button
              key={f}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                setFolder(f);
                setOpen(false);
              }}
              style={{ cursor: "pointer" }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceChip({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const iconFor = (d: string) =>
    d === "Desktop" ? <Laptop className="size-4 text-[#9CA3AF]" /> : d === "Tablet" ? <TabletIcon className="size-4 text-[#9CA3AF]" /> : <Smartphone className="size-4 text-[#9CA3AF]" />;
  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Device" onClick={() => setOpen((s) => !s)}>
        <Grid3X3 className="size-4 text-[#9CA3AF]" />
        <span>{value}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ChipButton>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[200px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
        >
          {["Desktop", "Mobile", "Tablet"].map((d) => (
            <button
              key={d}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
              onClick={() => {
                onChange?.(d);
                setOpen(false);
              }}
              style={{ cursor: "pointer" }}
            >
              {iconFor(d)}
              {d}
              {value === d ? <span className="ml-auto text-[12px]" style={{ color: TOKENS.brand }}>Selected</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IndexingChip({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const options = ["All", "Indexed", "NonIndexed"];
  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Indexing" onClick={() => setOpen((s) => !s)}>
        <Search className="size-4 text-[#9CA3AF]" />
        <span>{value}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ChipButton>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[200px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                onChange?.(opt);
                setOpen(false);
              }}
              style={{ cursor: "pointer" }}
            >
              {opt} {value === opt ? "" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceChip({ label, connected = true }: { label: string; connected?: boolean }) {
  const tone = connected ? { bg: TOKENS.chipBg, fg: TOKENS.text } : { bg: "#FFFFFF", fg: TOKENS.textMuted };
  return (
    <div
      className="inline-flex items-center gap-1 h-9 px-2.5 text-[12px]"
      title={connected ? `${label} connected` : `${label} not connected`}
      style={{
        border: `${BORDER}px solid ${TOKENS.borderLight}`,
        borderRadius: RADIUS,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {connected ? <CheckCircle2 size={14} color="#10B981" /> : <XCircle size={14} color="#EF4444" />}
      <span>{label}</span>
    </div>
  );
}
function SourcesChipGroup({ sources }: { sources: { gsc: boolean; ga4: boolean; crawler: boolean; ext: boolean } }) {
  return (
    <div className="flex items-center gap-2">
      <SourceChip label="GSC" connected={sources.gsc} />
      <SourceChip label="GA4" connected={sources.ga4} />
      <SourceChip label="W‑Crawler" connected={sources.crawler} />
      <SourceChip label="Ext." connected={sources.ext} />
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Export dropdown
 * ---------------------------------------------------------------------------*/
function ExportDropdown({
  canXls,
  canPdf,
  onExport,
}: {
  canXls?: boolean;
  canPdf?: boolean;
  onExport?: (fmt: "csv" | "xls" | "pdf") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <IconOnlyButton title="Export" onClick={() => setOpen((s) => !s)}>
        <Upload className="size-4" />
      </IconOnlyButton>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[260px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
          role="menu"
        >
          <div className="px-3 py-2 text-[12px] font-semibold" style={{ color: TOKENS.textMuted }}>
            Page Insights — Exports
          </div>
          <button
            onClick={() => onExport?.("csv")}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            style={{ cursor: "pointer" }}
          >
            <FileText className="size-4" />
            Pages (CSV)
          </button>
          <button
            onClick={() => canXls && onExport?.("xls")}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            title={canXls ? "Export XLSX" : "Upgrade to unlock XLSX"}
            style={{ cursor: "pointer" }}
          >
            <FileSpreadsheet className="size-4" />
            Pages (XLS) {!canXls && <Lock className="size-4 ml-auto text-[#9CA3AF]" />}
          </button>
          <button
            onClick={() => canPdf && onExport?.("pdf")}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            title={canPdf ? "Export Overview PDF" : "Upgrade to unlock PDF"}
            style={{ cursor: "pointer" }}
          >
            <Download className="size-4" />
            Overview (PDF) {!canPdf && <Lock className="size-4 ml-auto text-[#9CA3AF]" />}
          </button>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Breadcrumb with branded section icon
 * ---------------------------------------------------------------------------*/
function Breadcrumb({ sectionTitle = "Page Insights" }: { sectionTitle?: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] leading-tight">
      <span style={{ color: TOKENS.textMuted }}>Projects</span>
      <span className="text-[#9CA3AF]">›</span>
      <span className="font-semibold inline-flex items-center gap-1.5" style={{ color: TOKENS.text }}>
        <BarChart3 className="h-4 w-4" color={TOKENS.brand} />
        {sectionTitle}
      </span>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Main Header (drop‑in)
 * ---------------------------------------------------------------------------*/
export function PageInsightsHeader({
  timestamps = { auditAt: "", gscAt: "", extAt: "" },
  device = "Mobile",
  onDeviceChange,
  indexing = "All",
  onIndexingChange,
  sources = { gsc: true, ga4: true, crawler: true, ext: true },
  onCreateTask,
  onCreateProject,
  onExport,
  canExportXls = false,
  canExportPdf = false,
  onRecrawl,
  canRecrawl = true,
  recrawlCooldownMs = 0,
  onShare,
  onAddToReports,
  onOpenSettings,
  projectName = "wranker.com",
  projectFavicon,
}: {
  timestamps?: { auditAt?: string; gscAt?: string; extAt?: string };
  device?: string;
  onDeviceChange?: (v: string) => void;
  indexing?: string;
  onIndexingChange?: (v: string) => void;
  sources?: { gsc: boolean; ga4: boolean; crawler: boolean; ext: boolean };
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  onExport?: (fmt: "csv" | "xls" | "pdf") => void;
  canExportXls?: boolean;
  canExportPdf?: boolean;
  onRecrawl?: () => void;
  canRecrawl?: boolean;
  recrawlCooldownMs?: number;
  onShare?: () => void;
  onAddToReports?: () => void;
  onOpenSettings?: () => void;
  projectName?: string;
  projectFavicon?: string;
}) {
  const nowIso = useMemo(() => new Date().toISOString(), []);
  const stale = timestamps?.auditAt ? daysBetween(timestamps.auditAt, nowIso) > 30 : true;
  const cooldownLabel = recrawlCooldownMs > 0 ? `Please wait ${Math.ceil(recrawlCooldownMs / 1000)}s` : "";

  return (
    <div
      className="w-full"
      style={{
        color: TOKENS.text,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Row 1: breadcrumb + freshness */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <Breadcrumb sectionTitle="Page Insights" />
        <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: TOKENS.textDarkerMuted }}>
          <div className="inline-flex items-center gap-2">
            <Clock className="size-4" />
            <span>
              <b>Last audited:</b> {formatStamp(timestamps.auditAt)}
            </span>
            {stale && (
              <span
                className="ml-2 px-2 py-0.5 text-[12px] rounded-full"
                style={{ background: "#F3F4F6", color: "#9CA3AF", border: `1px solid ${TOKENS.borderLight}` }}
              >
                Stale audit
              </span>
            )}
          </div>
          <div className="inline-flex items-center gap-2">
            <Clock className="size-4" />
            <span>
              <b>GSC synced:</b> {formatStamp(timestamps.gscAt)}
            </span>
          </div>
          <div className="inline-flex items-center gap-2">
            <Clock className="size-4" />
            <span>
              <b>External:</b> {formatStamp(timestamps.extAt)}
            </span>
          </div>
        </div>
      </div>
      {/* Row 2: context chips + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: context chips */}
        <div className="flex items-center gap-2">
          <ProjectAccess />
          <ProjectChip projectName={projectName} faviconUrl={projectFavicon} />
          <SectionChip />
          <DeviceChip value={device} onChange={onDeviceChange} />
          <IndexingChip value={indexing} onChange={onIndexingChange} />
          <SourcesChipGroup sources={sources} />
        </div>

        {/* Right: actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* New: Create Project (same design as original Create Task) */}
          <PrimaryButton title="Create Project" onClick={onCreateProject}>
            <Plus className="size-4" />
          </PrimaryButton>

          {/* Create Task → icon with hover-revealed label */}
          <RevealPrimaryButton
            icon={<ClipboardPlus className="size-4" />}
            label="Create Task"
            title="Create Task"
            onClick={onCreateTask}
          />

          <ExportDropdown canXls={canExportXls} canPdf={canExportPdf} onExport={onExport} />

          <IconOnlyButton
            title={canRecrawl ? "Re-crawl" : "Re-crawl (permission required)"}
            onClick={onRecrawl}
            disabled={!canRecrawl || recrawlCooldownMs > 0}
          >
            <RefreshCw className="size-4" aria-label={cooldownLabel} />
          </IconOnlyButton>

          <IconOnlyButton title="Share" onClick={onShare}>
            <Share2 className="size-4" />
          </IconOnlyButton>

          <IconOnlyButton title="Add to Reports" onClick={onAddToReports}>
            <BarChart3 className="size-4" />
          </IconOnlyButton>

          {/* Columns & Advanced Filters icons intentionally removed as requested */}

          <IconOnlyButton title="Settings" onClick={onOpenSettings}>
            <Settings className="size-4" />
          </IconOnlyButton>
        </div>
      </div>

      {/* Divider (kept subtle) */}
      <div className="mt-3" style={{ borderBottom: `${BORDER}px solid ${TOKENS.borderLight}` }} />
      {/* Tab navigation removed per requirement */}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Demo wrapper (optional)
 * ---------------------------------------------------------------------------*/
export default function DemoPageInsightsHeader() {
  const [device, setDevice] = useState("Mobile");
  const [indexing, setIndexing] = useState("All");
  const [cooldown, setCooldown] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1000 ? 0 : c - 1000)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const now = new Date();
  const iso = (d: Date) => d.toISOString();

  return (
    // <div
    //   className="min-h-screen w-full bg-white text-[14px]"
    //   style={{
    //     color: TOKENS.text,
    //     fontFamily:
    //       'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
    //   }}
    // >
    //   {/* Top brand bar */}
    //   <div className="w-full px-6 py-4 border-b" style={{ borderColor: TOKENS.borderLight, background: "#FFFFFF" }}>
    //     <div className="mx-auto max-w-6xl flex items-center justify-between">
    //       <div className="flex items-center gap-3">
    //         <div
    //           className="h-8 w-8 rounded-lg grid place-items-center"
    //           style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.borderLight}` }}
    //         >
    //           <BarChart3 className="h-4 w-4" color={TOKENS.brand} />
    //         </div>
    //         <span className="font-semibold">Wranker – Page Insights</span>
    //       </div>
    //       <div className="text-sm" style={{ color: TOKENS.textMuted }}>
    //         Demo canvas — Panel Header
    //       </div>
    //     </div>
    //   </div>

    //   {/* Page container */}
    //   <div className="mx-auto max-w-6xl px-6 py-6">
    //     <PageInsightsHeader
    //       timestamps={{
    //         auditAt: iso(new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)), // stale
    //         gscAt: iso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
    //         extAt: iso(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
    //       }}
    //       device={device}
    //       onDeviceChange={(d) => {
    //         setDevice(d);
    //         flash(`Device → ${d}`);
    //       }}
    //       indexing={indexing}
    //       onIndexingChange={(v) => {
    //         setIndexing(v);
    //         flash(`Indexing → ${v}`);
    //       }}
    //       sources={{ gsc: true, ga4: false, crawler: true, ext: true }}
    //       onCreateProject={() => flash("Create Project")}
    //       onCreateTask={() => flash("Create Task")}
    //       onExport={(fmt) => flash(`Export → ${fmt.toUpperCase()}`)}
    //       canExportPdf={false}
    //       canExportXls={true}
    //       onRecrawl={() => {
    //         flash("Re-crawl queued");
    //         setCooldown(6000);
    //       }}
    //       canRecrawl={true}
    //       recrawlCooldownMs={cooldown}
    //       onShare={() => flash("Link copied")}
    //       onAddToReports={() => flash("Added to Reports")}
    //       onOpenSettings={() => flash("Open Settings")}
    //       projectName="wranker.com"
    //       projectFavicon="/favicon.ico"
    //     />

    //     {/* Demo content */}
    //     <div className="mt-6 rounded-lg border p-6" style={{ borderColor: TOKENS.borderLight, background: "#FAFCFE" }}>
    //       <div className="text-sm" style={{ color: TOKENS.textDarkerMuted }}>
    //         Body content goes here…
    //       </div>
    //       <div className="mt-3 text-[13px]" style={{ color: TOKENS.textMuted }}>
    //         This area represents the panel body. The header above implements all requested refinements.
    //       </div>
    //     </div>
    //   </div>

    //   {/* Tiny toast */}
    //   {toast && (
    //     <div className="fixed bottom-4 right-4 shadow-lg rounded-md px-3 py-2 text-sm" style={{ background: TOKENS.text, color: "white" }}>
    //       {toast}
    //     </div>
    //   )}
    // </div>
  
      <div className="mx-auto w-full px-6 py-6">
        <PageInsightsHeader
          timestamps={{
            auditAt: iso(new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)), // stale
            gscAt: iso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
            extAt: iso(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
          }}
          device={device}
          onDeviceChange={(d) => {
            setDevice(d);
            flash(`Device → ${d}`);
          }}
          indexing={indexing}
          onIndexingChange={(v) => {
            setIndexing(v);
            flash(`Indexing → ${v}`);
          }}
          sources={{ gsc: true, ga4: false, crawler: true, ext: true }}
          onCreateProject={() => flash("Create Project")}
          onCreateTask={() => flash("Create Task")}
          onExport={(fmt) => flash(`Export → ${fmt.toUpperCase()}`)}
          canExportPdf={false}
          canExportXls={true}
          onRecrawl={() => {
            flash("Re-crawl queued");
            setCooldown(6000);
          }}
          canRecrawl={true}
          recrawlCooldownMs={cooldown}
          onShare={() => flash("Link copied")}
          onAddToReports={() => flash("Added to Reports")}
          onOpenSettings={() => flash("Open Settings")}
          projectName="wranker.com"
          projectFavicon="/favicon.ico"
        />
      </div>
);
}

