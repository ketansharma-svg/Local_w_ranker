import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Globe,
  CalendarDays,
  RefreshCw,
  Upload,
  ArrowLeftRight,
  ChevronDown,
  ExternalLink as ExternalLinkIcon,
  Clock,
  BarChart3,
  Users,
  LineChart,
  Target,
  FileText,
  Network,
  Lock,
  Settings,
} from "lucide-react";
import OviKpiSummarySection from "./overview/OviKpiSummarySection";
import OVIKeywordDistributionSection from "./overview/OVIKeywordDistributionSection";
import DemoTopKeywordsSection from "./overview/DemoTopKeywordsSection";
import OVI_Section_KeywordIntentBreakdown from "./overview/KeywordIntentBreakdown";
import OVI_TopPositionChanges from "./overview/TopPositionChanges";
import OVI_SerpFeatureMovement from "./overview/SerpFeatureMovement";
import SerpFeatureLandscapeGrid from "./overview/SerpFeatureLandscapeGrid";
import OVI_SerpFeatureTrend from "./overview/SerpFeatureTrend";
import OVI_TopPages from "./overview/TopPages";
import Demo_TopSubdomainsPreview from "./overview/TopSubdomainsPreview";
import OVI_TopOrganicCompetitors from "./overview/TopOrganicCompetitors";
import CompetitivePositioningMap from "./overview/CompetitivePositioningMap";
import KeywordTrendsAdvancedTable from "./keywords/KeywordTrendsAdvancedTable";
import PositionChangesKpiSummary from "./position-insights/PositionChangesKpiSummary";
import PositionChangeTrend from "./position-insights/PositionChangeTrend";
import TopPage from "./position-insights/TopPage";
import KeywordMovementAdvancedTable from "./position-insights/KeywordMovementAdvancedTable";
import PagesAdvancedTable from "./page-insights/PagesAdvancedTable";
import SubdomainsTable from "./subdomains/SubdomainsTable";
import CompetitorsTable_Refined from "./competitors/CompetitorsTable_Refined";
import CompetitorPositioningMap from "./competitors/CompetitorPositioningMap";
/**
 * Wranker – Organic Visibility Insights (OVI)
 * Panel header & Tabs navigation (drop‑in React + Tailwind)
 *
 * Refinements in this update:
 * - Inter / Inter Fallback font on the whole section
 * - No emoji (country flags removed)
 * - Branded #008CCD icons for section/action usage
 * - Pointer cursor on all clickable elements
 * - Modular chips & toggle switches (consistent with recent designs)
 * - New Filter chip “Project Access” (before project selector) with options:
 *   “My projects”, “Shared with me” — both selected by default
 * - Project selector chip shows site favicon
 * - Settings action uses the global Settings icon
 * - Tabs (bar navigation) kept as-is
 */

const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastelBrand: "#D2EFFF",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  textMutedDarker: "#374151",
  radius: 9999, // fully rounded chips
  border: 1,
};

// ------------------ utilities
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

function BrandIcon({ children }: React.PropsWithChildren) {
  return <span style={{ color: TOKENS.brand, display: "inline-flex" }}>{children}</span>;
}

/* ────────────────────────── modular primitives ────────────────────────── */
function ChipButton({
  title,
  onClick,
  children,
  className,
}: React.PropsWithChildren<{ title: string; onClick?: () => void; className?: string }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`inline-flex cursor-pointer items-center gap-2 h-9 px-3 text-[13px] ${className || ""}`}
      style={{
        border: `${TOKENS.border}px solid ${TOKENS.borderLight}`,
        borderRadius: TOKENS.radius,
        background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
      <ChevronDown size={16} className="text-[#9CA3AF]" />
    </button>
  );
}

function IconOnlyButton({
  title,
  onClick,
  disabled,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false);
  const bg = disabled ? "#F9FAFB" : hover ? TOKENS.chipHover : TOKENS.chipBg;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid size-9 min-w-9 place-items-center rounded-md border text-slate-700"
      style={{
        borderColor: TOKENS.borderLight,
        background: bg,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  title,
  onClick,
  icon: Icon,
  disabled,
}: {
  title: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const bg = disabled ? "#9CA3AF" : hover ? TOKENS.brandHover : TOKENS.brand;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-white"
      style={{ background: bg }}
    >
      {Icon ? <Icon size={16} className="text-white" /> : null}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

/** Toggle switch (used in Project Access dropdown) */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs"
      style={{ borderColor: TOKENS.borderLight, background: TOKENS.chipBg }}
      title={label}
    >
      <span
        className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
          checked ? "" : ""
        }`}
        style={{ background: checked ? TOKENS.brand : "#CBD5E1" }}
      >
        <span
          className={`absolute left-0.5 top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      {label ? <span className="text-slate-700">{label}</span> : null}
    </button>
  );
}

