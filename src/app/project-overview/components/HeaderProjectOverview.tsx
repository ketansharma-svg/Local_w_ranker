"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  RefreshCw,
  ClipboardPlus,
  Share2,
  BarChart3,
  Settings,
  ChevronDown,
  Globe,
  Laptop,
  Smartphone,
  CalendarDays,
  SlidersHorizontal,
  Check,
  Search,
  Info,
  Link as LinkIcon,
  Database,
} from "lucide-react";
import { ProjectSelector } from "@/src/components/common/project-selector";

/**
 * Wranker – Project Overview (Section 1)
 * Header, Project Selector & Global Filters (no tabs, no KPIs)
 * - No external UI deps; only React + lucide-react + Tailwind
 * - Matches Wranker tokens (2025-08-21), action order, chip patterns
 * - Includes Saved Views (local state), property chips, data freshness
 */

/* ----------------------- Design Tokens ----------------------- */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  pastelBrand: "#D9EEF8",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  darkerMuted: "#374151",
};
const RADIUS = 8;
const BORDER = 2;

/* ----------------------- Types ----------------------- */
type SourceKey = "ga4" | "gsc" | "crawler" | "backlinks";
type SourceMode = "all" | "ga4" | "gsc";
type DeviceMode = "all" | "desktop" | "mobile";
type CompareMode = "prev_period" | "prev_year";
type PresetRange = "last_7" | "last_28" | "last_90" | "last_180" | "last_365" | "custom";

export interface SourceStatus {
  connected: boolean;
  lastSynced?: Date;
  propertyName?: string; // e.g., GA4 property, GSC site
  needsMapping?: boolean;
}

export interface SourceStatuses {
  ga4: SourceStatus;
  gsc: SourceStatus;
  crawler: SourceStatus;
  backlinks: SourceStatus;
}

export type ProjectAccessSelection = { my: boolean; shared: boolean };

export interface FiltersState {
  dateRange: PresetRange;
  customFrom?: string; // ISO yyyy-mm-dd (only if dateRange === 'custom')
  customTo?: string;   // ISO yyyy-mm-dd (only if dateRange === 'custom')
  compare: CompareMode;
  device: DeviceMode;
  countries: string[]; // ISO country codes (e.g., ["US","GB"])
  sourceMode: SourceMode; // All / GA4 / GSC
  projectAccess: ProjectAccessSelection; // NEW: multi-select access
  savedView?: string; // name of saved view
}

export interface ProjectOverviewHeaderProps {
  /** Connection + freshness status per source */
  sources?: SourceStatuses;

  /** Default filters (optional) */
  defaultFilters?: Partial<FiltersState>;
onProjectChange?:any
  /** Callbacks (optional) */
  onFiltersChange?: (filters: FiltersState) => void;
  onSourceMapClick?: (source: SourceKey) => void; // open mapping/connect UI

  onCreateProject?: () => void;
  onExport?: () => void;
  onReCrawl?: () => void;
  onCreateTask?: () => void;
  onShare?: () => void;
  onAddToReports?: () => void;
  onSettings?: () => void;
}

/* ----------------------- Utilities ----------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function formatSync(d?: Date) {
  if (!d) return "Not synced";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Generic outside-click to close hook */
function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
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

/* ----------------------- Small Primitives ----------------------- */

function IconOnlyButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 36,
        width: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${TOKENS.border}`,
        background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-9 px-3 text-white"
      style={{ background: hover ? TOKENS.brandHover : TOKENS.brand, borderRadius: RADIUS }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

/** Segmented toggle (3 options max works best) */
function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: string; label: string; icon?: React.ComponentType<{ size?: number }> }[];
  value: string;
  onChange: (k: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden"
      style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
    >
      {options.map((o, idx) => {
        const isActive = value === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            className={classNames(
              "px-2.5 h-9 flex items-center gap-1.5 text-[13px]",
              idx > 0 && "border-l",
            )}
            style={{
              borderColor: TOKENS.border,
              background: isActive ? TOKENS.pastelBrand : TOKENS.chipBg,
              color: isActive ? TOKENS.brand : TOKENS.text,
            }}
            onClick={() => onChange(o.key)}
          >
            {Icon && <Icon size={16} />}
            <span className={isActive ? "font-semibold" : "font-medium"}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------- Project Selector ----------------------- */

/* ----------------------- Project Access (NEW) ----------------------- */

function accessLabel(v: ProjectAccessSelection) {
  if (v.my && v.shared) return "All";
  if (v.my) return "My Projects";
  if (v.shared) return "Shared Projects";
  return "Select Access";
}

function ProjectAccessChip({
  value,
  onChange,
}: {
  value: ProjectAccessSelection;
  onChange: (v: ProjectAccessSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  const allChecked = value.my && value.shared;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Project Access"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 px-3 py-1.5"
        style={{
          border: `${BORDER}px solid ${TOKENS.border}`,
          borderRadius: RADIUS,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        }}
      >
        <span className="inline-flex h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#008CCD,#4286F5)]" />
        <span className="text-[14px] font-medium" style={{ color: "#1E3A8A" }}>
          {accessLabel(value)}
        </span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[280px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="max-h-[260px] overflow-auto py-1">
            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange({ my: checked, shared: checked });
                }}
              />
              <span>All</span>
            </label>

            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value.my}
                onChange={(e) => onChange({ ...value, my: e.target.checked })}
              />
              <span>My Projects</span>
            </label>

            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value.shared}
                onChange={(e) => onChange({ ...value, shared: e.target.checked })}
              />
              <span>Shared Projects</span>
            </label>
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: TOKENS.border }}>
            <button
              className="text-sm underline"
              onClick={() => onChange({ my: true, shared: true })}
            >
              Select all
            </button>
            <button className="text-sm underline" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Property Mapping Chips ----------------------- */

function StatusDot({ status }: { status: SourceStatus }) {
  const color = !status.connected
    ? "#EF4444" // red
    : status.needsMapping
    ? "#F59E0B" // amber
    : "#10B981"; // green
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

function SourceChip({
  label,
  icon: Icon,
  status,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  status: SourceStatus;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={
        status.connected
          ? `${label}: ${status.propertyName ?? "Connected"} • ${formatSync(status.lastSynced)}`
          : `${label}: Not connected`
      }
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-1.5 h-9 px-2.5 text-[13px]"
      style={{
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${TOKENS.border}`,
        background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      <Icon size={16}  />
      <span className="font-medium">{label}</span>
      <StatusDot status={status} />
    </button>
  );
}

/* ----------------------- Data Freshness Badges ----------------------- */

function FreshnessBadge({ label, status }: { label: string; status: SourceStatus }) {
  const color =
    !status.connected ? TOKENS.muted : status.needsMapping ? "#F59E0B" : "#10B981";
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px]"
      style={{
        borderRadius: 999,
        border: `1px solid ${TOKENS.border}`,
        background: "#FFFFFF",
        color: TOKENS.darkerMuted,
      }}
      title={
        status.connected
          ? `${label}: ${formatSync(status.lastSynced)}`
          : `${label}: Not connected`
      }
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="font-medium">{label}</span>
      <span className="opacity-70">
        {status.connected ? formatSync(status.lastSynced) : "Not connected"}
      </span>
    </div>
  );
}

/* ----------------------- Filters: Date / Compare / Device / Country / Saved Views ----------------------- */

