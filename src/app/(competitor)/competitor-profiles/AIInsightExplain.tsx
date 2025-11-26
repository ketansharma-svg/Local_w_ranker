"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  Clock,
  Link as LinkIcon,
  BarChart2,
  TrendingDown,
  TrendingUp,
  FilePlus,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceDot,
  ComposedChart,
  Bar,
  Legend,
} from "recharts";

/**
 * Wranker — AI Insight Details / Explain Drawer
 * Redesigned per spec:
 *  - Inter / Inter Fallback font stack
 *  - No emoji anywhere (SERP features use Lucide icons with colors)
 *  - Branded (#008CCD) icons for section titles, card titles, and action types
 *  - Favicon for project/domain (auto from domain; falls back to /favicon.ico)
 *  - Modular chips, buttons; pointer cursor on clickables
 *  - Wider drawer + deeper scroll area so all sections sit comfortably
 *
 * Exports:
 *   - AIInsightExplainDrawer (named)  — reusable drawer
 *   - default AIInsightExplainDrawerDemo — ready-to-run demo with mock data
 */

/* -------------------------------- Tokens -------------------------------- */
const TK = {
  surface: "var(--wr-surface-card, #FFFFFF)",
  text: "var(--wr-text-primary, #111827)",
  muted: "var(--wr-text-secondary, #6B7280)",
  border: "var(--wr-border-brand, #EFF0F6)",
  borderSubtle: "var(--wr-border-subtle, #E5E7EB)",
  chipBg: "var(--wr-chip-filter-bg, #F5F7FA)",
  chipActiveBg: "var(--wr-chip-active-bg, #E8F5FD)",
  chipActiveText: "var(--wr-chip-active-text, #0B6FAE)",
  primary: "var(--wr-btn-primary-bg, #1090D0)",
  primaryText: "var(--wr-btn-primary-text, #FFFFFF)",
  brandIcon: "#008CCD",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  competitor: "#0077FF",
  zebra: "#FAFCFE",
} as const;

/* ------------------------------ SERP Icons ------------------------------- */
const SERP_ICON_META: Record<
  "FS" | "PAA" | "SITELINKS" | "IMAGE_PACK" | "DEFAULT",
  { Icon: React.ComponentType<{ size?: number; color?: string; className?: string }>; color: string; label: string }
> = {
  FS: { Icon: FileText, color: "#F97316", label: "Featured Snippet" },
  PAA: { Icon: HelpCircle, color: "#22C55E", label: "People Also Ask" },
  SITELINKS: { Icon: LinkIcon, color: "#8B5CF6", label: "Sitelinks" },
  IMAGE_PACK: { Icon: ImageIcon, color: "#3B82F6", label: "Image Pack" },
  DEFAULT: { Icon: Search, color: "#0EA5E9", label: "SERP Feature" },
};
function SerpIcon({ f, size = 14 }: { f: "FS" | "PAA" | "SITELINKS" | "IMAGE_PACK" | string; size?: number }) {
  const meta = SERP_ICON_META[(f as any) in SERP_ICON_META ? (f as any) : "DEFAULT"];
  const I = meta.Icon;
  return <I size={size} color={meta.color} />;
}

/* ---------------------------------- Types ----------------------------------- */
type InsightType =
  | "RankDropAfterContentShrink"
  | "RankGainAfterContentExpansion"
  | "FeaturedSnippetLost"
  | "SerpFeatureGained"
  | "BacklinkSpikeCorrelation"
  | "InactivityDecline";

type EvidenceRankPoint = { dateISO: string; position: number; marker?: "FS_LOST" | "FS_GAINED" | "CONTENT_CHANGE" };
type EvidenceContentEvent = {
  dateISO: string;
  wordCountDeltaPct: number;
  absDelta?: number;
  h1Added?: string[];
  h1Removed?: string[];
  h2Added?: string[];
  h2Removed?: string[];
  templateChangeSuspected?: boolean;
  snippet?: string;
};
type EvidenceSerpEvent = { dateISO: string; feature: "FS" | "PAA" | "SITELINKS" | "IMAGE_PACK"; before: 0 | 1; after: 0 | 1; holderDomain?: string };
type EvidenceBacklinkPoint = { dateISO: string; newLinks: number };
type CompetitorSnapshot = { domain: string; position?: number; features?: Array<"FS" | "PAA" | "SITELINKS">; wordCount?: number; lastUpdatedISO?: string };

