"use client";

import * as React from "react";
import dayjs, { Dayjs } from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  LayoutList,
  MonitorSmartphone,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Target,
  Users,
  Filter,
  GitMerge,
  Activity,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  DatePicker,
  Radio,
  Select,
  Switch,
  Tooltip,
  InputNumber,
  Slider,
  message,
} from "antd";

const { RangePicker } = DatePicker;

/* ────────────────────────────────────────────────────────────────────────────
   Tokens (mirrors suite; branded icons & modern controls)
──────────────────────────────────────────────────────────────────────────── */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastelBrand: "#D9EEF8",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  text: "#111827",
  textMuted: "#6B7280",
  textDarkerMuted: "#374151",
};
const BORDER = 2;

/* ────────────────────────────────────────────────────────────────────────────
   Types (extended to cover ALL tabs)
──────────────────────────────────────────────────────────────────────────── */
export type InsightsSections = {
  /** Overview page sections toggles (existing) */
  overview: boolean;
  cannibalization: boolean;
  clusterview: boolean;
  movement: boolean;
  performance: boolean;
};

export type InsightsBehavior = {
  autoFetchRest: boolean; // fan-out after Overview
  reduceMotion: boolean;  // tone down framer-motion
  showTooltips: boolean;
};

export type InsightsAdvanced = {
  maxCards: number;          // limits grid cards
  distributionBins: number[]; // rank buckets end points (incl): e.g., [3,10,20,50,100]
};

/** Rank Tracking (project-level tracker) */
export type RankTrackingSettings = {
  trendWindow: "7d" | "30d" | "90d";
  showSerpPreview: boolean; // toggle SERP preview snippets where present
  autoAddFromChecker: boolean; // when Rank Checker finishes, auto-enqueue in Tracker
};

/** Rank Checker (ad hoc check) — see your doc: limits & competitors model */
export type RankCheckerSettings = {
  maxManual: number; // default: 50
  maxCSV: number;    // default: 1000
  allowCompetitors: boolean; // show competitors input on checker
  autoAddToTracker: boolean; // after check, save to tracker
};

/** Gap Analyzer defaults */
export type GapAnalyzerSettings = {
  defaultCompetitors: string[]; // domains (max ~5 practical)
  includeBrandTerms: boolean;
  minVolume: number;            // ignore below N monthly volume
  competitorWinThreshold: number; // consider rival "win" when rank <= N (e.g., 10)
};

/** Opportunities defaults (reason filters + score threshold) */
export type ReasonType =
  | "MISSING"
  | "WEAK"
  | "NEAR_TOP10"
  | "COMPETITOR_WIN"
  | "TRENDING"
  | "CANNIBALIZED"
  | "HIGH_INTENT"; // matches panel reasons in your code

export type OpportunitiesSettings = {
  enabledReasons: Record<ReasonType, boolean>;
  minScore: number;         // 0..100
  showSerpPreview: boolean; // quick SERP peeks where available
};

/** Full pref model used by the drawer */
export type InsightsPreferences = {
  device: "desktop" | "mobile";
  locationISO?: "IN" | "US" | "AE" | string;
  datePreset: "7d" | "30d" | "60d" | "custom";
  start?: string; // YYYY-MM-DD when preset=custom
  end?: string;

  sections: InsightsSections;   // Overview only (existing)
  behavior: InsightsBehavior;   // global behavior
  advanced: InsightsAdvanced;   // global advanced

  tabs: {
    rankTracking: RankTrackingSettings;
    rankChecker: RankCheckerSettings;
    gapAnalyzer: GapAnalyzerSettings;
    opportunities: OpportunitiesSettings;
  };
};

export type InsightsSettingsDrawerProps = {
  open: boolean;
  onClose: () => void;

  /** Current project/user plan – used to lock certain features (optional) */
  plan?: "free" | "pro" | "team" | "enterprise";

  /** Hard min/max for insight date picking (mirror of page constraints) */
  minDate?: Dayjs;
  maxDate?: Dayjs;

  /** Seed values (from page state or persisted localStorage) */
  initial: InsightsPreferences;

  /** Called on Apply. Use this to update device/date/sections/tab settings in the host page */
  onApply: (prefs: InsightsPreferences) => void;

  /** Optional: override persistence. If omitted, component uses localStorage */
  onPersist?: (prefs: InsightsPreferences) => void;
};

