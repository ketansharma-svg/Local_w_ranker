import { ProjectSelector } from "@/src/components/common/project-selector";
import SetupModal from "@/src/components/common/SetupModal";
import GaIntegrationSection from "@/src/components/ga/GaIntegrationSection";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  Clock,
  Grid3X3, Layers, ListChecks,
  Plus, RefreshCw, Search,
  Settings, Share2, TrendingUp, Upload,
  X
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Tooltip as ReTooltip, ResponsiveContainer,
  XAxis, YAxis
} from "recharts";
import { Breadcrumb } from "../keyword-insights/components/keywordInsightsHeader";
import ConversionByDeviceCountry from "./conversion/ConversionByDeviceCountry";
import ConversionBySourceMediumSection from "./conversion/ConversionBySourceMediumSection";
import ConversionFunnelSection from "./conversion/ConversionFunnelSection";
import ConversionTrendsOverTime from "./conversion/ConversionTrendsOverTime";
import DemoConversionSummaryKpis from "./conversion/DemoConversionSummaryKpis";
import LowConversionOpportunitiesTable from "./conversion/LowConversionOpportunitiesTable";
import TopConvertingTable from "./conversion/TopConvertingTable";
import { LandingPagesComparisonCards } from "./landing/DemoLandingPagesComparisonCards";
import LP_Section5_ScrollDepthPerPage from "./landing/LP_Section5_ScrollDepthPerPage";
import LandingPagesTablePage from "./landing/Page";
import Section33 from "./landing/Section33";
import { useLandingPages } from "./landing/useLandingPages";
import AnalyticsDeviceGeoSection from "./overview/AnalyticsDeviceGeoSection";
import AnalyticsProgressToGoalSection from "./overview/AnalyticsProgressToGoalSection";
import { AnalyticsOverviewKpiSection } from "./overview/DemoKpiSection";
import IndexedVsPerformingSection from "./overview/IndexedVsPerformingSection";
import SourceBreakdownTable from "./overview/SourceBreakdownTable";
import CtrVsPositionHeatmap from "./search/CtrVsPositionHeatmap";
import DemoSearchKpisOverview from "./search/DemoSearchKpisOverview";
import KeywordPerformanceTable from "./search/KeywordPerformanceTable";
import PageLevelSearchInsightsSection from "./search/PageLevelSearchInsightsSection";
import SearchDeviceCountrySection from "./search/SearchDeviceCountrySection";
import SearchTrendsOverTime from "./search/SearchTrendsOverTime";
import AnalyticsPanelSettings from "./settings/AnalyticsPanelSettings";
import BehaviorByDeviceSection from "./traffic/BehaviorByDeviceSection";
import DropoffsExitRatesSection from "./traffic/DropoffsExitRatesSection";
import EngagementOverTimeSection from "./traffic/EngagementOverTimeSection";
import ReturningVsNewUsersSection from "./traffic/ReturningVsNewUsersSection";
import ScrollDepthSection from "./traffic/ScrollDepthSection";
import SessionsBySourceMedium from "./traffic/SessionsBySourceMedium";
import TopPagesByEngagementTable from "./traffic/TopPagesByEngagementTable";
import { useTrafficEngagement } from "./traffic/useTrafficEngagement";
/* ------------------------- TOKENS (Analytics) ------------------------- */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastelBrand: "#D9EEF8",
  valueBlue: "#0077FF",
  chartBlue: "#4286F5",
  chartBlueFill: "#BDD6FF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  textDarkerMuted: "#374151",
  rowBg: "#FAFAFA",
  radius: 8,
  borderW: 1,
  fontFamily:
    'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  donutRemainder: "#E5E7EB",
};

/* ------------------------- Utilities ------------------------- */
function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);
  return ref;
}