export type AIInsightExplainModel = {
  id: string;
  type: InsightType;
  title: string;
  pageUrl: string; // path of your page
  competitorDomain: string;
  timeframe: { startISO: string; endISO: string; label: string };
  device: "desktop" | "mobile";
  summary: string;
  confidence: number; // 0..1
  deltas: {
    rankDelta?: number;
    wordCountDeltaPct?: number;
    fsChange?: "lost" | "gained" | "none";
    paaChange?: "lost" | "gained" | "none";
  };
  rationale: Array<{ text: string; refs: string[] }>;
  evidence: {
    rankSeries?: { id: "r1"; points: EvidenceRankPoint[] };
    contentEvents?: { id: "r2"; items: EvidenceContentEvent[] };
    serpEvents?: { id: "r3"; items: EvidenceSerpEvent[] };
    backlinkSeries?: { id: "r4"; points: EvidenceBacklinkPoint[] };
    competitorSnapshot?: { id: "r5"; items: CompetitorSnapshot[] };
  };
  links: {
    serpSnapshot?: { href: string; label: string };
    opportunities?: { href: string; label: string };
    pageAnalyzer?: { href: string; label: string };
  };
  permissions: { role: "admin" | "editor" | "viewer"; canCreateTask: boolean };
  provenance: Array<{ id: string; label: string; source: "PageMonitor" | "Crawler" | "SERankingAPI" | "SERPSnapshot" | "BacklinkTracker"; details?: string }>;
};

/* --------------------------------- Helpers ---------------------------------- */
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const confLabel = (c: number) => (c >= 0.75 ? "High" : c >= 0.45 ? "Medium" : "Low");
const deltaPill = (n?: number) => (n == null ? "—" : n === 0 ? "±0" : n > 0 ? `+${n}` : `${n}`);
const pctPill = (n?: number) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n}%`);
function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
const fontStack = {
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};
const domainFromUrlMaybe = (u?: string) => {
  // Accepts absolute or relative; returns host or "your.site"
  if (!u) return "your.site";
  try {
    const url = new URL(u, "https://your.site");
    return url.host || "your.site";
  } catch {
    return "your.site";
  }
};
const faviconFor = (domain?: string) => domain ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}` : "/favicon.ico";

/* -------------------------------- Mock Data --------------------------------- */
function makeMockInsight(id = "demo_insight"): AIInsightExplainModel {
  const today = new Date();
  const points: EvidenceRankPoint[] = [];
  let basePos = 9;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString();
    const noise = Math.round(Math.sin(i / 4) * 1.5);
    basePos = Math.min(40, Math.max(5, basePos + (Math.random() < 0.35 ? 1 : 0) - (Math.random() < 0.4 ? 1 : 0)));
    const pos = Math.max(5, Math.min(40, basePos + noise));
    points.push({ dateISO: iso, position: pos });
  }
  const contentChangeIdx = points.length - 8;
  points[contentChangeIdx].marker = "CONTENT_CHANGE";
  points[contentChangeIdx + 1].marker = "FS_LOST";
  points[contentChangeIdx + 2].position += 3;

  const backlinks: EvidenceBacklinkPoint[] = points.map((p, idx) => ({
    dateISO: p.dateISO,
    newLinks: idx === contentChangeIdx - 5 ? 6 : Math.max(0, Math.round(Math.random() * 2)),
  }));

  const startISO = points[0].dateISO;
  const endISO = points[points.length - 1].dateISO;

  return {
    id,
    type: "RankDropAfterContentShrink",
    title: "Rank drop after content shrink",
    pageUrl: "/seo-guide",
    competitorDomain: "comp1.com",
    timeframe: { startISO, endISO, label: "Last 30 days" },
    device: "desktop",
    summary: `Rank dropped 3 positions after 12% content loss on ${fmtDate(points[contentChangeIdx].dateISO)}.`,
    confidence: 0.82,
    deltas: { rankDelta: -3, wordCountDeltaPct: -12, fsChange: "lost", paaChange: "none" },
    rationale: [
      { text: "Content −12% on change date → rank −3 within 2 days.", refs: ["r1", "r2"] },
      { text: "Featured Snippet lost right after content change.", refs: ["r1", "r3"] },
      { text: "No broad peer movement suggesting an algo shift.", refs: ["r1"] },
    ],
    evidence: {
      rankSeries: { id: "r1", points },
      contentEvents: {
        id: "r2",
        items: [
          {
            dateISO: points[contentChangeIdx].dateISO,
            wordCountDeltaPct: -12,
            absDelta: -430,
            h2Removed: ["What is SEO?", "How to pick a tool"],
            snippet:
              "…best SEO tools in 2025 include suites and point solutions. We removed comparative table rows…",
          },
        ],
      },
      serpEvents: {
        id: "r3",
        items: [
          { dateISO: points[contentChangeIdx + 1].dateISO, feature: "FS", before: 1, after: 0, holderDomain: "comp1.com" },
          { dateISO: points[contentChangeIdx + 1].dateISO, feature: "PAA", before: 1, after: 1 },
        ],
      },
      backlinkSeries: { id: "r4", points: backlinks },
      competitorSnapshot: {
        id: "r5",
        items: [
          { domain: "you.example", position: 12, features: ["PAA"], wordCount: 2100, lastUpdatedISO: points[contentChangeIdx + 2].dateISO },
          { domain: "comp1.com", position: 1, features: ["FS", "SITELINKS"], wordCount: 2800, lastUpdatedISO: points[contentChangeIdx - 1].dateISO },
        ],
      },
    },
    links: {
      serpSnapshot: { href: "/ci/insights?tab=serp&kw=best+seo+tools&date=" + endISO, label: "Open SERP Snapshot" },
      opportunities: { href: "/backlinks/opportunities?prefilter=domain:comp1.com", label: "Open Opportunities" },
      pageAnalyzer: { href: "/tools/domain-analyzer?domain=comp1.com&page=%2Fseo-guide", label: "Open Page Analyzer" },
    },
    permissions: { role: "admin", canCreateTask: true },
    provenance: [
      { id: "r1", label: "Rank series (Page Monitor)", source: "PageMonitor" },
      { id: "r2", label: "Content diff (Crawler)", source: "Crawler" },
      { id: "r3", label: "SERP features (SERP Snapshot)", source: "SERPSnapshot" },
      { id: "r4", label: "Backlink events (Backlink Tracker)", source: "BacklinkTracker" },
    ],
  };
}
async function mockFetchExplain(_id: string): Promise<AIInsightExplainModel> {
  await new Promise((r) => setTimeout(r, 420));
  return makeMockInsight(_id);
}

