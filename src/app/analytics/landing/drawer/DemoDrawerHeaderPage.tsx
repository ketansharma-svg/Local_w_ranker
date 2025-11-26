"use client";

import * as React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CalendarClock,
  Search,
  Pin,
} from "lucide-react";
import DemoPageDetailKpis from "./DemoPageDetailKpis";
import TrafficTrendsGA4 from "./TrafficTrendsGA4";
import ContentUpdateRecencySection from "./ContentUpdateRecencySection"
import GSCImprClicksCTRChart from "./GSCImprClicksCTRChart";
import ConversionImpactSection from "./ConversionImpactSection";
import DeviceGeoBreakdownSection from "./DeviceGeoBreakdownSection"
import ScrollDepthPageDetaill from "./ScrollDepthPageDetaill";
/** Tokens (neutral + brand-ish) */
const TOKENS = {
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  card: "#FFFFFF",
  brand: "#008CCD",
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};

type SourceStatus = { ga4?: boolean; gsc?: boolean };

type Device = "all" | "desktop" | "mobile" | "tablet";
type DateRange = "7d" | "14d" | "30d" | "90d";

export interface PageDrawerStickyHeaderProps {
  /** Page title shown in the center block */
  title: string;
  /** Path/slug shown next to copy button (e.g., /product-page) */
  path: string;
  /** Optional page type badge text (Canonical / Clustered / Orphaned) */
  pageType?: "Canonical" | "Clustered" | "Orphaned";
  /** Data source availability; safely optional */
  sources?: SourceStatus;
  /** Last modified date (string or Date). Optional. */
  lastModified?: string | Date | null;
  /** Initial filters */
  initialDateRange?: DateRange;
  initialDevice?: Device;
  /** Sticky offset in px if you have a global header above */
  stickyOffset?: number;
  /** Handlers */
  onBack?: () => void;
  onOpenAudit?: () => void;
  onAssignTask?: () => void;
  onChangeFilters?: (filters: { dateRange: DateRange; device: Device }) => void;
}

/** Small status dot: GA4 / GSC connected state */
function Dot({ ok = false, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${label}: ${ok ? "Connected" : "Not connected"}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          ok ? "bg-emerald-500" : "bg-gray-300"
        }`}
      />
      <span
        className={`text-[11px] font-medium ${
          ok ? "text-emerald-600" : "text-gray-400"
        }`}
      >
        {label}
      </span>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
    </span>
  );
}

/** Copy-to-clipboard button with quick feedback */
function CopyPath({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      if (typeof window !== "undefined" && navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      const id = setTimeout(() => setCopied(false), 1200);
      return () => clearTimeout(id);
    } catch {
      // no-op
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium hover:bg-gray-50"
      style={{ borderColor: TOKENS.border }}
      aria-label="Copy URL path"
      title={copied ? "Copied" : "Copy path"}
    >
      <Copy className="h-3.5 w-3.5 text-gray-500" />
      <span className="text-gray-600">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/** Simple pill badge */
function Pill({
  children,
  tone = "default",
  title,
}: React.PropsWithChildren<{ tone?: "default" | "ok" | "muted"; title?: string }>) {
  const styles =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "muted"
      ? "bg-gray-50 text-gray-600 border-gray-200"
      : "bg-[#F5F7FA] text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${styles}`}
      title={title}
    >
      {children}
    </span>
  );
}

