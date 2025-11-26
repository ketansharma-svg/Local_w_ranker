"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  RefreshCw,
  ClipboardPlus,
  Share2,
  BarChart3,
  Settings,
  ExternalLink as ExternalLinkIcon,
  ChevronDown,
  Globe,
  Laptop,
  Smartphone,
  CalendarDays,
  SlidersHorizontal,
  Check,
  Search,
  Info,
} from "lucide-react";
import Demo_ProjectSummarySection from "./widgets/ProjectSummarySection";
import ProjectDirectoryQuickPeek from "./widgets/ProjectDirectoryQuickPeek";
import DemoPrioritizationMatrix from "./widgets/DemoPrioritizationMatrix";
import DemoTopMoversLaggardsSection from "./widgets/DemoTopMoversLaggardsSection";
import Demo_RiskAnomaliesCenter from "./widgets/RiskAnomaliesCenter";
import Demo_ContentPipelineSnapshot from "./widgets/ContentPipelineSnapshot";
import KeywordsPulseAllProjects from "./widgets/KeywordsPulseAllProjects";
import BacklinkAuthoritySection from "./widgets/BacklinkAuthoritySection";
import CrawlPageExperienceSummary from "./widgets/CrawlPageExperience";
import WorkloadTasksSection from "./widgets/WorkloadTasks";
import TeamAccessPanel from "./widgets/TeamAccessPanel";
import HomePanelSettings from "./widgets/HomePanelSettings";
/**
 * Wranker – Home (Header & Global Filters)
 * - No external UI deps; only React + lucide-react + Tailwind
 * - Matches Project Overview tokens & patterns (2025-08-21)
 * - Action order identical to Project Overview
 * - Project selector + access chip available (global context)
 * - Saved Views included (local state)
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
type DeviceMode = "all" | "desktop" | "mobile";
type CompareMode = "prev_period" | "prev_year";
type PresetRange =
  | "last_7"
  | "last_28"
  | "last_90"
  | "last_180"
  | "last_365"
  | "custom";
type SourceMode = "all" | "ga4" | "gsc";

export interface ProjectInfo {
  id: string;
  name: string;
  domain: string;
  externalUrl?: string;
}

export type ProjectAccessSelection = { my: boolean; shared: boolean };

export interface FiltersState {
  dateRange: PresetRange;
  customFrom?: string; // ISO yyyy-mm-dd (only if dateRange === 'custom')
  customTo?: string; // ISO yyyy-mm-dd (only if dateRange === 'custom')
  compare: CompareMode;
  device: DeviceMode;
  countries: string[]; // ISO country codes
  sourceMode: SourceMode; // All / GA4 / GSC
  projectAccess: ProjectAccessSelection;
  savedView?: string;
}

export interface HomeHeaderProps {
  /** Optional current project for quick switch */
  project?: ProjectInfo | null;
  /** Projects available for selection */
  projects?: ProjectInfo[];

  /** Defaults for the global filters */
  defaultFilters?: Partial<FiltersState>;

  /** Callbacks */
  onProjectChange?: (projectId: string) => void;
  onFiltersChange?: (filters: FiltersState) => void;

  /** Actions (same order as Project Overview) */
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

function useOutsideClose<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void
) {
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
              idx > 0 && "border-l"
            )}
            style={{
              borderColor: TOKENS.border,
              background: isActive ? TOKENS.pastelBrand : TOKENS.chipBg,
              color: isActive ? TOKENS.brand : TOKENS.text,
            }}
            onClick={() => onChange(o.key)}
          >
            {Icon && <Icon size={16}  />}
            <span className={isActive ? "font-semibold" : "font-medium"}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------- Project selector & access ----------------------- */

