"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DemoQueryPerformanceKpis from "./DemoQueryPerformanceKpis";
import KeywordTrendMini from "./KeywordTrendMini";
import DemoLandingPagesByQueryPage from "./DemoLandingPagesByQueryPage";
import DemoCountryBreakdown from "./DemoCountryBreakdown";
import DeviceBreakdownTable from "./DeviceBreakdownTable";
import DemoOptimizationInsights from "./DemoOptimizationInsights"
import KeywordPerformanceTrend from "./KeywordPerformanceTrend";
/* =====================================================================
   KEYWORD DRAWER HEADER — Drop‑in Component + Demo Host
   Refinements:
   - Font: Inter / Inter Fallback
   - No emoji usage anywhere
   - Brand color (#008CCD) for icons/legend dots
   - Pointer cursor on all interactive elements
   - Modular chips + compact toggle look (consistent with recent designs)
   ===================================================================== */

const BRAND = "#008CCD";
const BORDER = "#E5E7EB";

type DateRangeKey = "7d" | "14d" | "30d" | "90d";
type DeviceKey = "all" | "mobile" | "desktop" | "tablet";
type SearchType = "web" | "image" | "video";

export type KeywordDrawerHeaderProps = {
  query: string;
  searchType?: SearchType; // defaults to 'web'
  // Filter state (drawer-scoped)
  dateRange: DateRangeKey;
  device: DeviceKey;
  country: string; // "all" or ISO name
  // Status & permissions
  isGscConnected?: boolean;
  isKwAnalyzerConnected?: boolean;
  canAssignTask?: boolean;
  canOpenKwAnalyzer?: boolean;
  canOpenGsc?: boolean;
  // Links / deep links
  gscUrl?: string; // prebuilt native GSC URL (optional)
  // IDs / ARIA
  contentAreaId?: string; // section list ID controlled by these filters
  // Callbacks
  onBack?: () => void;
  onClose?: () => void;
  onAssignTask?: (ctx: {
    query: string;
    dateRange: DateRangeKey;
    device: DeviceKey;
    country: string;
  }) => void;
  onOpenKwAnalyzer?: (query: string) => void;
  onOpenGsc?: (query: string) => void;
  onFilterChange?: (next: {
    dateRange?: DateRangeKey;
    device?: DeviceKey;
    country?: string;
  }) => void;
  onTelemetry?: (event: string, payload?: Record<string, unknown>) => void;
  // Data / UI
  countries?: string[]; // for datalist suggestions; defaults below
  loading?: boolean; // skeleton state
  className?: string;
};

const DEFAULT_COUNTRIES = [
  "All",
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Brazil",
  "Japan",
];

