import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings,
  Upload,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Clock,
  Globe2,
  MonitorSmartphone,
  CalendarDays,
  BarChart3,
  Search,
  ArrowLeftRight,
  Link2,
  LayoutGrid,
  Sparkles,
  ExternalLink,
  Info,
} from "lucide-react";
import DemoKpiSummarySection from "./overview/KpiSummarySection";
import CI_Section2_ComparisonTable from "./overview/ComparisonTable";
import RadarSeoSignalCardDemo from "./overview/RadarSeoSignalCard";
import CI_Section4_SERPFeatureCoverage from "./overview/SERPFeatureCoverage";
import Section5SmartSuggestions from "./overview/SmartSuggestions";
import DemoAddCompetitorModal from "./drawers/AddCompetitorModal";
import DemoCanvas from "./drawers/CompetitorSelector";
import CompetitorInsightsEmptyState from "./drawers/EmptyState";
import Manage from "./drawers/ManageCompetitor";
import CISettingsModalDemo from "./drawers/settings";
import SharedKeywordsKpiCards from "./shared-keywords/SharedKeywordsKpiCards";
import CI_SharedKeywordsTable from "./shared-keywords/SharedKeywordsTable";
import DemoSwitcher from "./shared-keywords/Switcher";
import KpiCardsKeywordGap from "./keyword-gap/KpiCardsKeywordGap";
import CI_KeywordGapTable from "./keyword-gap/KeywordGapTable";
import KG_OpportunityScatter from "./keyword-gap/OpportunityScatter";
import DemoBacklinkGapKpiSummary from "./backlink-gap/BacklinkGapKpiSummary";
import BacklinkGapTable from "./backlink-gap/BacklinkGapTable";
import WRScoreBenchmarkBlock from "./backlink-gap/ScoreBenchmarkBlock";
import LinkAuthorityOpportunityPlot from "./backlink-gap/LinkAuthorityOpportunityPlot";
import BacklinkSmartInsights from "./backlink-gap/BacklinkSmartInsights";
import SerpKpiSummaryDemo from "./serp-layout/SerpKpiSummaryDemo";
import OVI_SERPComparisonTable from "./serp-layout/SERPComparisonTable";
import VisualSerpTrendsSummary from "./serp-layout/VisualSerpTrendsSummary";
import StrategySuggestionsTab from "./strategy-suggestions/StrategySuggestionsTab";
import GlobalStrategyCardHolder from "./strategy-suggestions/GlobalStrategyCardHolder";
/**
 * Wranker • Competitor Insights — Header + Tabs
 * - No external UI deps; only React + lucide-react + Tailwind classes
 * - Matches global header pattern used elsewhere, adds 6-tab nav per spec
 * - Props allow wiring to your state/store; sensible defaults for demo
 *
 * Usage:
 * <CompetitorInsightsHeader
 *   projectDomain="wranker.com"
 *   seatsUsed={6}
 *   seatLimit={10}
 *   resetAt="2025-08-01"
 *   role="admin"
 *   activeTab="overview"
 *   onTabChange={(k) => ...}
 *   onAddCompetitor={() => ...}
 *   onExport={(fmt) => ...}
 *   onOpenSettings={() => ...}
 *   onUpgradePlan={() => ...}
 *   filters={{ device: "All", country: "US", date: "Last 30 Days" }}
 *   onFiltersChange={(next) => ...}
 * />
 */

// ---------- tokens (align to Wranker global tokens)
const TOKENS = {
  brand: "#1090D0",
  brandHover: "#0C7FB6",
  pastelBrand: "#D2EFFF",
  text: "#282829",
  textMuted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  danger: "#F04438",
  ok: "#16A34A",
} as const;

