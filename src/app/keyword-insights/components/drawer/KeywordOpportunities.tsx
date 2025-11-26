"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  Download,
  ExternalLink,
  Info,
  Lock,
  Target,
  Flame,
  Trophy,
  TrendingUp as TrendingIcon,
  AlertTriangle,
  ShieldAlert,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ───────────────────────────────── TOKENS ───────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  panel: "#FFFFFF",
  hover: "#FAFAFA",
  // reason colors
  red: "#E94134",
  orange: "#F97316",
  yellow: "#F9BB04",
  green: "#34A853",
  brown: "#7C3E0C",
  blue: "#4286F5",
};

/* ─────────────────────────────── TYPES ─────────────────────────────── */
type Device = "desktop" | "mobile";
type ExportFormat = "csv" | "json";
type ReasonType =
  | "MISSING"
  | "WEAK"
  | "NEAR_TOP10"
  | "COMPETITOR_WIN"
  | "TRENDING"
  | "CANNIBALIZED"
  | "HIGH_INTENT";

type Reason = {
  type: ReasonType;
  data?: {
    yourRank?: number | null;
    bestCompetitorRank?: number | null;
    competitor?: string | null;
    increasePct?: number | null;
    competingUrls?: number | null;
    exampleUrl?: string | null;
  };
};

interface Props {
  keyword: string;
  device: Device;
  locationISO: string; // e.g., "US"
  projectDomain?: string;
  reasons: Reason[]; // 1..N
  plan?: "free" | "premium";
  showPlanToggleForDemo?: boolean;
  onNavigate?: (
    target:
      | "GAP"
      | "OPPORTUNITIES"
      | "CANNIBALIZATION"
      | "COMPETITOR_INTEL",
    payload?: Record<string, any>
  ) => void;
  onExport?: (fmt: ExportFormat, data: Reason[]) => void;
}

/* ───────────────────────────── UI PRIMITIVES ───────────────────────────── */
const Chip = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <span
    title={title}
    className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px]"
    style={{ borderColor: TK.border, background: TK.chipBg, color: "#374151" }}
  >
    {children}
  </span>
);