/** Main sticky header (drawer) */
export function PageDrawerStickyHeader({
  title,
  path,
  pageType = "Canonical",
  sources = { ga4: false, gsc: false },
  lastModified = null,
  initialDateRange = "30d",
  initialDevice = "all",
  stickyOffset = 0,
  onBack,
  onOpenAudit,
  onAssignTask,
  onChangeFilters,
}: PageDrawerStickyHeaderProps) {
  // Local filter state (scoped to this drawer)
  const [dateRange, setDateRange] = React.useState<DateRange>(initialDateRange);
  const [device, setDevice] = React.useState<Device>(initialDevice);

  const handleBack = React.useCallback(() => {
    if (onBack) return onBack();
    if (typeof window !== "undefined") window.history.back();
  }, [onBack]);

  const handleAudit = React.useCallback(() => {
    onOpenAudit ? onOpenAudit() : console.log("Open Audit clicked");
  }, [onOpenAudit]);

  const handleTask = React.useCallback(() => {
    onAssignTask ? onAssignTask() : console.log("Assign Task clicked");
  }, [onAssignTask]);

  const handleFiltersChange = (next: { dateRange?: DateRange; device?: Device }) => {
    const newDateRange = next.dateRange ?? dateRange;
    const newDevice = next.device ?? device;
    setDateRange(newDateRange);
    setDevice(newDevice);
    onChangeFilters?.({ dateRange: newDateRange, device: newDevice });
  };

  const formattedDate =
    lastModified
      ? new Date(lastModified).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <div
      className="z-40 w-full border-b bg-white"
      style={{ top: stickyOffset, borderColor: TOKENS.border }}
      role="region"
      aria-label="Page detail sticky header"
    >
      {/* Row 1 */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
        {/* Left side: Back + Title + Path/Copy + Page Type */}
        <div className="min-w-0 flex flex-1 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            aria-label="Back to Landing Pages"
            title="Back to Landing Pages"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
            <span className="hidden sm:inline text-gray-700">Landing Pages</span>
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <code className="truncate text-xs text-gray-600">{path}</code>
              <CopyPath text={path} />
            </div>
          </div>

          {pageType ? (
            <Pill title={`Detected as ${pageType} page based on canonical/meta.`}>
              {pageType}
            </Pill>
          ) : null}
        </div>

        {/* Right side: Source dots + Last modified */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <Dot ok={!!sources?.ga4} label="GA4" />
            <Dot ok={!!sources?.gsc} label="GSC" />
          </div>
          <div
            className="hidden items-center gap-1 text-xs text-gray-600 sm:flex"
            title="Last Modified"
          >
            <CalendarClock className="h-4 w-4 text-gray-500" />
            <span>Last Modified: {formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Filters + CTAs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2"
           style={{ borderColor: TOKENS.border }}>
        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Date Range */}
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <span className="sr-only">Date range</span>
            <select
              value={dateRange}
              onChange={(e) =>
                handleFiltersChange({ dateRange: e.target.value as DateRange })
              }
              className="rounded-md border px-2 py-1 text-sm"
              style={{ borderColor: TOKENS.border }}
              aria-label="Date range"
            >
              <option value="7d">7d</option>
              <option value="14d">14d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
          </label>

          {/* Device */}
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <span className="sr-only">Device</span>
            <select
              value={device}
              onChange={(e) =>
                handleFiltersChange({ device: e.target.value as Device })
              }
              className="rounded-md border px-2 py-1 text-sm"
              style={{ borderColor: TOKENS.border }}
              aria-label="Device"
            >
              <option value="all">All</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
            </select>
          </label>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAudit}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            aria-label="View in Site Audit"
            title="View in Site Audit"
          >
            <Search className="h-4 w-4 text-gray-600" />
            Audit
          </button>

          <button
            type="button"
            onClick={handleTask}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#111827] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95"
            aria-label="Assign Task"
            title="Assign Task"
          >
            <Pin className="h-4 w-4" />
            Assign Task
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Demo wrapper (optional) — paste this whole file into a page to trial
------------------------------------------------------------------- */
export default function DemoDrawerHeaderPage() {
  return (
    <div className="min-h-[140vh] w-full" style={{ background: "#F5F7FA" }}>
      {/* Simulate a top panel header (to test sticky offset) */}
      <div className="top-0 z-50 w-full border-b bg-white px-4 py-3 text-sm font-medium text-gray-700">
        Analytics Panel Header (Global)
      </div>

      {/* Drawer header (sticky below the global header) */}
      <PageDrawerStickyHeader
        title="SEO Guide: The Complete Handbook"
        path="/seo-guide"
        pageType="Canonical"
        sources={{ ga4: true, gsc: true }}
        lastModified={new Date()}
        initialDateRange="30d"
        initialDevice="all"
        stickyOffset={48} // matches simulated global header height above
        onBack={() => console.log("Back to Landing Pages")}
        onOpenAudit={() => console.log("Open Site Audit")}
        onAssignTask={() => console.log("Open Task modal")}
        onChangeFilters={(f) => console.log("Drawer filters changed:", f)}
      />

      {/* Dummy content to show stickiness while scrolling */}
      <div className="mx-auto max-w-8xl px-2 py-4" style={{ borderColor: TOKENS.border }}>
        <>
          <DemoPageDetailKpis />
          <TrafficTrendsGA4 />
          <GSCImprClicksCTRChart />
          <ScrollDepthPageDetaill
            pagePath="/ScrollDepthPageDetaill"
            fetchScroll90={() =>
              Promise.resolve({
                series: [
                  { date: "2024-06-01", scroll90: 90, pageViews: 100 },
                  { date: "2024-06-02", scroll90: 85, pageViews: 95 },
                ],
                snapshot: {
                  pageViews: 195,
                  scrollEvents90: 175,
                  pct: 89.7,
                },
                devices: [
                  { device: "desktop", pct: 60 },
                  { device: "mobile", pct: 30 },
                  { device: "tablet", pct: 10 },
                ],
              })
            }
          />
          <ConversionImpactSection/>
          <ContentUpdateRecencySection />
          <DeviceGeoBreakdownSection />
</>
      </div>
    </div>
  );
}