/* ────────────────────────────────────────────────────────────────────────────
   Local helpers
──────────────────────────────────────────────────────────────────────────── */
const LS_KEY = "kw_insights_prefs";
function saveToLS(p: InsightsPreferences) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
}
function domainValid(d: string) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d.trim());
}

/* Small chip btn */
function ChipBtn({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-3 h-7 rounded-full text-xs border transition cursor-pointer ${
        active ? "text-white" : "text-gray-700"
      }`}
      style={{
        borderColor: TOKENS.borderLight,
        background: active ? TOKENS.brand : TOKENS.chipBg,
      }}
    >
      {children}
    </button>
  );
}

/* Simple tag list editor for competitor domains */
function CompetitorTags({
  value,
  onChange,
  max = 5,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (!v) return;
    if (!domainValid(v)) {
      message.warning("Enter a valid domain (e.g., example.com)");
      return;
    }
    if (value.includes(v)) {
      message.info("Already added");
      return;
    }
    if (value.length >= max) {
      message.warning(`You can add up to ${max} competitors.`);
      return;
    }
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((d) => (
          <span
            key={d}
            className="inline-flex items-center gap-2 h-7 px-2 rounded-full text-xs"
            style={{ background: TOKENS.chipBg, border: `1px solid ${TOKENS.borderLight}` }}
          >
            {d}
            <button
              className="h-5 w-5 grid place-items-center rounded-full border cursor-pointer"
              style={{ borderColor: TOKENS.borderLight }}
              onClick={() => onChange(value.filter((x) => x !== d))}
              aria-label={`Remove ${d}`}
              title="Remove"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add competitor domain (e.g., semrush.com)"
          className="flex-1 h-9 px-2 rounded-md border"
          style={{ borderColor: TOKENS.borderLight }}
        />
        <button
          className="h-9 px-3 rounded-md text-sm text-white cursor-pointer"
          style={{ background: TOKENS.brand }}
          onClick={add}
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────────────────────── */
export const InsightsSettingsDrawer: React.FC<InsightsSettingsDrawerProps> = ({
  open,
  onClose,
  plan = "free",
  minDate,
  maxDate,
  initial,
  onApply,
  onPersist,
}) => {
  const [prefs, setPrefs] = React.useState<InsightsPreferences>(initial);
  const [persistOnApply, setPersistOnApply] = React.useState<boolean>(true);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => setPrefs(initial), [initial]);

  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const isPro = plan !== "free";

  const handlePresetChange = (val: InsightsPreferences["datePreset"]) => {
    if (val !== "custom") {
      setPrefs((p) => ({ ...p, datePreset: val, start: undefined, end: undefined }));
    } else {
      setPrefs((p) => ({ ...p, datePreset: "custom" }));
    }
  };

  const applyNow = () => {
    if (prefs.datePreset === "custom") {
      if (!prefs.start || !prefs.end) {
        message.warning("Please select a start and end date for the custom range.");
        return;
      }
    }
    onApply(prefs);
    if (persistOnApply) onPersist ? onPersist(prefs) : saveToLS(prefs);
    onClose();
  };

  const resetToDefaults = () => {
    const defaults: InsightsPreferences = {
      device: "desktop",
      locationISO: "IN",
      datePreset: "30d",
      sections: {
        overview: true,
        cannibalization: true,
        clusterview: true,
        movement: true,
        performance: true,
      },
      behavior: {
        autoFetchRest: true,
        reduceMotion: false,
        showTooltips: true,
      },
      advanced: {
        maxCards: 6,
        distributionBins: [3, 10, 20, 50, 100],
      },
      tabs: {
        rankTracking: {
          trendWindow: "30d",
          showSerpPreview: true,
          autoAddFromChecker: true,
        },
        rankChecker: {
          maxManual: 50,
          maxCSV: 1000,
          allowCompetitors: true,
          autoAddToTracker: false,
        },
        gapAnalyzer: {
          defaultCompetitors: ["ahrefs.com", "semrush.com", "moz.com"],
          includeBrandTerms: false,
          minVolume: 100,
          competitorWinThreshold: 10,
        },
        opportunities: {
          enabledReasons: {
            MISSING: true,
            WEAK: true,
            NEAR_TOP10: true,
            COMPETITOR_WIN: true,
            TRENDING: true,
            CANNIBALIZED: true,
            HIGH_INTENT: true,
          },
          minScore: 55,
          showSerpPreview: true,
        },
      },
    };
    setPrefs(defaults);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden={!open}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            style={{ background: "#0B10241F" }}
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Insights Settings"
            ref={panelRef}
            className="absolute right-0 top-0 h-full w-full sm:w-[72vw] bg-white shadow-xl flex flex-col"
            initial={{ x: 560, filter: "blur(8px)" }}
            animate={{ x: 0, filter: "blur(0px)" }}
            exit={{ x: 560, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            style={{ borderLeft: `${BORDER}px solid ${TOKENS.borderLight}`, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `${BORDER}px solid ${TOKENS.borderLight}` }}
            >
              <div className="inline-flex items-center gap-2">
                <div
                  className="h-9 w-9 grid place-items-center rounded-md"
                  style={{ background: TOKENS.pastelBrand, color: TOKENS.brand }}
                >
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
                    Keywords Insights — Settings
                  </div>
                  <div className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                    Global & per‑tab controls (Overview, Tracker, Checker, Gaps, Opportunities)
                  </div>
                </div>
              </div>
              <button
                aria-label="Close settings"
                onClick={onClose}
                className="h-8 w-8 grid place-items-center rounded-md cursor-pointer"
                style={{ border: `${BORDER}px solid ${TOKENS.borderLight}`, background: "#fff" }}
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-12" style={{ fontFamily: 'Inter, Inter Fallback, ui-sans-serif, system-ui' }}>
              {/* General */}
              <section aria-labelledby="general-title">
                <div id="general-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <MonitorSmartphone className="h-4 w-4" style={{ color: TOKENS.brand }} /> General
                </div>

                <div className="space-y-4">
                  {/* Device */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-start gap-2">
                      <MonitorSmartphone className="h-4 w-4 mt-[2px] text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Default device</div>
                        <div className="text-xs" style={{ color: TOKENS.textMuted }}>Used when fetching insights</div>
                      </div>
                    </div>
                    <Radio.Group
                      value={prefs.device}
                      onChange={(e) => setPrefs((p) => ({ ...p, device: e.target.value }))}
                      optionType="button"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="desktop">Desktop</Radio.Button>
                      <Radio.Button value="mobile">Mobile</Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* Location */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-start gap-2">
                      <Target className="h-4 w-4 mt-[2px] text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Default location</div>
                        <div className="text-xs" style={{ color: TOKENS.textMuted }}>Applies across tabs</div>
                      </div>
                    </div>
                    <Select
                      size="middle"
                      value={prefs.locationISO}
                      style={{ minWidth: 160 }}
                      onChange={(v) => setPrefs((p) => ({ ...p, locationISO: v }))}
                      options={[
                        { value: "IN", label: "India (IN)" },
                        { value: "US", label: "United States (US)" },
                        { value: "AE", label: "U.A.E. (AE)" },
                      ]}
                    />
                  </div>

                  {/* Date range */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-[2px] text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Date range</div>
                        <div className="text-xs" style={{ color: TOKENS.textMuted }}>Preset or custom</div>
                      </div>
                    </div>
                    <Select
                      size="middle"
                      value={prefs.datePreset}
                      style={{ minWidth: 160 }}
                      onChange={handlePresetChange}
                      options={[
                        { value: "7d", label: "Last 7 days" },
                        { value: "30d", label: "Last 30 days" },
                        { value: "60d", label: "Last 60 days" },
                        { value: "custom", label: "Custom…" },
                      ]}
                    />
                  </div>

                  {/* Custom range */}
                  <AnimatePresence>
                    {prefs.datePreset === "custom" && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <RangePicker
                          allowClear
                          inputReadOnly
                          value={
                            prefs.start && prefs.end
                              ? [dayjs(prefs.start, "YYYY-MM-DD"), dayjs(prefs.end, "YYYY-MM-DD")]
                              : null
                          }
                          onChange={(vals) => {
                            if (!vals || !vals[0] || !vals[1]) {
                              setPrefs((p) => ({ ...p, start: undefined, end: undefined }));
                              return;
                            }
                            const [s, e] = vals;
                            if (minDate && s.isBefore(minDate, "day")) {
                              message.warning("Start date is outside the allowed window.");
                              return;
                            }
                            if (maxDate && e.isAfter(maxDate, "day")) {
                              message.warning("End date is outside the allowed window.");
                              return;
                            }
                            setPrefs((p) => ({ ...p, start: s.format("YYYY-MM-DD"), end: e.format("YYYY-MM-DD") }));
                          }}
                          disabledDate={(cur) => {
                            if (!cur) return false;
                            if (minDate && cur.isBefore(minDate, "day")) return true;
                            if (maxDate && cur.isAfter(maxDate, "day")) return true;
                            return false;
                          }}
                          format="YYYY-MM-DD"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Overview (existing sections) */}
              <section aria-labelledby="overview-title">
                <div id="overview-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <LayoutList className="h-4 w-4" style={{ color: TOKENS.brand }} /> Overview Sections
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: "overview", label: "Overview KPIs", icon: Activity },
                    { key: "cannibalization", label: "Cannibalization", icon: GitMerge },
                    { key: "clusterview", label: "Cluster View", icon: Sparkles },
                    { key: "movement", label: "Movement Feed", icon: TrendingUp },
                    { key: "performance", label: "Performance Table", icon: SlidersHorizontal },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <div className="text-sm font-medium">{label}</div>
                      </div>
                      <Switch
                        checked={(prefs.sections as any)[key]}
                        onChange={(val) =>
                          setPrefs((p) => ({ ...p, sections: { ...p.sections, [key]: val } as InsightsSections }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Keyword Rank Tracking */}
              <section aria-labelledby="tracker-title">
                <div id="tracker-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <Target className="h-4 w-4" style={{ color: TOKENS.brand }} /> Keyword Rank Tracking
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Trend window</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Default window for tracker charts</div>
                    </div>
                    <Radio.Group
                      value={prefs.tabs.rankTracking.trendWindow}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: { ...p.tabs, rankTracking: { ...p.tabs.rankTracking, trendWindow: e.target.value } },
                        }))
                      }
                      optionType="button"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="7d">7d</Radio.Button>
                      <Radio.Button value="30d">30d</Radio.Button>
                      <Radio.Button value="90d">90d</Radio.Button>
                    </Radio.Group>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Show SERP preview</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Show quick SERP rows where available</div>
                    </div>
                    <Switch
                      checked={prefs.tabs.rankTracking.showSerpPreview}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: { ...p.tabs, rankTracking: { ...p.tabs.rankTracking, showSerpPreview: v } },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Auto‑add from Rank Checker</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>After a check finishes</div>
                    </div>
                    <Switch
                      checked={prefs.tabs.rankTracking.autoAddFromChecker}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: { ...p.tabs, rankTracking: { ...p.tabs.rankTracking, autoAddFromChecker: v } },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Rank Checker */}
              <section aria-labelledby="checker-title">
                <div id="checker-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <SlidersHorizontal className="h-4 w-4" style={{ color: TOKENS.brand }} /> Rank Checker
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Manual input limit</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Max keywords per paste</div>
                    </div>
                    <InputNumber
                      min={10}
                      max={200}
                      value={prefs.tabs.rankChecker.maxManual}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            rankChecker: { ...p.tabs.rankChecker, maxManual: Number(v ?? 50) },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">CSV import limit</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Max rows per upload</div>
                    </div>
                    <InputNumber
                      min={100}
                      max={10000}
                      value={prefs.tabs.rankChecker.maxCSV}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            rankChecker: { ...p.tabs.rankChecker, maxCSV: Number(v ?? 1000) },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Allow competitors field</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Enable competitor domains on form</div>
                    </div>
                    <Switch
                      checked={prefs.tabs.rankChecker.allowCompetitors}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            rankChecker: { ...p.tabs.rankChecker, allowCompetitors: v },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Auto‑add results to Tracker</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Keep your tracker in sync</div>
                    </div>
                    <Switch
                      checked={prefs.tabs.rankChecker.autoAddToTracker}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            rankChecker: { ...p.tabs.rankChecker, autoAddToTracker: v },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Gap Analyzer */}
              <section aria-labelledby="gap-title">
                <div id="gap-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <Users className="h-4 w-4" style={{ color: TOKENS.brand }} /> Gap Analyzer
                </div>

                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Default competitors</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Up to 5 domains</div>
                    </div>
                    <div className="w-[280px]">
                      <CompetitorTags
                        value={prefs.tabs.gapAnalyzer.defaultCompetitors}
                        onChange={(v) =>
                          setPrefs((p) => ({
                            ...p,
                            tabs: {
                              ...p.tabs,
                              gapAnalyzer: { ...p.tabs.gapAnalyzer, defaultCompetitors: v },
                            },
                          }))
                        }
                        max={5}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Include brand terms</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Otherwise brand/own-brand filtered</div>
                    </div>
                    <Switch
                      checked={prefs.tabs.gapAnalyzer.includeBrandTerms}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            gapAnalyzer: { ...p.tabs.gapAnalyzer, includeBrandTerms: v },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Minimum volume</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Ignore queries below this</div>
                    </div>
                    <InputNumber
                      min={0}
                      max={100000}
                      value={prefs.tabs.gapAnalyzer.minVolume}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            gapAnalyzer: { ...p.tabs.gapAnalyzer, minVolume: Number(v ?? 0) },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Competitor win threshold</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Treat rank ≤ N as a win</div>
                    </div>
                    <InputNumber
                      min={1}
                      max={20}
                      value={prefs.tabs.gapAnalyzer.competitorWinThreshold}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            gapAnalyzer: {
                              ...p.tabs.gapAnalyzer,
                              competitorWinThreshold: Number(v ?? 10),
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Keyword Opportunities */}
              <section aria-labelledby="opp-title">
                <div id="opp-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <ShieldCheck className="h-4 w-4" style={{ color: TOKENS.brand }} /> Keyword Opportunities
                </div>

                <div className="space-y-5">
                  {/* Reasons filter (chips) */}
                  <div>
                    <div className="text-sm mb-2">Enabled reason types</div>
                    <div className="flex flex-wrap gap-2">
                      {(["MISSING","WEAK","NEAR_TOP10","COMPETITOR_WIN","TRENDING","CANNIBALIZED","HIGH_INTENT"] as ReasonType[]).map((r) => {
                        const active = prefs.tabs.opportunities.enabledReasons[r];
                        return (
                          <ChipBtn
                            key={r}
                            active={active}
                            onClick={() =>
                              setPrefs((p) => ({
                                ...p,
                                tabs: {
                                  ...p.tabs,
                                  opportunities: {
                                    ...p.tabs.opportunities,
                                    enabledReasons: { ...p.tabs.opportunities.enabledReasons, [r]: !active },
                                  },
                                },
                              }))
                            }
                            title={r.replace(/_/g, " ").toLowerCase()}
                          >
                            {r.replace(/_/g, " ")}
                          </ChipBtn>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score threshold */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Minimum opportunity score</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Only show items ≥ threshold</div>
                    </div>
                    <div className="w-[220px]">
                      <Slider
                        min={0}
                        max={100}
                        value={prefs.tabs.opportunities.minScore}
                        onChange={(v) =>
                          setPrefs((p) => ({
                            ...p,
                            tabs: {
                              ...p.tabs,
                              opportunities: { ...p.tabs.opportunities, minScore: Number(v) },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* SERP preview toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Show SERP preview</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Enable quick context cards</div>
                    </div>
                    <Switch
                      checked={prefs.tabs.opportunities.showSerpPreview}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          tabs: {
                            ...p.tabs,
                            opportunities: { ...p.tabs.opportunities, showSerpPreview: v },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Advanced (global) */}
              <section aria-labelledby="adv-title">
                <div id="adv-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <Filter className="h-4 w-4" style={{ color: TOKENS.brand }} /> Advanced
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Max insights cards</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Limits large cards rendered</div>
                    </div>
                    <InputNumber
                      min={3}
                      max={12}
                      value={prefs.advanced.maxCards}
                      onChange={(v) => setPrefs((p) => ({ ...p, advanced: { ...p.advanced, maxCards: Number(v ?? 6) } }))}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium">Ranking distribution bins</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Comma‑separated end points</div>
                    </div>
                    <Tooltip title="Example: 3,10,20,50,100">
                      <input
                        type="text"
                        className="w-[220px] px-2 py-1 border rounded"
                        style={{ borderColor: TOKENS.borderLight }}
                        value={prefs.advanced.distributionBins.join(",")}
                        onChange={(e) => {
                          const parts = e.target.value
                            .split(",")
                            .map((s) => parseInt(s.trim(), 10))
                            .filter((n) => Number.isFinite(n) && n > 0);
                          setPrefs((p) => ({ ...p, advanced: { ...p.advanced, distributionBins: parts } }));
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              </section>

              {/* Behavior (global) */}
              <section aria-labelledby="beh-title">
                <div id="beh-title" className="text-[12px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: TOKENS.textMuted }}>
                  <Activity className="h-4 w-4" style={{ color: TOKENS.brand }} /> Behavior
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">Auto‑fetch additional tabs</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>After Overview is ready</div>
                    </div>
                    <Switch
                      checked={prefs.behavior.autoFetchRest}
                      onChange={(v) => setPrefs((p) => ({ ...p, behavior: { ...p.behavior, autoFetchRest: v } }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">Reduce motion</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Tone down animations</div>
                    </div>
                    <Switch
                      checked={prefs.behavior.reduceMotion}
                      onChange={(v) => setPrefs((p) => ({ ...p, behavior: { ...p.behavior, reduceMotion: v } }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">Show tooltips</div>
                      <div className="text-xs" style={{ color: TOKENS.textMuted }}>Context hints on cards/charts</div>
                    </div>
                    <Switch
                      checked={prefs.behavior.showTooltips}
                      onChange={(v) => setPrefs((p) => ({ ...p, behavior: { ...p.behavior, showTooltips: v } }))}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: `${BORDER}px solid ${TOKENS.borderLight}` }}
            >
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: TOKENS.textDarkerMuted }}>
                <Switch checked={persistOnApply} onChange={setPersistOnApply} />
                Save as my default
              </label>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="h-9 px-3 rounded-md text-sm cursor-pointer"
                  style={{
                    border: `${BORDER}px solid ${TOKENS.borderLight}`,
                    background: "#fff",
                    color: TOKENS.text,
                  }}
                >
                  Reset
                </button>
                <motion.button
                  type="button"
                  onClick={applyNow}
                  className="h-9 px-4 rounded-md text-sm text-white cursor-pointer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ background: TOKENS.brand }}
                >
                  Apply
                </motion.button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   Default export demo (safe to remove in your app)
   Fixes: “The default export is not a React Component in "/demo4/page"”
──────────────────────────────────────────────────────────────────────────── */
export default function KeywordSettings() {
  const [open, setOpen] = React.useState(true);

  const initial: InsightsPreferences = {
    device: "desktop",
    locationISO: "IN",
    datePreset: "30d",
    sections: {
      overview: true,
      cannibalization: true,
      clusterview: true,
      movement: true,
      performance: true,
    },
    behavior: {
      autoFetchRest: true,
      reduceMotion: false,
      showTooltips: true,
    },
    advanced: {
      maxCards: 6,
      distributionBins: [3, 10, 20, 50, 100],
    },
    tabs: {
      rankTracking: {
        trendWindow: "30d",
        showSerpPreview: true,
        autoAddFromChecker: true,
      },
      rankChecker: {
        maxManual: 50,
        maxCSV: 1000,
        allowCompetitors: true,
        autoAddToTracker: false,
      },
      gapAnalyzer: {
        defaultCompetitors: ["ahrefs.com", "semrush.com", "moz.com"],
        includeBrandTerms: false,
        minVolume: 100,
        competitorWinThreshold: 10,
      },
      opportunities: {
        enabledReasons: {
          MISSING: true,
          WEAK: true,
          NEAR_TOP10: true,
          COMPETITOR_WIN: true,
          TRENDING: true,
          CANNIBALIZED: true,
          HIGH_INTENT: true,
        },
        minScore: 55,
        showSerpPreview: true,
      },
    },
  };

  return (
<>
   <InsightsSettingsDrawer
        open={open}
        onClose={() => setOpen(false)}
        plan="pro"
        minDate={dayjs().subtract(180, "day")}
        maxDate={dayjs()}
        initial={initial}
        onApply={(p) => console.log("APPLY PREFS", p)}
      />
</>
  );
}

