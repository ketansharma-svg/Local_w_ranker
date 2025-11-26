"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings,
  Upload,
  MoreHorizontal,
  ChevronDown,
  Clock,
  Globe2,
  MonitorSmartphone,
  CalendarDays,
  Search,
  RefreshCw,
  Users,
  ExternalLink,
  Info,
  Building2,
  Shield,
  Check,
} from "lucide-react";
import KeywordTrackingMonitorSectionMock from "./KeywordTrackingMonitor";
import PageActivityMonitorSectionMock from "./PageActivityMonitor";
import ContentPublishingMonitorSectionMock from "./ContentPublishingMonitor";
import BacklinkTrackerKPIsAndTrend from "./BacklinkTrackerKPIsAndTrend";
import BacklinkTrackerTable from "./BacklinkTrackerTable";
import SmartSuggestionCardsDemo from "./SmartSuggestionCards";
import AlertLogAndActivitySection from "./AlertLogAndActivity";
/* -------------------- TOKENS -------------------- */
const TOKENS = {
  brand: "#1090D0",
  brandHover: "#0C7FB6",
  pastelBrand: "#D2EFFF",
  text: "#282829",
  textMuted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
} as const;

/* -------------------- helpers -------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}
function timeAgo(iso?: string) {
  if (!iso) return null;
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* -------------------- primitives -------------------- */
function ChipButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  title,
  withCaret = true,
  activeBg = false,
}: {
  label: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  withCaret?: boolean;
  activeBg?: boolean;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm",
        activeBg ? "bg-white" : "bg-[#F5F7FA]",
        "border-[#EFF0F6]",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#E5E7EB]"
      )}
      style={{ color: TOKENS.text }}
    >
      {Icon && <Icon size={16} className="text-[#9CA3AF]" />}
      <span className="truncate">{label}</span>
      {withCaret && <ChevronDown size={16} className="text-[#9CA3AF]" />}
    </button>
  );
}

function GhostButton({
  label,
  onClick,
  icon: Icon,
  title,
}: {
  label: string;
  onClick?: () => void;
  icon?: React.ComponentType<any>;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      {Icon && <Icon size={16} className="text-[#6B7280]" />}
      <span>{label}</span>
    </button>
  );
}

function IconOnly({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md border"
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
    >
      {children}
    </button>
  );
}

function InfoPopover({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <Info size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={classNames(
          "invisible group-hover:visible absolute z-50 top-full mt-1 w-72 rounded-md border bg-white p-2 text-xs leading-snug text-[#111827] shadow",
          align === "right" ? "right-0" : "left-0"
        )}
        style={{ borderColor: TOKENS.border }}
      >
        {label}
      </span>
    </span>
  );
}

/* -------------------- filters -------------------- */
type DeviceOpt = "All" | "Desktop" | "Mobile";
type DateOpt = "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "Custom";