function DateRangePicker({
  value,
  onChange,
}: {
  value: PresetRange;
  onChange: (v: PresetRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const [hover, setHover] = useState(false);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Date range"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px]"
        style={{
          borderRadius: RADIUS,
          border: `${BORDER}px solid ${TOKENS.border}`,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          color: TOKENS.text,
        }}
      >
        <CalendarDays size={16} className="text-[#6B7280]" />
        <span className="font-medium">
          {value === "last_7" && "Last 7 days"}
          {value === "last_28" && "Last 28 days"}
          {value === "last_90" && "Last 90 days"}
          {value === "last_180" && "Last 180 days"}
          {value === "last_365" && "Last 365 days"}
          {value === "custom" && "Custom"}
        </span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[220px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          {([
            ["Last 7 days", "last_7"],
            ["Last 28 days", "last_28"],
            ["Last 90 days", "last_90"],
            ["Last 180 days", "last_180"],
            ["Last 365 days", "last_365"],
            ["Custom", "custom"],
          ] as [string, PresetRange][]).map(([label, key]) => (
            <button
              key={key}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparePicker({
  value,
  onChange,
}: {
  value: CompareMode;
  onChange: (v: CompareMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const [hover, setHover] = useState(false);
  const label = value === "prev_period" ? "Prev period" : "Prev year";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Compare"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px]"
        style={{
          borderRadius: RADIUS,
          border: `${BORDER}px solid ${TOKENS.border}`,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          color: TOKENS.text,
        }}
      >
        <SlidersHorizontal size={16} className="text-[#6B7280]" />
        <span className="font-medium">{label}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[180px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          {[
            ["Prev period", "prev_period"],
            ["Prev year", "prev_year"],
          ].map(([l, k]) => (
            <button
              key={k}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                onChange(k as CompareMode);
                setOpen(false);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DevicePicker({
  value,
  onChange,
}: {
  value: DeviceMode;
  onChange: (v: DeviceMode) => void;
}) {
  return (
    <Segmented
      ariaLabel="Device"
      value={value}
      onChange={(k) => onChange(k as DeviceMode)}
      options={[
        { key: "all", label: "All", icon: Globe },
        { key: "desktop", label: "Desktop", icon: Laptop },
        { key: "mobile", label: "Mobile", icon: Smartphone },
      ]}
    />
  );
}

function CountryPicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const [hover, setHover] = useState(false);
  const [query, setQuery] = useState("");
  const OPTIONS = useMemo(
    () =>
      [
        ["US", "United States"],
        ["GB", "United Kingdom"],
        ["IN", "India"],
        ["AU", "Australia"],
        ["CA", "Canada"],
        ["DE", "Germany"],
        ["FR", "France"],
        ["NL", "Netherlands"],
        ["SG", "Singapore"],
      ] as [string, string][],
    []
  );
  const filtered = OPTIONS.filter(([, name]) =>
    name.toLowerCase().includes(query.toLowerCase())
  );
  const label =
    values.length === 0 ? "All Countries" : `${values.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Country"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px]"
        style={{
          borderRadius: RADIUS,
          border: `${BORDER}px solid ${TOKENS.border}`,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          color: TOKENS.text,
        }}
      >
        <Globe size={16} className="text-[#6B7280]" />
        <span className="font-medium">{label}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[260px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="p-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center gap-2 bg-white rounded border px-2 py-1.5"
                 style={{ borderColor: TOKENS.border }}>
              <Search size={16} className="text-[#9CA3AF]" />
              <input
                className="w-full text-sm outline-none"
                placeholder="Search country"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-auto">
            {filtered.map(([code, name]) => {
              const checked = values.includes(code);
              return (
                <label
                  key={code}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...values, code]
                        : values.filter((c) => c !== code);
                      onChange(next);
                    }}
                  />
                  <span>{name}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t"
               style={{ borderColor: TOKENS.border }}>
            <button
              className="text-sm underline"
              onClick={() => onChange([])}
            >
              Select all
            </button>
            <button
              className="text-sm underline"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Saved Views ----------------------- */

function SavedViews({
  currentName,
  onSave,
  onLoad,
  views,
  onDelete,
  onSetDefault,
  defaultName,
}: {
  currentName?: string;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  views: string[];
  onDelete: (name: string) => void;
  onSetDefault: (name: string) => void;
  defaultName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const [hover, setHover] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Saved Views"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px]"
        style={{
          borderRadius: RADIUS,
          border: `${BORDER}px solid ${TOKENS.border}`,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
          color: TOKENS.text,
        }}
      >
        <Info size={16} className="text-[#6B7280]" />
        <span className="font-medium">{currentName ? `View: ${currentName}` : "Saved Views"}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[280px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="text-[12px]" style={{ color: TOKENS.muted }}>Save current filters as</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-full text-sm rounded border px-2 py-1.5 outline-none"
                style={{ borderColor: TOKENS.border }}
                placeholder="e.g., US • Desktop • Last 28d"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <PrimaryButton title="Save" onClick={() => { if (name.trim()) { onSave(name.trim()); setName(""); } }}>
                <Check className="size-4" />
              </PrimaryButton>
            </div>
          </div>

          <div className="max-h-[240px] overflow-auto">
            {views.length === 0 ? (
              <div className="px-3 py-3 text-sm" style={{ color: TOKENS.muted }}>
                No saved views yet.
              </div>
            ) : views.map((v) => (
              <div key={v} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                <button className="text-left" onClick={() => onLoad(v)}>
                  {v}{v === defaultName ? " • default" : ""}
                </button>
                <div className="flex items-center gap-2">
                  <button className="underline" onClick={() => onSetDefault(v)}>Set default</button>
                  <button className="underline text-red-600" onClick={() => onDelete(v)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Main Component ----------------------- */

export function ProjectOverviewHeader({
  sources = {
    ga4: { connected: false },
    gsc: { connected: false },
    crawler: { connected: false },
    backlinks: { connected: false },
  },
  defaultFilters,
  onProjectChange,
  onFiltersChange,
  onSourceMapClick,
  onCreateProject,
  onExport,
  onReCrawl,
  onCreateTask,
  onShare,
  onAddToReports,
  onSettings,
}: ProjectOverviewHeaderProps) {
  // Filters state
  const [filters, setFilters] = useState<FiltersState>({
    dateRange: defaultFilters?.dateRange ?? "last_28",
    compare: defaultFilters?.compare ?? "prev_period",
    device: defaultFilters?.device ?? "all",
    countries: defaultFilters?.countries ?? [],
    sourceMode: defaultFilters?.sourceMode ?? "all",
    projectAccess: defaultFilters?.projectAccess ?? { my: true, shared: true }, // NEW default = All
    savedView: defaultFilters?.savedView,
    customFrom: defaultFilters?.customFrom,
    customTo: defaultFilters?.customTo,
  });

  const [savedViews, setSavedViews] = useState<string[]>([]);
  const [defaultViewName, setDefaultViewName] = useState<string | undefined>(undefined);

  useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = <K extends keyof FiltersState>(k: K, v: FiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [k]: v }));
  };

  return (
    <div className="w-full" style={{ color: TOKENS.text }}>
      {/* Row 1: breadcrumb + data freshness */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 text-[14px] leading-tight">
          <span style={{ color: TOKENS.muted }}>SEO Dashboard</span>
          <span className="text-[#9CA3AF]">›</span>
          <span className="font-semibold" style={{ color: TOKENS.text }}>
            Project Overview
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FreshnessBadge label="GA4" status={sources.ga4} />
          <FreshnessBadge label="GSC" status={sources.gsc} />
          <FreshnessBadge label="Crawler" status={sources.crawler} />
          <FreshnessBadge label="Backlinks" status={sources.backlinks} />
        </div>
      </div>

      {/* Row 2: Access chip + Project selector + property chips + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">

          <ProjectSelector className="w-64" />

          {/* Property mapping chips */}
          <SourceChip
            label="GA4"
            icon={Database}
            status={sources.ga4}
            onClick={() => onSourceMapClick?.("ga4")}
          />
          <SourceChip
            label="GSC"
            icon={LinkIcon}
            status={sources.gsc}
            onClick={() => onSourceMapClick?.("gsc")}
          />
          <SourceChip
            label="Crawler"
            icon={RefreshCw}
            status={sources.crawler}
            onClick={() => onSourceMapClick?.("crawler")}
          />
          <SourceChip
            label="Backlinks"
            icon={Share2}
            status={sources.backlinks}
            onClick={() => onSourceMapClick?.("backlinks")}
          />
        </div>

        {/* Actions (exact order) */}
        <div className="flex items-center flex-wrap gap-2">
          <PrimaryButton title="Create Project" onClick={onCreateProject}>
            <Plus className="size-4" />
          </PrimaryButton>
          <IconOnlyButton title="Export" onClick={onExport}>
            <Upload className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Re-crawl" onClick={onReCrawl}>
            <RefreshCw className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Create Task" onClick={onCreateTask}>
            <ClipboardPlus className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Share" onClick={onShare}>
            <Share2 className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Add to Reports" onClick={onAddToReports}>
            <BarChart3 className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Settings" onClick={onSettings}>
            <Settings className="size-4" />
          </IconOnlyButton>
        </div>
      </div>

      {/* Separator */}
      <div className="mt-3" style={{ borderBottom: `${BORDER}px solid ${TOKENS.border}` }} />

      {/* Row 3: Global Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center flex-wrap gap-2">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(v) => setFilter("dateRange", v)}
          />
          <ComparePicker
            value={filters.compare}
            onChange={(v) => setFilter("compare", v)}
          />
          <DevicePicker
            value={filters.device}
            onChange={(v) => setFilter("device", v)}
          />
          <CountryPicker
            values={filters.countries}
            onChange={(v) => setFilter("countries", v)}
          />
          {/* Source toggle: All / GA4 / GSC */}
          <Segmented
            ariaLabel="Source"
            value={filters.sourceMode}
            onChange={(k) => setFilter("sourceMode", k as SourceMode)}
            options={[
              { key: "all", label: "All Sources" },
              { key: "ga4", label: "GA4" },
              { key: "gsc", label: "GSC" },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <SavedViews
            currentName={filters.savedView}
            views={savedViews}
            defaultName={defaultViewName}
            onSave={(name) => {
              setSavedViews((xs) => (xs.includes(name) ? xs : [...xs, name]));
              setFilter("savedView", name);
            }}
            onLoad={(name) => setFilter("savedView", name)}
            onDelete={(name) => {
              setSavedViews((xs) => xs.filter((x) => x !== name));
              if (filters.savedView === name) setFilter("savedView", undefined);
            }}
            onSetDefault={(name) => setDefaultViewName(name)}
          />
        </div>
      </div>

      <div className="mt-2" style={{ borderBottom: `${BORDER}px solid ${TOKENS.border}` }} />
    </div>
  );
}

/* ----------------------- Optional Demo Wrapper ----------------------- */
const DemoProjectOverviewHeader = (props: ProjectOverviewHeaderProps) => <ProjectOverviewHeader {...props} />;

export default DemoProjectOverviewHeader;
