import React, { useEffect, useRef, useState } from "react";
import {
  Link2,
  Download,
  ClipboardPlus,
  ShieldOff,
  ListPlus,
  Plus,
  Clock,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Filter as FilterIcon,
  Users,
  UserRound,
  UserPlus,
  Globe,
} from "lucide-react";

/**
 * Backlinks Overview (Sub-panel) — Sticky Header
 * - Drop-in React + Tailwind + TSX component
 * - Inter / Inter Fallback font stack
 * - Branded icons (#008CCD) for Section title and Project Access
 * - Modern chips + Filters button (as per recent design system)
 * - Project selector chip uses site favicon + project name
 * - All clickable UI uses pointer cursor
 *
 * Exposed callbacks via props for integration:
 *   onExport, onCreateTask, onDisavow, onAddToTracker, onFindNewLink, onOpenFilters, onProjectChange
 */

// -----------------------------------------------------------------------------
// Design Tokens (aligned to latest palette)
// -----------------------------------------------------------------------------
const TOKENS = {
  // Brand
  brand: "#008CCD",
  brand600: "#007AB3",
  brand700: "#006C9E",
  brand50: "#E6F6FD",
  // Base / text
  text: "#0B1220",
  textMuted: "#5D6B82",
  // Surfaces / borders
  surface: "#FFFFFF",
  surfaceSubtle: "#F6F9FC",
  chipBg: "#F4F7FA",
  chipHover: "#EDF2F7",
  line: "#E6EAF0",
  // Danger
  danger: "#E03131",
  danger600: "#C92A2A",
  danger50: "#FFF2F2",
  // Focus
  focus: "#94D5F3",
};

const RADIUS = 10;
const BORDER = 1;

// -----------------------------------------------------------------------------
// Utils & Hooks
// -----------------------------------------------------------------------------
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

// Favicon helper
function getFavicon(project: string) {
  // Accept domain or URL; pull hostname if needed
  try {
    const host = project.includes("://") ? new URL(project).hostname : project;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${project}&sz=64`;
  }
}

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------
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
  const border = tone === "danger" ? TOKENS.danger : TOKENS.line;
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
  tone = "brand",
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "brand" | "danger";
}) {
  const [hover, setHover] = useState(false);
  const toneColor = tone === "danger" ? TOKENS.danger : TOKENS.brand;
  const hoverBg = tone === "danger" ? TOKENS.danger50 : TOKENS.brand50;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-10 px-3 text-[14px] font-medium rounded-md cursor-pointer"
      style={{
        color: toneColor,
        background: hover ? hoverBg : TOKENS.surface,
        border: `${BORDER}px solid ${toneColor}`,
      }}
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
      style={{
        background: hover ? TOKENS.brand600 : TOKENS.brand,
      }}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

function PillChip({
  label,
  active,
  onToggle,
  icon: Icon,
}: {
  label: string;
  active?: boolean;
  onToggle?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
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
      {Icon ? <Icon size={16} className="opacity-80" /> : null}
      <span>{label}</span>
    </button>
  );
}

function FiltersButton({
  count = 0,
  onClick,
}: {
  count?: number;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-9 px-3 text-[13px] font-medium rounded-full cursor-pointer"
      style={{
        background: hover ? TOKENS.brand50 : TOKENS.surface,
        border: `${BORDER}px solid ${TOKENS.brand}`,
        color: TOKENS.brand,
      }}
      aria-label={count > 0 ? `Filters (${count} active)` : "Filters"}
      title={count > 0 ? `Filters (${count} active)` : "Filters"}
    >
      <FilterIcon size={16} />
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

// -----------------------------------------------------------------------------
// Project Access control (branded icon #008CCD)
// -----------------------------------------------------------------------------
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
        className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px] rounded-md cursor-pointer"
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
          className="absolute z-50 mt-2 min-w-[240px] bg-white shadow-lg"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.line}` }}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => onChange?.({ ...value, mine: !value.mine })}
          >
            <UserRound size={16} style={{ color: TOKENS.brand }} />
            <span className="flex-1">My projects</span>
            <input type="checkbox" readOnly checked={value.mine} />
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => onChange?.({ ...value, shared: !value.shared })}
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