function ProjectChip({
  project,
  projects,
  onChange,
}: {
  project?: ProjectInfo | null;
  projects?: ProjectInfo[];
  onChange?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const current = project;

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
          border: `${BORDER}px solid ${TOKENS.border}`,
          borderRadius: RADIUS,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        }}
      >
        <span className="inline-flex h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#008CCD,#4286F5)]" />
        <span className="text-[14px] font-medium" style={{ color: "#1E3A8A" }}>
          {current ? current.domain : "Select a project"}
        </span>
        {current?.externalUrl && <ExternalLinkIcon size={16} className="text-[#9CA3AF]" />}
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[300px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="text-[12px]" style={{ color: TOKENS.muted }}>My Projects</div>
          </div>
          <div className="max-h-[280px] overflow-auto">
            {(projects ?? []).map((p) => (
              <button
                key={p.id}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange?.(p.id);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3 w-3 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#008CCD,#4286F5)]" />
                  <span>{p.domain}</span>
                </div>
                {current?.id === p.id && <Check size={16} className="text-emerald-600" />}
              </button>
            ))}
          </div>
          <div className="p-2 border-t" style={{ borderColor: TOKENS.border }}>
            <PrimaryButton title="Create Project">
              <Plus className="size-4" />
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

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

          <div
            className="flex items-center justify-between px-3 py-2 border-t"
            style={{ borderColor: TOKENS.border }}
          >
            <button className="text-sm underline" onClick={() => onChange({ my: true, shared: true })}>
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
          {(
            [
              ["Last 7 days", "last_7"],
              ["Last 28 days", "last_28"],
              ["Last 90 days", "last_90"],
              ["Last 180 days", "last_180"],
              ["Last 365 days", "last_365"],
              ["Custom", "custom"],
            ] as [string, PresetRange][]
          ).map(([label, key]) => (
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
            <div
              className="flex items-center gap-2 bg-white rounded border px-2 py-1.5"
              style={{ borderColor: TOKENS.border }}
            >
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
          <div
            className="flex items-center justify-between px-3 py-2 border-t"
            style={{ borderColor: TOKENS.border }}
          >
            <button className="text-sm underline" onClick={() => onChange([])}>
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
        <span className="font-medium">
          {currentName ? `View: ${currentName}` : "Saved Views"}
        </span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[280px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="text-[12px]" style={{ color: TOKENS.muted }}>
              Save current filters as
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-full text-sm rounded border px-2 py-1.5 outline-none"
                style={{ borderColor: TOKENS.border }}
                placeholder="e.g., US • Desktop • Last 28d"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <PrimaryButton
                title="Save"
                onClick={() => {
                  if (name.trim()) {
                    onSave(name.trim());
                    setName("");
                  }
                }}
              >
                <Check className="size-4" />
              </PrimaryButton>
            </div>
          </div>

          <div className="max-h-[240px] overflow-auto">
            {views.length === 0 ? (
              <div className="px-3 py-3 text-sm" style={{ color: TOKENS.muted }}>
                No saved views yet.
              </div>
            ) : (
              views.map((v) => (
                <div
                  key={v}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <button className="text-left" onClick={() => onLoad(v)}>
                    {v}
                    {v === defaultName ? " • default" : ""}
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="underline" onClick={() => onSetDefault(v)}>
                      Set default
                    </button>
                    <button
                      className="underline text-red-600"
                      onClick={() => onDelete(v)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Main Component ----------------------- */

export function HomeHeader({
  project,
  projects = [],
  defaultFilters,
  onProjectChange,
  onFiltersChange,
  onCreateProject,
  onExport,
  onReCrawl,
  onCreateTask,
  onShare,
  onAddToReports,
  onSettings,
}: HomeHeaderProps) {
  // Global filters (kept identical to Project Overview)
  const [filters, setFilters] = useState<FiltersState>({
    dateRange: defaultFilters?.dateRange ?? "last_28",
    compare: defaultFilters?.compare ?? "prev_period",
    device: defaultFilters?.device ?? "all",
    countries: defaultFilters?.countries ?? [],
    sourceMode: defaultFilters?.sourceMode ?? "all",
    projectAccess: defaultFilters?.projectAccess ?? { my: true, shared: true },
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

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }


  return (
    <div className="w-full" style={{ color: TOKENS.text }}>
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <HomePanelSettings   />
                    </Drawer>
                  )}
      {/* Row 1: breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 text-[14px] leading-tight">
          <span style={{ color: TOKENS.muted }}>SEO Dashboard</span>
          <span className="text-[#9CA3AF]">›</span>
          <span className="font-semibold" style={{ color: TOKENS.text }}>
            Home
          </span>
        </div>

        {/* (Optional slot — keep empty on Home to reduce noise) */}
        <div className="flex items-center gap-2" />
      </div>

      {/* Row 2: Access + Project selector + (optional) actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">
          <ProjectAccessChip
            value={filters.projectAccess}
            onChange={(v) => setFilter("projectAccess", v)}
          />

          <ProjectChip
            project={project}
            projects={projects}
            onChange={(id) => onProjectChange?.(id)}
          />

          {/* If you want property chips on Home, copy SourceChip instances here. */}
        </div>

        {/* Actions — same order as Project Overview */}
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
          <IconOnlyButton title="Settings" onClick={openDrawer}>
            <Settings className="size-4 cursor-pointer" />
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

/* ----------------------- Optional Demo Wrapper (remove in prod) ----------------------- */
export default function DemoHomeHeader() {
  const [project, setProject] = useState<ProjectInfo | null>({
    id: "p1",
    name: "Wranker",
    domain: "wranker.com",
    externalUrl: "https://wranker.com",
  });

  const projects: ProjectInfo[] = [
    { id: "p1", name: "Wranker", domain: "wranker.com", externalUrl: "https://wranker.com" },
    { id: "p2", name: "W3era", domain: "w3era.com", externalUrl: "https://w3era.com" },
    { id: "p3", name: "Vefogix", domain: "vefogix.com", externalUrl: "https://vefogix.com" },
  ];

  return (
    <div className="min-h-screen w-full bg-white text-[14px]" style={{ color: TOKENS.text }}>
      {/* Top brand bar for context */}
      <div
        className="w-full px-6 py-4 border-b"
        style={{ borderColor: TOKENS.border, background: "#FFFFFF" }}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg"
              style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.border}` }}
            />
            <span className="font-semibold">Wranker – Home</span>
          </div>
          <div className="text-sm" style={{ color: TOKENS.muted }}>
            Demo canvas • Header & Filters
          </div>
        </div>
      </div>

      {/* Page container */}
      <div className="w-full px-6 py-6">
        <HomeHeader
          project={project}
          projects={projects}
          defaultFilters={{
            dateRange: "last_28",
            compare: "prev_period",
            device: "all",
            countries: [],
            sourceMode: "all",
            projectAccess: { my: true, shared: true },
          }}
          onProjectChange={(id) => {
            const next = projects.find((p) => p.id === id) ?? null;
            setProject(next);
          }}
          onFiltersChange={(f) => {
            // eslint-disable-next-line no-console
            console.log("Home filters changed", f);
          }}
          onCreateProject={() => alert("Create Project")}
          onExport={() => alert("Export")}
          onReCrawl={() => alert("Re-crawl")}
          onCreateTask={() => alert("Create Task")}
          onShare={() => alert("Share")}
          onAddToReports={() => alert("Add to Reports")}
          onSettings={() => alert("Settings")}
        />

        {/* Demo body placeholder */}

            {/* Body starts here — place Home widgets below this divider. */}
            <Demo_ProjectSummarySection/>
            <ProjectDirectoryQuickPeek />
            <DemoPrioritizationMatrix />
            <DemoTopMoversLaggardsSection />
            <Demo_RiskAnomaliesCenter />
            <Demo_ContentPipelineSnapshot />
            <KeywordsPulseAllProjects />
            <BacklinkAuthoritySection />
            <CrawlPageExperienceSummary />
            <WorkloadTasksSection />
            <TeamAccessPanel />

      </div>
    </div>
  );
}
