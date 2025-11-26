"use client";

/**
 * Wranker — Section 7: Optimization Insights & Warnings – Keyword Drilldown Drawer
 * Update notes:
 * - Inter / Inter Fallback font stack is applied.
 * - Removed all emoji; replaced with branded (#008CCD) lucide icons for section title, device/country chips, and CTA buttons.
 * - Clickable elements use pointer cursor.
 * - Filters use modular segmented toggle; chips match recent designs.
 * - No behavior changes beyond the refinements requested.
 *
 * Patterns for chips & toggles mirror the recent Header/Filters work in Project Overview. :contentReference[oaicite:0]{index=0}
 */

import * as React from "react";
import {
  AlertTriangle,
  Lightbulb,
  Globe,
  Smartphone,
  Layers,
  FileWarning,
  ExternalLink,
  ClipboardList,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Info,
  Search,
  ChevronUp as ChevronUpMini,
  ChevronDown as ChevronDownMini,
} from "lucide-react";

/* ======================== Tokens (alias to Wranker) ======================== */
const TK = {
  surface: "var(--bg-panel, #FFFFFF)",
  surfaceMuted: "var(--bg-app, #F5F7FA)",
  text: "var(--text-strong, #111827)",
  muted: "var(--text-muted, #6B7280)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  brand: "var(--brand, #008CCD)",
  brandPastel: "var(--brand-pastel, #D9EEF8)",
  focus: "var(--focus, #4286F5)",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  overlay: "var(--overlay, rgba(17,24,39,0.96))",
  radius: "var(--radius, 6px)",
  shadow: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
};

const FONT_STACK =
  `'Inter', 'Inter Fallback', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'`;

/* =============================== Types =============================== */
type InsightSeverity = "critical" | "warning" | "info";
type InsightType =
  | "low_ctr"
  | "high_impr_low_clicks"
  | "multiple_pages"
  | "wrong_page"
  | "mobile_ctr_weak"
  | "outdated_top_page"
  | "geo_opportunity";

export type Insight = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  badges?: string[]; // e.g., ["Critical"]
  meta?: {
    country?: string; // "AU"
    countryName?: string; // "Australia"
    device?: "mobile" | "desktop" | "tablet";
    ctr?: number; // ratio 0..1
    position?: number; // rank
    impressions?: number;
    clicks?: number;
    pageUrl?: string;
    pageTitle?: string;
    lastUpdatedDays?: number;
    deltaVsDesktopPct?: number; // +/- %
  };
  ctas?: {
    label: string;
    kind: "primary" | "secondary";
    action: "assign-task" | "view-page" | "open-landing-pages" | "open-locale-serp";
  }[];
};

type TelemetryFn = (ev: string, payload: Record<string, any>) => void;

export type OptimizationInsightsProps = {
  query: string;
  insights?: Insight[];
  defaultCollapsed?: boolean;
  onAssignTask?: (payload: { query: string; insight: Insight }) => void;
  onViewPage?: (payload: { pageUrl?: string; query: string; insight: Insight }) => void;
  onOpenLandingPages?: (query: string) => void;
  onOpenLocaleSerp?: (payload: { query: string; country?: string }) => void;
  onTelemetry?: TelemetryFn;
  className?: string;
};