// -----------------------------------------------------------------------------
// Project Selector chip (favicon + name)
// -----------------------------------------------------------------------------
function ProjectChip({
  projectName,
  onProjectChange,
}: {
  projectName: string;
  onProjectChange?: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const fav = getFavicon(projectName);

  const projects = [
    projectName,
    "wranker.com",
    "vefogix.com",
    "site-demo.dev",
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 h-9 px-2.5 rounded-md cursor-pointer"
        style={{
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          border: `${BORDER}px solid ${TOKENS.line}`,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Select Project"
      >
        <img
          src={fav}
          alt={`${projectName} favicon`}
          className="h-4 w-4 rounded-sm"
          loading="lazy"
          decoding="async"
        />
        <span className="text-[13px] font-medium text-[#0F2B46]">{projectName}</span>
        <ExternalLink size={16} className="text-[#94A3B8]" />
        <ChevronDown size={16} className="text-[#94A3B8]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[260px] bg-white shadow-lg"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.line}` }}
        >
          {projects.map((p) => {
            const f = getFavicon(p);
            return (
              <button
                key={p}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onProjectChange?.(p);
                  setOpen(false);
                }}
                title={p}
              >
                <img src={f} alt="" className="h-4 w-4 rounded-sm" />
                <span className="flex-1 truncate">{p}</span>
                {p === projectName ? (
                  <span className="text-[11px] text-[#64748B]">current</span>
                ) : null}
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

// -----------------------------------------------------------------------------
// Overflow menu for mobile
// -----------------------------------------------------------------------------
function MoreMenu({
  onExport,
  onCreateTask,
  onDisavow,
  onAddToTracker,
}: {
  onExport?: () => void;
  onCreateTask?: () => void;
  onDisavow?: () => void;
  onAddToTracker?: () => void;
}) {
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
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
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
          className="absolute right-0 z-50 mt-2 min-w-[220px] bg-white shadow-lg"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.line}` }}
          role="menu"
        >
          <Item label="Export Report" icon={Download} onClick={onExport} />
          <Item label="Create Task" icon={ClipboardPlus} onClick={onCreateTask} />
          <Item label="Disavow Links" icon={ShieldOff} onClick={onDisavow} />
          <Item label="Add to Tracker" icon={ListPlus} onClick={onAddToTracker} />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Public Component
// -----------------------------------------------------------------------------
export function BacklinkOverviewHeader({
  projectName = "w3era.com",
  subtitle = "Monitor backlink strength, risks, and new opportunities",
  lastCrawl = new Date(),
  filtersCount = 0,
  onExport,
  onCreateTask,
  onDisavow,
  onAddToTracker,
  onFindNewLink,
  onOpenFilters,
  onProjectChange,
}: {
  projectName?: string;
  subtitle?: string;
  lastCrawl?: Date;
  filtersCount?: number;
  onExport?: () => void;
  onCreateTask?: () => void;
  onDisavow?: () => void;
  onAddToTracker?: () => void;
  onFindNewLink?: () => void;
  onOpenFilters?: () => void;
  onProjectChange?: (project: string) => void;
}) {
  const hasShadow = useStickyShadow(2);
  const lastCrawlLabel = lastCrawl.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Local demo state for chips (can be lifted if desired)
  const [chipNew, setChipNew] = useState(true);
  const [chipDofollow, setChipDofollow] = useState(true);
  const [chipLost, setChipLost] = useState(false);
  const [access, setAccess] = useState<{ mine: boolean; shared: boolean }>({ mine: true, shared: true });

  return (
    <header
      className="sticky top-0 z-50 border-b bg-white"
      style={{
        borderColor: TOKENS.line,
        boxShadow: hasShadow ? "0 1px 10px rgba(16,24,40,0.08)" : "none",
        fontFamily:
          'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
      aria-label="Backlinks Overview sub-panel header"
    >
      <div className="mx-auto w-full px-5 py-3 md:py-4">
        {/* Row 1 — Title + meta */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid size-9 place-items-center rounded-lg"
              style={{
                background: TOKENS.brand50,
                border: `${BORDER}px solid ${TOKENS.line}`,
              }}
            >
              <Link2 size={18} style={{ color: TOKENS.brand }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className="truncate text-[18px] md:text-[20px] font-semibold"
                  style={{ color: TOKENS.text }}
                >
                  Backlinks Overview
                </h1>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
                  style={{
                    background: TOKENS.surfaceSubtle,
                    border: `${BORDER}px solid ${TOKENS.line}`,
                    color: TOKENS.textMuted,
                  }}
                >
                  SUB‑PANEL
                </span>
              </div>
              <p className="mt-0.5 hidden sm:block text-[13px]" style={{ color: TOKENS.textMuted }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textMuted }}>
            <Clock className="size-4" />
            <span>Last Crawl: {lastCrawlLabel}</span>
          </div>
        </div>

        {/* Row 2 — Chips / Filters / Actions */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* Left: access + project + quick chips */}
          <div className="flex items-center gap-2">
            <ProjectAccess
              value={access}
              onChange={(v) => setAccess(v)}
            />
            <ProjectChip projectName={projectName} onProjectChange={onProjectChange} />

            <div className="hidden md:flex items-center gap-1.5">
              <PillChip label="New" active={chipNew} onToggle={() => setChipNew((s) => !s)} />
              <PillChip label="Dofollow" active={chipDofollow} onToggle={() => setChipDofollow((s) => !s)} />
              <PillChip label="Lost" active={chipLost} onToggle={() => setChipLost((s) => !s)} />
            </div>

            <FiltersButton count={filtersCount} onClick={onOpenFilters} />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Desktop / tablet */}
            <div className="hidden sm:flex items-center gap-2">
              <OutlineButton title="Export Report" icon={Download} onClick={onExport} />
              <OutlineButton title="Create Task" icon={ClipboardPlus} onClick={onCreateTask} />
              <OutlineButton title="Disavow Links" icon={ShieldOff} onClick={onDisavow} tone="danger" />
              <OutlineButton title="Add to Tracker" icon={ListPlus} onClick={onAddToTracker} />
              <PrimaryButton title="Find New Link" icon={Plus} onClick={onFindNewLink} />
            </div>

            {/* Mobile overflow */}
            <div className="flex sm:hidden items-center gap-2">
              <PrimaryButton title="Find New Link" icon={Plus} onClick={onFindNewLink} />
              <MoreMenu
                onExport={onExport}
                onCreateTask={onCreateTask}
                onDisavow={onDisavow}
                onAddToTracker={onAddToTracker}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// -----------------------------------------------------------------------------
// Optional: quick demo wrapper (safe to remove in production)
// -----------------------------------------------------------------------------
export default function BacklinksOverviewHeader() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout((flash as any)._t);
    (flash as any)._t = window.setTimeout(() => setToast(null), 1200);
  };

  return (
    <div className="min-h-screen bg-white">
      <BacklinkOverviewHeader
        projectName="w3era.com"
        filtersCount={2}
        onExport={() => flash("Export Report")}
        onCreateTask={() => flash("Create Task")}
        onDisavow={() => flash("Open Disavow Manager")}
        onAddToTracker={() => flash("Open Manual Link Tracker")}
        onFindNewLink={() => flash("Go to Opportunities")}
        onOpenFilters={() => flash("Open Filters")}
        onProjectChange={(p) => flash(`Switch to: ${p}`)}
      />

      {/* Mock content to show stickiness */}
      <main className="mx-auto max-w-6xl px-5 py-6 text-sm" style={{ color: TOKENS.textMuted }}>
        <p>Scroll to see sticky header shadow. Replace this area with the sub‑panel body.</p>
        <div className="h-[1200px]" />
      </main>

      {toast && (
        <div
          className="fixed bottom-4 right-4 shadow-lg rounded-md px-3 py-2 text-sm"
          style={{ background: TOKENS.text, color: "white" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
