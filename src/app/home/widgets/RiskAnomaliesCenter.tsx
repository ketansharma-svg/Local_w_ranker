"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardPlus,
  Download,
  ExternalLink,
  Filter,
  Info,
  Loader2,
  Rocket,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
  Gauge,
  Link2,
  Globe,
  Layers,
} from "lucide-react";

/* =============================================================================
 * TOKENS
 * ==========================================================================*/
const TOKENS = {
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  subtle: "#F5F7FA",
  surface: "#FFFFFF",
  brand: "#0077FF",

  critical: "#EF4444",
  criticalPastel: "rgba(239, 68, 68, 0.12)",

  warning: "#F59E0B",
  warningPastel: "rgba(245, 158, 11, 0.14)",

  info: "#3B82F6",
  infoPastel: "rgba(59, 130, 246, 0.12)",

  good: "#10B981",
  goodPastel: "rgba(16, 185, 129, 0.14)",
} as const;

const RADIUS = 8;

/* =============================================================================
 * TYPES
 * ==========================================================================*/
type Severity = "critical" | "warning" | "info";
type RuleId =
  | "ctr_drop_stable_impr"
  | "cwv_failures_spike"
  | "orphan_over_threshold"
  | "broken_links_over_threshold"
  | "toxic_backlink_or_lost_rd_spike";

interface Project {
  id: string;
  domain: string;
}

interface BaseRow {
  id: string;
  type: RuleId;
  projectId: string;
  domain: string;
  severity: Severity;
}

interface CTRRow extends BaseRow {
  type: "ctr_drop_stable_impr";
  keyword: string;
  impressions: number;
  ctrNow: number; // %
  ctrPrev: number; // %
  ctrDeltaPct: number; // negative for drop
  positionNow: number;
  positionDelta: number;
}

interface CWVRow extends BaseRow {
  type: "cwv_failures_spike";
  url: string;
  metric: "LCP" | "INP" | "CLS";
  passRatePrev: number; // 0..1
  passRateNow: number; // 0..1
  failPctNow: number; // 0..1
}

interface OrphanRow extends BaseRow {
  type: "orphan_over_threshold";
  orphanPct: number; // 0..1
  affectedPages: number;
  crawledPages: number;
  orphanChangePct: number; // pp delta
}

interface BrokenRow extends BaseRow {
  type: "broken_links_over_threshold";
  brokenPct: number; // 0..1
  brokenLinks: number;
  scannedLinks: number;
  changePct: number; // pp delta
}

interface BacklinkRow extends BaseRow {
  type: "toxic_backlink_or_lost_rd_spike";
  newRD: number;
  lostRD: number;
  net: number;
  toxicAnchorsPct: number; // 0..1
}

type AnyRow = CTRRow | CWVRow | OrphanRow | BrokenRow | BacklinkRow;

interface SparkBucket {
  total: number;
  byProject: { projectId: string; domain: string; count: number }[];
}

interface RuleCard {
  /** stable unique key for rendering */
  uid: string;
  /** rule id (used to open drawer) */
  id: RuleId;
  title: string;
  description: string;
  highestSeverity: Severity;
  totalAffected: number;
  projects: { projectId: string; domain: string; count: number }[];
  /** simple totals for bars */
  spark: number[];
  /** distribution used for the smart popover */
  buckets: SparkBucket[];
}

/* =============================================================================
 * HELPERS
 * ==========================================================================*/
function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
const intFmt = new Intl.NumberFormat();
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const pct100 = (v: number, d = 1) => `${v.toFixed(d)}%`;
const caret = (n: number) => (n > 0 ? "▲" : n < 0 ? "▼" : "—");
const bySeverity = (a: Severity, b: Severity) =>
  scoreSeverity(b) - scoreSeverity(a);
const scoreSeverity = (s: Severity) =>
  s === "critical" ? 3 : s === "warning" ? 2 : 1;

function tone(s: Severity) {
  if (s === "critical") return { solid: TOKENS.critical, pastel: TOKENS.criticalPastel };
  if (s === "warning") return { solid: TOKENS.warning, pastel: TOKENS.warningPastel };
  return { solid: TOKENS.info, pastel: TOKENS.infoPastel };
}