const ButtonPrimary = ({
  onClick,
  children,
  title,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-1"
    style={{ background: TK.brand }}
  >
    {children}
  </button>
);

const ButtonGhost = ({
  onClick,
  children,
  className = "",
  title,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 ${className}`}
    style={{ borderColor: TK.border, background: "#fff" }}
  >
    {children}
  </button>
);

const IconButton = ({
  onClick,
  title,
  children,
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1"
    style={{ borderColor: TK.border, background: "#fff" }}
  >
    {children}
  </button>
);

/* Modern toggle for demo */
const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) => (
  <label className="inline-flex cursor-pointer select-none items-center gap-2">
    {label && <span className="text-sm" style={{ color: TK.muted }}>{label}</span>}
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-[var(--brand)]" : "bg-gray-300"
      }`}
      style={{ ["--brand" as any]: TK.brand }}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </span>
  </label>
);

/* ───────────────────────────── HELPERS ───────────────────────────── */
const reasonMeta = {
  MISSING: {
    label: "Missing",
    bg: TK.red,
    text: "#ffffff",
    icon: <ShieldAlert className="h-4 w-4" />,
    tooltip: (r: Reason) => {
      const a = r?.data?.yourRank;
      return `Your domain doesn’t rank in Top 100${a ? ` (you #${a})` : ""}, competitors do.`;
    },
    navigate: () => ({ target: "GAP" as const, payload: { gapType: "missing" } }),
  },
  WEAK: {
    label: "Weak",
    bg: TK.orange,
    text: "#ffffff",
    icon: <AlertTriangle className="h-4 w-4" />,
    tooltip: (r: Reason) =>
      `You trail competitor by ≥5 positions${
        r?.data?.yourRank && r?.data?.bestCompetitorRank
          ? ` (you #${r.data.yourRank}, best comp #${r.data.bestCompetitorRank})`
          : ""
      }.`,
    navigate: () => ({ target: "GAP" as const, payload: { gapType: "weak" } }),
  },
  NEAR_TOP10: {
    label: "Near Top 10",
    bg: TK.blue,
    text: "#ffffff",
    icon: <Target className="h-4 w-4" />,
    tooltip: (r: Reason) => `Just outside Top 10${r?.data?.yourRank ? ` (rank #${r.data.yourRank})` : ""}.`,
    navigate: () => ({ target: "OPPORTUNITIES" as const, payload: { type: "LOW_HANGING" } }),
  },
  COMPETITOR_WIN: {
    label: "Competitor Win",
    bg: TK.yellow,
    text: TK.text,
    icon: <Trophy className="h-4 w-4" />,
    tooltip: (r: Reason) => `Competitor ${r?.data?.competitor ?? "—"} moved into Top 3 recently.`,
    navigate: (r: Reason) => ({
      target: "COMPETITOR_INTEL" as const,
      payload: { competitor: r?.data?.competitor },
    }),
  },
  TRENDING: {
    label: "Trending",
    bg: TK.green,
    text: "#ffffff",
    icon: <TrendingIcon className="h-4 w-4" />,
    tooltip: (r: Reason) => `Search demand increasing${r?.data?.increasePct ? ` (~${r.data.increasePct}% in 30d)` : ""}.`,
    navigate: () => ({ target: "OPPORTUNITIES" as const, payload: { type: "TRENDING" } }),
  },
  CANNIBALIZED: {
    label: "Cannibalized",
    bg: TK.brown,
    text: "#ffffff",
    icon: <Flame className="h-4 w-4" />,
    tooltip: (r: Reason) =>
      `Multiple URLs ranking${r?.data?.competingUrls ? ` (${r.data.competingUrls} pages)` : ""}.`,
    navigate: () => ({ target: "CANNIBALIZATION" as const, payload: {} }),
  },
  HIGH_INTENT: {
    label: "High Intent",
    bg: "#ffffff",
    text: TK.blue,
    icon: <ShoppingBag className="h-4 w-4" />,
    tooltip: () => "Commercial/transactional terms detected (buy, pricing, vs, review…).",
    navigate: () => ({ target: "OPPORTUNITIES" as const, payload: { type: "HIGH_INTENT" } }),
  },
} as const;

function toCSV(reasons: Reason[]) {
  const header = ["type", "label", "yourRank", "bestCompetitorRank", "competitor", "increasePct", "competingUrls"].join(",");
  const rows = reasons.map((r) => {
    const meta = reasonMeta[r.type];
    return [
      r.type,
      meta.label,
      r.data?.yourRank ?? "",
      r.data?.bestCompetitorRank ?? "",
      r.data?.competitor ?? "",
      r.data?.increasePct ?? "",
      r.data?.competingUrls ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header, ...rows].join("\n");
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────────────────────────── COMPONENT ───────────────────────────── */
export function KeywordOpportunitiesGapsSection({
  keyword,
  device,
  locationISO,
  projectDomain,
  reasons,
  plan = "premium",
  showPlanToggleForDemo = false,
  onNavigate,
  onExport,
}: Props) {
  const [isPremium, setIsPremium] = useState(plan === "premium");
  useEffect(() => setIsPremium(plan === "premium"), [plan]);

  // export dropdown
  const [expOpen, setExpOpen] = useState(false);
  const expRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!expRef.current) return;
      if (!expRef.current.contains(e.target as Node)) setExpOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleExport = (fmt: ExportFormat) => {
    onExport?.(fmt, reasons);
    if (fmt === "csv") downloadBlob(toCSV(reasons), "text/csv;charset=utf-8;", `keyword-opps_${keyword}_${device}_${locationISO}.csv`);
    else downloadBlob(JSON.stringify(reasons, null, 2), "application/json", `keyword-opps_${keyword}_${device}_${locationISO}.json`);
    setExpOpen(false);
  };

  const MAX_INLINE = 4;
  const hasMore = reasons.length > MAX_INLINE;
  const [showAll, setShowAll] = useState(false);
  const badges = useMemo(() => (showAll ? reasons : reasons.slice(0, MAX_INLINE)), [reasons, showAll]);

  const gated = !isPremium && reasons.length > 1;

  return (
    <section
      role="region"
      aria-label="Opportunities & Gaps"
      className="rounded-lg border shadow-sm"
      style={{
        borderColor: TK.border,
        background: TK.panel,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-3" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: TK.brand }} />
          <div className="text-[16px] font-semibold" style={{ color: TK.text }}>
            Opportunities &amp; Gaps
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showPlanToggleForDemo && (
            <Toggle checked={isPremium} onChange={setIsPremium} label="Demo: Premium" />
          )}

          {/* Export (single button with dropdown) */}
          <div className="relative" ref={expRef}>
            <ButtonGhost title="Export" onClick={() => setExpOpen((v) => !v)}>
              <Download className="h-4 w-4" style={{ color: TK.brand }} />
              Export
            </ButtonGhost>
            {expOpen && (
              <div
                role="menu"
                aria-label="Export options"
                className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-md border bg-white shadow-lg"
                style={{ borderColor: TK.border }}
              >
                <button
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => handleExport("csv")}
                >
                  CSV
                </button>
                <button
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => handleExport("json")}
                >
                  JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        {/* Meta */}
        <div className="mb-2 text-[12px]" style={{ color: TK.muted }}>
          <strong style={{ color: TK.text }}>{keyword}</strong> · {device === "mobile" ? "Mobile" : "Desktop"} · {locationISO}
          {projectDomain ? <> · {projectDomain}</> : null}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {badges.map((r, idx) => {
            const meta = reasonMeta[r.type];
            const locked = gated && idx > 0;
            const isHighIntent = r.type === "HIGH_INTENT";

            const onClick = () => {
              if (locked) return;
              if (!onNavigate) return;
              const nav =
                "navigate" in meta
                  ? typeof meta.navigate === "function" ? meta.navigate(r): undefined: undefined;
              if (nav) onNavigate(nav.target, nav.payload);
            };

            return (
              <button
                key={`${r.type}-${idx}`}
                onClick={onClick}
                title={isPremium || idx === 0 ? meta.tooltip(r) : "Upgrade to view full context"}
                className={`group inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  isHighIntent ? "bg-white" : ""
                }`}
                style={{
                  background: isHighIntent ? meta.bg : meta.bg,
                  color: isHighIntent ? meta.text : meta.text,
                  borderColor: isHighIntent ? TK.blue : "transparent",
                  opacity: locked ? 0.7 : 1,
                }}
                aria-label={`${meta.label} — ${meta.tooltip(r)}`}
              >
                <span className={`${isHighIntent ? "text-[color:var(--blue)]" : ""}`} style={{ ["--blue" as any]: TK.blue }}>
                  {meta.icon}
                </span>
                <span>{meta.label}</span>
                {locked && <Lock className="h-4 w-4" />}
              </button>
            );
          })}

          {hasMore && !showAll && (
            <ButtonGhost onClick={() => setShowAll(true)} title={`Show ${reasons.length - MAX_INLINE} more`}>
              <ChevronDown className="h-4 w-4" />
              Show {reasons.length - MAX_INLINE} more
            </ButtonGhost>
          )}
          {hasMore && showAll && (
            <ButtonGhost onClick={() => setShowAll(false)} title="Show fewer">
              <ChevronUp className="h-4 w-4" />
              Show fewer
            </ButtonGhost>
          )}
        </div>

        {/* Gated note */}
        {gated && (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-[12px]"
            style={{ borderColor: TK.border, background: TK.hover, color: TK.muted }}
            role="note"
          >
            <Lock className="h-4 w-4" />
            Multiple reasons are available on Premium. The top reason is shown here.
          </div>
        )}

        {/* Explanations */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[14px] font-semibold" style={{ color: TK.text }}>
              Why this keyword matters{isPremium ? "" : " (sample)"}
            </div>
            <ButtonGhost onClick={() => handleExport("csv")} title="Export details as CSV">
              <Download className="h-4 w-4" style={{ color: TK.brand }} />
              Export details
            </ButtonGhost>
          </div>

          <div className="grid gap-2">
            {(isPremium ? reasons : reasons.slice(0, 1)).map((r, i) => {
              const meta = reasonMeta[r.type];
              const pillBg =
                r.type === "MISSING" ? TK.red : r.type === "COMPETITOR_WIN" ? TK.yellow : TK.blue;
              const pillText = r.type === "COMPETITOR_WIN" ? TK.text : "#ffffff";
              const detail = (meta.tooltip as any)(r) as string;

              const go = () => {
                if (!onNavigate) return;
                const nav = meta.navigate(r);
                if (nav) onNavigate(nav.target, nav.payload);
              };

              return (
                <div
                  key={`exp-${r.type}-${i}`}
                  className="flex items-start gap-3 rounded-md border p-3"
                  style={{ borderColor: TK.border, background: "#fff" }}
                >
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold"
                    style={{ background: pillBg, color: pillText }}
                  >
                    {meta.label}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
                      {detail}
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: TK.muted }}>
                      {r.type === "MISSING" && "Click the reason to open Gap Analyzer (Missing)."}
                      {r.type === "WEAK" && "Click the reason to open Gap Analyzer (Weak)."}
                      {r.type === "NEAR_TOP10" && "Routes to Opportunities (Low‑hanging)."}
                      {r.type === "CANNIBALIZED" && "Opens Cannibalization view for competing URLs."}
                      {r.type === "TRENDING" && "Routes to Opportunities with Trending filter."}
                      {r.type === "COMPETITOR_WIN" && "Jump to Competitor Intelligence for movement."}
                      {r.type === "HIGH_INTENT" && "Filter Opportunities by High Intent."}
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <IconButton title="Go">
                      <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} onClick={go} />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[12px]" style={{ color: TK.muted }}>
            <Info className="mr-1 inline h-4 w-4 align-[-2px]" style={{ color: TK.brand }} />
            Click a badge to navigate to the relevant view (Gap Analyzer, Opportunities, Cannibalization, Competitor Intelligence).
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── DEMO (optional) ───────────────────────────── */
const demoReasons: Reason[] = [
  { type: "NEAR_TOP10", data: { yourRank: 12 } },
  { type: "WEAK", data: { yourRank: 12, bestCompetitorRank: 6, competitor: "semrush.com" } },
  { type: "TRENDING", data: { increasePct: 42 } },
  { type: "CANNIBALIZED", data: { competingUrls: 3, exampleUrl: "/blog/seo-audit-tools" } },
  { type: "HIGH_INTENT" },
];

export default function DemoKeywordOpportunitiesGaps() {
  return (
    <div className="space-y-3 p-4" style={{ fontFamily: 'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui' }}>
      <KeywordOpportunitiesGapsSection
        keyword="best seo audit tools"
        device="desktop"
        locationISO="US"
        projectDomain="wranker.com"
        reasons={demoReasons}
        plan="premium"                   // change to "free" to preview gating
        showPlanToggleForDemo            // demo-only toggle for plan
        onNavigate={(target, payload) => alert(`Navigate → ${target}\n${JSON.stringify(payload || {}, null, 2)}`)}
        onExport={(fmt) => console.log("Exported:", fmt)}
      />
    </div>
  );
}