function IconOnlyButton({
  title, onClick, children,
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
      className="h-9 w-9 grid place-items-center"
      style={{
        borderRadius: TOKENS.radius,
        border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}`,
        background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  title, children, onClick,
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
      style={{ background: hover ? TOKENS.brandHover : TOKENS.brand, borderRadius: TOKENS.radius, cursor: "pointer" }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

function ChipButton({
  title, children, onClick, active,
}: React.PropsWithChildren<{ title: string; onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void; active?: boolean }>) {
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
        border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}`,
        borderRadius: TOKENS.radius,
        background: active ? TOKENS.brand : hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: active ? "#FFFFFF" : TOKENS.text,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SourceFilter() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"All Sources" | "GA4" | "GSC">("All Sources");
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Source Filter" onClick={() => setOpen((s) => !s)}>
        <Grid3X3 className="w-4 h-4 text-[#9CA3AF]" />
        <span>{source}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ChipButton>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[220px] bg-white shadow"
          style={{ borderRadius: TOKENS.radius, border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
        >
          {(["All Sources", "GA4", "GSC"] as const).map((s) => (
            <button
              key={s}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => { setSource(s); setOpen(false); }}
              style={{ cursor: "pointer" }}
            >
              {s} {source === s ? "?" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateRange() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("Last 30 Days");
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const options = ["Last 7 Days", "Last 14 Days", "Last 30 Days", "Last 90 Days", "Custom?"];

  return (
    <div className="relative" ref={ref}>
      <ChipButton title="Date Range" onClick={() => setOpen((s) => !s)}>
        <Clock className="w-4 h-4 text-[#9CA3AF]" />
        <span>{range}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </ChipButton>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[220px] bg-white shadow"
          style={{ borderRadius: TOKENS.radius, border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
        >
          {options.map((o) => (
            <button key={o} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => { setRange(o); setOpen(false); }} style={{ cursor: "pointer" }}>
              {o} {range === o ? "?" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationsButton() {
  // demo statuses: "connected" | "warning" | "error"
  const status: "connected" | "warning" | "error" = "warning";
  // const color = status === "connected" ? "#10B981" : status === "warning" ? "#F59E0B" : "#EF4444";
  return (
    <ChipButton title="Integrations" onClick={() => alert("Open Integrations modal (demo)")}>
      <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: "#F59E0B" }} />
      <span>Integrations</span>
    </ChipButton>
  );
}

/* ------------------------- Sticky Panel Header ------------------------- */
/** Matches Analytics header: breadcrumb + global filters + actions. (Sticky) */
function AnalyticsPanelHeader({
  onCreateProject,
}: { onCreateProject?: () => void }) {
  const lastUpdated = useMemo(() => {
    const d = new Date();
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  }, []);

  const [drawerRow, setDrawerRow] = useState(false);

  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };

  return (
    <header
      className="sticky top-0 z-40 bg-white"
      style={{ borderBottom: `${TOKENS.borderW}px solid ${TOKENS.borderLight}`, fontFamily: TOKENS.fontFamily }}
    >
      <div className="mx-auto max-w-8xl px-6 py-3">
        {/* Row 1 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb />
          <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textDarkerMuted }}>
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ProjectSelector />
            {/* <SourceFilter /> */}
            {/* <DateRange /> */}
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <PrimaryButton title="Create Project" onClick={onCreateProject}><Plus className="w-4 h-4" /></PrimaryButton>
            <div className="relative">
              <IconOnlyButton title="Export" onClick={() => alert("Export menu (demo)")}>
                <Upload className="w-4 h-4" />
              </IconOnlyButton>
            </div>
            <IconOnlyButton title="Re-crawl"><RefreshCw className="w-4 h-4" /></IconOnlyButton>
            <IconOnlyButton title="Create Task"><ListChecks className="w-4 h-4" /></IconOnlyButton>
            <IconOnlyButton title="Share"><Share2 className="w-4 h-4" /></IconOnlyButton>
            <IconOnlyButton title="Add to Reports"><BarChart3 className="w-4 h-4" /></IconOnlyButton>
            {/* <IconOnlyButton title="Settings" onClick={openDrawer}>
              <Settings className="w-4 h-4" />
            </IconOnlyButton> */}
            {/* <ChipButton title="Integrations" onClick={openDrawer}>
              <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: "#F59E0B" }} />
              <span>Integrations</span>
            </ChipButton> */}

            {drawerRow && (
              <AnalyticsPanelSettings drawerRow={drawerRow} closeDrawer={closeDrawer} />
            )}


          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------- Micro viz ------------------------- */
const tooltipLabel = (l: any) =>
  new Date(l as string).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

function SparkMini({ data }: { data: { date: string; value: number }[] }) {

  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={[0, "dataMax+"]} />
        <ReTooltip labelFormatter={tooltipLabel} />
        <Area type="monotone" dataKey="value" stroke={TOKENS.chartBlue} fill={TOKENS.chartBlueFill} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------- Smart Summary (collapsible) ------------------------- */
type SummaryCard = {
  id: string;
  title: string;
  source: "GA4" | "GSC" | "Wranker";
  metric: string;             // main number e.g., "-23%"
  sub: string;                // e.g., "sessions on /pricing"
  spark?: { date: string; value: number }[];
  tone?: "up" | "down" | "neutral";
  cta?: { label: string; onClick: () => void };
};

const demoSeries = (n = 12, base = 50) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
    return { date: d.toISOString(), value: Math.max(1, Math.round(base + Math.sin(i / 2) * 10 + (Math.random() * 8 - 4))) };
  });

function SmartSummary() {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  const [hidden, setHidden] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem("analytics.smartSummary.hidden") || "{}"); }
    catch { return {}; }
  });

  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("analytics.smartSummary.collapsed", collapsed ? "1" : "0"); }, [collapsed]);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("analytics.smartSummary.hidden", JSON.stringify(hidden)); }, [hidden]);

  const cards: SummaryCard[] = [
    {
      id: "drop", title: "Traffic Drop Detected", source: "GA4", metric: "-23%", sub: "sessions on /pricing vs last week", spark: demoSeries(12, 42), tone: "down",
      cta: { label: "View Landing Pages", onClick: () => location.hash = "#landing" }
    },
    {
      id: "rankloss", title: "Keyword Rank Loss", source: "GSC", metric: "3", sub: "keywords fell out of Top 10", spark: demoSeries(12, 28), tone: "down",
      cta: { label: "Open Search Performance", onClick: () => location.hash = "#search" }
    },
    { id: "newquery", title: "New Query Opportunity", source: "GSC", metric: "+240", sub: "new impressions: ?seo checklist 2025?", spark: demoSeries(12, 35), tone: "up" },
    { id: "bounce", title: "Bounce Rate Spike", source: "GA4", metric: "+12%", sub: "sitewide bounce vs prior", spark: demoSeries(12, 55), tone: "down" },
  ];

  if (collapsed) {

    return (
      <section className="mx-auto w-full px-6">
        <div
          className="mt-4 mb-2 flex items-center justify-between rounded-md bg-white px-4 py-2"
          style={{ border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
        >
          <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
            Smart Summary
          </div>
          <button className="text-[13px] px-2 py-1 rounded hover:bg-gray-100" onClick={() => setCollapsed(false)}>
            Expand
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-8xl px-6">
      <div
        className="mt-4 rounded-md bg-[#F5F7FA] p-3"
        style={{ border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.textMuted }}>
            Smart Summary
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[13px] px-2 py-1 rounded hover:bg-gray-100" onClick={() => setCollapsed(true)}>
              Collapse
            </button>
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {cards.filter(c => !hidden[c.id]).map((c) => (
            <article key={c.id}
              className="relative rounded-md bg-white p-3"
              style={{ border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
            >
              <button
                aria-label="Hide card"
                onClick={() => setHidden(s => ({ ...s, [c.id]: true }))}
                className="absolute right-2 top-2 rounded p-1 hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-[#9CA3AF]" />
              </button>
              <div className="flex items-start justify-between">
                <div className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>{c.title}</div>
                <span
                  className="ml-2 inline-flex items-center rounded px-2 py-[2px] text-[11px] font-medium"
                  style={{ background: TOKENS.pastelBrand, color: TOKENS.brand }}
                  title="Data source"
                >
                  {c.source}
                </span>
              </div>
              <div className="mt-1 text-[13px]" style={{ color: TOKENS.textMuted }}>{c.sub}</div>
              <div className="mt-2 grid items-center" style={{ gridTemplateColumns: "auto 1fr", columnGap: 12 }}>
                <div className="text-2xl font-semibold"
                  style={{ color: c.tone === "up" ? TOKENS.success : c.tone === "down" ? TOKENS.danger : TOKENS.text }}>
                  {c.metric}
                </div>
                {c.spark && <SparkMini data={c.spark} />}
              </div>
              {c.cta && (
                <div className="mt-2 flex justify-end">
                  <button
                    className="text-[13px] underline"
                    style={{ color: TOKENS.valueBlue }}
                    onClick={c.cta.onClick}
                  >
                    {c.cta.label}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- Tabs (a11y + hash routing) ------------------------- */
type TabKey = "overview" | "traffic" | "landing" | "conversions" | "search" | "settings";
const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<any> }> = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "traffic", label: "Traffic & Engagement", icon: TrendingUp },
  { key: "landing", label: "Landing Pages", icon: Layers },
  // { key: "conversions", label: "Conversions", icon: ListChecks },
  // { key: "search", label: "Search Performance", icon: Search },
  // { key: "settings",    label: "Panel Settings",        icon: Settings },
];

function TabsNav({
  active, onChange,
}: { active: TabKey; onChange: (k: TabKey) => void }) {
  const listRef = useRef<HTMLDivElement | null>(null);

  function focusTab(idx: number) {
    const el = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')?.[idx];
    el?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!items || !items.length) return;
    const idx = Array.from(items).findIndex(el => el.getAttribute("data-key") === active);
    if (e.key === "ArrowRight") { const ni = (idx + 1) % items.length; focusTab(ni); onChange(items[ni].getAttribute("data-key") as TabKey); }
    if (e.key === "ArrowLeft") { const ni = (idx - 1 + items.length) % items.length; focusTab(ni); onChange(items[ni].getAttribute("data-key") as TabKey); }
    if (e.key === "Home") { focusTab(0); onChange(items[0].getAttribute("data-key") as TabKey); }
    if (e.key === "End") { focusTab(items.length - 1); onChange(items[items.length - 1].getAttribute("data-key") as TabKey); }
  }

  return (
    <nav aria-label="Analytics tabs" className="mx-auto w-full px-6 mt-4">
      <div
        className="rounded-md bg-white"
      >
        <div
          role="tablist"
          aria-orientation="horizontal"
          className="flex items-center gap-6 px-2 pb-1"
          onKeyDown={onKeyDown}
          ref={listRef}
          style={{ borderBottom: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                role="tab"
                data-key={key}
                id={`tab-${key}`}
                aria-selected={isActive}
                aria-controls={`panel-${key}`}
                tabIndex={isActive ? 0 : -1}
                className="relative flex items-center gap-2 py-2 px-3 rounded-md"
                onClick={() => onChange(key)}
                style={{
                  color: isActive ? TOKENS.brand : TOKENS.text,
                  backgroundColor: isActive ? TOKENS.pastelBrand : "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = TOKENS.chipHover; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                title={label}
              >
                <Icon size={16} className={isActive ? "" : "text-[#6B7280]"} />
                <span className={isActive ? "font-semibold" : "font-medium"}>{label}</span>
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[6px] h-[2px]" style={{ backgroundColor: TOKENS.brand }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function TabPanel({
  active, tab, children,
}: React.PropsWithChildren<{ active: TabKey; tab: TabKey }>) {
  const hidden = active !== tab;

  return (
    <section
      id={`panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab}`}
      hidden={hidden}
      className="mx-auto w-8xl px-6"
    >
      {!hidden && (
        <div >
          {children}
        </div>
      )}
    </section>
  );
}

/* ------------------------- Main: Analytics Panel Shell ------------------------- */
export default function Rankings({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<TabKey>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [gaOverviewData, setGaOverviewData] = useState<any | null>(null);
  const [gaOverviewLoading, setGaOverviewLoading] = useState(false);
  const [gaOverviewError, setGaOverviewError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false)
  const [trafficInputs, setTrafficInputs] = useState<{ projectId?: number; start?: string; end?: string } | null>(null)
  const [landingPageIndex, setLandingPageIndex] = useState(1);
  const [scrollPageIndex, setScrollPageIndex] = useState(1);


  const normalizedStatus = String(gaOverviewData?.status ?? "").toLowerCase();
  const isFetchingStatus = normalizedStatus === "fetching";
  const loading = gaOverviewLoading || isFetchingStatus;
  const isGaOverviewReady = useMemo(() => !!gaOverviewData && !gaOverviewError, [gaOverviewData, gaOverviewError]);
  const canViewAnalyticsContent = Boolean(gaOverviewData && !gaOverviewLoading && !gaOverviewError);

  const { selectedProject, refreshProjects } = useProjectManager()
  // --- KPI data from overview_kpis + series from daily_raw_kpi ---
  const kpiData = (() => {
    // Helpers
    const toSec = (mmss?: string) => {
      const [m, s] = (mmss || "00:00").split(":").map(Number);
      return (m || 0) * 60 + (s || 0);
    };
    // Build GA4 daily series (current period)
    const ga4Days: Array<any> = gaOverviewData?.daily_raw_kpi?.ga4?.current_daily ?? []; // sessions, engagedSessions, userEngagementDuration, averageSessionDuration etc.
    // Build GSC daily series (current period)
    const gscDays: Array<any> = gaOverviewData?.daily_raw_kpi?.gsc?.current_daily ?? []; // clicks, impressions, ctr, position

    const S = (date: string, v: number) => ({ t: date, v });

    const seriesSessions = ga4Days.map(d => S(d.date, Number(d.sessions || 0)));                                            // :contentReference[oaicite:6]{index=6}
    const seriesEngRate = ga4Days.map(d => {
      const s = Number(d.sessions || 0);
      const e = Number(d.engagedSessions || 0);
      const pct = s > 0 ? (e / s) * 100 : 0;
      return S(d.date, pct);
    });                                                                                                                       // :contentReference[oaicite:7]{index=7}
    const seriesBounce = ga4Days.map(d => {
      const s = Number(d.sessions || 0);
      const e = Number(d.engagedSessions || 0);
      const br = s > 0 ? ((s - e) / s) * 100 : 0;
      return S(d.date, br);
    });                                                                                                                       // :contentReference[oaicite:8]{index=8}
    const seriesAvgEngTime = ga4Days.map(d => {
      const s = Math.max(1, Number(d.sessions || 0)); // avoid ?0
      const engagedSec = Number(d.userEngagementDuration || 0);
      return S(d.date, engagedSec / s);
    });                                                                                                                       // :contentReference[oaicite:9]{index=9}

    const seriesClicks = gscDays.map(d => S(d.date, Number(d.clicks || 0)));                                                 // :contentReference[oaicite:10]{index=10}
    const seriesImpr = gscDays.map(d => S(d.date, Number(d.impressions || 0)));                                            // :contentReference[oaicite:11]{index=11}
    const seriesCtr = gscDays.map(d => S(d.date, Number(d.ctr || 0) * 100));                                              // :contentReference[oaicite:12]{index=12}
    const seriesPos = gscDays.map(d => S(d.date, Number(d.position || 0)));                                               // :contentReference[oaicite:13]{index=13}

    return {
      // snapshot values from overview_kpis
      totalSessions: { value: gaOverviewData?.overview_kpis?.total_sessions?.value ?? 0, connected: true, series: seriesSessions },             // :contentReference[oaicite:14]{index=14}
      engagementRate: { value: gaOverviewData?.overview_kpis?.engagement_rate?.value ?? 0, connected: true, series: seriesEngRate },             // :contentReference[oaicite:15]{index=15}
      bounceRate: { value: 100 - (gaOverviewData?.overview_kpis?.engagement_rate?.value ?? 0), connected: true, series: seriesBounce },      // :contentReference[oaicite:16]{index=16}
      avgEngagementTime: { value: toSec(gaOverviewData?.overview_kpis?.avg_engagement_time?.value ?? "00:00"), connected: true, series: seriesAvgEngTime }, // :contentReference[oaicite:17]{index=17}

      // GSC (connected flag will hide in card if absent)
      organicClicks: { value: gaOverviewData?.overview_kpis?.organic_clicks?.value ?? 0, connected: Boolean(gaOverviewData?.data_sources?.gsc), series: seriesClicks },       // :contentReference[oaicite:18]{index=18}
      organicImpressions: { value: gaOverviewData?.overview_kpis?.organic_impressions?.value ?? 0, connected: Boolean(gaOverviewData?.data_sources?.gsc), series: seriesImpr },     // :contentReference[oaicite:19]{index=19}
      organicCtr: { value: (gaOverviewData?.overview_kpis?.organic_ctr?.value ?? 0) * 100, connected: Boolean(gaOverviewData?.data_sources?.gsc), series: seriesCtr },      // :contentReference[oaicite:20]{index=20}
      avgPosition: { value: gaOverviewData?.overview_kpis?.average_position?.value ?? 0, connected: Boolean(gaOverviewData?.data_sources?.gsc), series: seriesPos },         // :contentReference[oaicite:21]{index=21}
    };
  })();

  // Source table (Traffic Source Breakdown) from GA4 details
  const sRows = (gaOverviewData?.source_performance_details ?? []).map((r: any, i: number) => {
    const type =
      r.source_medium.includes("organic") ? "Organic" :
        r.source_medium.includes("cpc") ? "Paid" :
          r.source_medium.includes("referral") ? "Referral" :
            r.source_medium.includes("email") ? "Email" :
              r.source_medium.includes("social") ? "Social" :
                r.source_medium.includes("direct") ? "Direct" : "Other";
    const toSec = (mmss: string) => {
      const [m, s] = (mmss || "00:00").split(":").map(Number);
      return (m || 0) * 60 + (s || 0);
    };
    return {
      id: `${type}-${i}`,
      sourceMedium: r.source_medium,
      sourceType: type,
      sessions: r.sessions ?? 0,
      engagementRate: (parseFloat(String(r.engagement_rate || "").replace("%", "")) / 100) || 0,
      bounceRate: (parseFloat(String(r.bounce_rate || "").replace("%", "")) / 100) || 0,
      avgTimeSec: toSec(r.avg_time ?? "00:00"),
      conversions: r.conversions ?? undefined,
    };
  }); // bound to source_performance_details :contentReference[oaicite:22]{index=22}

  // Indexed vs Performing ? categories + underperforming pages
  const categories = (gaOverviewData?.page_category_analysis?.category_chart_data ?? []).map((c: any) => ({
    category: c.category,
    indexed: Number(c.indexed_pages ?? 0),
    performing: Number(c.pages_with_sessions ?? 0),
  })); // :contentReference[oaicite:23]{index=23}

  const underperformingRows = (gaOverviewData?.page_category_analysis?.underperforming_pages ?? []).map((p: any, idx: number) => ({
    id: String(idx + 1),
    url: p.url,
    category: p.category,
    indexed: Boolean(p.indexed),
    sessions: Number(p.sessions ?? 0),
    engagementRate: p.engagement_rate === "?" ? undefined : Number(p.engagement_rate),
    lastUpdated: p.last_updated && p.last_updated !== "?" ? p.last_updated : undefined,
    issues: undefined, // optional: wire Site Audit flags if you expose them later
  })); // feeds table rows (no mock) :contentReference[oaicite:24]{index=24}

  // Device & Geo distribution
  const deviceData = (() => {
    const d = gaOverviewData?.device_geographic_distribution?.device_distribution ?? {};
    return [
      { device: "Desktop", sessions: d.desktop?.sessions ?? 0, engagementRate: 0, bounceRate: 0, avgSessionDurationSec: 0 },
      { device: "Mobile", sessions: d.mobile?.sessions ?? 0, engagementRate: 0, bounceRate: 0, avgSessionDurationSec: 0 },
      ...(d.tablet ? [{ device: "Tablet", sessions: d.tablet?.sessions ?? 0, engagementRate: 0, bounceRate: 0, avgSessionDurationSec: 0 }] : []),
    ];
  })(); // :contentReference[oaicite:25]{index=25}

  const geoData = (() => {
    const sessions = (gaOverviewData?.device_geographic_distribution?.top_countries_by_session ?? [])
      .reduce((m: any, r: any) => (m[r.country] = r.sessions, m), {});
    const er = (gaOverviewData?.device_geographic_distribution?.top_countries_by_engagement_rate ?? [])
      .reduce((m: any, r: any) => (m[r.country] = r.engagement_rate * 100, m), {}); // 0..1 ? %
    const br = (gaOverviewData?.device_geographic_distribution?.top_countries_by_bounce_rate ?? [])
      .reduce((m: any, r: any) => (m[r.country] = r.bounce_rate * 100, m), {});     // 0..1 ? %
    const all = Array.from(new Set([...Object.keys(sessions), ...Object.keys(er), ...Object.keys(br)]));
    return all.map(country => ({
      country,
      countryCode: "", // TODO: map to ISO-2 if/when available
      sessions: Number(sessions[country] ?? 0),
      clicks: undefined, // optional GSC clicks by country
      engagementRate: Number(er[country] ?? 0),
      bounceRate: Number(br[country] ?? 0),
    }));
  })(); // :contentReference[oaicite:26]{index=26}

  // Impact Matrix ? prefer source_impact_matrix (has CTR/Position fields)
  const impactRows = (gaOverviewData?.source_impact_matrix ?? []).map((r: any) => {
    const type =
      r.source_medium.includes("organic") ? "Organic" :
        r.source_medium.includes("cpc") ? "Paid" :
          r.source_medium.includes("referral") ? "Referral" :
            r.source_medium.includes("email") ? "Email" :
              r.source_medium.includes("social") ? "Social" :
                r.source_medium.includes("direct") ? "Direct" : "Other";
    const pct = (x: any) => {
      if (x === "?" || x == null) return undefined;
      return typeof x === "number" ? x / 100 : Number(String(x).replace("%", "")) / 100;
    };
    const toNum = (x: any) => (x === "?" || x == null ? undefined : Number(x));
    return {
      id: r.source_medium.replace(/\W+/g, "_"),
      sourceMedium: r.source_medium,
      type,
      sessions: Number(r.sessions ?? 0),
      engagementRate: pct(r.engagement_percentage),
      bounceRate: pct(r.bounce_percentage),
      conversions: toNum(r.conversions),
      ctr: type === "Organic" ? (typeof r.ctr_organic === "number" ? Number(r.ctr_organic) : undefined) : undefined,
      avgPosition: type === "Organic" ? toNum(r.avg_position) : undefined,
    };
  }); // :contentReference[oaicite:27]{index=27}

  // --- UI helpers: animated skeletons (subtle, premium) ---
  const FadeIn = ({ i = 0, children }: React.PropsWithChildren<{ i?: number }>) => (
    <motion.div
      initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.01 * i }}
    >
      {children}
    </motion.div>
  );

  const PulseBlock = ({ h = 80 }: { h?: number }) => (
    <div className="animate-pulse rounded-md bg-slate-100" style={{ height: h }} />
  );

  const OverviewSkeleton = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-4 space-y-4"
    >
      {/* KPIs skeleton grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        {[0, 1, 2].map(i => <FadeIn i={i} key={i}><PulseBlock h={160} /></FadeIn>)}
      </div>
      {/* Tables/sections skeletons */}
      {[180, 320, 240, 360].map((h, i) => <FadeIn i={i + 3} key={i}><PulseBlock h={h} /></FadeIn>)}
    </motion.div>
  );



  useEffect(() => {
    const parseHash = () => {
      const h = (typeof window !== "undefined" && window.location.hash ? window.location.hash.slice(1) : "").toLowerCase();
      const k = TABS.find(t => t.key === h)?.key;
      if (k) setActive(k);
    };
    parseHash();
    const onHash = () => parseHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // push hash when tab changes
  function changeTab(k: TabKey) {
    setActive(k);
    if (typeof window !== "undefined") {
      if (window.location.hash.slice(1) !== k) window.location.hash = k;
    }
  }


  const dateRangeForTraffic = useMemo(() => {
    if (trafficInputs?.start && trafficInputs?.end) {
      return { start: trafficInputs.start, end: trafficInputs.end }
    }
    const s = gaOverviewData?.date_range?.start_date
    const e = gaOverviewData?.date_range?.end_date
    return (s && e) ? { start: s, end: e } : undefined
  }, [trafficInputs?.start, trafficInputs?.end, gaOverviewData?.date_range?.start_date, gaOverviewData?.date_range?.end_date])

  const projectId = useMemo(() => {
    if (trafficInputs?.projectId) return trafficInputs.projectId
    const pid = gaOverviewData?.site_info?.id ?? gaOverviewData?.project_id
    return typeof pid === "number" ? pid : undefined
  }, [trafficInputs?.projectId, gaOverviewData?.site_info?.id, gaOverviewData?.project_id])


  const {
    data: trafficData,
    loading: trafficLoading,
    error: trafficError,
    refetch: refetchTraffic,
    meta: { lastFetchedAt: trafficLastFetched, hasContent: trafficHasContent },
  } = useTrafficEngagement({
    activeTab: active as any,
    projectId,
    dateRange: dateRangeForTraffic,
  });

  const srcMediumRows = trafficData?.data?.charts?.sources ?? []; // SessionsBySourceMedium
  const deviceRows = trafficData?.data?.charts?.devices ?? []; // BehaviorByDevice
  const dailySeries = trafficData?.data?.charts?.daily_metrics ?? []; // EngagementOverTime
  const userTypeSplit = trafficData?.data?.charts?.user_types ?? {}; // ReturningVsNew
  const userCards = trafficData?.data?.charts?.user_cards ?? []; // ReturningVsNew cards
  const scrollAnalysis = trafficData?.data?.charts?.scroll_depth_analysis ?? []; // ScrollDepthSection
  const scrollSummary = trafficData?.data?.charts?.scroll_summary ?? null; // ScrollDepthSection summary
  const perPageRows = trafficData?.data?.charts?.daily_metrics_device_session ?? []; // TopPagesByEngagement
  const landingTable = trafficData?.data?.landing_page_scroll_performance ?? []; // DropoffsExitRates

const {
  data: landingData,
  loading: landingLoading,
  error: landingError,
  refetch: refetchLanding,
  meta: { lastFetchedAt: landingLastFetched, hasContent: landingHasContent },
  scroll: { rows: scrollRows, loading: scrollLoading, error: scrollError, hasFullBuckets, domain: scrollDomain, pagination: scrollPagination }
} = useLandingPages({
  activeTab: active as any,
  projectId,
  dateRange: dateRangeForTraffic,
  page: landingPageIndex,
  pagesToLoad: 1,
  scrollPage: scrollPageIndex,
  domain: gaOverviewData?.site_info?.domain,
});


const landingPayload =  landingData || {};

  useEffect(() => {
    setLandingPageIndex(1);
    setScrollPageIndex(1);
  }, [projectId, dateRangeForTraffic?.start, dateRangeForTraffic?.end]);

  useEffect(() => {
    const responsePage =
      typeof landingPayload?.current_page === "number"
        ? landingPayload.current_page
        : typeof landingPayload?.currentPage === "number"
          ? landingPayload.currentPage
          : undefined;
    if (typeof responsePage === "number") {
      setLandingPageIndex((prev) => (prev === responsePage ? prev : responsePage));
    }
  }, [landingPayload?.current_page, landingPayload?.currentPage]);

  useEffect(() => {
    const responsePage =
      typeof scrollPagination?.currentPage === "number" ? scrollPagination.currentPage : undefined;
    if (typeof responsePage === "number") {
      setScrollPageIndex((prev) => (prev === responsePage ? prev : responsePage));
    }
  }, [scrollPagination?.currentPage]);

  // Build a sessions lookup (path -> sessions) from landing pages payload
  const sessionsLookup = useMemo(() => {
    const m = new Map<string, number>();
    const pages = Array.isArray(landingPayload?.pages) ? landingPayload.pages : [];
    for (const p of pages) {
      let path = (p.page_path || p.full_url || "/").split("?")[0];
      if (!path.startsWith("/")) {
        try {
          const url = new URL(path, "https://placeholder.local");
          path = url.pathname || "/";
        } catch {
          path = `/${path}`;
        }
      }
      const s = Math.max(0, Number(p.sessions ?? 0));
      if (path) m.set(path, s);
      // add both with and without trailing slash for easier joins
      if (path.endsWith("/") && path.length > 1) m.set(path.slice(0, -1), s);
      if (!path.endsWith("/")) m.set(`${path}/`, s);
    }
    return m;
  }, [landingPayload?.pages]);


  // --- add just above the <motion.div> that renders Landing tab content
  type LandingApiPage = {
    date: string;
    page_path: string;
    page_title: string;
    full_url: string;
    device: string;
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    position: number | null;
    sessions: number | null;
    bounce_rate: number | null;    // 0..1 per your sample (0, 1) OR % (100) depending backend
    page_views: number | null;
    users: number | null;
    avg_engagement_seconds: number | null;
    conversions: number | null;
    has_gsc_data: boolean;
    has_ga4_data: boolean;
  };

  // helpers (keep tiny and local)
  const toNumberSafe = (value: unknown): number | undefined => {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };
  const pct = (v: number | null | undefined) => (typeof v === "number" ? v : 0);
  const pct01To100 = (v: number | null | undefined) =>
    typeof v === "number" ? (v <= 1 ? v * 100 : v) : 0;

  const landingPages = Array.isArray(landingPayload?.pages)
    ? (landingPayload.pages as LandingApiPage[])
    : [];

  const landingPagination = useMemo(() => {
    const totalRecordsVal =
      toNumberSafe((landingPayload as any)?.total_records) ??
      toNumberSafe((landingPayload as any)?.totalRecords) ??
      landingPages.length;
    const pageSizeVal =
      (toNumberSafe((landingPayload as any)?.page_size) ??
        toNumberSafe((landingPayload as any)?.pageSize) ??
        landingPages.length) ||
      10;
    const currentPageVal =
      toNumberSafe((landingPayload as any)?.current_page) ??
      toNumberSafe((landingPayload as any)?.currentPage) ??
      landingPageIndex;
    const totalPagesVal =
      toNumberSafe((landingPayload as any)?.total_pages) ??
      toNumberSafe((landingPayload as any)?.totalPages) ??
      (pageSizeVal ? Math.ceil((totalRecordsVal || landingPages.length) / pageSizeVal) : 1);

    return {
      totalRecords: Math.max(0, totalRecordsVal || 0),
      pageSize: Math.max(1, pageSizeVal || 10),
      currentPage: Math.max(1, currentPageVal || 1),
      totalPages: Math.max(1, totalPagesVal || 1),
    };
  }, [
    landingPayload,
    landingPages.length,
    landingPageIndex,
  ]);

  const handleLandingPageChange = useCallback((nextPage: number) => {
    setLandingPageIndex((prev) => {
      const safeNext = Math.max(1, nextPage);
      return prev === safeNext ? prev : safeNext;
    });
  }, []);

  const handleScrollPageChange = useCallback((nextPage: number) => {
    setScrollPageIndex((prev) => {
      const safeNext = Math.max(1, nextPage);
      return prev === safeNext ? prev : safeNext;
    });
  }, []);

  // 1) Cards need a single highlighted page; pick most recent with max sessions
  const topBySessions = [...landingPages]
    .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0))[0];

  // 2) ?Top Landing Pages? table wants rows with GA4+GSC fields
  const tableRows = landingPages.map((p, i) => ({
    id: `lp_${i}`,
    url: p.page_path || p.full_url || "/",
    title: p.page_title || undefined,
    sessions: Math.max(0, p.sessions ?? 0),
    organicClicks: Math.max(0, p.clicks ?? 0),
    impressions: Math.max(0, p.impressions ?? 0),
    organicCtr: pct01To100(p.ctr),                       // Page.tsx expects % (0..100)
    avgEngagementTimeSec: Math.max(0, p.avg_engagement_seconds ?? 0),
    bounceRate: pct01To100(p.bounce_rate),
    conversions: Math.max(0, p.conversions ?? 0),
    lastUpdated: p.date,                                 // ISO okay
  }));
  type HCLSApiRow = {
    page_path: string;
    page_title?: string;
    impressions: number;
    sessions: number;
    clicks: number;
    ctr: number;          // 0..1 or 0..100
    position?: number;
    bounce_rate?: number; // ignored here
    has_gsc_data?: boolean;
    has_ga4_data?: boolean;
  };
  // 3) Section 3.3 ?High Clicks, Low Sessions? wants GSC+GA4 (impressions, clicks, ctr, sessions)
  const hclsRows =
    Array.isArray(landingPayload?.high_clicks_low_sessions)
      ? (landingPayload.high_clicks_low_sessions as HCLSApiRow[]).map((p, i) => ({
        id: `hcls_${i}`,
        url: p.page_path || "/",
        title: p.page_title,
        impressions: Math.max(0, p.impressions || 0),
        organicClicks: Math.max(0, p.clicks || 0),
        organicCtr: pct01To100(p.ctr),     // Section33 expects CTR in %
        sessions: Math.max(0, p.sessions || 0),
        lastUpdated: undefined,       // (optional) pass ISO when you have it
      }))
      : [];

  const normalisePath = (raw?: string): string => {
    if (!raw) return "/";
    let path = raw;
    if (path.includes("://")) {
      try {
        const url = new URL(path);
        path = url.pathname || "/";
      } catch {
        // fall through
      }
    }
    path = path.split("?")[0] || "/";
    if (!path.startsWith("/")) path = `/${path}`;
    if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
  };

  const scrollTableRows = useMemo(() => {
    if (!Array.isArray(scrollRows)) return [];
    return scrollRows.map((row: any, index: number) => {
      const pagePath = normalisePath(row?.page_path ?? row?.pageUrl ?? "/");
      const fullUrl =
        scrollDomain ? `https://${scrollDomain}${pagePath === "/" ? "" : pagePath}` : pagePath;
      const sessions =
        (typeof row?.sessions === "number" ? row.sessions : undefined) ??
        sessionsLookup.get(pagePath) ??
        sessionsLookup.get(`${pagePath}/`) ??
        0;

      const p25 = typeof row?.p25 === "number" ? row.p25 : undefined;
      const p50 = typeof row?.p50 === "number" ? row.p50 : undefined;
      const p75 = typeof row?.p75 === "number" ? row.p75 : undefined;
      const p100 = typeof row?.p100 === "number" ? row.p100 : undefined;
      const ninety = typeof row?.scrolled90Pct === "number" ? row.scrolled90Pct : undefined;
      const avgEng = Math.max(0, Number(row?.avg_engagement_seconds ?? 0));
      const scoreBase = [p25, p50, p75, p100]
        .map((v) => (typeof v === "number" ? v : 0))
        .reduce((acc, v) => acc + v, 0);
      const scrollScore = Math.round(scoreBase / 4);

      return {
        id: `scroll_${index}`,
        pageUrl: pagePath,
        fullUrl,
        sessions,
        p25,
        p50,
        p75,
        p100,
        scrolled90Pct: ninety ?? p100 ?? undefined,
        avgEngagementSec: avgEng,
        scrollScore,
      };
    });
  }, [scrollRows, scrollDomain, sessionsLookup]);


  const TrafficSkeleton = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {[140, 220, 180, 260].map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.3, delay: 0.05 * i }}
          className="animate-pulse rounded-md bg-slate-100"
          style={{ height: h }}
        />
      ))}
    </motion.div>
  );

  const TrafficHeaderBar = () => (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-[13px]" style={{ color: TOKENS.textMuted }}>
        {trafficLastFetched
          ? `Traffic data last synced ${new Date(trafficLastFetched).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })}`
          : `Traffic & Engagement (live)`}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => refetchTraffic()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          style={{ borderColor: TOKENS.borderLight, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>
    </div>
  );

  const TrafficErrorState = ({ message }: { message: string }) => (
    <div
      className="rounded-md border bg-red-50 p-4 text-red-700"
      style={{ borderColor: "#fecaca" }}
      role="alert"
    >
      <div className="mb-2 font-medium">Couldn?t load Traffic & Engagement</div>
      <div className="text-sm">{message}</div>
      <div className="mt-3">
        <button
          onClick={() => refetchTraffic()}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const TrafficEmptyState = () => (
    <div
      className="rounded-md border border-dashed bg-gray-50 p-6 text-center text-sm"
      style={{ borderColor: TOKENS.borderLight }}
    >
      No traffic rows for the selected range. Try a broader date window or different filters.
      <div className="mt-3">
        <button
          onClick={() => refetchTraffic()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
          style={{ borderColor: TOKENS.borderLight, cursor: "pointer" }}
        >
          Recheck
        </button>
      </div>
    </div>
  );

  const LandingHeaderBar = () => (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-[13px]" style={{ color: TOKENS.textMuted }}>
        {landingLastFetched
          ? `Landing pages last synced ${new Date(landingLastFetched).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit" })}`
          : `Landing Pages (live)`}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => refetchLanding()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          style={{ borderColor: TOKENS.borderLight, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>
    </div>
  );

  const LandingErrorState = ({ message }: { message: string }) => (
    <div
      className="rounded-md border bg-red-50 p-4 text-red-700"
      style={{ borderColor: "#fecaca" }}
      role="alert"
    >
      <div className="mb-2 font-medium">Couldn't load Landing Pages</div>
      <div className="text-sm">{message}</div>
      <div className="mt-3">
        <button
          onClick={() => refetchLanding()}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const LandingEmptyState = () => (
    <div
      className="rounded-md border border-dashed bg-gray-50 p-6 text-center text-sm"
      style={{ borderColor: TOKENS.borderLight }}
    >
      No landing page results for the selected range. Adjust filters or try refreshing.
      <div className="mt-3">
        <button
          onClick={() => refetchLanding()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
          style={{ borderColor: TOKENS.borderLight, cursor: "pointer" }}
        >
          Recheck
        </button>
      </div>
    </div>
  );

  const LandingSkeleton = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {[200, 240, 180].map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.3, delay: 0.05 * i }}
          className="animate-pulse rounded-md bg-slate-100"
          style={{ height: h }}
        />
      ))}
    </motion.div>
  );


  const renderOverviewLoadingState = () => (
    <div className="mx-auto mt-6 w-8xl px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key="overview-gate-loading"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {[0, 1, 2].map((sectionIndex) => (
            <motion.div
              key={sectionIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: sectionIndex * 0.08 }}
              className="rounded-2xl border bg-white/90 p-6 shadow-sm"
              style={{ borderColor: TOKENS.borderLight }}
            >
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-4 w-1/4 rounded bg-slate-200" />
                <div className="h-6 w-1/3 rounded bg-slate-100" />
                <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="space-y-3 rounded-xl border bg-slate-50 p-4"
                      style={{ borderColor: TOKENS.borderLight }}
                    >
                      <div className="h-3 w-2/3 rounded bg-slate-200" />
                      <div className="h-5 w-1/2 rounded bg-slate-100" />
                      <div className="h-8 rounded-xl bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const renderLockedState = () => (
    <div className="mx-auto mt-6 w-8xl px-6">
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
        Connect Google Analytics and choose a date range to unlock analytics insights.
      </div>
    </div>
  );

  const isInitialGaOverviewLoading = loading && !gaOverviewData && !gaOverviewError;

  return (
    <div className="min-h-screen w-full bg-white text-[14px]" style={{ color: TOKENS.text, fontFamily: TOKENS.fontFamily }}>


      {/* Sticky Panel Header */}
      <AnalyticsPanelHeader onCreateProject={() => setModalOpen(!modalOpen)} />
      <SetupModal modalOpen={modalOpen} setModalOpen={setModalOpen} />

      {/* GA integration / date controls */}
      <div className="mx-auto mt-4 w-full px-6">
        <div
          className="rounded-md bg-white p-4"
          style={{ border: `${TOKENS.borderW}px solid ${TOKENS.borderLight}` }}
        >
          <GaIntegrationSection
            onOverviewData={setGaOverviewData}
            onOverviewLoadingChange={setGaOverviewLoading}
            onOverviewError={setGaOverviewError}
            onDateRangeChange={(p) => setTrafficInputs(p)}   // ? rename here
            shouldFetchOverview={active === "overview"}
          />
        </div>
      </div>

      {canViewAnalyticsContent ? (
        <>
          {/* Smart Summary between header & tabs */}
          <SmartSummary />

          {/* Tabs Nav (a11y + hash) */}
          <TabsNav active={active} onChange={changeTab} />

          {/* Panels (placeholders) */}
          <TabPanel active={active} tab="overview">
            <AnimatePresence mode="wait">
              {loading && (
                <OverviewSkeleton key="skeleton" />
              )}
              {!loading && isGaOverviewReady && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  className="mt-4 text-sm space-y-4"
                  style={{ color: TOKENS.textMuted }}
                >
                  <FadeIn i={0}>
                    <AnalyticsOverviewKpiSection data={kpiData} />
                  </FadeIn>
                  <FadeIn i={1}>
                    <SourceBreakdownTable
                      data={sRows}
                      gscConnected={Boolean(gaOverviewData?.data_sources?.gsc)}
                    />
                  </FadeIn>
                  <FadeIn i={2}>
                    <IndexedVsPerformingSection
                      categories={categories}
                      rows={underperformingRows}
                    />
                  </FadeIn>
                  <FadeIn i={3}>
                    <AnalyticsDeviceGeoSection
                      deviceData={deviceData}
                      geoData={geoData}
                      gscConnected={Boolean(gaOverviewData?.data_sources?.gsc)}
                    />
                  </FadeIn>
                  {/* <FadeIn i={4}>
                <ImpactMatrix
                  gscConnected={Boolean(gaOverviewData?.data_sources?.gsc)}
                  initialRows={impactRows}
                />
              </FadeIn> */}
                  {/* <FadeIn i={4}>
                    <AnalyticsProgressToGoalSection />
                  </FadeIn> */}
                </motion.div>
              )}
            </AnimatePresence>
          </TabPanel>

          <TabPanel active={active} tab="traffic">
            <div className="text-sm" style={{ color: TOKENS.textMuted }}>
              {/* NEW: API-wired Traffic content */}
              <TrafficHeaderBar />

              {trafficLoading && <TrafficSkeleton />}

              {!trafficLoading && trafficError && (
                <TrafficErrorState message={trafficError} />
              )}

              {!trafficLoading && !trafficError && (!trafficData || !trafficHasContent) && (
                <TrafficEmptyState />
              )}

              {!trafficLoading && !trafficError && trafficHasContent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <SessionsBySourceMedium data={srcMediumRows} />
                  <EngagementOverTimeSection data={dailySeries} />
                  <BehaviorByDeviceSection data={deviceRows} />
                  <ReturningVsNewUsersSection
                    data={{ split: userTypeSplit, cards: userCards }}
                  />
                  <ScrollDepthSection
                    da_ta={{ summary: scrollSummary, rows: scrollAnalysis }}
                  />
                  <TopPagesByEngagementTable data={perPageRows} />
                  <DropoffsExitRatesSection data={landingTable} />

                </motion.div>
              )}
            </div>
          </TabPanel>

          <TabPanel active={active} tab="landing">
            <div className="text-sm" style={{ color: TOKENS.textMuted }}>
              <LandingHeaderBar />

              {landingLoading && <LandingSkeleton />}

              {!landingLoading && landingError && (
                <LandingErrorState message={landingError} />
              )}

              {!landingLoading && !landingError && (!landingHasContent || !landingPayload) && (
                <LandingEmptyState />
              )}

              {!landingLoading && !landingError && landingHasContent && landingPayload && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <LandingPagesComparisonCards
                    data={{
                      url: topBySessions?.page_path || topBySessions?.full_url || "/",
                      title: topBySessions?.page_title,
                      ga4: {
                        sessions: Math.max(0, topBySessions?.sessions ?? 0),
                        avgEngagementTimeSec: Math.max(0, topBySessions?.avg_engagement_seconds ?? 0),
                        bounceRatePct: pct01To100(topBySessions?.bounce_rate),
                      },
                      gsc: {
                        clicks: Math.max(0, topBySessions?.clicks ?? 0),
                        impressions: Math.max(0, topBySessions?.impressions ?? 0),
                        ctrPct: pct01To100(topBySessions?.ctr),
                      },
                    }}
                  />
                  {tableRows && (
                    <LandingPagesTablePage
                      rows={tableRows}
                      pagination={landingPagination}
                      loading={landingLoading}
                      onPageChange={handleLandingPageChange}
                    />
                  )}
                  {hclsRows && <Section33 rows={hclsRows} />}
                  {/* <Analytics_Dropoffs_BeforeConversion /> */}
                  <LP_Section5_ScrollDepthPerPage
                    dataMode={hasFullBuckets ? "full" : "ga4only"}
                    rows={scrollTableRows}
                    loading={scrollLoading}
                    error={scrollError || undefined}
                    pagination={scrollPagination || undefined}
                    onPageChange={handleScrollPageChange}
                  />
                  {/* <PageUpdateRecencyFlags /> */}
                </motion.div>
              )}
            </div>
          </TabPanel>

          <TabPanel active={active} tab="conversions">
            <div className="text-sm" style={{ color: TOKENS.textMuted }}>
              Conversions placeholder - conversion summary, top paths, funnel, device/country splits.
              <DemoConversionSummaryKpis />
              <ConversionBySourceMediumSection />
              <TopConvertingTable />
              <ConversionFunnelSection />
              <LowConversionOpportunitiesTable />
              <ConversionByDeviceCountry />
              <ConversionTrendsOverTime />
            </div>
          </TabPanel>

          <TabPanel active={active} tab="search">
            <div className="text-sm" style={{ color: TOKENS.textMuted }}>
              Search Performance placeholder - queries table, page-wise search insights, CTR vs position heatmap, trends.
              <DemoSearchKpisOverview />
              <KeywordPerformanceTable />
              <PageLevelSearchInsightsSection />
              <CtrVsPositionHeatmap />
              <SearchDeviceCountrySection />
              <SearchTrendsOverTime />
            </div>
          </TabPanel>

        </>
      ) : gaOverviewLoading ? (
        renderOverviewLoadingState()
      ) : (
        renderLockedState()
      )}
      {/* Tiny toast */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 shadow-lg rounded-md px-3 py-2 text-sm"
          style={{ background: "#111827", color: "white", border: `1px solid ${TOKENS.borderLight}` }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}