/* -------------------------------- Primitives -------------------------------- */
function Chip({
  children,
  tone = "default",
  title,
  onClick,
}: React.PropsWithChildren<{ tone?: "default" | "ok" | "warn" | "bad" | "brand"; title?: string; onClick?: () => void }>) {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    default: { bg: TK.chipBg, fg: TK.text, bd: TK.borderSubtle },
    ok: { bg: "#ECFDF5", fg: TK.success, bd: "rgba(16,185,129,0.25)" },
    warn: { bg: "#FFFBEB", fg: TK.warning, bd: "rgba(245,158,11,0.25)" },
    bad: { bg: "#FEF2F2", fg: TK.danger, bd: "rgba(239,68,68,0.25)" },
    brand: { bg: TK.chipActiveBg, fg: TK.chipActiveText, bd: TK.borderSubtle },
  };
  const s = map[tone];
  return (
    <span
      role={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={classNames(
        "inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-medium",
        onClick && "cursor-pointer"
      )}
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  kind = "ghost",
  disabled,
  title,
  iconLeft,
}: React.PropsWithChildren<{
  onClick?: () => void;
  kind?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  title?: string;
  iconLeft?: React.ReactNode;
}>) {
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const cls =
    kind === "primary"
      ? `${base} text-white shadow-sm hover:opacity-95`
      : kind === "outline"
      ? `${base} border hover:bg-gray-50`
      : `${base} hover:bg-gray-50`;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={classNames(cls, disabled && "opacity-60 cursor-not-allowed", !disabled && "cursor-pointer")}
      style={kind === "primary" ? { background: TK.primary, color: TK.primaryText } : { borderColor: TK.borderSubtle }}
    >
      {iconLeft} {children}
    </button>
  );
}

function Section({
  title,
  id,
  defaultOpen = true,
  children,
  icon,
}: React.PropsWithChildren<{ title: string; id?: string; defaultOpen?: boolean; icon?: React.ReactNode }>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} aria-labelledby={id ? `${id}-label` : undefined} className="rounded-lg border" style={{ borderColor: TK.border, background: TK.surface }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left hover:bg-[var(--wr-surface-subtle,#F9FAFB)]"
      >
        <div className="flex items-center gap-2">
          {icon ? <span className="text-[color:var(--wr-brand-icon,#008CCD)]" style={{ ["--wr-brand-icon" as any]: TK.brandIcon }}>{icon}</span> : null}
          <h3 id={id ? `${id}-label` : undefined} className="text-sm font-semibold" style={{ color: TK.text }}>
            {title}
          </h3>
        </div>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className="border-t px-3 py-3" style={{ borderColor: TK.border }}>{children}</div>}
    </section>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center" style={fontStack}>
      <div className="rounded-md border bg-white px-3 py-2 text-sm shadow" style={{ borderColor: TK.border }}>
        {msg}
      </div>
    </div>
  );
}

const RankTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const d = p?.payload;
  if (!d) return null;
  return (
    <div className="rounded border bg-white px-2 py-1 text-xs shadow" style={{ borderColor: TK.border }}>
      <div className="text-[11px]" style={{ color: TK.muted }}>{fmtDate(d.dateISO)}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.competitor }} />
          Position
        </span>
        <span className="font-semibold" style={{ color: TK.text }}>#{d.position}</span>
      </div>
      {d.marker && (
        <div className="mt-1 flex items-center gap-1">
          {d.marker === "CONTENT_CHANGE" ? <FilePlus size={12} color={TK.warning} /> : <AlertTriangle size={12} color={TK.danger} />}
          <span>{d.marker === "CONTENT_CHANGE" ? "Content change" : d.marker === "FS_LOST" ? "FS lost" : "FS gained"}</span>
        </div>
      )}
    </div>
  );
};

/* --------------------------- Main (named) component -------------------------- */
export function AIInsightExplainDrawer({
  open,
  onClose,
  insightId = "demo_insight",
  role = "admin",
  onCreateTask,
  onFeedback,
  projectDomain = "you.example",
  projectFaviconUrl, // optional explicit favicon
}: {
  open: boolean;
  onClose: () => void;
  insightId?: string;
  role?: "admin" | "editor" | "viewer";
  onCreateTask?: (model: AIInsightExplainModel) => void | Promise<void>;
  onFeedback?: (args: { id: string; useful: boolean; note?: string }) => void | Promise<void>;
  projectDomain?: string;
  projectFaviconUrl?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<AIInsightExplainModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const canCreateTask = (model?.permissions.canCreateTask ?? false) && role !== "viewer";

  // Focus trap
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement;
    setLoading(true);
    setError(null);
    setModel(null);
    (async () => {
      try {
        const data = await mockFetchExplain(insightId);
        data.permissions.role = role;
        if (role === "viewer") data.permissions.canCreateTask = false;
        setModel(data);
      } catch {
        setError("Could not load insight details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, insightId, role]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
      } else if (e.key === "Tab") {
        const root = drawerRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not(:disabled)",
            "input:not(:disabled)",
            "select:not(:disabled)",
            "textarea:not(:disabled)",
            "[tabindex]:not([tabindex='-1'])",
          ].join(",")
        );
        const arr = Array.from(focusables);
        if (arr.length === 0) return;
        const first = arr[0];
        const last = arr[arr.length - 1];
        const active = document.activeElement as HTMLElement;
        if (!root.contains(active)) {
          first.focus();
          e.preventDefault();
        } else {
          if (!e.shiftKey && active === last) {
            first.focus();
            e.preventDefault();
          } else if (e.shiftKey && active === first) {
            last.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function closeDrawer() {
    onClose();
    const el = lastActiveRef.current;
    if (el && typeof el.focus === "function") setTimeout(() => el.focus(), 0);
  }
  function raiseToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }
  async function handleCreateTask() {
    if (!model) return;
    if (!canCreateTask) return raiseToast("Insufficient permissions");
    if (onCreateTask) await onCreateTask(model);
    raiseToast("Task created (demo)");
  }
  async function handleFeedback(useful: boolean) {
    if (!model) return;
    try {
      if (onFeedback) await onFeedback({ id: model.id, useful });
      raiseToast(useful ? "Thanks for the feedback!" : "We’ll improve future insights.");
    } catch {
      raiseToast("Could not send feedback");
    }
  }

  const conf = useMemo(() => clamp01(model?.confidence ?? 0), [model]);
  const confTone = conf >= 0.75 ? "ok" : conf >= 0.45 ? "warn" : "bad";
  const confIcon =
    conf >= 0.75 ? <CheckCircle2 size={14} className="text-emerald-600" /> :
    conf >= 0.45 ? <AlertTriangle size={14} className="text-amber-600" /> :
    <AlertTriangle size={14} className="text-red-600" />;

  if (!open) return null;

  const yourDomain = projectDomain || "you.example";
  const yourFav = projectFaviconUrl || faviconFor(yourDomain);
  const compFav = faviconFor(model?.competitorDomain);

  return (
    <>
      {toast && <Toast msg={toast} />}

      {/* Scrim */}
      {/* <div className="fixed inset-0 z-[60] bg-black/30" onClick={closeDrawer} /> */}

      {/* Drawer — widened + deeper scroll area */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="AI Insight Details"
        className="fixed right-0 top-0 z-[61] h-full w-full max-w-[1120px] bg-white shadow-xl outline-none"
        style={{ borderLeft: `1px solid ${TK.border}`, ...fontStack }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4" style={{ borderColor: TK.border }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-grid h-7 w-7 place-items-center rounded-md" style={{ background: TK.chipBg }}>
                <Info size={16} color={TK.brandIcon} />
              </span>
              <h2 className="truncate text-[16px] font-semibold" style={{ color: TK.text }}>
                AI Insight Details — {model?.title || "…"}
              </h2>
            </div>
            {model && (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs" style={{ color: TK.muted }}>
                {/* Your site with favicon */}
                <span className="inline-flex items-center gap-1.5">
                  <img src={yourFav} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  <span className="font-mono">{yourDomain}{model.pageUrl}</span>
                </span>
                <span>•</span>
                {/* Competitor with favicon */}
                <span className="inline-flex items-center gap-1.5">
                  <img src={compFav} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  Competitor: <span className="font-mono">{model.competitorDomain}</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> {model.timeframe.label}</span>
                <Chip tone={confTone} title={`Confidence ${Math.round(conf * 100)}%`}>
                  {confIcon} <span className="ml-1">Confidence: {confLabel(conf)}</span>
                </Chip>
              </div>
            )}
          </div>
        </div>

        {/* Body (deeper scroll area) */}
        <div className="h-[calc(100%-148px)] overscroll-contain overflow-auto px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <div className="mb-2 h-4 w-3/5 rounded bg-gray-200" />
                <div className="mb-1 h-3 w-4/5 rounded bg-gray-100" />
                <div className="mb-4 h-3 w-2/3 rounded bg-gray-100" />
                <div className="h-[200px] w-full rounded bg-gray-100" />
              </div>
              <div className="animate-pulse">
                <div className="mb-2 h-4 w-2/5 rounded bg-gray-200" />
                <div className="h-[180px] w-full rounded bg-gray-100" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md border p-4" style={{ borderColor: TK.border }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 text-red-500" size={18} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: TK.text }}>Error loading insight</div>
                  <div className="text-sm" style={{ color: TK.muted }}>{error}</div>
                  <div className="mt-2">
                    <Button
                      kind="outline"
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        mockFetchExplain(insightId)
                          .then((d) => {
                            d.permissions.role = role;
                            if (role === "viewer") d.permissions.canCreateTask = false;
                            setModel(d);
                          })
                          .catch(() => setError("Could not load insight details."))
                          .finally(() => setLoading(false));
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : model ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Summary */}
              <Section id="summary" title="Summary" defaultOpen icon={<Info size={16} color={TK.brandIcon} />}>
                <div className="text-sm" style={{ color: TK.text }}>{model.summary}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Chip tone={model.deltas.rankDelta != null && model.deltas.rankDelta < 0 ? "bad" : "ok"}>
                    {model.deltas.rankDelta != null && model.deltas.rankDelta < 0 ? (
                      <TrendingDown size={12} color={TK.danger} />
                    ) : (
                      <TrendingUp size={12} color={TK.success} />
                    )}
                    <span className="ml-1">Δ Position: {deltaPill(model.deltas.rankDelta)}</span>
                  </Chip>
                  <Chip tone={model.deltas.wordCountDeltaPct != null && model.deltas.wordCountDeltaPct < 0 ? "warn" : "ok"}>
                    <FilePlus size={12} color={TK.warning} />
                    <span className="ml-1">Δ Word Count: {pctPill(model.deltas.wordCountDeltaPct)}</span>
                  </Chip>
                  <Chip tone={model.deltas.fsChange === "lost" ? "bad" : model.deltas.fsChange === "gained" ? "ok" : "default"}>
                    <FileText size={12} color={SERP_ICON_META.FS.color} />
                    <span className="ml-1">FS: {model.deltas.fsChange ?? "—"}</span>
                  </Chip>
                  <Chip tone={model.deltas.paaChange === "lost" ? "warn" : model.deltas.paaChange === "gained" ? "ok" : "default"}>
                    <HelpCircle size={12} color={SERP_ICON_META.PAA.color} />
                    <span className="ml-1">PAA: {model.deltas.paaChange ?? "—"}</span>
                  </Chip>
                  <Chip tone="default">Device: {model.device}</Chip>
                  <Chip tone="default">
                    Window: {fmtDate(model.timeframe.startISO)} → {fmtDate(model.timeframe.endISO)}
                  </Chip>
                </div>
              </Section>

              {/* Rationale */}
              <Section id="rationale" title="Why we think this" defaultOpen icon={<Info size={16} color={TK.brandIcon} />}>
                <ul className="list-disc pl-5 text-sm" style={{ color: TK.text }}>
                  {model.rationale.map((r, i) => (
                    <li key={i} className="mb-1">
                      {r.text}{" "}
                      {r.refs?.length ? (
                        <span className="text-xs" style={{ color: TK.muted }}>
                          {r.refs.map((ref) => (
                            <a
                              key={ref}
                              href={`#${ref}`}
                              onClick={(e) => {
                                e.preventDefault();
                                const n = document.getElementById(ref);
                                if (n) {
                                  n.scrollIntoView({ behavior: "smooth", block: "start" });
                                  n.classList.add("ring-1", "ring-sky-300");
                                  setTimeout(() => n.classList.remove("ring-1", "ring-sky-300"), 1200);
                                }
                              }}
                              className="cursor-pointer underline decoration-dotted hover:text-gray-900"
                            >
                              ({ref})
                            </a>
                          ))}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Rank timeline */}
              <Section id="r1" title="Rank timeline" defaultOpen icon={<BarChart2 size={16} color={TK.brandIcon} />}>
                {model.evidence.rankSeries?.points?.length ? (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={model.evidence.rankSeries.points} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                        <CartesianGrid stroke={TK.borderSubtle} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="dateISO"
                          tickLine={false}
                          axisLine={{ stroke: TK.borderSubtle }}
                          tick={{ fontSize: 12, fill: TK.muted }}
                          minTickGap={28}
                          tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={{ stroke: TK.borderSubtle }}
                          tick={{ fontSize: 12, fill: TK.muted }}
                          allowDecimals={false}
                          reversed
                          domain={[1, "dataMax + 2"]}
                        />
                        <RTooltip content={<RankTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(val) => <span className="text-gray-700">{val === "position" ? "Position" : val}</span>} />
                        <Line type="monotone" dataKey="position" stroke={TK.competitor} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="position" />
                        {model.evidence.rankSeries.points
                          .filter((p) => p.marker)
                          .map((p, idx) => (
                            <ReferenceDot
                              key={idx}
                              x={p.dateISO}
                              y={p.position}
                              r={4}
                              fill={p.marker === "CONTENT_CHANGE" ? "#FB923C" : "#DC2626"}
                              stroke="white"
                              strokeWidth={1}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-[11px]" style={{ color: TK.muted }}>
                      Y‑axis inverted (top = position #1). Markers: orange = content change, red = FS lost.
                    </div>
                  </div>
                ) : (
                  <Placeholder>Not enough rank data for this period.</Placeholder>
                )}
              </Section>

              {/* Content diff */}
              <Section id="r2" title="Content change diff" defaultOpen icon={<FilePlus size={16} color={TK.brandIcon} />}>
                {model.evidence.contentEvents?.items?.length ? (
                  <div className="space-y-3">
                    {model.evidence.contentEvents.items.map((ev, i) => (
                      <div key={i} className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle, background: TK.surface }}>
                        <div className="text-sm font-medium" style={{ color: TK.text }}>
                          {fmtDate(ev.dateISO)} — {ev.wordCountDeltaPct > 0 ? "Added" : "Removed"} {Math.abs(ev.wordCountDeltaPct)}%
                          {ev.absDelta != null ? ` (${ev.absDelta > 0 ? "+" : ""}${ev.absDelta} words)` : ""}
                        </div>
                        <div className="mt-1 grid gap-2 md:grid-cols-2">
                          <div className="text-xs" style={{ color: TK.muted }}>
                            {ev.h1Added?.length ? <div>H1 added: “{ev.h1Added.join("”, “")}”</div> : null}
                            {ev.h1Removed?.length ? <div>H1 removed: “{ev.h1Removed.join("”, “")}”</div> : null}
                            {ev.h2Added?.length ? <div>H2 added: {ev.h2Added.join(", ")}</div> : null}
                            {ev.h2Removed?.length ? <div>H2 removed: {ev.h2Removed.join(", ")}</div> : null}
                          </div>
                          {ev.snippet ? (
                            <div className="rounded bg-[var(--wr-surface-subtle,#FAFAFA)] p-2 text-xs" style={{ color: TK.muted }}>
                              <span className="font-medium" style={{ color: TK.text }}>Snippet:</span> {ev.snippet}
                            </div>
                          ) : null}
                        </div>
                        {ev.templateChangeSuspected && (
                          <div className="mt-2 text-[11px] text-amber-700">Template change suspected — treat causality with caution.</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Placeholder>No content changes detected.</Placeholder>
                )}
              </Section>

              {/* SERP features */}
              <Section id="r3" title="SERP features (before/after)" defaultOpen icon={<ExternalLink size={16} color={TK.brandIcon} />}>
                {model.evidence.serpEvents?.items?.length ? (
                  <div className="space-y-2">
                    {model.evidence.serpEvents.items.map((s, i) => {
                      const meta = SERP_ICON_META[(s.feature as any) in SERP_ICON_META ? s.feature : "DEFAULT"];
                      return (
                        <div key={i} className="flex flex-wrap items-center justify-between rounded border px-2 py-2 text-sm" style={{ borderColor: TK.borderSubtle }}>
                          <div className="flex items-center gap-2">
                            <Chip tone="brand" title={meta.label}>
                              <SerpIcon f={s.feature} /> <span className="ml-1">{meta.label}</span>
                            </Chip>
                            <span className="text-xs" style={{ color: TK.muted }}>{fmtDate(s.dateISO)}</span>
                          </div>
                          <div className="text-xs" style={{ color: TK.text }}>
                            {s.before === s.after ? (
                              <span>No change</span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className="line-through opacity-70">{s.before ? "Present" : "Absent"}</span>
                                <span>→</span>
                                <b>{s.after ? "Present" : "Absent"}</b>
                              </span>
                            )}
                            {s.holderDomain ? <span className="ml-2 text-xs" style={{ color: TK.muted }}>(holder: {s.holderDomain})</span> : null}
                          </div>
                        </div>
                      );
                    })}
                    {model.links.serpSnapshot && (
                      <div className="pt-1">
                        <a
                          href={model.links.serpSnapshot.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm underline decoration-dotted"
                          style={{ color: TK.chipActiveText }}
                        >
                          <ExternalLink size={14} color={TK.brandIcon} /> {model.links.serpSnapshot.label}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <Placeholder>No SERP feature changes logged.</Placeholder>
                )}
              </Section>

              {/* Backlink correlation */}
              <Section id="r4" title="Backlink correlation (if tracked)" defaultOpen icon={<LinkIcon size={16} color={TK.brandIcon} />}>
                {model.evidence.backlinkSeries?.points?.length ? (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={joinRankBacklink(model)} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                        <CartesianGrid stroke={TK.borderSubtle} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="dateISO"
                          tickLine={false}
                          axisLine={{ stroke: TK.borderSubtle }}
                          tick={{ fontSize: 12, fill: TK.muted }}
                          minTickGap={28}
                          tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                        />
                        <YAxis
                          yAxisId="L"
                          tickLine={false}
                          axisLine={{ stroke: TK.borderSubtle }}
                          tick={{ fontSize: 12, fill: TK.muted }}
                          reversed
                          allowDecimals={false}
                          domain={[1, "dataMax + 2"]}
                        />
                        <YAxis
                          yAxisId="R"
                          orientation="right"
                          tickLine={false}
                          axisLine={{ stroke: TK.borderSubtle }}
                          tick={{ fontSize: 12, fill: TK.muted }}
                          allowDecimals={false}
                        />
                        <RTooltip content={BacklinkTooltip} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="R" dataKey="newLinks" name="New links" fill={TK.success} radius={[3, 3, 0, 0]} />
                        <Line yAxisId="L" type="monotone" dataKey="position" name="Position" stroke={TK.competitor} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-[11px]" style={{ color: TK.muted }}>
                      Bars = new links (right axis) • Line = position (left, inverted).
                    </div>
                  </div>
                ) : (
                  <Placeholder>No backlink events in this window.</Placeholder>
                )}
              </Section>

              {/* Competitor snapshot */}
              <Section id="r5" title="Competitor snapshot" defaultOpen icon={<ExternalLink size={16} color={TK.brandIcon} />}>
                {model.evidence.competitorSnapshot?.items?.length ? (
                  <div className="overflow-auto rounded border" style={{ borderColor: TK.borderSubtle }}>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-white">
                        <tr className="border-b" style={{ borderColor: TK.borderSubtle }}>
                          <th className="px-3 py-2 text-left text-xs" style={{ color: TK.muted, minWidth: 200 }}>Domain</th>
                          <th className="px-3 py-2 text-left text-xs" style={{ color: TK.muted, minWidth: 110 }}>Position</th>
                          <th className="px-3 py-2 text-left text-xs" style={{ color: TK.muted, minWidth: 180 }}>Features</th>
                          <th className="px-3 py-2 text-left text-xs" style={{ color: TK.muted, minWidth: 140 }}>Word Count</th>
                          <th className="px-3 py-2 text-left text-xs" style={{ color: TK.muted, minWidth: 160 }}>Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.evidence.competitorSnapshot.items.map((c, i) => (
                          <tr key={c.domain} className={i % 2 ? "" : "bg-[var(--wr-table-row-alt,#FAFCFE)]"}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <img src={faviconFor(c.domain)} alt="" className="h-4 w-4 rounded-sm" />
                                <span className="font-mono">{c.domain}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">#{c.position ?? "—"}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {(c.features || []).map((f) => (
                                  <Chip key={f} tone="brand" title={SERP_ICON_META[(f as any) in SERP_ICON_META ? (f as any) : "DEFAULT"].label}>
                                    <SerpIcon f={f} /> <span className="ml-1">{f}</span>
                                  </Chip>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">{c.wordCount ? `${c.wordCount.toLocaleString()} words` : "—"}</td>
                            <td className="px-3 py-2 text-xs" style={{ color: TK.muted }}>{c.lastUpdatedISO ? fmtDate(c.lastUpdatedISO) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Placeholder>No competitor snapshot available.</Placeholder>
                )}
              </Section>

              {/* Caveats & References */}
              <Section id="caveats" title="Assumptions & caveats" defaultOpen icon={<AlertTriangle size={16} color={TK.brandIcon} />}>
                <ul className="list-disc pl-5 text-sm" style={{ color: TK.text }}>
                  <li>We attribute likely influence based on timing and magnitude; other factors may apply.</li>
                  <li>Crawler deltas reflect live content; templated changes can appear as content shifts.</li>
                </ul>
              </Section>

              <Section id="refs" title="References / data used" defaultOpen icon={<Info size={16} color={TK.brandIcon} />}>
                <div className="grid gap-2 md:grid-cols-2">
                  {model.provenance.map((p) => (
                    <div key={p.id} className="rounded border p-2 text-sm" style={{ borderColor: TK.borderSubtle }}>
                      <div className="font-medium" style={{ color: TK.text }}>
                        {p.id}: {p.label}
                      </div>
                      <div className="text-xs" style={{ color: TK.muted }}>
                        Source: {p.source}{p.details ? ` — ${p.details}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-white px-5 py-4" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <Button kind="outline" onClick={() => handleFeedback(true)} title="Mark as useful" iconLeft={<ThumbsUp size={16} color={TK.brandIcon} />}>
              Useful
            </Button>
            <Button kind="outline" onClick={() => handleFeedback(false)} title="Mark as not useful" iconLeft={<ThumbsDown size={16} color={TK.brandIcon} />}>
              Not useful
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={model?.links.serpSnapshot?.href || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-md px-3 py-2 text-sm underline decoration-dotted hover:bg-gray-50"
              title={model?.links.serpSnapshot?.label || "Open SERP Snapshot"}
              style={{ color: TK.chipActiveText }}
            >
              <span className="inline-flex items-center gap-1">
                <ExternalLink size={14} color={TK.brandIcon} /> {model?.links.serpSnapshot?.label || "Open SERP Snapshot"}
              </span>
            </a>
            <a
              href={model?.links.opportunities?.href || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-md px-3 py-2 text-sm underline decoration-dotted hover:bg-gray-50"
              title={model?.links.opportunities?.label || "Open Opportunities"}
              style={{ color: TK.chipActiveText }}
            >
              <span className="inline-flex items-center gap-1">
                <ExternalLink size={14} color={TK.brandIcon} /> {model?.links.opportunities?.label || "Open Opportunities"}
              </span>
            </a>
            <Button
              kind="primary"
              onClick={handleCreateTask}
              disabled={!canCreateTask}
              title={canCreateTask ? "Create task" : "Insufficient permissions"}
              iconLeft={<FilePlus size={16} />}
            >
              Create Task
            </Button>
            <Button onClick={closeDrawer} title="Close">Close</Button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------- Support UI --------------------------------- */
function Placeholder({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-md border p-3 text-sm" style={{ borderColor: TK.borderSubtle, color: TK.muted }}>
      {children}
    </div>
  );
}
function BacklinkTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded border bg-white px-2 py-1 text-xs shadow" style={{ borderColor: TK.borderSubtle }}>
      <div className="text-[11px]" style={{ color: TK.muted }}>{fmtDate(row.dateISO)}</div>
      <div className="mt-0.5 grid grid-cols-1 gap-1">
        <span className="inline-flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.competitor }} /> Position</span>
          <b style={{ color: TK.text }}>#{row.position}</b>
        </span>
        <span className="inline-flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.success }} /> New links</span>
          <b style={{ color: TK.text }}>{row.newLinks}</b>
        </span>
      </div>
    </div>
  );
}
function joinRankBacklink(model: AIInsightExplainModel) {
  const rank = model.evidence.rankSeries?.points || [];
  const links = model.evidence.backlinkSeries?.points || [];
  const map = new Map<string, any>();
  rank.forEach((p) => map.set(p.dateISO, { dateISO: p.dateISO, position: p.position, newLinks: 0 }));
  links.forEach((l) => {
    const prev = map.get(l.dateISO);
    if (prev) prev.newLinks = l.newLinks;
    else map.set(l.dateISO, { dateISO: l.dateISO, position: null, newLinks: l.newLinks });
  });
  return Array.from(map.values()).sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

/* ------------------------------- Demo export -------------------------------- */
export default function AIInsightExplainDrawerDemo() {
  const [open, setOpen] = useState(true);
  return (
<>


      <AIInsightExplainDrawer
        open={open}
        onClose={() => setOpen(false)}
        insightId="demo_insight"
        role="admin"
        projectDomain="you.example"
      />
</>
  );
}
