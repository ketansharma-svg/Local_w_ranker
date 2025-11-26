"use client";

/* =============================================================================
   Page Analyzer Drawer · Page Organic Insights
   Tab 4 — Backlinks (Single Page) · HEADER SECTION ONLY
   -----------------------------------------------------------------------------
   - Inter / Inter Fallback fonts; no emoji
   - Latest tokens (consistent with recent designs)
   - Branded #008CCD icons for header title & action types
   - Modular CTAs in header: Export (CSV free; XLSX/PDF Pro), Assign Task,
     Open Link Explorer, Close
   - Sticky Filters row with modern chips:
     Date range, Status, Attribute, Link type, DA range, TLD, Country, Language,
     One link per domain, Anchor contains…, Internal vs External
   - Pointer cursor on interactive controls
   - Drop‑in TSX; no external UI deps (uses lucide-react + Tailwind)
   - Emits `onFiltersChange` with full filter state
   ============================================================================ */

import * as React from "react";
import {
  Link2,
  Download,
  ClipboardCheck,
  ExternalLink,
  X,
  Info,
  SlidersHorizontal,
  Calendar,
  ChevronDown,
  Check,
  Lock,
  Gauge,
  Globe,
  Languages,
  Filter,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS (align with recent designs)
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  action: "#0077FF",
  pastel: "#D9EEF8",

  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",

  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

/* -----------------------------------------------------------------------------
 * TYPES
 * ---------------------------------------------------------------------------*/
type DateRange = "30d" | "90d" | "180d" | "custom";
type Status = "all" | "active" | "lost";
type AttrKey = "follow" | "nofollow" | "sponsored" | "ugc";
type LinkType = "text" | "image" | "redirect" | "js";
type Scope = "external" | "internal" | "both";

export type BacklinksHeaderFilters = {
  dateRange: DateRange;
  customFrom?: string; // yyyy-mm-dd
  customTo?: string;   // yyyy-mm-dd

  status: Status;
  attributes: AttrKey[]; // multi
  linkTypes: LinkType[]; // multi

  daMin: number; // 0..100
  daMax: number; // 0..100

  tlds: string[];     // multi
  countries: string[];// multi (ISO2)
  languages: string[];// multi (ISO, e.g., en, de)

  onePerDomain: boolean;
  anchorIncludes: string;
  scope: Scope; // internal vs external
};

export type BacklinksHeaderProps = {
  url: string;                        // resolved page URL (canonicalized)
  canonicalUrl?: string | null;       // if different from `url`, shows hint
  isPro?: boolean;                    // export gating
  onClose?: () => void;
  onAssignTask?: () => void;
  onOpenExplorer?: () => void;
  onExport?: (type: "csv" | "xlsx" | "pdf") => void;
  onFiltersChange?: (filters: BacklinksHeaderFilters) => void;
  initialFilters?: Partial<BacklinksHeaderFilters>;
  className?: string;
};

/* -----------------------------------------------------------------------------
 * UTILS
 * ---------------------------------------------------------------------------*/
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const domainOf = (url: string) => {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/* -----------------------------------------------------------------------------
 * SMALL ATOMS
 * ---------------------------------------------------------------------------*/
function Chip({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm",
        active ? "bg-[#D9EEF8] font-medium" : "bg-white hover:bg-gray-50"
      )}
      style={{ borderColor: TK.border, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

function SplitButton({
  label,
  icon,
  onPrimary,
  menu,
  disabled,
  title,
}: {
  label: string;
  icon?: React.ReactNode;
  onPrimary?: () => void;
  menu?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={onPrimary}
        disabled={disabled}
        title={title}
        className="inline-flex items-center gap-2 rounded-l-full border-y border-l px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
      >
        {icon}
        {label}
      </button>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="rounded-r-full border px-2 py-1.5 hover:bg-gray-50"
        style={{ borderColor: TK.border, cursor: "pointer" }}
      >
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[110%] z-50 min-w-[220px] rounded-md border bg-white p-1 shadow"
          style={{ borderColor: TK.border }}
        >
          {menu}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  icon,
  hint,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-[#F7FAFC] disabled:opacity-50"
      style={{ cursor: "pointer", color: TK.text }}
      role="menuitem"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      {hint}
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * FILTER POPOVER (generic)
 * ---------------------------------------------------------------------------*/
function Popover({
  button,
  children,
  align = "left",
  onOpenChange,
}: {
  button: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => { setOpen((s) => !s); onOpenChange?.(!open); }} style={{ cursor: "pointer" }}>
        {button}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[320px] rounded-md border bg-white p-3 shadow",
            align === "right" ? "right-0" : "left-0"
          )}
          style={{ borderColor: TK.border }}
          role="dialog"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * MAIN HEADER COMPONENT
 * ---------------------------------------------------------------------------*/
const DEFAULT_FILTERS: BacklinksHeaderFilters = {
  dateRange: "30d",
  status: "all",
  attributes: ["follow", "nofollow", "sponsored", "ugc"],
  linkTypes: ["text", "image", "redirect", "js"],
  daMin: 0,
  daMax: 100,
  tlds: [],
  countries: [],
  languages: [],
  onePerDomain: false,
  anchorIncludes: "",
  scope: "external",
};

export default function BacklinksHeader({
  url,
  canonicalUrl,
  isPro = false,
  onClose,
  onAssignTask,
  onOpenExplorer,
  onExport,
  onFiltersChange,
  initialFilters,
  className,
}: BacklinksHeaderProps) {
  const [filters, setFilters] = React.useState<BacklinksHeaderFilters>({
    ...DEFAULT_FILTERS,
    ...(initialFilters || {}),
  });

  React.useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const isCanonHint = canonicalUrl && canonicalUrl !== url;

  const exportMenu = (
    <div>
      <MenuItem
        icon={<Download size={16} color={TK.brand} />}
        onClick={() => onExport ? onExport("csv") : alert("[demo] Export CSV")}
      >
        CSV <span className="ml-2 text-xs" style={{ color: TK.gray }}>(Free)</span>
      </MenuItem>
      <MenuItem
        icon={<Download size={16} color={TK.brand} />}
        onClick={() =>
          isPro
            ? onExport
              ? onExport("xlsx")
              : alert("[demo] Export XLSX (Pro)")
            : alert("XLSX export is Pro. Upgrade to unlock.")
        }
        hint={!isPro ? <Lock size={14} className="text-[#9CA3AF]" /> : null}
      >
        XLSX <span className="ml-2 text-xs" style={{ color: TK.gray }}>(Pro)</span>
      </MenuItem>
      <MenuItem
        icon={<Download size={16} color={TK.brand} />}
        onClick={() =>
          isPro
            ? onExport
              ? onExport("pdf")
              : alert("[demo] Export PDF (Pro)")
            : alert("PDF export is Pro. Upgrade to unlock.")
        }
        hint={!isPro ? <Lock size={14} className="text-[#9CA3AF]" /> : null}
      >
        PDF <span className="ml-2 text-xs" style={{ color: TK.gray }}>(Pro)</span>
      </MenuItem>
    </div>
  );

  // Helpers to mutate filters
  const toggleInArray = <T extends string>(arr: T[], key: T): T[] =>
    arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];

  const update = <K extends keyof BacklinksHeaderFilters>(k: K, v: BacklinksHeaderFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const dateLabel =
    filters.dateRange === "custom" && filters.customFrom && filters.customTo
      ? `Custom ${filters.customFrom} → ${filters.customTo}`
      : filters.dateRange.toUpperCase();

  return (
    <section
      className={cn("rounded-[12px] border bg-white mt-4", className)}
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        {/* Left: Title + scope */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link2 size={20} color={TK.brand} />
            <h2 className="truncate text-[18px] font-semibold" style={{ color: TK.text }}>
              Backlinks
            </h2>
            <button
              type="button"
              className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
              title="Context: inbound links to this exact URL (canonical resolved)."
              aria-label="About"
              style={{ cursor: "pointer" }}
            >
              <Info size={16} />
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]" style={{ color: TK.muted }}>
            <span className="truncate">
              <strong className="font-medium" style={{ color: TK.text }}>
                URL:
              </strong>{" "}
              {url}
            </span>
            <span className="hidden sm:block">•</span>
            <span>Scope: inbound links to this exact URL</span>
            {isCanonHint && (
              <>
                <span className="hidden sm:block">•</span>
                <span className="inline-flex items-center gap-1">
                  <Info size={14} color={TK.gray} />
                  Some links consolidate to canonical{" "}
                  <a
                    className="underline"
                    href={canonicalUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: TK.action }}
                  >
                    {canonicalUrl}
                  </a>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Modular CTAs */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SplitButton
            label="Export"
            icon={<Download size={16} color={TK.brand} />}
            onPrimary={() => (onExport ? onExport("csv") : alert("[demo] Export CSV"))}
            menu={exportMenu}
            title="Export data"
          />
          <button
            type="button"
            onClick={() => (onAssignTask ? onAssignTask() : alert("[demo] Assign Task"))}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            title="Assign Task"
          >
            <ClipboardCheck size={16} color={TK.brand} />
            Assign Task
          </button>
          <button
            type="button"
            onClick={() => (onOpenExplorer ? onOpenExplorer() : window.open(`https://www.google.com/search?q=link:${encodeURIComponent(url)}`, "_blank"))}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            title="Open Link Explorer"
          >
            <ExternalLink size={16} color={TK.brand} />
            Open Link Explorer
          </button>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : undefined)}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            title="Close"
          >
            <X size={16} color={TK.brand} />
            Close
          </button>
        </div>
      </div>

      {/* Sticky Filters row */}
      <div
        className="sticky top-0 z-40 border-t border-b bg-white/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/70"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range */}
          <Popover
            align="left"
            button={
              <Chip active title="Date range">
                <Calendar size={16} />
                {dateLabel}
              </Chip>
            }
          >
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {(["30d", "90d", "180d"] as DateRange[]).map((r) => (
                  <button
                    key={r}
                    className={cn(
                      "rounded border px-2 py-1.5 text-sm",
                      filters.dateRange === r ? "bg-[#D9EEF8] font-medium" : "hover:bg-[#F7FAFC]"
                    )}
                    style={{ borderColor: TK.border, cursor: "pointer" }}
                    onClick={() => update("dateRange", r)}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
                <button
                  className={cn(
                    "rounded border px-2 py-1.5 text-sm",
                    filters.dateRange === "custom" ? "bg-[#D9EEF8] font-medium" : "hover:bg-[#F7FAFC]"
                  )}
                  style={{ borderColor: TK.border, cursor: "pointer" }}
                  onClick={() => update("dateRange", "custom")}
                >
                  Custom
                </button>
              </div>
              {filters.dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: TK.muted }}>
                      From
                    </label>
                    <input
                      type="date"
                      value={filters.customFrom || ""}
                      onChange={(e) => update("customFrom", e.target.value)}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      style={{ borderColor: TK.border }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: TK.muted }}>
                      To
                    </label>
                    <input
                      type="date"
                      value={filters.customTo || ""}
                      onChange={(e) => update("customTo", e.target.value)}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      style={{ borderColor: TK.border }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Popover>

          {/* Status */}
          <Popover
            button={
              <Chip title="Status">
                <Filter size={16} />
                Status: {filters.status === "all" ? "All" : filters.status === "active" ? "Active" : "Lost"}
              </Chip>
            }
          >
            <div className="grid gap-1">
              {(["all", "active", "lost"] as Status[]).map((s) => (
                <label key={s} className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-[#F7FAFC]">
                  <span className="text-sm" style={{ color: TK.text }}>
                    {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
                  </span>
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === s}
                    onChange={() => update("status", s)}
                  />
                </label>
              ))}
            </div>
          </Popover>

          {/* Attributes */}
          <Popover
            button={
              <Chip title="Rel attributes">
                <SlidersHorizontal size={16} />
                Attributes
              </Chip>
            }
          >
            <div className="grid grid-cols-2 gap-1">
              {(["follow", "nofollow", "sponsored", "ugc"] as AttrKey[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-[#F7FAFC]">
                  <span className="text-sm">{k === "ugc" ? "UGC" : k[0].toUpperCase() + k.slice(1)}</span>
                  <input
                    type="checkbox"
                    checked={filters.attributes.includes(k)}
                    onChange={() => update("attributes", toggleInArray(filters.attributes, k))}
                  />
                </label>
              ))}
            </div>
          </Popover>

          {/* Link Types */}
          <Popover
            button={
              <Chip title="Link types">
                <SlidersHorizontal size={16} />
                Types
              </Chip>
            }
          >
            <div className="grid grid-cols-2 gap-1">
              {(["text", "image", "redirect", "js"] as LinkType[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-[#F7FAFC]">
                  <span className="text-sm">{k === "js" ? "JS" : k[0].toUpperCase() + k.slice(1)}</span>
                  <input
                    type="checkbox"
                    checked={filters.linkTypes.includes(k)}
                    onChange={() => update("linkTypes", toggleInArray(filters.linkTypes, k))}
                  />
                </label>
              ))}
            </div>
          </Popover>

          {/* DA Range */}
          <Popover
            button={
              <Chip title="Domain Authority range">
                <Gauge size={16} />
                DA {filters.daMin}–{filters.daMax}
              </Chip>
            }
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs" style={{ color: TK.muted }}>
                    Min
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={filters.daMin}
                    onChange={(e) => update("daMin", clamp(Number(e.target.value || 0), 0, filters.daMax))}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: TK.border }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: TK.muted }}>
                    Max
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={filters.daMax}
                    onChange={(e) => update("daMax", clamp(Number(e.target.value || 0), filters.daMin, 100))}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: TK.border }}
                  />
                </div>
              </div>
              <div className="text-xs" style={{ color: TK.muted }}>
                0–10, 11–30, 31–50, 51–70, 71–100 buckets are derived from this range.
              </div>
            </div>
          </Popover>

          {/* TLD */}
          <Popover
            button={
              <Chip title="Top-level domains">
                <Globe size={16} />
                TLD
                {filters.tlds.length ? <span className="rounded bg-[#F3F4F6] px-1 text-xs">{filters.tlds.length}</span> : null}
              </Chip>
            }
          >
            <MultiList
              allItems={[".com", ".org", ".net", ".io", ".co.uk", ".de", ".fr", ".es", ".in", ".au"]}
              selected={filters.tlds}
              onChange={(list) => update("tlds", list)}
            />
          </Popover>

          {/* Country */}
          <Popover
            button={
              <Chip title="Countries">
                <Globe size={16} />
                Country
                {filters.countries.length ? <span className="rounded bg-[#F3F4F6] px-1 text-xs">{filters.countries.length}</span> : null}
              </Chip>
            }
          >
            <MultiList
              allItems={["US", "UK", "DE", "FR", "ES", "IN", "CA", "AU", "NL", "BR"]}
              selected={filters.countries}
              onChange={(list) => update("countries", list)}
            />
          </Popover>

          {/* Language */}
          <Popover
            button={
              <Chip title="Languages">
                <Languages size={16} />
                Lang
                {filters.languages.length ? <span className="rounded bg-[#F3F4F6] px-1 text-xs">{filters.languages.length}</span> : null}
              </Chip>
            }
          >
            <MultiList
              allItems={["en", "de", "fr", "es", "it", "pt", "pl", "nl", "sv"]}
              selected={filters.languages}
              onChange={(list) => update("languages", list)}
            />
          </Popover>

          {/* One link / domain */}
          <Chip
            active={filters.onePerDomain}
            onClick={() => update("onePerDomain", !filters.onePerDomain)}
            title="One link per domain"
          >
            <Check size={16} color={filters.onePerDomain ? TK.brand : TK.gray} />
            One / domain
          </Chip>

          {/* Anchor contains */}
          <div className="relative">
            <input
              value={filters.anchorIncludes}
              onChange={(e) => update("anchorIncludes", e.target.value)}
              placeholder="Anchor contains…"
              className="h-9 w-[220px] rounded-full border px-3 text-sm outline-none"
              style={{ borderColor: TK.border, color: TK.text }}
            />
          </div>

          {/* Scope (Internal vs External) — secondary */}
          <Popover
            align="right"
            button={
              <Chip title="Link scope">
                <SlidersHorizontal size={16} />
                {filters.scope === "external" ? "External" : filters.scope === "internal" ? "Internal" : "Both"}
              </Chip>
            }
          >
            <div className="grid gap-1">
              {(["external", "internal", "both"] as Scope[]).map((s) => (
                <label key={s} className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-[#F7FAFC]">
                  <span className="text-sm">{s[0].toUpperCase() + s.slice(1)}</span>
                  <input type="radio" name="scope" checked={filters.scope === s} onChange={() => update("scope", s)} />
                </label>
              ))}
            </div>
          </Popover>

          {/* Reset */}
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
            title="Reset filters"
          >
            <SlidersHorizontal size={16} />
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * MULTI LIST (checkbox list for TLD / Country / Language)
 * ---------------------------------------------------------------------------*/
function MultiList({
  allItems,
  selected,
  onChange,
}: {
  allItems: string[];
  selected: string[];
  onChange: (list: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const items = React.useMemo(() => {
    if (!query) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((x) => x.toLowerCase().includes(q));
  }, [allItems, query]);

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded border px-2 py-1.5 text-sm"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ borderColor: TK.border }}
      />
      <div className="max-h-[220px] overflow-auto rounded border" style={{ borderColor: TK.borderLight }}>
        {items.map((it) => (
          <label
            key={it}
            className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-sm hover:bg-[#F7FAFC]"
            title={it}
          >
            <span className="truncate">{it}</span>
            <input type="checkbox" checked={selected.includes(it)} onChange={() => toggle(it)} />
          </label>
        ))}
        {items.length === 0 && (
          <div className="p-2 text-center text-sm" style={{ color: TK.muted }}>
            No matches
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: TK.muted }}>
            {selected.length} selected
          </div>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer" }}
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