export function KeywordDrawerHeader({
  query,
  searchType = "web",
  dateRange,
  device,
  country,
  isGscConnected = true,
  isKwAnalyzerConnected = true,
  canAssignTask = true,
  canOpenKwAnalyzer = true,
  canOpenGsc = true,
  gscUrl,
  contentAreaId,
  onBack,
  onClose,
  onAssignTask,
  onOpenKwAnalyzer,
  onOpenGsc,
  onFilterChange,
  onTelemetry,
  countries = DEFAULT_COUNTRIES,
  loading = false,
  className = "",
}: KeywordDrawerHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);

  // === Keyboard shortcuts: Esc (close) & Alt/Option+Left (back) ===
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
      if ((e.altKey || e.metaKey) && e.key === "ArrowLeft") {
        onBack?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, onClose]);

  const shortQuery = useMemo(() => middleEllipsis(query, 12, 12), [query]);

  const copyQuery = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onTelemetry?.("analytics.keywordDrawer.header.copyQuery", { query });
    } catch {
      // Fallback: hidden textarea selection if clipboard fails (rare)
      const ta = document.createElement("textarea");
      ta.value = query;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onTelemetry, query]);

  const handleDate = (val: DateRangeKey) => {
    onFilterChange?.({ dateRange: val });
    onTelemetry?.("analytics.keywordDrawer.header.filterChanged", {
      dateRange: val,
    });
  };
  const handleDevice = (val: DeviceKey) => {
    onFilterChange?.({ device: val });
    onTelemetry?.("analytics.keywordDrawer.header.filterChanged", {
      device: val,
    });
  };
  const handleCountry = (val: string) => {
    onFilterChange?.({ country: val || "All" });
    onTelemetry?.("analytics.keywordDrawer.header.filterChanged", {
      country: val || "All",
    });
  };

  // Close the "More" menu on outside click / blur
  useEffect(() => {
    const closeOnClickAway = (e: MouseEvent) => {
      if (!moreBtnRef.current) return;
      if (!moreBtnRef.current.closest("div")) return;
      const menu = document.getElementById("drawer-more-menu");
      if (menu && !menu.contains(e.target as Node) && e.target !== moreBtnRef.current) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) document.addEventListener("mousedown", closeOnClickAway);
    return () => document.removeEventListener("mousedown", closeOnClickAway);
  }, [moreOpen]);

  const searchTypeLabel =
    searchType === "image" ? "Image" : searchType === "video" ? "Video" : "Web";

  // Row height tokens to match panel density
  const row1Class = "min-h-14"; // ~56px
  const row2Class = "min-h-12"; // ~48px

  return (
    <header
      aria-label="Keyword drilldown header"
      style={{ fontFamily: 'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial' }}
      className={[
        "top-0 z-50 bg-white border-b border-gray-200",
        "px-4 lg:px-6 py-2 space-y-2",
        className,
      ].join(" ")}
    >
      {/* Row 1: Back + Breadcrumb + Query + Chips + Close */}
      <div className={`flex items-center justify-between ${row1Class}`}>
        {/* Left cluster */}
        <div className="flex items-center gap-3 min-w-0">
          <IconButton
            label="Back"
            title="Back (Alt/Option + ←)"
            onClick={() => onBack?.()}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center text-sm text-gray-500">
              <li className="shrink-0">
                <button
                  type="button"
                  className="hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand, #008CCD)] rounded cursor-pointer"
                  onClick={() => onBack?.()}
                  title="Go to Analytics"
                  style={{ ["--brand" as any]: BRAND }}
                >
                  Analytics
                </button>
              </li>
              <li className="mx-2 text-gray-300 select-none">/</li>
              <li className="shrink-0">
                <span className="text-gray-600">Search Performance</span>
              </li>
              <li className="mx-2 text-gray-300 select-none">/</li>
              <li className="truncate max-w-[22ch]" aria-current="page" title={query}>
                Query
              </li>
            </ol>
          </nav>

          {/* Query title (copyable) */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              role="button"
              tabIndex={0}
              title="Click to copy"
              aria-label="Copy query"
              className="font-semibold text-[16px] sm:text-[17px] text-gray-900 truncate max-w-[26ch] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] rounded"
              style={{ ["--brand" as any]: BRAND }}
              onClick={copyQuery}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
                  e.preventDefault();
                  copyQuery();
                }
              }}
            >
              {shortQuery}
            </div>
            <IconButton
              label={copied ? "Copied" : "Copy"}
              title={copied ? "Copied" : "Click to copy"}
              onClick={copyQuery}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </IconButton>

            {/* Search type chip (modular) */}
            <Chip label={searchTypeLabel} />

            {/* Integration chips (modular; no emoji) */}
            <IntegrationChip label="GSC" connected={isGscConnected} />
            {isKwAnalyzerConnected ? (
              <IntegrationChip label="KW Analyzer" connected />
            ) : null}
          </div>
        </div>

        {/* Right cluster: Close */}
        <div className="flex items-center gap-2">
          <IconButton label="Close" title="Close (Esc)" onClick={() => onClose?.()}>
            <XIcon />
          </IconButton>
        </div>
      </div>

      {/* Row 2: Filters & Actions */}
      <div
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${row2Class}`}
      >
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            label="Date"
            icon={
              <span className="text-[var(--brand,#008CCD)]" style={{ ["--brand" as any]: BRAND }}>
                <CalendarIcon />
              </span>
            }
            value={dateRange}
            onChange={(v) => handleDate(v as DateRangeKey)}
            ariaControls={contentAreaId}
            options={[
              { label: "7D", value: "7d" },
              { label: "14D", value: "14d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
            ]}
          />
          <Select
            label="Device"
            icon={
              <span className="text-[var(--brand,#008CCD)]" style={{ ["--brand" as any]: BRAND }}>
                <DeviceIcon />
              </span>
            }
            value={device}
            onChange={(v) => handleDevice(v as DeviceKey)}
            ariaControls={contentAreaId}
            options={[
              { label: "All", value: "all" },
              { label: "Mobile", value: "mobile" },
              { label: "Desktop", value: "desktop" },
              { label: "Tablet", value: "tablet" },
            ]}
          />
          <CountryInput
            label="Country"
            icon={
              <span className="text-[var(--brand,#008CCD)]" style={{ ["--brand" as any]: BRAND }}>
                <GlobeIcon />
              </span>
            }
            value={country}
            onChange={handleCountry}
            countries={countries}
            ariaControls={contentAreaId}
          />
          <span className="basis-full sm:basis-auto text-xs text-gray-500 sm:ml-1">
            Applies in this drawer only.
          </span>
        </div>

        {/* Right: CTAs */}
        <div className="flex items-center gap-2">
          {/* Primary */}
          {canAssignTask && (
            <button
              type="button"
              onClick={() => onAssignTask?.({ query, dateRange, device, country })}
              title="Assign content update task"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--brand,#008CCD)] px-3 py-2 text-white text-sm font-medium shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] cursor-pointer"
              style={{ ["--brand" as any]: BRAND }}
            >
              <PinIcon />
              Assign Task
            </button>
          )}

          {/* Secondary & Tertiary on desktop */}
          <div className="hidden md:flex items-center gap-2">
            {isKwAnalyzerConnected && canOpenKwAnalyzer && (
              <button
                type="button"
                onClick={() => onOpenKwAnalyzer?.(query)}
                title="Explore in keyword database"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] cursor-pointer"
                style={{ ["--brand" as any]: BRAND }}
              >
                <SearchIcon />
                KW Analyzer
              </button>
            )}
            {isGscConnected ? (
              canOpenGsc && (
                <a
                  href={gscUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!gscUrl) e.preventDefault();
                    onOpenGsc?.(query);
                  }}
                  title="Open in native Search Console"
                  className="inline-flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] cursor-pointer"
                  style={{ ["--brand" as any]: BRAND }}
                >
                  <ExternalIcon />
                  Open in GSC
                </a>
              )
            ) : (
              // Unauthenticated state (optional connect)
              <button
                type="button"
                title="Connect Google Search Console"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] cursor-pointer"
                onClick={() => onTelemetry?.("analytics.keywordDrawer.header.openIntegrations")}
                style={{ ["--brand" as any]: BRAND }}
              >
                <PlugIcon />
                Connect GSC
              </button>
            )}
          </div>

          {/* Overflow on mobile/tablet */}
          <div className="md:hidden relative">
            <button
              ref={moreBtnRef}
              type="button"
              onClick={() => setMoreOpen((s) => !s)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] cursor-pointer"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              title="More actions"
              style={{ ["--brand" as any]: BRAND }}
            >
              More
              <ChevronDownIcon />
            </button>
            {moreOpen && (
              <div
                id="drawer-more-menu"
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-50"
              >
                <ul className="py-1 text-sm">
                  {isKwAnalyzerConnected && canOpenKwAnalyzer && (
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 inline-flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                          onOpenKwAnalyzer?.(query);
                          setMoreOpen(false);
                        }}
                        title="Explore in keyword database"
                      >
                        <span className="text-[var(--brand,#008CCD)]" style={{ ["--brand" as any]: BRAND }}>
                          <SearchIcon />
                        </span>
                        <span>View in Keyword Analyzer</span>
                      </button>
                    </li>
                  )}
                  {isGscConnected ? (
                    canOpenGsc && (
                      <li>
                        <a
                          role="menuitem"
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          href={gscUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!gscUrl) e.preventDefault();
                            setMoreOpen(false);
                            onOpenGsc?.(query);
                          }}
                          title="Open in native Search Console"
                        >
                          <span className="text-[var(--brand,#008CCD)]" style={{ ["--brand" as any]: BRAND }}>
                            <ExternalIcon />
                          </span>
                          <span>Open in GSC</span>
                        </a>
                      </li>
                    )
                  ) : (
                    <li>
                      <button
                        role="menuitem"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 inline-flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                          onTelemetry?.("analytics.keywordDrawer.header.openIntegrations");
                          setMoreOpen(false);
                        }}
                        title="Connect Google Search Console"
                      >
                        <span className="text-[var(--brand,#008CCD)]" style={{ ["--brand" as any]: BRAND }}>
                          <PlugIcon />
                        </span>
                        <span>Connect GSC</span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live region for copy feedback */}
      <p className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </p>

      {/* Loading shimmer (optional) */}
      {loading && (
        <div className="mt-2 grid grid-cols-3 gap-3 animate-pulse">
          <div className="h-4 bg-gray-100 rounded col-span-1" />
          <div className="h-4 bg-gray-100 rounded col-span-1" />
          <div className="h-4 bg-gray-100 rounded col-span-1" />
        </div>
      )}
    </header>
  );
}

/* ---------- Subcomponents (refined chips/toggles) ---------- */

function Chip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-white text-gray-700"
      title={label}
      style={{ borderColor: BORDER }}
    >
      {/* brand legend dot */}
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} />
      {label}
    </span>
  );
}

function IntegrationChip({
  label,
  connected = false,
}: {
  label: string;
  connected?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-white text-gray-700"
      title={`${label} ${connected ? "Connected" : "Not Connected"}`}
      style={{ borderColor: BORDER }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: connected ? BRAND : "#D1D5DB" }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

type Option = { label: string; value: string };

function Select({
  label,
  icon,
  value,
  options,
  onChange,
  ariaControls,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: Option[];
  onChange: (val: string) => void;
  ariaControls?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="sr-only">{label}</span>
      <div
        className="inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 focus-within:ring-2"
        style={{
          borderColor: BORDER,
          // Branded focus ring
          boxShadow: "0 0 0 0 rgba(0,0,0,0)",
        }}
      >
        {icon}
        <select
          aria-label={label}
          aria-controls={ariaControls}
          className="bg-transparent text-sm text-gray-800 focus:outline-none cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function CountryInput({
  label,
  icon,
  value,
  onChange,
  countries,
  ariaControls,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  countries: string[];
  ariaControls?: string;
}) {
  const listId = "country-datalist";
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="sr-only">{label}</span>
      <div
        className="inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 focus-within:ring-2"
        style={{ borderColor: BORDER }}
      >
        {icon}
        <input
          aria-label={label}
          aria-controls={ariaControls}
          list={listId}
          className="bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none w-36"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="All"
        />
        <datalist id={listId}>
          {countries.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
    </label>
  );
}

function IconButton({
  children,
  label,
  title,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title || label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#008CCD)] cursor-pointer"
      style={{ ["--brand" as any]: BRAND }}
    >
      {children}
    </button>
  );
}

/* ---------- Utility ---------- */

function middleEllipsis(text: string, start = 10, end = 10) {
  if (text.length <= start + end + 3) return text;
  return `${text.slice(0, start)}…${text.slice(-end)}`;
}

/* ---------- Inline SVG Icons (16–20px) ---------- */

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 15L7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 10l3 3 7-7"
        stroke={BRAND}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 3v3M13 3v3M3 8.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function DeviceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="19" y="8" width="2" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 10h16M10 2c2.5 2.6 2.5 12.4 0 16-2.5-3.6-2.5-12.4 0-16z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 12v6M6 8l4 4 4-4M6 3h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.5 14.5L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M11 3h6v6M9 11l8-8M17 11v6a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PlugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 3v4M13 3v4M5 7h10v3a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* =====================================================================
   DEMO HOST — so the header is immediately visible & interactive
   (Inter font + brand tokens applied to host as well)
   ===================================================================== */

function useLog() {
  const [lines, setLines] = useState<string[]>([]);
  const push = useCallback((msg: string) => {
    setLines((prev) => [new Date().toLocaleTimeString(), " • ", msg, "\n", ...prev].slice(0, 200));
  }, []);
  return { lines, push };
}

export default function KeywordHeaderDemoCanvas() {
  const [query, setQuery] = useState(
    "best seo company in india with affordable pricing and strong backlink profile"
  );
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [device, setDevice] = useState<DeviceKey>("all");
  const [country, setCountry] = useState<string>("India");

  const [isGscConnected, setIsGscConnected] = useState(true);
  const [isKwConnected] = useState(true);

  const { lines, push } = useLog();

  const gscUrl = useMemo(() => {
    // lightweight demo link builder (doesn't need to be exact)
    const base = "https://search.google.com/search-console/performance/search-analytics";
    const params = new URLSearchParams({
      resource_id: "sc-domain:wranker.com",
      query: query.slice(0, 90),
    }).toString();
    return `${base}?${params}`;
  }, [query]);

  const onFilterChange = (next: Partial<{ dateRange: DateRangeKey; device: DeviceKey; country: string }>) => {
    if (next.dateRange) setDateRange(next.dateRange);
    if (next.device) setDevice(next.device);
    if (next.country !== undefined) setCountry(next.country);
  };

  const onTelemetry = (event: string, payload?: Record<string, unknown>) => {
    push(`${event}${payload ? ` ${JSON.stringify(payload)}` : ""}`);
    // eslint-disable-next-line no-console
    console.log("telemetry:", event, payload);
  };

  const onAssignTask = (ctx: {
    query: string;
    dateRange: DateRangeKey;
    device: DeviceKey;
    country: string;
  }) => {
    push(`Task created → ${ctx.query} [${ctx.dateRange} · ${ctx.device} · ${ctx.country}]`);
    alert("(demo) Task assigned! Check console/log panel.");
  };

  const onOpenKwAnalyzer = (q: string) => {
    push(`KW Analyzer opened → ${q}`);
    alert("(demo) Open Keyword Analyzer");
  };

  const onOpenGsc = (q: string) => {
    push(`GSC opened → ${q}`);
  };

  return (
    <div
      className="min-h-screen w-full bg-white text-[#111827]"
      style={{ fontFamily: 'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial' }}
    >
      {/* Top demo controls to play with props */}
      <div className="top-0 z-[60] bg-white/90 backdrop-blur border-b border-gray-200 px-4 lg:px-6 py-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand,#008CCD)]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a query…"
          style={{ ["--brand" as any]: BRAND }}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer"
            checked={isGscConnected}
            onChange={(e) => setIsGscConnected(e.target.checked)}
          />
          GSC connected
        </label>
      </div>

      {/* Drawer header (the component under test) */}
      <KeywordDrawerHeader
        query={query}
        searchType="web"
        dateRange={dateRange}
        device={device}
        country={country}
        isGscConnected={isGscConnected}
        isKwAnalyzerConnected={isKwConnected}
        canAssignTask
        canOpenKwAnalyzer
        canOpenGsc
        gscUrl={gscUrl}
        contentAreaId="kw-sections"
        onBack={() => alert("(demo) Back")}
        onClose={() => alert("(demo) Close drawer")}
        onAssignTask={onAssignTask}
        onOpenKwAnalyzer={onOpenKwAnalyzer}
        onOpenGsc={onOpenGsc}
        onFilterChange={onFilterChange}
        onTelemetry={onTelemetry}
        countries={DEFAULT_COUNTRIES}
      />

      {/* Scrollable content area to prove sticky behavior */}
      {/* <main id="kw-sections" className="px-4 lg:px-6 py-6 space-y-8">
        <SectionCard title="Summary">
          <p className="text-sm text-gray-600">
            Current filters → <strong>{dateRange}</strong> · <strong>{device}</strong> ·{" "}
            <strong>{country || "All"}</strong>
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Try: change date/device/country, click KW Analyzer / Open in GSC, copy the query,
            or use keyboard: <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border">Esc</kbd>{" "}
            to close, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border">Alt</kbd> +{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border">←</kbd> to go back.
          </p>
        </SectionCard>

        {Array.from({ length: 6 }).map((_, i) => (
          <SectionCard key={i} title={`Section ${i + 1}`}>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>
                Simulated content block with lorem data. Resize window to see responsive chips &
                menu.
              </li>
              <li>
                Mobile overflow menu (More) contains Keyword Analyzer / GSC actions when hidden.
              </li>
              <li>Use the switch up top to simulate GSC disconnected state.</li>
            </ul>
          </SectionCard>
        ))}

        <SectionCard title="Event Log (most recent on top)">
          <pre className="text-xs leading-5 bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap max-h-64 overflow-auto">
            {lines.length ? lines.join("") : "No events yet. Interact with the header to generate logs…"}
          </pre>
        </SectionCard>

        <div className="h-20" />
      </main> */}
       <main id="kw-sections">
<SectionCard
  title="Summary"
  showKpis={true}
  showKeywordTrend={false} // hide if you want
  showDeviceTable={true}
/>

        <div className="h-20" />
      </main>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  showKpis?: boolean;
  showKeywordPerformance?: boolean;
  showKeywordTrend?: boolean;
  showLandingPages?: boolean;
  showCountryBreakdown?: boolean;
  showDeviceTable?: boolean;
  showOptimizationInsights?: boolean;
}

function SectionCard({
  title,
  showKpis = true,
  showKeywordPerformance= true,
  showKeywordTrend = true,
  showLandingPages = true,
  showCountryBreakdown = true,
  showDeviceTable = true,
  showOptimizationInsights = true,
}: SectionCardProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>

      {showKpis && <DemoQueryPerformanceKpis />}
      {showKeywordPerformance && <KeywordPerformanceTrend />}
      {showKeywordTrend && <KeywordTrendMini />}
      {showLandingPages && <DemoLandingPagesByQueryPage />}
      {showCountryBreakdown && <DemoCountryBreakdown />}
      {showDeviceTable && <DeviceBreakdownTable query="seo" />}
      {showOptimizationInsights && <DemoOptimizationInsights />}
    </section>
  );
}