/* ────────────────────────── helpers ────────────────────────── */
function Favicon({ domain, size = 16 }: { domain: string; size?: number }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      className="rounded-sm"
      onError={(e) => {
        // fallback brand dot
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

/* ────────────────────────── Domain (Project) selector ────────────────────────── */
function DomainSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  const recent = useMemo(
    () => ["w3era.com", "wranker.com", "vefogix.com", "example.org"].filter((d) =>
      d.toLowerCase().includes(filter.toLowerCase())
    ),
    [filter]
  );

  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Select project/domain" onClick={() => setOpen((s) => !s)}>
        <span className="inline-flex items-center gap-2">
          <Favicon domain={value} size={16} />
          <span className="text-[13px] font-medium">{value}</span>
        </span>
        <ExternalLinkIcon size={16} className="text-[#9CA3AF]" />
      </ChipButton>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[280px] bg-white shadow-lg"
          style={{ borderRadius: 12, border: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}
        >
          <div className="p-2">
            <div
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
              style={{ border: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}
            >
              <BrandIcon>
                <Globe size={16} />
              </BrandIcon>
              <input
                placeholder="Search projects..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {recent.map((d) => (
              <button
                key={d}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
              >
                <Favicon domain={d} size={16} />
                <span>{d}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Project Access filter ────────────────────────── */
function ProjectAccessFilter({
  value,
  onChange,
}: {
  value: { my: boolean; shared: boolean };
  onChange: (v: { my: boolean; shared: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const summary =
    value.my && value.shared ? "Both" : value.my ? "My projects" : value.shared ? "Shared with me" : "None";

  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Project Access" onClick={() => setOpen((s) => !s)}>
        <span className="inline-flex items-center gap-2">
          <BrandIcon>
            <Users size={16} />
          </BrandIcon>
          <span className="font-medium">Project Access</span>
          <span className="text-[12px] text-slate-600">• {summary}</span>
        </span>
      </ChipButton>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[260px] bg-white p-3 shadow-lg"
          style={{ borderRadius: 12, border: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}
        >
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">My projects</span>
              <ToggleSwitch
                checked={value.my}
                onChange={(v) => onChange({ ...value, my: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Shared with me</span>
              <ToggleSwitch
                checked={value.shared}
                onChange={(v) => onChange({ ...value, shared: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Country selector (no emoji) ────────────────────────── */
const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "IN", label: "India" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
];

function CountrySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const active = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];

  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Select country" onClick={() => setOpen((s) => !s)}>
        <BrandIcon>
          <Globe size={16} />
        </BrandIcon>
        <span className="text-[13px] font-medium">{active.code}</span>
      </ChipButton>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[220px] bg-white shadow-lg"
          style={{ borderRadius: 12, border: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}
        >
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
            >
              <BrandIcon>
                <Globe size={14} />
              </BrandIcon>
              <span className="font-medium">{c.code}</span>
              <span className="text-slate-500">— {c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Device toggle (chip style) ────────────────────────── */
function DeviceToggle({
  value,
  onChange,
}: {
  value: "desktop" | "mobile";
  onChange: (v: "desktop" | "mobile") => void;
}) {
  return (
    <div
      className="inline-flex items-center p-0.5"
      role="group"
      aria-label="Device"
      style={{
        border: `${TOKENS.border}px solid ${TOKENS.borderLight}`,
        borderRadius: TOKENS.radius,
        background: TOKENS.chipBg,
      }}
    >
      {(["desktop", "mobile"] as const).map((k) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="h-8 cursor-pointer px-3 text-[13px]"
            aria-pressed={active}
            style={{
              borderRadius: TOKENS.radius - 2,
              background: active ? TOKENS.pastelBrand : "transparent",
              color: active ? TOKENS.brand : TOKENS.text,
            }}
          >
            {k === "desktop" ? "Desktop" : "Mobile"}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────── Date range picker ────────────────────────── */
const PRESETS = ["Last 7 days", "Last 30 days", "Last 90 days", "Custom…"];

function DateRangePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Date range" onClick={() => setOpen((s) => !s)}>
        <BrandIcon>
          <CalendarDays size={16} />
        </BrandIcon>
        <span>{value}</span>
      </ChipButton>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[200px] bg-white shadow-lg"
          style={{ borderRadius: 12, border: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}
        >
          {PRESETS.map((p) => (
            <button
              key={p}
              className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Export dropdown (Pro-gated) ────────────────────────── */
function ExportMenu({ isPro, onExport }: { isPro: boolean; onExport?: (fmt: "csv" | "pdf" | "xlsx") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const disabled = !isPro;

  return (
    <div className="relative" ref={ref}>
      <IconOnlyButton
        title={disabled ? "Export (Pro)" : "Export"}
        onClick={() => !disabled && setOpen((s) => !s)}
        disabled={disabled}
      >
        {disabled ? (
          <Lock className="size-4 text-slate-400" />
        ) : (
          <Upload className="size-4" style={{ color: TOKENS.brand }} />
        )}
      </IconOnlyButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[160px] bg-white shadow-lg"
          style={{ borderRadius: 12, border: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}
        >
          {[
            { k: "csv", label: "Export CSV" },
            { k: "pdf", label: "Export PDF" },
            { k: "xlsx", label: "Export XLSX" },
          ].map((it) => (
            <button
              key={it.k}
              className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => onExport?.(it.k as any)}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Public component ────────────────────────── */
export function OVIHeaderTabs({
  active,
  onTabChange,
  isPro = true,
  onRefresh,
  onExport,
  onCompare,
  onOpenReports,
  onCreateTask,
  onSettings,
  domain = "w3era.com",
  country = "US",
  device = "desktop",
  dateRange = "Last 30 days",
  onChangeDomain,
  onChangeCountry,
  onChangeDevice,
  onChangeDateRange,
}: {
  active?: string;
  onTabChange?: (k: string) => void;
  isPro?: boolean;
  onRefresh?: () => void;
  onExport?: (fmt: "csv" | "pdf" | "xlsx") => void;
  onCompare?: () => void;
  onOpenReports?: () => void;
  onCreateTask?: () => void;
  onSettings?: () => void;
  domain?: string;
  country?: string;
  device?: "desktop" | "mobile";
  dateRange?: string;
  onChangeDomain?: (v: string) => void;
  onChangeCountry?: (v: string) => void;
  onChangeDevice?: (v: "desktop" | "mobile") => void;
  onChangeDateRange?: (v: string) => void;
}) {
  const activeKey = active ?? "overview";
  const [projectAccess, setProjectAccess] = useState<{ my: boolean; shared: boolean }>({ my: true, shared: true });

  const lastUpdated = useMemo(() => {
    const d = new Date();
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const TABS = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "keyword-trends", label: "Keyword Trends", icon: LineChart },
    { key: "position-insights", label: "Position Insights", icon: Target },
    { key: "page-insights", label: "Page Insights", icon: FileText },
    { key: "subdomains", label: "Subdomains", icon: Network },
    { key: "competitors", label: "Competitors", icon: Users, count: 0 },
  ];

  return (
    <div
      className="w-full"
      aria-label="OVI Header"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        color: TOKENS.text,
      }}
    >
      {/* Row A: breadcrumb + timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] leading-tight">
          <a href="#" className="cursor-pointer" style={{ color: TOKENS.textMuted }}>
            SEO Dashboard
          </a>
          <span className="text-[#9CA3AF]" aria-hidden>
            ›
          </span>
          <span className="inline-flex items-center gap-2 font-semibold" style={{ color: TOKENS.text }}>
            <BrandIcon>
              <BarChart3 size={16} />
            </BrandIcon>
            Organic Visibility Insights
          </span>
        </nav>
        <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textMutedDarker }}>
          <BrandIcon>
            <Clock className="size-4" />
          </BrandIcon>
          <span>Last updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Row B: filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* New Project Access filter chip (before project selector) */}
          <ProjectAccessFilter value={projectAccess} onChange={setProjectAccess} />

          {/* Project selector with favicon */}
          <DomainSelector value={domain} onChange={(v) => onChangeDomain?.(v)} />

          <CountrySelector value={country} onChange={(v) => onChangeCountry?.(v)} />
          <DeviceToggle value={device} onChange={(v) => onChangeDevice?.(v)} />
          <DateRangePicker value={dateRange} onChange={(v) => onChangeDateRange?.(v)} />

          <PrimaryButton title="Update Data" icon={RefreshCw} onClick={onRefresh} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton
            title="Compare Competitor"
            icon={ArrowLeftRight}
            onClick={onCompare}
            disabled={!isPro}
          />

          <ExportMenu isPro={isPro} onExport={onExport} />

          <IconOnlyButton title="Add to Reports" onClick={onOpenReports}>
            <BarChart3 className="size-4" style={{ color: TOKENS.brand }} />
          </IconOnlyButton>

          <IconOnlyButton title="Create Task" onClick={onCreateTask}>
            <FileText className="size-4" style={{ color: TOKENS.brand }} />
          </IconOnlyButton>

          <IconOnlyButton title="Settings" onClick={onSettings}>
            <Settings className="size-4" style={{ color: TOKENS.brand }} />
          </IconOnlyButton>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-3" style={{ borderBottom: `${TOKENS.border}px solid ${TOKENS.borderLight}` }} />

      {/* Row C: Tabs (bar navigation unchanged) */}
      <div className="mt-4" style={{ borderBottom: `${TOKENS.border}px solid ${TOKENS.borderLight}` }}>
        <div role="tablist" aria-label="OVI tabs" className="flex items-center gap-2 overflow-x-auto pb-1">
          {TABS.map(({ key, label, icon: Icon, count }) => {
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`ovi-tabpanel-${key}`}
                className="relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2"
                onClick={() => onTabChange?.(key)}
                style={{
                  color: isActive ? TOKENS.brand : TOKENS.text,
                  backgroundColor: isActive ? TOKENS.pastelBrand : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = TOKENS.chipHover;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                }}
              >
                <Icon size={16} style={{ color: isActive ? TOKENS.brand : "#6B7280" }} />
                <span className={isActive ? "font-semibold" : "font-medium"}>{label}</span>
                {typeof count === "number" && (
                  <span
                    className="ml-1 inline-flex min-w-[24px] items-center justify-center rounded-full px-1.5 text-[12px]"
                    style={{ backgroundColor: TOKENS.borderLight, color: TOKENS.text }}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-[6px] h-[2px]"
                    style={{ backgroundColor: TOKENS.brand }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------- Demo wrapper (optional for canvas/testing) */
export default function DemoOVIHeaderTabs() {
  const [active, setActive] = useState<string>("overview");
  const [domain, setDomain] = useState("w3era.com");
  const [country, setCountry] = useState("US");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [date, setDate] = useState("Last 30 days");
  const [toast, setToast] = useState<string | null>(null);
  const [isPro] = useState(true);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  return (
    <div className="w-full bg-white text-[14px]">
      <div className="mx-auto w-full px-6 py-6">
        <OVIHeaderTabs
          active={active}
          isPro={isPro}
          domain={domain}
          country={country}
          device={device}
          dateRange={date}
          onTabChange={(k) => {
            setActive(k);
            flash(`Switched to ${k}`);
          }}
          onChangeDomain={setDomain}
          onChangeCountry={setCountry}
          onChangeDevice={setDevice}
          onChangeDateRange={setDate}
          onRefresh={() => flash("Data refresh requested")}
          onExport={(fmt) => flash(`Export ${fmt.toUpperCase()}`)}
          onCompare={() => flash("Compare Competitor")}
          onOpenReports={() => flash("Add to Reports")}
          onCreateTask={() => flash("Create Task")}
          onSettings={() => flash("Open Settings")}
        />

        {/* demo body */}


          <div className="mt-2 text-[13px]">
  {active === "overview" && (
    <>
            <OviKpiSummarySection />
            <OVIKeywordDistributionSection />
            <DemoTopKeywordsSection />
            <OVI_Section_KeywordIntentBreakdown />
            <OVI_TopPositionChanges />
            <OVI_SerpFeatureMovement />
            <SerpFeatureLandscapeGrid />
            <OVI_SerpFeatureTrend />
            <OVI_TopPages />
            <Demo_TopSubdomainsPreview />
            <OVI_TopOrganicCompetitors />
            <CompetitivePositioningMap />
    </>
  )}

  {active === "keyword-trends" && (
    <>
        <KeywordTrendsAdvancedTable />
    </>
  )}    

  {active === "position-insights" && (
    <>
        <PositionChangesKpiSummary/>
        <PositionChangeTrend />
        <TopPage />
        <KeywordMovementAdvancedTable />
    </>
  )}

  {active === "page-insights" && (
    <>
    <PagesAdvancedTable />
    </>
  )}

{active === "subdomains" &&(
    <>
    <SubdomainsTable />
    </>
)}
  {active === "competitors" && (
    <>
    <CompetitorsTable_Refined />
    <CompetitorPositioningMap />
    </>
  )}
</div>

        </div>


      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md px-3 py-2 text-sm text-white shadow-lg" style={{ background: TOKENS.text }}>
          {toast}
        </div>
      )}
    </div>
  );
}