function DeviceDropdown({ value, onChange }: { value: DeviceOpt; onChange?: (v: DeviceOpt) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const opts: DeviceOpt[] = ["All", "Desktop", "Mobile"];
  return (
    <div className="relative" ref={ref}>
      <ChipButton label={`Device: ${value}`} icon={MonitorSmartphone} onClick={() => setOpen((s) => !s)} />
      {open && (
        <div className="absolute z-50 mt-2 min-w-[200px] rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          {opts.map((o) => (
            <button
              key={o}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onChange?.(o);
                setOpen(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function CountryDropdown({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const countries = [
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
  ];
  const current = countries.find((c) => c.code === value) ?? countries[0];
  return (
    <div className="relative" ref={ref}>
      <ChipButton label={`Country: ${current.flag} ${current.code}`} icon={Globe2} onClick={() => setOpen((s) => !s)} />
      {open && (
        <div className="absolute z-50 mt-2 min-w-[220px] rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          {countries.map((c) => (
            <button
              key={c.code}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onChange?.(c.code);
                setOpen(false);
              }}
            >
              <span className="text-base">{c.flag}</span>
              <span>{c.name}</span>
              <span className="ml-auto text-[#9CA3AF]">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function DateDropdown({ value, onChange }: { value: DateOpt; onChange?: (v: DateOpt) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const opts: DateOpt[] = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "Custom"];
  return (
    <div className="relative" ref={ref}>
      <ChipButton label={`Date: ${value}`} icon={CalendarDays} onClick={() => setOpen((s) => !s)} />
      {open && (
        <div className="absolute z-50 mt-2 min-w-[220px] rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          {opts.map((o) => (
            <button
              key={o}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onChange?.(o);
                setOpen(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Project Access & Project Selector -------------------- */
type ProjectAccessType = "my" | "shared";
function ProjectAccessChip({
  value,
  onChange,
}: {
  value: ProjectAccessType;
  onChange?: (v: ProjectAccessType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const label = value === "my" ? "Project Access: My Projects" : "Project Access: Shared";
  return (
    <div className="relative" ref={ref}>
      <ChipButton
        label={label}
        icon={value === "my" ? Building2 : Shield}
        onClick={() => setOpen((s) => !s)}
        title="Filter project scope"
      />
      {open && (
        <div className="absolute z-50 mt-2 min-w-[220px] rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              onChange?.("my");
              setOpen(false);
            }}
          >
            <Building2 size={16} className="text-[#6B7280]" /> My Projects
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              onChange?.("shared");
              setOpen(false);
            }}
          >
            <Shield size={16} className="text-[#6B7280]" /> Shared with me
          </button>
        </div>
      )}
    </div>
  );
}

type ProjectItem = { id: string; name: string; domain: string; href?: string };
function ProjectSelectorChip({
  currentLabel,
  allowSwitch,
  items,
  onSelect,
}: {
  currentLabel: string;
  allowSwitch?: boolean;
  items?: ProjectItem[];
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={allowSwitch ? "Switch Project" : "Active Project"}
        onClick={() => allowSwitch && setOpen((s) => !s)}
        className={classNames(
          "inline-flex items-center gap-2 h-9 px-3 rounded-md border",
          allowSwitch ? "hover:bg-[#E5E7EB]" : "bg-[#F5F7FA] cursor-default"
        )}
        style={{ borderColor: TOKENS.border }}
      >
        <span className="inline-flex h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#1090D0,#4286F5)]" />
        <span className="text-[14px] font-medium" style={{ color: "#1E3A8A" }}>
          {currentLabel}
        </span>
        {allowSwitch && <ChevronDown size={16} className="text-[#9CA3AF]" />}
      </button>
      {open && items && (
        <div className="absolute z-50 mt-2 min-w-[260px] overflow-hidden rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          <div className="border-b px-3 py-2 text-xs text-[#6B7280]" style={{ borderColor: TOKENS.border }}>
            Select Project
          </div>
          <div className="max-h-[280px] overflow-auto">
            {items.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onSelect?.(p.id);
                  setOpen(false);
                }}
              >
                <span className="inline-flex h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#1090D0,#4286F5)]" />
                <span className="font-medium">{p.name}</span>
                <span className="ml-auto text-[#9CA3AF]">{p.domain}</span>
                {p.href && <ExternalLink size={14} className="text-[#9CA3AF]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Competitor Switcher -------------------- */
type CompetitorItem = { id: string; domain: string; nickname?: string; active?: boolean };
function CompetitorSwitcher({
  items,
  activeId,
  onChange,
}: {
  items: CompetitorItem[];
  activeId?: string;
  onChange?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const active = items.find((c) => c.id === activeId) ?? items[0];
  const display = active ? (active.nickname ? `${active.nickname} (${active.domain})` : active.domain) : "Select Competitor";
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((c) => (c.nickname || "").toLowerCase().includes(s) || c.domain.toLowerCase().includes(s));
  }, [q, items]);

  return (
    <div className="relative" ref={ref}>
      <ChipButton
        label={`Competitor: ${display}`}
        icon={Users}
        onClick={() => setOpen((s) => !s)}
        title="Switch competitor for tracking"
      />
      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[320px] overflow-hidden rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
            <Search size={14} className="text-[#9CA3AF]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search competitors..."
              className="w-full text-sm outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
          <div className="max-h-[300px] overflow-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange?.(c.id);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{c.nickname || c.domain}</span>
                <span className="ml-auto text-[#9CA3AF]">{c.domain}</span>
                {c.active && (
                  <span className="ml-2 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[11px] text-[#6B7280]">
                    Active
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-[#6B7280]">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Compare Toggle -------------------- */
function CompareToggle({
  checked,
  onChange,
  readOnly = false,
  projectDomain,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
  projectDomain?: string;
}) {
  if (readOnly) {
    return (
      <span
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        title="Compare overlay (read-only; controlled by parent panel)"
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]">
          Compare
        </span>
        <b>{checked ? "ON" : "OFF"}</b>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
      title="Show side-by-side values vs your project"
    >
      <div
        className={classNames(
          "relative w-9 h-5 rounded-full transition-colors",
          checked ? "bg-[var(--wr-toggle-on,#1090D0)]" : "bg-gray-300"
        )}
      >
        <span
          className={classNames(
            "absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          )}
        />
      </div>
      <span className="whitespace-nowrap">
        Compare with My Project{projectDomain ? ` (${projectDomain})` : ""}
      </span>
    </button>
  );
}

/* -------------------- Export menu (Tracker) -------------------- */
type ExportKey =
  | "CSV_VIEW"
  | "PDF_VIEW"
  | "CSV_PAGES"
  | "CSV_KEYWORDS"
  | "CSV_ALERTS"
  | "ALL_DATA_PRO";

function ExportMenu({ onPick }: { onPick?: (k: ExportKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const items: { key: ExportKey; label: string; pro?: boolean }[] = [
    { key: "CSV_VIEW", label: "Export This View (CSV)" },
    { key: "PDF_VIEW", label: "Export This View (PDF)", pro: true },
    { key: "CSV_PAGES", label: "Export Tracked Pages (CSV)" },
    { key: "CSV_KEYWORDS", label: "Export Tracked Keywords (CSV)" },
    { key: "CSV_ALERTS", label: "Export Alert Logs (CSV)" },
    { key: "ALL_DATA_PRO", label: "Export All Competitor Data (Pro)", pro: true },
  ];
  return (
    <div className="relative" ref={ref}>
      <IconOnly title="Export" onClick={() => setOpen((s) => !s)}>
        <Upload size={16} />
      </IconOnly>
      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[240px] rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          {items.map((x) => (
            <button
              key={x.key}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onPick?.(x.key);
                setOpen(false);
              }}
              title={x.pro ? "Available on Pro plans" : undefined}
            >
              {x.label} {x.pro && <span className="ml-1 text-xs text-[#9CA3AF]">Pro</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- TYPES -------------------- */
export type TrackerHeaderFilters = {
  device: DeviceOpt;
  country: string;
  date: DateOpt;
};
export type Role = "owner" | "admin" | "editor" | "viewer";

/* -------------------- MAIN HEADER -------------------- */
export function CompetitorTrackerHeaderRedesigned({
  // meta
  breadcrumb = ["SEO Dashboard", "Competitor Intelligence", "Competitor Tracker"],
  lastRefreshedISO,

  // scope
  projectAccess = "my",
  onProjectAccessChange,
  projectDomain = "wranker.com",
  allowProjectSwitch = false,
  projects = [],
  onProjectSwitch,

  // competitors
  competitors = [],
  activeCompetitorId,
  onCompetitorChange,

  // compare overlay
  compareEnabled = false,
  compareReadOnly = false,
  onCompareChange,

  // filters
  filters: initialFilters = { device: "All", country: "US", date: "Last 30 Days" },
  onFiltersChange,

  // actions
  onTrackNewPage,
  onRefresh,
  onExport,
  onOpenSettings,
  onTrackKeyword,
  onOpenProfiles,
  onOpenInsights,
}: {
  breadcrumb?: string[];
  lastRefreshedISO?: string;

  projectAccess?: ProjectAccessType;
  onProjectAccessChange?: (v: ProjectAccessType) => void;
  projectDomain?: string;
  allowProjectSwitch?: boolean;
  projects?: ProjectItem[];
  onProjectSwitch?: (id: string) => void;

  competitors?: CompetitorItem[];
  activeCompetitorId?: string;
  onCompetitorChange?: (id: string) => void;

  compareEnabled?: boolean;
  compareReadOnly?: boolean;
  onCompareChange?: (v: boolean) => void;

  filters?: TrackerHeaderFilters;
  onFiltersChange?: (next: TrackerHeaderFilters) => void;

  onTrackNewPage?: () => void;
  onRefresh?: () => void;
  onExport?: (k: ExportKey) => void;
  onOpenSettings?: () => void;
  onTrackKeyword?: () => void;
  onOpenProfiles?: () => void;
  onOpenInsights?: () => void;
}) {
  const [filters, setFilters] = useState<TrackerHeaderFilters>(initialFilters);
  useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const refreshed = timeAgo(lastRefreshedISO);

  // More menu
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useOutsideClose<HTMLDivElement>(moreOpen, () => setMoreOpen(false));

  return (
    <header className="w-full text-[14px]" style={{ color: TOKENS.text }}>
      {/* Row 0: breadcrumb + refreshed */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 text-[14px] leading-tight">
          {breadcrumb.map((b, i) => (
            <div key={b} className="flex items-center gap-2">
              <span
                className={classNames(i < breadcrumb.length - 1 ? "text-[#6B7280]" : "font-semibold")}
                style={{ color: i < breadcrumb.length - 1 ? "#6B7280" : TOKENS.text }}
              >
                {b}
              </span>
              {i < breadcrumb.length - 1 && <span className="text-[#9CA3AF]">›</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Clock className="size-4" />
          <span>Last refreshed: {refreshed ?? "—"}</span>
        </div>
      </div>

      {/* Row 1: Title + right controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.border}` }}
          >
            <Search size={16} style={{ color: TOKENS.brand }} />
          </span>
          <h1 className="text-xl font-semibold">Competitor Tracker</h1>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]">
            <Info size={12} /> Targeted monitoring & alerts
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CompetitorSwitcher
            items={competitors}
            activeId={activeCompetitorId}
            onChange={onCompetitorChange}
          />
          <CompareToggle
            checked={!!compareEnabled}
            onChange={onCompareChange}
            readOnly={compareReadOnly}
            projectDomain={projectDomain}
          />
          <GhostButton label="Refresh Data" icon={RefreshCw} onClick={onRefresh} title="Pull latest tracker data" />
          <GhostButton label="Track New Page" onClick={onTrackNewPage} />
          <ExportMenu onPick={onExport} />
          <IconOnly title="Settings" onClick={onOpenSettings}>
            <Settings size={16} />
          </IconOnly>
          <div className="relative" ref={moreRef}>
            <IconOnly title="More" onClick={() => setMoreOpen((s) => !s)}>
              <MoreHorizontal size={16} />
            </IconOnly>
            {moreOpen && (
              <div
                className="absolute right-0 z-50 mt-2 min-w-[240px] rounded-md border bg-white shadow"
                style={{ borderColor: TOKENS.border }}
              >
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setMoreOpen(false);
                    onTrackKeyword?.();
                  }}
                >
                  Track Keyword…
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenProfiles?.();
                  }}
                >
                  Open in Profiles
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenInsights?.();
                  }}
                >
                  Compare in Insights
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Project access + project + filters + helper */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectAccessChip value={projectAccess} onChange={onProjectAccessChange} />
          <ProjectSelectorChip
            currentLabel={projectDomain}
            allowSwitch={allowProjectSwitch}
            items={projects}
            onSelect={onProjectSwitch}
          />
          <DeviceDropdown
            value={filters.device}
            onChange={(v) => setFilters((f) => ({ ...f, device: v }))}
          />
          <CountryDropdown
            value={filters.country}
            onChange={(v) => setFilters((f) => ({ ...f, country: v }))}
          />
          <DateDropdown
            value={filters.date}
            onChange={(v) => setFilters((f) => ({ ...f, date: v }))}
          />
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#6B7280]">
          <Info size={12} />
          <span>Filters affect all Tracker sections (Keywords, Pages, Content, Backlinks, Alerts).</span>
        </div>
      </div>

      {/* divider */}
      <div className="mt-3 border-b" style={{ borderColor: TOKENS.border }} />
    </header>
  );
}

/* -------------------- Optional demo wrapper (remove in production) -------------------- */
export default function CompetitorTrackerHeader() {
  const [filters, setFilters] = useState<TrackerHeaderFilters>({ device: "All", country: "US", date: "Last 30 Days" });
  const [projectAccess, setProjectAccess] = useState<ProjectAccessType>("my");
  const [project, setProject] = useState("wranker.com");
  const [activeComp, setActiveComp] = useState("c1");
  const [compare, setCompare] = useState(false);

  const projects: ProjectItem[] = [
    { id: "p1", name: "WrProj • wranker.com", domain: "wranker.com" },
    { id: "p2", name: "Client A • example.com", domain: "example.com" },
  ];
  const competitors: CompetitorItem[] = [
    { id: "c1", domain: "comp1.com", nickname: "Comp One", active: true },
    { id: "c2", domain: "comp2.io", nickname: "Comp Two" },
    { id: "c3", domain: "alpha.dev" },
  ];

  return (
    <div className="w-full bg-white">
      <div className="mx-auto w-full px-6 py-6">
        <CompetitorTrackerHeaderRedesigned
          breadcrumb={["SEO Dashboard", "Competitor Intelligence", "Competitor Tracker"]}
          lastRefreshedISO={new Date(Date.now() - 1000 * 60 * 8).toISOString()}
          projectAccess={projectAccess}
          onProjectAccessChange={setProjectAccess}
          projectDomain={project}
          allowProjectSwitch
          projects={projects}
          onProjectSwitch={(id) => {
            const p = projects.find((x) => x.id === id);
            if (p) setProject(p.domain);
          }}
          competitors={competitors}
          activeCompetitorId={activeComp}
          onCompetitorChange={(id) => setActiveComp(id)}
          compareEnabled={compare}
          compareReadOnly={false}
          onCompareChange={setCompare}
          filters={filters}
          onFiltersChange={setFilters}
          onTrackNewPage={() => alert("Track Competitor Page")}
          onRefresh={() => alert("Refreshed tracker")}
          onExport={(k) => alert(`Export: ${k}`)}
          onOpenSettings={() => alert("Open Settings")}
          onTrackKeyword={() => alert("Track Competitor Keyword")}
          onOpenProfiles={() => alert("Open in Profiles")}
          onOpenInsights={() => alert("Open in Insights")}
        />

        {/* demo body */}

          <KeywordTrackingMonitorSectionMock />
          <PageActivityMonitorSectionMock />
          <ContentPublishingMonitorSectionMock />
          <BacklinkTrackerKPIsAndTrend />
          <BacklinkTrackerTable />
          <SmartSuggestionCardsDemo />
          <AlertLogAndActivitySection />

      </div>
    </div>
  );
}