/* =============================== Utils =============================== */
const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
const pct = (v: number | null | undefined, d = 2) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const pp = (v: number, d = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)} pp`;
const compact = (n: number | undefined) => {
  if (n == null || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(Math.round(n));
};

/* Deterministic RNG for stable demos per query */
function makeRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ========================== Mock Insight Builder (no emoji in labels) ========================== */
function buildMockInsights(query: string): Insight[] {
  const rng = makeRng(query);
  const desktopCtr = 0.089 + (rng() - 0.5) * 0.02; // ~8.9% ±1%
  const mobileCtr = desktopCtr * (0.6 + rng() * 0.2); // 60–80% of desktop
  const pos = 4 + Math.round(rng() * 5); // rank 4–9
  const lowCtr = 0.006 + rng() * 0.009; // 0.6–1.5%
  const imprHigh = 2500 + Math.round(rng() * 12000);
  const clicksLow = Math.round(imprHigh * 0.012);
  const auCtr = 0.1 + (rng() - 0.5) * 0.02; // ~10%
  const auClicks = 80 + Math.round(rng() * 100);
  const auImpr = 300 + Math.round(rng() * 400);
  const outdatedDays = 370 + Math.round(rng() * 300);

  const commonCTAs = (pageUrl?: string): Insight["ctas"] => [
    { label: "Assign Task", kind: "primary", action: "assign-task" },
    pageUrl
      ? { label: "View Page", kind: "secondary", action: "view-page" }
      : { label: "Open Landing Pages", kind: "secondary", action: "open-landing-pages" },
  ];

  const insights: Insight[] = [
    {
      id: "i1",
      type: "low_ctr",
      severity: "critical",
      title: "Low CTR on ranking page",
      description: `CTR is ${pct(lowCtr)} despite average position around ${pos}. Snippet likely needs improvement.`,
      badges: ["Critical"],
      meta: { ctr: lowCtr, position: pos, pageUrl: "/blog/ultimate-seo-guide", pageTitle: "Ultimate SEO Guide" },
      ctas: commonCTAs("/blog/ultimate-seo-guide"),
    },
    {
      id: "i2",
      type: "high_impr_low_clicks",
      severity: "warning",
      title: "High impressions, low clicks",
      description: `Impressions are ${compact(imprHigh)} with CTR ${pct(0.012)}. Consider improving title/description.`,
      badges: ["Opportunity"],
      meta: { impressions: imprHigh, clicks: clicksLow },
      ctas: commonCTAs(),
    },
    {
      id: "i3",
      type: "multiple_pages",
      severity: "warning",
      title: "Multiple pages ranking (possible cannibalization)",
      description: `This query splits traffic across 3 pages. Consolidation might boost performance.`,
      badges: ["Cannibalization"],
      meta: {},
      ctas: [{ label: "Open Landing Pages", kind: "primary", action: "open-landing-pages" }],
    },
    {
      id: "i4",
      type: "wrong_page",
      severity: "info",
      title: "Wrong page ranking",
      description: `A blog post ranks instead of a conversion page. Consider retargeting internal links.`,
      badges: ["Info"],
      meta: { pageUrl: "/blog/seo-tools-list", pageTitle: "Top SEO Tools List" },
      ctas: commonCTAs("/blog/seo-tools-list"),
    },
    {
      id: "i5",
      type: "mobile_ctr_weak",
      severity: "warning",
      title: "Mobile CTR weaker than desktop",
      description: `Mobile CTR is ${pp((mobileCtr - desktopCtr) * 100)} vs desktop. Review mobile snippet & layout.`,
      badges: ["Mobile"],
      meta: { device: "mobile", ctr: mobileCtr, deltaVsDesktopPct: (mobileCtr - desktopCtr) * 100 },
      ctas: commonCTAs(),
    },
    {
      id: "i6",
      type: "outdated_top_page",
      severity: "warning",
      title: "Top page may be outdated",
      description: `Top page updated ~${outdatedDays} days ago with CTR below project average. Refresh recommended.`,
      badges: ["Content"],
      meta: { lastUpdatedDays: outdatedDays, pageUrl: "/seo-services", pageTitle: "SEO Services" },
      ctas: commonCTAs("/seo-services"),
    },
    {
      id: "i7",
      type: "geo_opportunity",
      severity: "info",
      title: "Geo opportunity detected",
      description: `Australia CTR is ${pct(auCtr)} but only ${compact(auClicks)} clicks. Consider localized content.`,
      badges: ["Geo"],
      meta: { country: "AU", countryName: "Australia", ctr: auCtr, clicks: auClicks, impressions: auImpr },
      ctas: [
        { label: "View Locale SERP", kind: "secondary", action: "open-locale-serp" },
        { label: "Create Locale Task", kind: "primary", action: "assign-task" },
      ],
    },
  ];

  const sevScore = (s: InsightSeverity) => (s === "critical" ? 0 : s === "warning" ? 1 : 2);
  return insights.sort((a, b) => sevScore(a.severity) - sevScore(b.severity));
}

/* ========================== Small UI primitives ========================== */
function SeverityBadge({ severity }: { severity: InsightSeverity }) {
  const styles =
    severity === "critical"
      ? { bg: TK.criticalBg, fg: TK.critical, label: "Critical" }
      : severity === "warning"
      ? { bg: TK.warningBg, fg: TK.warning, label: "Warning" }
      : { bg: TK.successBg, fg: TK.success, label: "Info" };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded"
      style={{ background: styles.bg, color: styles.fg, border: `1px solid ${styles.fg}22` }}
    >
      {styles.label}
    </span>
  );
}

/** Modular chip (matches recent designs) */
function Chip({
  active,
  children,
  onClick,
  title,
}: React.PropsWithChildren<{ active?: boolean; onClick?: () => void; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "h-8 px-3 rounded-full border text-sm inline-flex items-center gap-1.5 cursor-pointer",
        active ? "font-semibold" : "",
        "hover:bg-gray-50"
      )}
      style={{
        borderColor: TK.borderSubtle,
        background: active ? TK.brandPastel : "#fff",
        color: active ? TK.brand : TK.text,
      }}
    >
      {children}
    </button>
  );
}

/** Segmented toggle (brand pastel active) */
function Segmented<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; icon?: React.ComponentType<{ className?: string }>; disabled?: boolean }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden border rounded-full"
      style={{ borderColor: TK.borderSubtle }}
    >
      {items.map((it, idx) => {
        const isActive = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={String(it.value)}
            type="button"
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            className={cx(
              "px-3 h-8 text-sm inline-flex items-center gap-1.5 cursor-pointer",
              idx > 0 ? "border-l" : "",
              it.disabled ? "opacity-60 cursor-not-allowed" : ""
            )}
            style={{
              borderColor: TK.borderSubtle,
              background: isActive ? TK.brandPastel : "#fff",
              color: isActive ? TK.brand : TK.text,
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function IconForType({
  type,
  severity,
  className,
}: {
  type: InsightType;
  severity: InsightSeverity;
  className?: string;
}) {
  const color = severity === "critical" ? TK.critical : severity === "warning" ? TK.warning : TK.brand;
  const C =
    type === "low_ctr"
      ? AlertTriangle
      : type === "multiple_pages"
      ? Layers
      : type === "wrong_page"
      ? FileWarning
      : type === "mobile_ctr_weak"
      ? Smartphone
      : type === "geo_opportunity"
      ? Globe
      : type === "high_impr_low_clicks"
      ? Lightbulb
      : Lightbulb;
  return <C className={cx("h-4 w-4", className)} style={{ color }} aria-hidden />;
}

function ActionIcon({ action }: { action: NonNullable<Insight["ctas"]>[number]["action"] }) {
  const map = {
    "assign-task": ClipboardList,
    "view-page": ExternalLink,
    "open-landing-pages": Layers,
    "open-locale-serp": Globe,
  } as const;
  const C = map[action];
  return <C className="h-4 w-4" style={{ color: TK.brand }} aria-hidden />;
}

/* ================================ Component ================================ */
export function OptimizationInsights({
  query,
  insights: provided,
  defaultCollapsed = false,
  onAssignTask,
  onViewPage,
  onOpenLandingPages,
  onOpenLocaleSerp,
  onTelemetry,
  className,
}: OptimizationInsightsProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [severity, setSeverity] = React.useState<"all" | InsightSeverity>("all");
  const [search, setSearch] = React.useState("");
  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});

  const insights = React.useMemo(
    () => (provided && provided.length ? provided : buildMockInsights(query)),
    [provided, query]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return insights
      .filter((i) => !dismissed[i.id])
      .filter((i) => (severity === "all" ? true : i.severity === severity))
      .filter((i) => {
        if (!q) return true;
        const hay = [
          i.title,
          i.description,
          i.type,
          ...(i.badges ?? []),
          i.meta?.country,
          i.meta?.countryName,
          i.meta?.device,
          i.meta?.pageUrl,
          i.meta?.pageTitle,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [insights, dismissed, severity, search]);

  const exportCSV = () => {
    const headers = [
      "id",
      "type",
      "severity",
      "title",
      "description",
      "country",
      "device",
      "ctr",
      "position",
      "impressions",
      "clicks",
      "pageUrl",
      "pageTitle",
    ];
    const rows = filtered.map((i) =>
      [
        i.id,
        i.type,
        i.severity,
        i.title,
        i.description,
        i.meta?.country ?? "",
        i.meta?.device ?? "",
        i.meta?.ctr ?? "",
        i.meta?.position ?? "",
        i.meta?.impressions ?? "",
        i.meta?.clicks ?? "",
        i.meta?.pageUrl ?? "",
        i.meta?.pageTitle ?? "",
      ]
        .map((v) => JSON.stringify(v))
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `optimization-insights_${query.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onTelemetry?.("insights_export", { surface: "drawer", count: filtered.length, query });
  };

  const handleCTA = (i: Insight, action: NonNullable<Insight["ctas"]>[number]["action"]) => {
    switch (action) {
      case "assign-task":
        onTelemetry?.("insights_card_action", { surface: "drawer", action, type: i.type, severity: i.severity });
        onAssignTask ? onAssignTask({ query, insight: i }) : alert(`Assign Task → "${i.title}" for "${query}"`);
        break;
      case "view-page":
        onTelemetry?.("insights_card_action", { surface: "drawer", action, page: i.meta?.pageUrl });
        onViewPage
          ? onViewPage({ pageUrl: i.meta?.pageUrl, query, insight: i })
          : window.open(i.meta?.pageUrl || "#", "_blank", "noopener,noreferrer");
        break;
      case "open-landing-pages":
        onTelemetry?.("insights_card_action", { surface: "drawer", action });
        onOpenLandingPages ? onOpenLandingPages(query) : alert("Open Landing Pages section");
        break;
      case "open-locale-serp":
        onTelemetry?.("insights_card_action", { surface: "drawer", action, country: i.meta?.country });
        onOpenLocaleSerp
          ? onOpenLocaleSerp({ query, country: i.meta?.country })
          : alert(`Open Locale SERP → ${i.meta?.countryName || i.meta?.country}`);
        break;
    }
  };

  const aria = `Optimization insights for "${query}". ${filtered.length} items.`;

  return (
    <section
      aria-label={aria}
      className={cx("w-full rounded-md border shadow-sm", className)}
      style={{
        background: TK.surface,
        borderColor: TK.border,
        fontFamily: FONT_STACK,
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${TK.borderSubtle}` }}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} aria-hidden />
          <h3 className="text-base font-semibold" style={{ color: TK.text }}>
            Optimization insights
          </h3>
          <span
            title="Google Search Console"
            className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium"
            style={{ background: TK.brandPastel, color: TK.brand, border: `1px solid ${TK.brand}22` }}
          >
            GSC
          </span>
          <span
            className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px]"
            style={{ background: "#F5F7FA", color: TK.muted, border: `1px solid ${TK.borderSubtle}` }}
            title="Smart suggestions for this query"
          >
            <Info className="h-3.5 w-3.5" style={{ color: TK.brand }} /> Smart
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Collapse toggle */}
          <button
            className="h-8 px-3 rounded border text-sm inline-flex items-center gap-1.5 hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setCollapsed((v) => !v);
              onTelemetry?.("insights_collapse_toggle", { surface: "drawer", collapsed: !collapsed });
            }}
            style={{ borderColor: TK.borderSubtle, color: TK.text, background: "#fff" }}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}{" "}
            {collapsed ? "Expand" : "Collapse"}
          </button>

          {/* Export */}
          <button
            className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-gray-50 cursor-pointer"
            onClick={exportCSV}
            style={{ borderColor: TK.borderSubtle, color: TK.text, background: "#fff" }}
            aria-label="Export insights as CSV"
          >
            <Download className="h-4 w-4" style={{ color: TK.brand }} /> Export CSV
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <>
          {/* Filters bar (segmented severity + search) */}
          <div
            className="px-4 py-3 flex flex-wrap items-center gap-2"
            style={{ borderBottom: `1px solid ${TK.borderSubtle}` }}
          >
            <Segmented
              ariaLabel="Severity filter"
              value={severity}
              onChange={(v) => {
                setSeverity(v);
                onTelemetry?.("insights_filter", { surface: "drawer", severity: v });
              }}
              items={[
                { value: "all", label: "All", icon: Filter as any },
                { value: "critical", label: "Critical", icon: AlertTriangle as any },
                { value: "warning", label: "Warnings", icon: AlertTriangle as any },
                { value: "info", label: "Info", icon: Lightbulb as any },
              ]}
            />

            {/* Search */}
            <div className="relative ml-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-[260px] rounded border pl-8 pr-3 text-sm outline-none"
                placeholder="Filter insights…"
                style={{ borderColor: TK.borderSubtle }}
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9CA3AF" }} aria-hidden />
            </div>
          </div>

          {/* Cards list */}
          <div className="p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: TK.muted }}>
                No insights for these filters. Try clearing filters or widening date range.
              </div>
            ) : (
              filtered.map((i) => {
                const metaChips: React.ReactNode[] = [];

                if (i.meta?.country || i.meta?.countryName) {
                  metaChips.push(
                    <span
                      key="country"
                      className="px-2 py-[2px] rounded text-[11px] inline-flex items-center gap-1.5"
                      style={{ background: "#FAFBFF", border: `1px solid ${TK.borderSubtle}`, color: TK.text }}
                    >
                      <Globe className="h-3.5 w-3.5" style={{ color: TK.brand }} /> {i.meta.countryName || i.meta.country}
                    </span>
                  );
                }
                if (i.meta?.device) {
                  metaChips.push(
                    <span
                      key="device"
                      className="px-2 py-[2px] rounded text-[11px] inline-flex items-center gap-1.5"
                      style={{ background: "#FAFBFF", border: `1px solid ${TK.borderSubtle}`, color: TK.text }}
                    >
                      <Smartphone className="h-3.5 w-3.5" style={{ color: TK.brand }} /> {i.meta.device}
                    </span>
                  );
                }
                if (i.meta?.ctr != null) {
                  metaChips.push(
                    <span
                      key="ctr"
                      className="px-2 py-[2px] rounded text-[11px]"
                      style={{ background: TK.successBg, color: TK.text, border: `1px solid ${TK.success}22` }}
                    >
                      CTR {pct(i.meta.ctr)}
                    </span>
                  );
                }
                if (i.meta?.position != null) {
                  metaChips.push(
                    <span
                      key="pos"
                      className="px-2 py-[2px] rounded text-[11px]"
                      style={{ background: "#FFF", border: `1px solid ${TK.borderSubtle}`, color: TK.text }}
                    >
                      Pos {i.meta.position.toFixed(1)}
                    </span>
                  );
                }
                if (i.meta?.impressions != null) {
                  metaChips.push(
                    <span
                      key="impr"
                      className="px-2 py-[2px] rounded text-[11px]"
                      style={{ background: "#FFF", border: `1px solid ${TK.borderSubtle}`, color: TK.text }}
                    >
                      Impr {compact(i.meta.impressions)}
                    </span>
                  );
                }
                if (i.meta?.clicks != null) {
                  metaChips.push(
                    <span
                      key="clicks"
                      className="px-2 py-[2px] rounded text-[11px]"
                      style={{ background: "#FFF", border: `1px solid ${TK.borderSubtle}`, color: TK.text }}
                    >
                      Clicks {compact(i.meta.clicks)}
                    </span>
                  );
                }
                if (i.meta?.lastUpdatedDays != null) {
                  metaChips.push(
                    <span
                      key="updated"
                      className="px-2 py-[2px] rounded text-[11px]"
                      style={{ background: TK.warningBg, color: TK.text, border: `1px solid ${TK.warning}22` }}
                    >
                      Updated ~{i.meta.lastUpdatedDays}d ago
                    </span>
                  );
                }
                if (typeof i.meta?.deltaVsDesktopPct === "number") {
                  const dv = i.meta.deltaVsDesktopPct!;
                  metaChips.push(
                    <span
                      key="dv"
                      className="px-2 py-[2px] rounded text-[11px] inline-flex items-center gap-1"
                      style={{
                        background: dv < 0 ? TK.criticalBg : TK.successBg,
                        color: TK.text,
                        border: `1px solid ${dv < 0 ? TK.critical : TK.success}22`,
                      }}
                    >
                      {dv >= 0 ? (
                        <ChevronUpMini className="h-3 w-3" style={{ color: TK.brand }} />
                      ) : (
                        <ChevronDownMini className="h-3 w-3" style={{ color: TK.brand }} />
                      )}
                      {Math.abs(dv).toFixed(0)}%
                    </span>
                  );
                }

                return (
                  <article
                    key={i.id}
                    className="rounded-md border p-3 shadow-[var(--shadow-1,0_1px_3px_rgba(0,0,0,0.1))]"
                    style={{ borderColor: TK.border, background: "#FFF" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <IconForType type={i.type} severity={i.severity} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold" style={{ color: TK.text }}>
                            {i.title}
                          </h4>
                          <SeverityBadge severity={i.severity} />
                          {i.badges?.map((b) => (
                            <span
                              key={b}
                              className="inline-flex items-center px-2 py-[2px] rounded text-[11px]"
                              style={{ border: `1px solid ${TK.borderSubtle}`, color: TK.muted, background: "#FAFBFF" }}
                            >
                              {b}
                            </span>
                          ))}
                        </div>

                        <p className="mt-1 text-sm" style={{ color: TK.text }}>
                          {i.description}
                        </p>

                        {/* Meta chips */}
                        {metaChips.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2">{metaChips}</div>}

                        {/* Page link preview */}
                        {i.meta?.pageUrl && (
                          <div className="mt-1 text-xs" style={{ color: TK.muted }}>
                            Page:{" "}
                            <button
                              className="underline decoration-transparent hover:decoration-inherit cursor-pointer inline-flex items-center gap-1"
                              style={{ color: TK.focus }}
                              onClick={() => handleCTA(i, "view-page")}
                            >
                              {i.meta.pageTitle || i.meta.pageUrl}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {(i.ctas ?? []).map((c, idx) => (
                            <button
                              key={idx}
                              className={cx(
                                "h-8 px-3 rounded text-sm inline-flex items-center gap-1.5 cursor-pointer",
                                c.kind === "primary" ? "text-white" : "border hover:bg-gray-50"
                              )}
                              style={{
                                background: c.kind === "primary" ? TK.brand : "#fff",
                                borderColor: c.kind === "primary" ? "transparent" : TK.borderSubtle,
                              }}
                              onClick={() => handleCTA(i, c.action)}
                              aria-label={`${c.label} — ${i.title}`}
                            >
                              <ActionIcon action={c.action} />
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        aria-label="Dismiss insight"
                        className="rounded p-1 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setDismissed((s) => ({ ...s, [i.id]: true }))}
                        title="Dismiss this insight"
                        style={{ color: TK.muted }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ============================== Demo wrapper ============================== */
/** Optional: demo component you can render directly */
export default function DemoOptimizationInsights() {
  return (
    <div className="p-4" style={{ fontFamily: FONT_STACK }}>
      <OptimizationInsights query="best seo tool" onTelemetry={(ev, p) => console.log("[telemetry]", ev, p)} />
    </div>
  );
}