/** Tiny deterministic RNG for repeatable demo data */
function makeRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Favicon helpers (fevicons everywhere) */
function getFaviconUrl(domain: string, size = 16) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
function Favicon({ domain, size = 14, className }: { domain: string; size?: number; className?: string }) {
  return (
    <img
      src={getFaviconUrl(domain, size)}
      alt=""
      width={size}
      height={size}
      className={cx("inline-block rounded", className)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

/* =============================================================================
 * THRESHOLDS (aligned to product spec)
 * Orphans: >5% Critical, 2–5% Warning
 * Broken internal links: >3% Critical, 1–3% Warning
 * CWV failing pages: >30% Critical, >15% Warning (pass rate <70 / <85)
 * CTR drop: drop ≥30% Critical; 15–30% Warning; stable impressions assumed
 * Lost RD / Toxic: Lost ≥1.5× New or Toxic ≥10% Critical; Lost > New or Toxic ≥6% Warning
 * ==========================================================================*/
function severityOrphan(p: number): Severity {
  if (p > 0.05) return "critical";
  if (p >= 0.02) return "warning";
  return "info";
}
function severityBroken(p: number): Severity {
  if (p > 0.03) return "critical";
  if (p >= 0.01) return "warning";
  return "info";
}
function severityCWVFail(failPct: number): Severity {
  if (failPct > 0.30) return "critical";
  if (failPct > 0.15) return "warning";
  return "info";
}
function severityCTRDrop(dropPct: number): Severity {
  if (dropPct <= -30) return "critical";
  if (dropPct <= -15) return "warning";
  return "info";
}
function severityBacklinks(lost: number, newRD: number, toxicPct: number): Severity {
  if (lost >= newRD * 1.5 || toxicPct >= 0.10) return "critical";
  if (lost > newRD || toxicPct >= 0.06) return "warning";
  return "info";
}

/* =============================================================================
 * BRAND ICONS
 * ==========================================================================*/
const RULE_ICON: Record<RuleId, React.ReactNode> = {
  ctr_drop_stable_impr: <TrendingDown className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />,
  cwv_failures_spike: <Gauge className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />,
  orphan_over_threshold: <Search className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />,
  broken_links_over_threshold: <Link2 className="h-3.5 w-3.5 -rotate-45" style={{ color: TOKENS.brand }} />,
  toxic_backlink_or_lost_rd_spike: <ShieldAlert className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />,
};

/* =============================================================================
 * TREND BARS with animated hover + smart popover
 * ==========================================================================*/
function TrendBars({
  buckets,
  color,
}: {
  buckets: SparkBucket[];
  color: string;
}) {
  const values = buckets.map((b) => Math.max(1, b.total));
  const max = Math.max(1, ...values);
  const [hover, setHover] = useState<number | null>(null);

  const leftPct = (i: number) => ((i + 0.5) / values.length) * 100;

  return (
    <div className="relative">
      <div className="group flex items-end gap-0.5 h-8">
        {values.map((v, i) => (
          <div
            key={i}
            className={cx(
              "w-1.5 rounded-t transition-all duration-150 ease-out origin-bottom",
              "hover:scale-y-[1.15] hover:brightness-110",
              hover !== null && hover !== i ? "opacity-50" : "opacity-90"
            )}
            style={{
              height: `${Math.max(2, (v / max) * 100)}%`,
              background: color,
              opacity: (hover === null ? 0.85 : hover === i ? 0.95 : 0.5) - (values.length - 1 - i) * 0.02,
            }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            aria-label={`Period ${i + 1}: ${v} issues`}
          />
        ))}
      </div>

      {/* Smart popover */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -top-2 flex -translate-y-full flex-col items-center"
          style={{
            left: `${leftPct(hover)}%`,
            transform: hover < 2
              ? "translateY(-100%) translateX(0)"
              : hover > values.length - 3
              ? "translateY(-100%) translateX(-100%)"
              : "translate(-50%, -100%)",
          }}
        >
          <div
            className="rounded-md border shadow-lg backdrop-blur-sm transition-all"
            style={{ background: TOKENS.surface, borderColor: TOKENS.border, width: 260 }}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-xs font-semibold" style={{ color: TOKENS.text }}>
                Period {hover + 1}
              </div>
              <div className="text-xs" style={{ color: TOKENS.muted }}>
                Total: <span className="font-semibold" style={{ color: TOKENS.brand }}>{intFmt.format(values[hover])}</span>
              </div>
            </div>
            <div className="max-h-56 overflow-auto px-3 pb-2">
              {buckets[hover].byProject.length === 0 ? (
                <div className="py-3 text-xs" style={{ color: TOKENS.muted }}>
                  No items recorded in this period.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {buckets[hover].byProject.slice(0, 6).map((p) => (
                    <li key={p.projectId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <Favicon domain={p.domain} size={14} />
                        <span className="truncate text-xs" style={{ color: TOKENS.text }}>{p.domain}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: TOKENS.text }}>
                        {intFmt.format(p.count)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-1 h-2 w-2 rotate-45 rounded-sm border" style={{ background: TOKENS.surface, borderColor: TOKENS.border }} />
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * CARD
 * ==========================================================================*/
function RuleCardView({
  card,
  onOpen,
}: {
  card: RuleCard;
  onOpen: (rule: RuleId, opt?: { projectId?: string }) => void;
}) {
  const t = tone(card.highestSeverity);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(card.id)}
      className="group flex flex-col gap-3 rounded-md border p-3 shadow-sm hover:-translate-y-[1px] transition"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      aria-label={`${card.title} – ${card.totalAffected} affected`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ color: t.solid, background: t.pastel }}
          >
            {card.highestSeverity === "critical"
              ? "Critical"
              : card.highestSeverity === "warning"
              ? "Warning"
              : "Info"}
          </span>
          {/* Branded icon + Title */}
          <span className="shrink-0">{RULE_ICON[card.id]}</span>
          <div className="truncate text-[15px] font-semibold">{card.title}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
      </div>

      <div className="text-[13px]" style={{ color: TOKENS.muted }}>
        {card.description}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[22px] font-bold" style={{ color: TOKENS.brand }}>
            {intFmt.format(card.totalAffected)}
          </div>
          <div className="text-sm" style={{ color: TOKENS.muted }}>
            affected items
          </div>
        </div>
        <TrendBars
          buckets={card.buckets}
          color={
            card.highestSeverity === "critical"
              ? TOKENS.critical
              : card.highestSeverity === "warning"
              ? TOKENS.warning
              : TOKENS.info
          }
        />
      </div>

      {/* Project chips (with favicons) */}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {card.projects.slice(0, 6).map((p) => (
          <button
            key={p.projectId}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(card.id, { projectId: p.projectId });
            }}
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            title="Open filtered table"
          >
            <Favicon domain={p.domain} size={12} />
            <span className="font-medium">{p.domain}</span>
            <span className="rounded bg-[rgba(0,0,0,0.06)] px-1">{p.count}</span>
          </button>
        ))}
        {card.projects.length > 6 && (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
            +{card.projects.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
 * DRAWER (right side)
 * ==========================================================================*/
type DrawerState =
  | { open: false }
  | {
      open: true;
      rule: RuleId;
      initialProjectId?: string;
    };

function Drawer({
  state,
  onClose,
  rows,
  projects,
  onCreateTasks,
}: {
  state: DrawerState;
  onClose: () => void;
  rows: AnyRow[];
  projects: Project[];
  onCreateTasks: (rule: RuleId, selectedRows: AnyRow[]) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // project dropdown open/close (closed by default)
  const [projMenuOpen, setProjMenuOpen] = useState(false);
  const projMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (projMenuOpen && projMenuRef.current && !projMenuRef.current.contains(e.target as Node)) {
        setProjMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [projMenuOpen]);

  useEffect(() => {
    if (state.open) {
      setSelected(new Set());
      setQ("");
      setProjectId(state.initialProjectId ?? "all");
      setProjMenuOpen(false);
    }
  }, [state]);

  if (!state.open) return null;

  const rule = state.rule;
  const visibleRows = rows
    .filter((r) => r.type === rule)
    .filter((r) => (projectId === "all" ? true : r.projectId === projectId))
    .filter((r) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      if ("keyword" in r && r.keyword.toLowerCase().includes(needle)) return true;
      if ("url" in r && r.url.toLowerCase().includes(needle)) return true;
      return r.domain.toLowerCase().includes(needle);
    })
    .sort((a, b) => bySeverity(a.severity, b.severity));

  const allIds = visibleRows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleId = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const exportCsv = () => {
    const colsBase = ["id", "domain", "severity"];
    const mapRow = (r: AnyRow) => {
      switch (r.type) {
        case "ctr_drop_stable_impr":
          return {
            ...r,
            cols: [
              ...colsBase,
              "keyword",
              "impressions",
              "ctrNow",
              "ctrPrev",
              "ctrDeltaPct",
              "positionNow",
              "positionDelta",
            ],
            values: [
              r.id,
              r.domain,
              r.severity,
              r.keyword,
              r.impressions,
              r.ctrNow,
              r.ctrPrev,
              r.ctrDeltaPct,
              r.positionNow,
              r.positionDelta,
            ],
          };
        case "cwv_failures_spike":
          return {
            ...r,
            cols: [...colsBase, "url", "metric", "passRatePrev", "passRateNow", "failPctNow"],
            values: [r.id, r.domain, r.severity, r.url, r.metric, r.passRatePrev, r.passRateNow, r.failPctNow],
          };
        case "orphan_over_threshold":
          return {
            ...r,
            cols: [...colsBase, "orphanPct", "affectedPages", "crawledPages", "orphanChangePct"],
            values: [r.id, r.domain, r.severity, r.orphanPct, r.affectedPages, r.crawledPages, r.orphanChangePct],
          };
        case "broken_links_over_threshold":
          return {
            ...r,
            cols: [...colsBase, "brokenPct", "brokenLinks", "scannedLinks", "changePct"],
            values: [r.id, r.domain, r.severity, r.brokenPct, r.brokenLinks, r.scannedLinks, r.changePct],
          };
        case "toxic_backlink_or_lost_rd_spike":
          return {
            ...r,
            cols: [...colsBase, "newRD", "lostRD", "net", "toxicAnchorsPct"],
            values: [r.id, r.domain, r.severity, r.newRD, r.lostRD, r.net, r.toxicAnchorsPct],
          };
      }
    };

    const mapped = visibleRows.map(mapRow);
    const headers = mapped[0]?.cols ?? colsBase;
    const lines = [headers.join(",")].concat(
      mapped.map((m) =>
        (m?.values ?? []).map((v) => JSON.stringify(v)).join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${rule}-export.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const selectedRows = visibleRows.filter((r) => selected.has(r.id));

  const ruleTitle: Record<RuleId, string> = {
    ctr_drop_stable_impr: "CTR drop with stable impressions",
    cwv_failures_spike: "CWV failures spike",
    orphan_over_threshold: "Orphan pages % over threshold",
    broken_links_over_threshold: "Broken internal links % over threshold",
    toxic_backlink_or_lost_rd_spike: "Toxic backlink spike / Lost RD spike",
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl flex flex-col"
        aria-label="Risk drawer"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: TOKENS.muted }}>
              Risk & Anomalies
            </div>
            <h4 className="truncate text-[18px] font-semibold">{ruleTitle[rule]}</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded border px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TOKENS.border }}
              onClick={exportCsv}
            >
              <Download size={16} className="text-[#6B7280]" />
              Export CSV
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded border px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TOKENS.border }}
              onClick={onClose}
            >
              <X size={16} className="text-[#6B7280]" />
              Close
            </button>
          </div>
        </div>

        {/* Controls */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                className="h-9 w-64 rounded border pl-8 pr-3 text-sm outline-none"
                style={{ borderColor: TOKENS.border }}
                placeholder="Search domain, keyword, or URL"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#9CA3AF]" />
            </div>

            {/* Project filter with closed-by-default dropdown and favicons */}
            <div className="relative" ref={projMenuRef}>
              <button
                className="inline-flex h-9 items-center gap-2 rounded border px-3 text-sm hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                onClick={() => setProjMenuOpen((s) => !s)}
              >
                <Filter size={16} className="text-[#6B7280]" />
                {projectId === "all" ? "All projects" : projects.find((p) => p.id === projectId)?.domain}
                <ChevronDown size={16} className={cx("text-[#9CA3AF] transition", projMenuOpen && "rotate-180")} />
              </button>

              {projMenuOpen && (
                <div
                  className="absolute z-10 mt-1 w-64 overflow-hidden rounded border bg-white shadow"
                  style={{ borderColor: TOKENS.border }}
                >
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setProjectId("all");
                      setProjMenuOpen(false);
                    }}
                  >
                    <Globe className="h-4 w-4 text-[#9CA3AF]" />
                    All projects
                  </button>
                  <div className="max-h-60 overflow-auto">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 truncate px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setProjectId(p.id);
                          setProjMenuOpen(false);
                        }}
                        title={p.domain}
                      >
                        <Favicon domain={p.domain} size={14} />
                        <span className="truncate">{p.domain}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={allSelected}
                aria-checked={allSelected}
                onChange={toggleAll}
              />
              Select all ({intFmt.format(visibleRows.length)})
            </label>
            <button
              disabled={selectedRows.length === 0 || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onCreateTasks(rule, selectedRows);
                } finally {
                  setBusy(false);
                }
              }}
              className={cx(
                "inline-flex h-9 items-center gap-2 rounded px-3 text-sm text-white",
                selectedRows.length === 0 ? "opacity-60 cursor-not-allowed" : ""
              )}
              style={{ background: TOKENS.brand }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPlus className="h-4 w-4" />}
              Create Tasks ({selectedRows.length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {visibleRows.length === 0 ? (
            <div
              className="flex h-[240px] flex-col items-center justify-center rounded-md border text-center"
              style={{ borderColor: TOKENS.border, background: TOKENS.subtle }}
            >
              <Rocket className="mb-2 h-6 w-6 text-green-500" />
              <div className="text-[15px] font-semibold">No matches for the current filter</div>
              <div className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                Try clearing search or switching the project filter.
              </div>
            </div>
          ) : (
            <div className="overflow-auto rounded-md border" style={{ borderColor: TOKENS.border }}>
              {renderRuleTable(rule, visibleRows, {
                selected,
                toggleId,
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div
          className="border-t px-4 py-2 text-xs"
          style={{ color: TOKENS.muted, borderColor: TOKENS.border }}
        >
          Tip: Use the search box (keyword / URL / domain) and project filter to narrow down the list. Bulk
          “Create Tasks” attaches context automatically.
        </div>
      </aside>
    </div>
  );
}

/* =============================================================================
 * TABLE RENDERERS PER RULE (Project cells show favicons)
 * ==========================================================================*/
function Th({ children, right }: React.PropsWithChildren<{ right?: boolean }>) {
  return (
    <th
      className={cx("whitespace-nowrap px-3 py-2 text-left text-sm font-semibold", right && "text-right")}
      style={{ color: TOKENS.text, background: "#FAFBFF", borderBottom: `1px solid ${TOKENS.border}` }}
    >
      {children}
    </th>
  );
}


type TdProps = React.PropsWithChildren<{
  right?: boolean;
  muted?: boolean;
}> &
  React.HTMLAttributes<HTMLTableCellElement>; // <-- allow native <td> attributes

function Td({ children, right, muted, className, style, ...rest }: TdProps) {
  return (
    <td
      className={cx("whitespace-nowrap px-3 py-2 text-sm", right && "text-right", className)}
      style={{ color: muted ? TOKENS.muted : TOKENS.text, borderBottom: `1px solid ${TOKENS.border}`, ...style }}
      {...rest}
    >
      {children}
    </td>
  );
}

function SevPill({ s }: { s: Severity }) {
  const t = tone(s);
  return (
    <span className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[11px] font-semibold" style={{ color: t.solid, background: t.pastel }}>
      {s === "critical" ? "Critical" : s === "warning" ? "Warning" : "Info"}
    </span>
  );
}
function DeltaChip({ v, good, unit = "%" }: { v: number; good: boolean; unit?: "%" | "pp" }) {
  const color = good ? TOKENS.good : TOKENS.critical;
  const Icon = good ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[11px]" style={{ color, background: `${color}1F` }}>
      <Icon className="h-3 w-3" />
      {v >= 0 ? "+" : "−"}
      {Math.abs(v).toFixed(1)}
      {unit}
    </span>
  );
}
function ProjectCell({ domain }: { domain: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Favicon domain={domain} size={14} />
      <span className="truncate">{domain}</span>
    </div>
  );
}

function renderRuleTable(
  rule: RuleId,
  rows: AnyRow[],
  sel: { selected: Set<string>; toggleId: (id: string) => void }
) {
  switch (rule) {
    case "ctr_drop_stable_impr": {
      const list = rows as CTRRow[];
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th />
              <Th>Severity</Th>
              <Th>Project</Th>
              <Th>Keyword</Th>
              <Th right>Impr.</Th>
              <Th right>CTR now</Th>
              <Th right>Δ CTR</Th>
              <Th right>Pos now</Th>
              <Th right>Δ Pos</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>
                  <input
                    type="checkbox"
                    checked={sel.selected.has(r.id)}
                    onChange={() => sel.toggleId(r.id)}
                  />
                </Td>
                <Td>
                  <SevPill s={r.severity} />
                </Td>
                <Td muted>
                  <ProjectCell domain={r.domain} />
                </Td>
                <Td className="max-w-[360px] truncate">
                  <a className="underline decoration-dotted" href="#" onClick={(e) => e.preventDefault()}>
                    {r.keyword}
                  </a>
                </Td>
                <Td right>{intFmt.format(r.impressions)}</Td>
                <Td right>{pct100(r.ctrNow)}</Td>
                <Td right>
                  <DeltaChip v={r.ctrDeltaPct} good={r.ctrDeltaPct > 0} />
                </Td>
                <Td right>{r.positionNow.toFixed(1)}</Td>
                <Td right>
                  <DeltaChip v={r.positionDelta} good={r.positionDelta < 0} unit="pp" />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "cwv_failures_spike": {
      const list = rows as CWVRow[];
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th />
              <Th>Severity</Th>
              <Th>Project</Th>
              <Th>URL</Th>
              <Th>Metric</Th>
              <Th right>Pass prev</Th>
              <Th right>Pass now</Th>
              <Th right>Fail now</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>
                  <input type="checkbox" checked={sel.selected.has(r.id)} onChange={() => sel.toggleId(r.id)} />
                </Td>
                <Td><SevPill s={r.severity} /></Td>
                <Td muted><ProjectCell domain={r.domain} /></Td>
                <Td className="max-w-[420px] truncate">
                  <a className="inline-flex items-center gap-1 underline decoration-dotted" href="#" onClick={(e) => e.preventDefault()}>
                    {r.url}
                    <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  </a>
                </Td>
                <Td>{r.metric}</Td>
                <Td right>{pct(r.passRatePrev)}</Td>
                <Td right>{pct(r.passRateNow)}</Td>
                <Td right>
                  <DeltaChip v={r.failPctNow * 100} good={false} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "orphan_over_threshold": {
      const list = rows as OrphanRow[];
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th />
              <Th>Severity</Th>
              <Th>Project</Th>
              <Th right>Orphan %</Th>
              <Th right>Affected</Th>
              <Th right>Crawled</Th>
              <Th right>Δ pp</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>
                  <input type="checkbox" checked={sel.selected.has(r.id)} onChange={() => sel.toggleId(r.id)} />
                </Td>
                <Td><SevPill s={r.severity} /></Td>
                <Td muted><ProjectCell domain={r.domain} /></Td>
                <Td right>{pct(r.orphanPct)}</Td>
                <Td right>{intFmt.format(r.affectedPages)}</Td>
                <Td right>{intFmt.format(r.crawledPages)}</Td>
                <Td right>
                  <DeltaChip v={r.orphanChangePct * 100} good={r.orphanChangePct < 0} unit="pp" />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "broken_links_over_threshold": {
      const list = rows as BrokenRow[];
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th />
              <Th>Severity</Th>
              <Th>Project</Th>
              <Th right>Broken %</Th>
              <Th right>Broken</Th>
              <Th right>Scanned</Th>
              <Th right>Δ pp</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>
                  <input type="checkbox" checked={sel.selected.has(r.id)} onChange={() => sel.toggleId(r.id)} />
                </Td>
                <Td><SevPill s={r.severity} /></Td>
                <Td muted><ProjectCell domain={r.domain} /></Td>
                <Td right>{pct(r.brokenPct)}</Td>
                <Td right>{intFmt.format(r.brokenLinks)}</Td>
                <Td right>{intFmt.format(r.scannedLinks)}</Td>
                <Td right>
                  <DeltaChip v={r.changePct * 100} good={r.changePct < 0} unit="pp" />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "toxic_backlink_or_lost_rd_spike": {
      const list = rows as BacklinkRow[];
      return (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th />
              <Th>Severity</Th>
              <Th>Project</Th>
              <Th right>New RD</Th>
              <Th right>Lost RD</Th>
              <Th right>Net</Th>
              <Th right>Toxic %</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td>
                  <input type="checkbox" checked={sel.selected.has(r.id)} onChange={() => sel.toggleId(r.id)} />
                </Td>
                <Td><SevPill s={r.severity} /></Td>
                <Td muted><ProjectCell domain={r.domain} /></Td>
                <Td right>{intFmt.format(r.newRD)}</Td>
                <Td right>{intFmt.format(r.lostRD)}</Td>
                <Td right style={{ color: r.net >= 0 ? TOKENS.good : TOKENS.critical }}>
                  {intFmt.format(r.net)}
                </Td>
                <Td right>{pct(r.toxicAnchorsPct)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }
}

/* =============================================================================
 * MAIN SECTION
 * ==========================================================================*/
export interface RiskAnomaliesCenterProps {
  projects?: Project[];
  rows?: AnyRow[]; // pass in real data if available; otherwise demo generator is used
  onCreateTasks?: (payload: { rule: RuleId; rows: AnyRow[] }) => Promise<void>;
}

export function RiskAnomaliesCenter({
  projects: projectsProp,
  rows: rowsProp,
  onCreateTasks,
}: RiskAnomaliesCenterProps) {
  const projects = useMemo<Project[]>(
    () =>
      projectsProp ?? [
        { id: "p1", domain: "wranker.com" },
        { id: "p2", domain: "w3era.com" },
        { id: "p3", domain: "vefogix.com" },
        { id: "p4", domain: "orbitly.co" },
        { id: "p5", domain: "hypergrowth.ai" },
      ],
    [projectsProp]
  );

  const rows = useMemo<AnyRow[]>(
    () => rowsProp ?? generateMockRows(projects),
    [rowsProp, projects]
  );

  const cards = useMemo<RuleCard[]>(() => addDemoCards(buildCards(rows)), [rows]);

  const columns: Record<Severity, RuleCard[]> = useMemo(() => {
    const map: Record<Severity, RuleCard[]> = { critical: [], warning: [], info: [] };
    for (const c of cards) map[c.highestSeverity].push(c);
    for (const k of Object.keys(map) as Severity[]) {
      map[k].sort((a, b) => b.totalAffected - a.totalAffected);
    }
    return map;
  }, [cards]);

  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const handleOpen = (rule: RuleId, opt?: { projectId?: string }) =>
    setDrawer({ open: true, rule, initialProjectId: opt?.projectId });

  const createTasks = async (rule: RuleId, selectedRows: AnyRow[]) => {
    await (onCreateTasks
      ? onCreateTasks({ rule, rows: selectedRows })
      : new Promise<void>((res) => {
          setTimeout(res, 600);
          alert(`Created ${selectedRows.length} tasks for rule "${rule}"`);
        }));
  };

  return (
    <section className="w-full">
      {/* Header (branded icon) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-0.5 h-5 w-5" style={{ color: TOKENS.brand }} />
          <div>
            <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
              Risk & Anomalies Center
            </h3>
            <div className="mt-0.5 text-sm" style={{ color: TOKENS.muted }}>
              Rule‑driven signals across projects. Click any card to review impacted items and bulk create tasks.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded border px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            onClick={() => alert("Export section CSV")}
          >
            <Download size={16} className="text-[#6B7280]" />
            Export
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded border px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            onClick={() => alert("Manage Rules")}
          >
            <Wrench size={16} className="text-[#6B7280]" />
            Manage Rules
          </button>
        </div>
      </div>

      <div className="mt-3" style={{ borderTop: `1px solid ${TOKENS.border}` }} />

      {/* Columns */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        <SeverityColumn
          label="Critical"
          icon={<ShieldAlert className="h-4 w-4" />}
          color={TOKENS.critical}
          cards={columns.critical}
          onOpen={handleOpen}
        />
        <SeverityColumn
          label="Warning"
          icon={<AlertTriangle className="h-4 w-4" />}
          color={TOKENS.warning}
          cards={columns.warning}
          onOpen={handleOpen}
        />
        <SeverityColumn
          label="Info"
          icon={<Info className="h-4 w-4" />}
          color={TOKENS.info}
          cards={columns.info}
          onOpen={handleOpen}
        />
      </div>

      {/* Drawer */}
      <Drawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        rows={rows}
        projects={projects}
        onCreateTasks={createTasks}
      />
    </section>
  );
}

function SeverityColumn({
  label,
  icon,
  color,
  cards,
  onOpen,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  cards: RuleCard[];
  onOpen: (rule: RuleId, opt?: { projectId?: string }) => void;
}) {
  return (
    <div className="col-span-12 md:col-span-6 xl:col-span-4">
      <div
        className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
        style={{ color, background: `${color}1F`, border: `1px solid ${color}33` }}
      >
        {icon}
        {label}
      </div>

      {cards.length === 0 ? (
        <div
          className="flex min-h-[120px] items-center justify-center rounded-md border text-sm"
          style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
        >
          No {label.toLowerCase()} issues detected.
        </div>
      ) : (
        <div className="grid gap-3">
          {cards.map((c) => (
            <RuleCardView key={c.uid} card={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * MOCK DATA GENERATION
 * ==========================================================================*/
function generateMockRows(projects: Project[]): AnyRow[] {
  const rng = makeRng("risk-center-seed");
  const take = <T,>(arr: T[], n: number) => Array.from({ length: n }, () => arr[Math.floor(rng() * arr.length)]);
  const rows: AnyRow[] = [];

  // CTR: ~80 rows total
  for (const p of projects) {
    for (let i = 0; i < 16; i++) {
      const ctrPrev = 2 + rng() * 4; // 2..6%
      const drop = (rng() < 0.55 ? 1 : -1) * (8 + rng() * 40); // mostly drops
      const ctrNow = Math.max(0.2, ctrPrev * (1 + drop / 100));
      const row: CTRRow = {
        id: `ctr-${p.id}-${i}`,
        type: "ctr_drop_stable_impr",
        projectId: p.id,
        domain: p.domain,
        keyword: i % 5 === 0 ? "best crm software" : i % 3 === 0 ? "seo audit checklist" : `keyword ${i}`,
        impressions: Math.round(800 + rng() * 8000),
        ctrNow,
        ctrPrev,
        ctrDeltaPct: ((ctrNow - ctrPrev) / ctrPrev) * 100,
        positionNow: +(8 + rng() * 10).toFixed(1),
        positionDelta: +(rng() * 1.2 - 0.6).toFixed(1),
        severity: severityCTRDrop(((ctrNow - ctrPrev) / ctrPrev) * 100),
      };
      rows.push(row);
    }
  }

  // CWV: ~40 rows
  const metrics: CWVRow["metric"][] = ["LCP", "INP", "CLS"];
  for (const p of projects) {
    for (let i = 0; i < 8; i++) {
      const passPrev = 0.8 + rng() * 0.2; // 80..100%
      const passNow = Math.max(0, Math.min(1, passPrev - rng() * 0.4)); // sometimes down
      const fail = 1 - passNow;
      const row: CWVRow = {
        id: `cwv-${p.id}-${i}`,
        type: "cwv_failures_spike",
        projectId: p.id,
        domain: p.domain,
        url: i % 3 === 0 ? "/" : `/blog/post-${i}`,
        metric: take(metrics, 1)[0]!,
        passRatePrev: passPrev,
        passRateNow: passNow,
        failPctNow: fail,
        severity: severityCWVFail(fail),
      };
      rows.push(row);
    }
  }

  // Orphan: ~25 rows
  for (const p of projects) {
    for (let i = 0; i < 5; i++) {
      const crawled = Math.round(800 + rng() * 2000);
      const orphanPct = Math.max(0, Math.min(0.2, 0.01 + rng() * 0.12)); // 1%..13%
      const row: OrphanRow = {
        id: `orph-${p.id}-${i}`,
        type: "orphan_over_threshold",
        projectId: p.id,
        domain: p.domain,
        orphanPct,
        affectedPages: Math.round(orphanPct * crawled),
        crawledPages: crawled,
        orphanChangePct: +(rng() * 0.06 - 0.03).toFixed(3),
        severity: severityOrphan(orphanPct),
      };
      rows.push(row);
    }
  }

  // Broken links: ~25 rows
  for (const p of projects) {
    for (let i = 0; i < 5; i++) {
      const scanned = Math.round(3000 + rng() * 4000);
      const brokenPct = Math.max(0, Math.min(0.1, 0.005 + rng() * 0.06)); // 0.5%..6.5%
      const row: BrokenRow = {
        id: `broken-${p.id}-${i}`,
        type: "broken_links_over_threshold",
        projectId: p.id,
        domain: p.domain,
        brokenPct,
        brokenLinks: Math.round(brokenPct * scanned),
        scannedLinks: scanned,
        changePct: +(rng() * 0.05 - 0.025).toFixed(3),
        severity: severityBroken(brokenPct),
      };
      rows.push(row);
    }
  }

  // Backlinks: ~30 rows
  for (const p of projects) {
    for (let i = 0; i < 6; i++) {
      const newRD = Math.round(10 + rng() * 90);
      const lostRD = Math.round(8 + rng() * 120);
      const toxic = Math.max(0, Math.min(0.25, rng() * 0.18));
      const row: BacklinkRow = {
        id: `rd-${p.id}-${i}`,
        type: "toxic_backlink_or_lost_rd_spike",
        projectId: p.id,
        domain: p.domain,
        newRD,
        lostRD,
        net: newRD - lostRD,
        toxicAnchorsPct: toxic,
        severity: severityBacklinks(lostRD, newRD, toxic),
      };
      rows.push(row);
    }
  }

  return rows;
}

function buildCards(rows: AnyRow[]): RuleCard[] {
  const ruleMeta: Record<RuleId, { title: string; desc: string }> = {
    ctr_drop_stable_impr: {
      title: "CTR drop with stable impressions",
      desc: "Keywords losing click‑through without demand loss.",
    },
    cwv_failures_spike: {
      title: "CWV failures spike",
      desc: "Page Experience issues detected by recent audits.",
    },
    orphan_over_threshold: {
      title: "Orphan pages % over threshold",
      desc: "Pages not reachable via internal links.",
    },
    broken_links_over_threshold: {
      title: "Broken internal links % over threshold",
      desc: "4xx/redirect chains within internal link graph.",
    },
    toxic_backlink_or_lost_rd_spike: {
      title: "Toxic backlink spike / Lost RD spike",
      desc: "Authority risks from toxic anchors or lost domains.",
    },
  };

  const byRule = new Map<RuleId, AnyRow[]>();
  rows.forEach((r) => {
    const arr = byRule.get(r.type) ?? [];
    arr.push(r);
    byRule.set(r.type, arr);
  });

  const cards: RuleCard[] = [];
  for (const [id, list] of byRule) {
    const highest = list.reduce<Severity>((acc, r) => (scoreSeverity(r.severity) > scoreSeverity(acc) ? r.severity : acc), "info");

    // bucketize into 10 periods for demo, preserving project distribution
    const BUCKETS = 10;
    const buckets: SparkBucket[] = Array.from({ length: BUCKETS }, () => ({ total: 0, byProject: [] }));
    const projName: Record<string, string> = {};
    list.forEach((r) => (projName[r.projectId] = r.domain));
    list.forEach((r, idx) => {
      const b = Math.min(BUCKETS - 1, Math.floor((idx / Math.max(1, list.length)) * BUCKETS));
      const entry = buckets[b];
      entry.total += 1;
      const cur = new Map(entry.byProject.map((x) => [x.projectId, x.count]));
      cur.set(r.projectId, (cur.get(r.projectId) ?? 0) + 1);
      entry.byProject = Array.from(cur.entries())
        .map(([projectId, count]) => ({ projectId, domain: projName[projectId], count }))
        .sort((a, b) => b.count - a.count);
    });

    const counts = new Map<string, number>();
    list.forEach((r) => counts.set(r.projectId, (counts.get(r.projectId) ?? 0) + 1));
    const projects = Array.from(counts.entries())
      .map(([projectId, count]) => ({
        projectId,
        domain: list.find((x) => x.projectId === projectId)!.domain,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    cards.push({
      uid: `${id}-base`,
      id,
      title: ruleMeta[id].title,
      description: ruleMeta[id].desc,
      highestSeverity: highest,
      totalAffected: list.length,
      projects,
      spark: buckets.map((b) => Math.max(1, b.total)),
      buckets,
    });
  }
  return cards;
}

/** Ensure Warning & Info columns have demo cards (clones with unique uids) */
function addDemoCards(base: RuleCard[]): RuleCard[] {
  const out = [...base];

  // Find two candidates to clone; fall back to first if needed
  const first = base[0];
  const second = base[1] ?? base[0];

  if (first) {
    out.push({
      ...first,
      uid: `${first.id}-demo-warning`,
      highestSeverity: "warning",
      // tweak totals slightly for variety
      totalAffected: Math.max(1, Math.round(first.totalAffected * 0.6)),
      spark: first.spark.map((v, i) => (i % 2 === 0 ? Math.max(1, Math.round(v * 0.8)) : v)),
      // buckets reused (ok for demo)
    });
  }
  if (second) {
    out.push({
      ...second,
      uid: `${second.id}-demo-info`,
      highestSeverity: "info",
      totalAffected: Math.max(1, Math.round(second.totalAffected * 0.4)),
      spark: second.spark.map((v, i) => (i % 3 === 0 ? Math.max(1, Math.round(v * 0.6)) : v)),
    });
  }
  return out;
}

/* =============================================================================
 * DEMO WRAPPER (default export)
 * ==========================================================================*/
export default function Demo_RiskAnomaliesCenter() {
  return (
    <div className="w-full rounded-md border bg-white mt-4">
      <div className="mx-auto w-full px-2.5 py-1.5">
        <RiskAnomaliesCenter
          onCreateTasks={async ({ rule, rows }) => {
            await new Promise((r) => setTimeout(r, 600));
            alert(`Created ${rows.length} tasks for rule "${rule}".`);
          }}
        />
      </div>
    </div>
  );
}