// ---------- small helpers
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
function daysUntil(dateISO?: string) {
  if (!dateISO) return null;
  const now = new Date();
  const end = new Date(dateISO);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

// ---------- primitives
function ChipButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  active,
  title,
}: {
  label: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm",
        active ? "bg-white" : "bg-[#F5F7FA]",
        "border-[#EFF0F6]",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#E5E7EB]"
      )}
      style={{ color: TOKENS.text }}
    >
      {Icon && <Icon size={16} className="text-[#9CA3AF]" />}
      <span>{label}</span>
      <ChevronDown size={16} className="text-[#9CA3AF]" />
    </button>
  );
}

function PrimaryButton({
  label,
  icon: Icon,
  onClick,
  title,
}: {
  label: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white shadow-sm"
      style={{ background: TOKENS.brand }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TOKENS.brandHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TOKENS.brand)}
    >
      {Icon && <Icon size={16} />}
      <span className="text-sm font-medium">{label}</span>
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

// ---------- dropdowns (device / country / date)
function DeviceDropdown({
  value,
  onChange,
}: {
  value: "All" | "Desktop" | "Mobile";
  onChange?: (v: "All" | "Desktop" | "Mobile") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const opts: Array<"All" | "Desktop" | "Mobile"> = ["All", "Desktop", "Mobile"];
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

function CountryDropdown({
  value,
  onChange,
}: {
  value: string; // ISO like "US"
  onChange?: (v: string) => void;
}) {
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

function DateDropdown({
  value,
  onChange,
}: {
  value: "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "Custom";
  onChange?: (v: "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "Custom") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const opts: Array<"Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "Custom"> = [
    "Last 7 Days",
    "Last 30 Days",
    "Last 90 Days",
    "Custom",
  ];
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

// ---------- Seat tracker
function SeatTracker({
  seatsUsed,
  seatLimit,
  resetAt,
}: {
  seatsUsed: number;
  seatLimit: number;
  resetAt?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((seatsUsed / Math.max(1, seatLimit)) * 100)));
  const resetIn = daysUntil(resetAt);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
        style={{ borderColor: TOKENS.border, background: "#FFFFFF", color: TOKENS.text }}
        title="Competitor seats used this month"
      >
        <span className="font-medium">Competitor Slots:</span>
        <span className="tabular-nums">
          {seatsUsed} / {seatLimit} Used
        </span>
        <span className="ml-2 inline-block h-2 w-24 overflow-hidden rounded bg-[#E5E7EB]">
          <span
            className="block h-full"
            style={{ width: `${pct}%`, background: pct >= 90 ? TOKENS.danger : TOKENS.brand }}
          />
        </span>
      </div>
      <div className="flex items-center gap-1 text-sm text-[#6B7280]">
        <Clock size={16} />
        <span>
          {typeof resetIn === "number" ? `Resets in: ${resetIn} days` : resetAt ? `Resets on: ${resetAt}` : null}
        </span>
      </div>
    </div>
  );
}

// ---------- Export menu
function ExportMenu({ onExport }: { onExport?: (fmt: "CSV" | "PDF" | "Link") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <IconOnly title="Export" onClick={() => setOpen((s) => !s)}>
        <Upload size={16} />
      </IconOnly>
      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[160px] rounded-md border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          {["CSV", "PDF", "Link"].map((x) => (
            <button
              key={x}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onExport?.(x as any);
                setOpen(false);
              }}
            >
              Export {x}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Tabs
type TabKey = "overview" | "shared" | "kw-gap" | "backlink-gap" | "serp" | "strategy";
const TABS: { key: TabKey; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "overview", label: "Overview", Icon: BarChart3 },
  { key: "shared", label: "Shared Keywords", Icon: Search },
  { key: "kw-gap", label: "Keyword Gap Analyzer", Icon: ArrowLeftRight },
  { key: "backlink-gap", label: "Backlink Gap Analyzer", Icon: Link2 },
  { key: "serp", label: "SERP Layout Comparison", Icon: LayoutGrid },
  { key: "strategy", label: "Strategy Suggestions", Icon: Sparkles },
];

function TabsBar({
  active,
  onTabChange,
}: {
  active: TabKey;
  onTabChange?: (k: TabKey) => void;
}) {
  return (
    <div className="w-full" role="tablist" aria-label="Competitor Insights Tabs">
      <div className="mt-4 border-b" style={{ borderColor: TOKENS.border }}>
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${key}`}
                className={classNames(
                  "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 cursor-pointer",
                  isActive ? "font-semibold" : "font-medium",
                  isActive ? "" : "hover:bg-gray-100"
                )}
                style={{
                  color: isActive ? TOKENS.brand : TOKENS.text,
                  backgroundColor: isActive ? TOKENS.pastelBrand : "transparent",
                }}
                onClick={() => onTabChange?.(key)}
              >
                <Icon size={16} className={isActive ? "" : "text-[#6B7280]"} />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[6px] h-[2px]" style={{ background: TOKENS.brand }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- main component
export type CIHeaderFilters = {
  device: "All" | "Desktop" | "Mobile";
  country: string; // ISO code
  date: "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "Custom";
};

export function CompetitorInsightsHeader({
  projectDomain = "wranker.com",
  allowProjectSwitch = false,
  projectHref,
  seatsUsed = 6,
  seatLimit = 10,
  resetAt,
  role = "editor" as "owner" | "admin" | "editor" | "viewer",
  activeTab = "overview" as TabKey,
  onTabChange,
  onAddCompetitor,
  onExport,
  onOpenSettings,
  onUpgradePlan,
  filters: initialFilters = { device: "All", country: "US", date: "Last 30 Days" },
  onFiltersChange,
}: {
  projectDomain?: string;
  allowProjectSwitch?: boolean;
  projectHref?: string;
  seatsUsed?: number;
  seatLimit?: number;
  resetAt?: string;
  role?: "owner" | "admin" | "editor" | "viewer";
  activeTab?: TabKey;
  onTabChange?: (k: TabKey) => void;
  onAddCompetitor?: () => void;
  onExport?: (fmt: "CSV" | "PDF" | "Link") => void;
  onOpenSettings?: () => void;
  onUpgradePlan?: () => void;
  filters?: CIHeaderFilters;
  onFiltersChange?: (next: CIHeaderFilters) => void;
}) {
  const [filters, setFilters] = useState<CIHeaderFilters>(initialFilters);
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters]); // eslint-disable-line

  const canManage = role === "owner" || role === "admin";
  const atLimit = seatsUsed >= seatLimit;

  const breadcrumb = useMemo(
    () => ["SEO Dashboard", "Competitor Intelligence", "Competitor Insights"],
    []
  );

  return (
    <header className="w-full text-[14px]" style={{ color: TOKENS.text }}>
      {/* Row 0: breadcrumb + optional link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 text-[14px] leading-tight">
          {breadcrumb.map((b, i) => (
            <div key={b} className="flex items-center gap-2">
              <span className={classNames(i < breadcrumb.length - 1 ? "text-[#6B7280]" : "font-semibold")} style={{ color: i < breadcrumb.length - 1 ? "#6B7280" : TOKENS.text }}>
                {b}
              </span>
              {i < breadcrumb.length - 1 && <span className="text-[#9CA3AF]">›</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Clock className="size-4" />
          <span>Panel: not sticky • Header pattern aligned</span>
        </div>
      </div>

      {/* Row 1: Title + right actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md" style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.border}` }}>
            <Search size={16} style={{ color: TOKENS.brand }} />
          </span>
          <h1 className="text-xl font-semibold">Competitor Insights</h1>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]">
            <Info size={12} /> Side‑by‑side comparisons & opportunities
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SeatTracker seatsUsed={seatsUsed} seatLimit={seatLimit} resetAt={resetAt} />
          {atLimit ? (
            <GhostButton label="Upgrade Plan" onClick={onUpgradePlan} />
          ) : (
            <DemoAddCompetitorModal/>
          )}
          <DemoCanvas />
          <Manage />
        </div>
      </div>

      {/* Row 2: Project + filters + tools */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Chip (read-only by default) */}
          <div
            className={classNames(
              "inline-flex items-center gap-2 h-9 px-3 rounded-md border",
              allowProjectSwitch ? "cursor-pointer hover:bg-[#E5E7EB]" : "cursor-default bg-[#F5F7FA]"
            )}
            style={{ borderColor: TOKENS.border }}
            title={allowProjectSwitch ? "Switch Project" : "Active Project"}
          >
            <span className="inline-flex h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#1090D0,#4286F5)]" />
            <span className="text-[14px] font-medium" style={{ color: "#1E3A8A" }}>
              {projectDomain}
            </span>
            {projectHref && <ExternalLink size={16} className="text-[#9CA3AF]" />}
            {allowProjectSwitch && <ChevronDown size={16} className="text-[#9CA3AF]" />}
          </div>

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

        <div className="flex items-center gap-2">
          <ExportMenu onExport={onExport} />
          {/* <IconOnly title="Settings" onClick={onOpenSettings}>
            <Settings size={16} />
          </IconOnly> */}
          <CISettingsModalDemo />
          <div className="relative">
            <IconOnly title="More">
              <MoreHorizontal size={16} />
            </IconOnly>
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="mt-3 border-b" style={{ borderColor: TOKENS.border }} />

      {/* (Optional) Global Strategy Card Holder would mount here */}

      {/* Tabs */}
      <TabsBar active={activeTab} onTabChange={onTabChange} />
    </header>
  );
}

/* -------------------- Optional demo wrapper (remove in production) -------------------- */
export default function Demo_CompetitorInsightsHeader() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [filters, setFilters] = useState<CIHeaderFilters>({
    device: "All",
    country: "US",
    date: "Last 30 Days",
  });
  const [seatsUsed, setSeatsUsed] = useState(6);

  return (
    <div className="w-full bg-white">
      <div className="mx-auto w-full px-6 py-6">
        <CompetitorInsightsHeader
          projectDomain="wranker.com"
          allowProjectSwitch={false}
          seatsUsed={seatsUsed}
          seatLimit={10}
          resetAt="2025-08-01"
          role="admin"
          activeTab={tab}
          onTabChange={(k) => setTab(k)}
          onAddCompetitor={() => setSeatsUsed((s) => Math.min(10, s + 1))}
          onExport={(fmt) => alert(`Export ${fmt}`)}
          onOpenSettings={() => alert("Open Settings")}
          onUpgradePlan={() => alert("Upgrade")}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* demo body area */}
        <div
          id={`panel-${tab}`}
          // style={{ borderColor: TOKENS.border, background: "#FAFCFE" }}
        >
        {tab === "overview" && (
            <>
                <DemoKpiSummarySection />
                <CI_Section2_ComparisonTable />
                <RadarSeoSignalCardDemo />
                <CI_Section4_SERPFeatureCoverage />
                <Section5SmartSuggestions />
               {/* If there is no competitor then it willl show below EmptyState */}
                {/* <CompetitorInsightsEmptyState /> */}
            </>
        )}

        {tab === "shared" && (
            <>
              <SharedKeywordsKpiCards />
              <CI_SharedKeywordsTable />
              <DemoSwitcher />
            </>
        )}    

         {tab === "kw-gap" && (
            <>
            <KpiCardsKeywordGap />
            <CI_KeywordGapTable />
            <KG_OpportunityScatter />
            </>
        )}

        {tab === "backlink-gap" && (
            <>
              <DemoBacklinkGapKpiSummary />
              <WRScoreBenchmarkBlock />
              <BacklinkGapTable/>
              <LinkAuthorityOpportunityPlot />
              <BacklinkSmartInsights />
            </>
        )}

        {tab === "serp" &&(
             <>
              <SerpKpiSummaryDemo />
              <OVI_SERPComparisonTable />
              <VisualSerpTrendsSummary />
            </>
        )}
        {tab === "strategy" && (
            <>
            <StrategySuggestionsTab  projectDomain={""}/>
            <GlobalStrategyCardHolder />
            </>
         )}
        </div>
      </div>
    </div>
  );
}
