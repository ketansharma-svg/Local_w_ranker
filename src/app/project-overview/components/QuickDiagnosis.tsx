"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/* ====================== UI kit used elsewhere in Project Overview ====================== */
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* ====================== Charts ====================== */
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";

/* ====================== Icons ====================== */
import {
  AlertTriangle,
  Lightbulb,
  Gauge,
  BarChart3,
  Link2,
  Activity,
  Rocket,
  Wrench,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ExternalLink,
  FileDown,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Clock,
} from "lucide-react";

/* ========================================================================================
 * TOKENS — match Project Overview look & feel
 * ====================================================================================== */
const TOKENS = {
  surface: "var(--wr-surface, #FFFFFF)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #EFF0F6)",
  borderStrong: "var(--wr-borderStrong, #E5E7EB)",
  subtle: "var(--wr-subtle, #F5F7FA)",
  valueBlue: "var(--wr-value-blue, #0077FF)",
  pastelBlue: "var(--wr-pastel-blue, #D9EEF8)",
  success: "var(--wr-success, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  danger: "var(--wr-danger, #EF4444)",
  brand: "var(--wr-brand, #1090D0)",
} as const;

/* ========================================================================================
 * TYPES (as per spec)
 * ====================================================================================== */
export type InsightSeverity = "critical" | "warning" | "info";
export type InsightCategory = "technical" | "keywords" | "content" | "backlinks" | "analytics";
export type InsightStatus = "open" | "snoozed" | "resolved";

export interface EvidencePoint { x: string | Date; y: number }
export interface EvidenceSeries {
  type: "area" | "bar";
  tone?: "info" | "warning" | "critical";
  points: EvidencePoint[];
}

export interface InsightAction {
  label: string;
  deepLink?: { panel: string; tab?: string; params?: Record<string, string> };
}

export interface InsightTaskTemplate {
  key: string;
  title: string;
  description?: string;
  assigneeHint?: "seo" | "dev" | "content";
  estimate?: "S" | "M" | "L";
  context?: Record<string, unknown>;
}

export interface Insight {
  id: string;
  detectedAt: string;
  category: InsightCategory;
  severity: InsightSeverity;
  status: InsightStatus;
  title: string;
  why: string;
  evidence?: EvidenceSeries;
  metrics: { label: string; value: string; delta?: string; good?: boolean }[];
  affected: { type: "url" | "keyword" | "page" | "template"; id: string; label: string }[];
  suggested: InsightAction[];
  taskTemplate?: InsightTaskTemplate;
  priorityScore: number;             // 0–100
  impactScore?: number;              // 0–100
  confidence?: number;               // 0–100
  sources: ("ga4" | "gsc" | "crawler" | "psi" | "backlinks")[];
  gating?: { requires: ("ga4" | "gsc" | "crawler" | "psi" | "backlinks")[]; connected: boolean };
  snoozeUntil?: string;
}

/* ========================================================================================
 * HELPERS
 * ====================================================================================== */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const timeAgo = (iso: string) => {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const dd = Math.floor(ms / 86400000);
  if (dd > 0) return `${dd}d ago`;
  const hh = Math.floor(ms / 3600000);
  if (hh > 0) return `${hh}h ago`;
  const mm = Math.max(1, Math.floor(ms / 60000));
  return `${mm}m ago`;
};
const toneColor = (sev: InsightSeverity | "critical" | "warning" | "info") =>
  sev === "critical" ? TOKENS.danger : sev === "warning" ? TOKENS.warning : TOKENS.valueBlue;

const evidenceToneColor = (series?: EvidenceSeries, fallbackSeverity?: InsightSeverity) =>
  series?.tone ? toneColor(series.tone) : (fallbackSeverity ? toneColor(fallbackSeverity) : TOKENS.valueBlue);

const categoryIcon: Record<InsightCategory, React.ComponentType<{ className?: string }>> = {
  technical: Wrench,
  keywords: Activity,
  content: Lightbulb,
  backlinks: Link2,
  analytics: BarChart3,
};

const severityChipLabel: Record<InsightSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const statusChipLabel: Record<InsightStatus, string> = {
  open: "Open",
  snoozed: "Snoozed",
  resolved: "Resolved",
};

/* ========================================================================================
 * CHIPS (match Project Overview chip style)
 * ====================================================================================== */
function FilterChip({
  active,
  label,
  tone,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  tone?: "critical" | "warning" | "info" | "success" | "default";
  onClick: () => void;
  title?: string;
}) {
  const bg =
    tone === "critical" ? `${TOKENS.danger}1F` :
    tone === "warning" ? `${TOKENS.warning}1F` :
    tone === "info" ? `${TOKENS.pastelBlue}` :
    tone === "success" ? `${TOKENS.success}1F` : "#fff";

  const ring =
    tone === "critical" ? `${TOKENS.danger}33` :
    tone === "warning" ? `${TOKENS.warning}33` :
    tone === "info" ? `${TOKENS.valueBlue}33` :
    tone === "success" ? `${TOKENS.success}33` : TOKENS.border;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-sm transition ${
        active ? "font-semibold" : "text-muted-foreground"
      }`}
      style={{ background: active ? bg : "#fff", borderColor: active ? ring : TOKENS.border }}
    >
      {label}
    </button>
  );
}

/* ========================================================================================
 * MICRO CHART
 * ====================================================================================== */
function EvidenceMiniChart({
  insight,
  aria,
}: {
  insight: Insight;
  aria: string;
}) {
  const data = useMemo(
    () => (insight.evidence?.points ?? []).map((p) => ({ x: typeof p.x === "string" ? p.x : (p.x as Date).toISOString().slice(0, 10), y: p.y })),
    [insight.evidence]
  );
  if (!insight.evidence || data.length === 0) {
    return <div className="h-16 w-[11.5rem] rounded bg-[#F3F4F6]" aria-label={`${aria} (no chart)`} />;
  }
  const stroke = evidenceToneColor(insight.evidence, insight.severity);
  const fill = stroke + "33";

  const tooltip = (
    <RTooltip
      content={({ active, label, payload }) => {
        if (!active || !payload?.length) return null;
        const v = payload[0]?.value as number;
        return (
          <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text }}>
            <div className="mb-1 text-[11px]" style={{ color: TOKENS.muted }}>
              {label}
            </div>
            <div className="font-semibold">{v}</div>
          </div>
        );
      }}
      allowEscapeViewBox={{ x: true, y: true }}
      offset={8}
      wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
      cursor={{ stroke: stroke, strokeOpacity: 0.18, strokeWidth: 1 }}
    />
  );

  return (
    <div className="h-16 w-[11.5rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        {insight.evidence.type === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={TOKENS.border} vertical={false} />
            <XAxis hide dataKey="x" />
            <YAxis hide />
            {tooltip}
            <Area type="monotone" dataKey="y" stroke={stroke} fill={fill} strokeWidth={2} dot={false} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis hide dataKey="x" />
            <YAxis hide />
            {tooltip}
            <Bar dataKey="y" fill={stroke} radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ========================================================================================
 * CARD
 * ====================================================================================== */
function InsightCard({
  insight,
  onCreateTask,
  onOpenDeepLink,
  onSnooze,
  onResolve,
}: {
  insight: Insight;
  onCreateTask: (insight: Insight) => void;
  onOpenDeepLink: (insight: Insight, action?: InsightAction) => void;
  onSnooze: (id: string, days: number) => void;
  onResolve: (id: string) => void;
}) {
  const CatIcon = categoryIcon[insight.category];
  const sevColor = toneColor(insight.severity);
  const locked = insight.gating && insight.gating.requires?.length && insight.gating.connected === false;

  // affected chips (max 6 + overflow)
  const maxChips = 6;
  const chips = insight.affected?.slice(0, maxChips) ?? [];
  const more = Math.max(0, (insight.affected?.length ?? 0) - chips.length);

  return (
    <div
      className="relative rounded-md border bg-white p-3"
      style={{ borderColor: TOKENS.border }}
      role="article"
      aria-label={`Insight ${insight.title}`}
    >
      {/* severity band */}
      <span
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-md"
        style={{ background: sevColor, opacity: 0.9 }}
        aria-hidden
      />

      {/* top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium"
            style={{ color: sevColor, borderColor: sevColor + "33", background: sevColor + "1A" }}
          >
            {severityChipLabel[insight.severity]}
          </span>
          <span
            className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
          >
            <CatIcon className="h-3.5 w-3.5" />
            {insight.category[0].toUpperCase() + insight.category.slice(1)}
          </span>
          {insight.priorityScore != null && (
            <span
              className="inline-flex h-6 items-center rounded-full border px-2 text-xs"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              title="Priority Score"
            >
              Priority&nbsp;<b>{Math.round(insight.priorityScore)}</b>
            </span>
          )}
          {!locked && insight.confidence != null && (
            <span
              className="inline-flex h-6 items-center rounded-full border px-2 text-xs"
              style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
              title="Confidence"
            >
              <Gauge className="mr-1 h-3.5 w-3.5" /> {Math.round(insight.confidence)}%
            </span>
          )}
          {locked && (
            <span
              className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs"
              style={{ borderColor: TOKENS.border, color: TOKENS.muted, background: TOKENS.subtle }}
              title="Data source required"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Connect&nbsp;{insight.gating?.requires?.join(" + ").toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: TOKENS.muted }}>
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            Detected {timeAgo(insight.detectedAt)}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded p-1 text-muted-foreground hover:bg-[#F7FAFC]">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Menu</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* headline */}
      <h5 className="mt-2 line-clamp-2 text-[15px] font-semibold" style={{ color: TOKENS.text }}>
        {insight.title}
      </h5>

      {/* why this matters */}
      <p className="mt-1 text-[13px]" style={{ color: TOKENS.muted }}>
        {insight.why}
      </p>

      {/* evidence */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <EvidenceMiniChart insight={insight} aria={`${insight.category} evidence`} />
        <div className="grid flex-1 grid-cols-3 gap-2">
          {(insight.metrics ?? []).slice(0, 3).map((m, i) => (
            <div key={insight.id + "_m_" + i} className="rounded-md border p-2" style={{ borderColor: TOKENS.border }}>
              <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                {m.label}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{m.value}</span>
                {m.delta && (
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[11px]"
                    style={{
                      color: m.good ? TOKENS.success : TOKENS.danger,
                      background: (m.good ? TOKENS.success : TOKENS.danger) + "14",
                    }}
                  >
                    {m.delta.startsWith("-") ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {m.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* suggested actions */}
      {insight.suggested?.length ? (
        <ul className="mt-2 list-disc pl-5 text-[13px]" style={{ color: TOKENS.text }}>
          {insight.suggested.slice(0, 3).map((a, i) => (
            <li key={insight.id + "_s_" + i} className="truncate">
              {a.label}
            </li>
          ))}
        </ul>
      ) : null}

      {/* affected assets */}
      {chips.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((a) => (
            <span
              key={a.type + a.id}
              className="inline-flex items-center rounded-full border px-2 text-[12px] leading-6"
              style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.subtle }}
            >
              {a.label}
            </span>
          ))}
          {more > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center rounded-full border px-2 text-[12px] leading-6"
                  style={{ borderColor: TOKENS.border, color: TOKENS.valueBlue, background: "#fff" }}
                  title="Show more"
                >
                  +{more} more
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <div className="text-sm font-medium mb-2">Affected assets</div>
                <div className="max-h-60 space-y-1 overflow-auto pr-1">
                  {insight.affected.slice(maxChips).map((a) => (
                    <div key={a.type + ":" + a.id} className="truncate text-sm">
                      {a.label}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      ) : null}

      {/* footer CTAs */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => onCreateTask(insight)}
          className="h-8"
          disabled={!!locked}
          style={{ background: TOKENS.brand }}
        >
          Create Task
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={() => onOpenDeepLink(insight)}
        >
          Open&nbsp;detail <ExternalLink className="h-3.5 w-3.5" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              Snooze
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40" side="top">
            <div className="flex flex-col">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  className="rounded px-2 py-1 text-left text-sm hover:bg-[#F7FAFC]"
                  onClick={() => onSnooze(insight.id, d)}
                >
                  {d} days
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-green-600 hover:bg-green-50"
          onClick={() => onResolve(insight.id)}
        >
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Resolve
        </Button>
      </div>

      {/* lock overlay */}
      {locked && (
        <div className="pointer-events-none absolute inset-0 rounded-md" style={{ background: "rgba(255,255,255,0.45)" }} />
      )}
    </div>
  );
}

/* ========================================================================================
 * MAIN — Quick Diagnosis Stack (robust against undefined `insights`)
 * ====================================================================================== */
export interface QuickDiagnosisStackProps {
  insights?: Insight[]; // optional
  loading?: boolean;
  className?: string;
  onExport?: (list: Insight[], fmt: "CSV" | "PDF") => void;
  onAddToReport?: (list: Insight[]) => void;
  onCreateTask?: (insight: Insight) => void;
  onOpenDeepLink?: (insight: Insight, action?: InsightAction) => void;
  onSnooze?: (insightId: string, days: number) => void;
  onResolve?: (insightId: string) => void;
  showManageRules?: boolean;
}

export default function QuickDiagnosisStack({
  insights,
  loading,
  className,
  onExport,
  onAddToReport,
  onCreateTask,
  onOpenDeepLink,
  onSnooze,
  onResolve,
  showManageRules = false,
}: QuickDiagnosisStackProps) {
  /* ----- NO-OP fallbacks to eliminate runtime errors ----- */
  const noop = () => {};
  const _onCreateTask = onCreateTask ?? noop;
  const _onOpenDeepLink = onOpenDeepLink ?? noop;
  const _onSnooze = onSnooze ?? noop;
  const _onResolve = onResolve ?? noop;

  /* Safe list */
  const list = useMemo<Insight[]>(() => (Array.isArray(insights) ? insights : []), [insights]);

  /* Header controls state (persist per user) */
  const STORAGE_KEY = "wr:qdx:ctrls:v1";
  const [sev, setSev] = useState<Array<InsightSeverity | "resolved">>(["critical", "warning", "info"]); // "resolved" off by default
  const [cats, setCats] = useState<InsightCategory[]>(["technical", "keywords", "content", "backlinks", "analytics"]);
  const [statusSet, setStatusSet] = useState<InsightStatus[]>(["open"]); // default only Open
  const [sortKey, setSortKey] = useState<"priority" | "impact" | "newest" | "oldest" | "category">("priority");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.sev) setSev(parsed.sev);
      if (parsed.cats) setCats(parsed.cats);
      if (parsed.statusSet) setStatusSet(parsed.statusSet);
      if (parsed.sortKey) setSortKey(parsed.sortKey);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sev, cats, statusSet, sortKey }));
    } catch {}
  }, [sev, cats, statusSet, sortKey]);

  /* Filtered + sorted */
  const filtered = useMemo(() => {
    const sSev = new Set(sev);
    const sCat = new Set(cats);
    const sStat = new Set(statusSet);
    return list.filter((i) => {
      const sevPass = i.status === "resolved" ? sSev.has("resolved") : sSev.has(i.severity);
      if (!sevPass) return false;
      if (!sCat.has(i.category)) return false;
      if (!sStat.has(i.status)) return false;
      return true;
    });
  }, [list, sev, cats, statusSet]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "impact":
        arr.sort((a, b) => (b.impactScore ?? -1) - (a.impactScore ?? -1));
        break;
      case "newest":
        arr.sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt));
        break;
      case "oldest":
        arr.sort((a, b) => +new Date(a.detectedAt) - +new Date(b.detectedAt));
        break;
      case "category":
        arr.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "priority":
      default:
        arr.sort((a, b) => (b.priorityScore ?? -1) - (a.priorityScore ?? -1));
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  /* Pagination / virtualization */
  const DEFAULT_PAGE = 10;
  const [pageCount, setPageCount] = useState(DEFAULT_PAGE);
  const enableVirtual = sorted.length > 30;

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const CARD_H = 260; // approximate card height target (220–280)
  const [virtRange, setVirtRange] = useState({ start: 0, end: Math.min(sorted.length, 20) });

  const computeVirtual = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const vh = el.clientHeight;
    const st = el.scrollTop;
    const start = Math.max(0, Math.floor(st / CARD_H) - 3);
    const count = Math.ceil(vh / CARD_H) + 8;
    const end = Math.min(sorted.length, start + count);
    setVirtRange({ start, end });
  }, [sorted.length]);

  useEffect(() => {
    if (!enableVirtual) return;
    computeVirtual();
  }, [enableVirtual, computeVirtual, sorted.length]);

  /* Export current filtered list */
  const doExportCsv = () => {
    const cols = ["id", "title", "severity", "category", "status", "priorityScore", "impactScore", "confidence", "detectedAt"];
    const head = cols.join(",");
    const lines = sorted.map((i) =>
      cols
        .map((k) => {
          const v: any = (i as any)[k];
          return JSON.stringify(v ?? "");
        })
        .join(",")
    );
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quick-diagnosis.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Section header chips toggles */
  const toggleSev = (k: InsightSeverity | "resolved") =>
    setSev((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const toggleCat = (k: InsightCategory) =>
    setCats((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const toggleStatus = (k: InsightStatus) =>
    setStatusSet((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  /* AI Insights placeholder (Phase 2) */
  const AiSlot = (
    <div
      className="rounded-md border bg-white p-3"
      style={{ borderColor: TOKENS.border }}
      role="region"
      aria-label="AI Insights (Preview)"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: TOKENS.text }}>
          <Sparkles className="h-4 w-4 text-yellow-500" /> AI Insights (Preview)
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-[#F7FAFC]">Coming soon</button>
            </TooltipTrigger>
            <TooltipContent>Reserved slot for Explain with AI</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="mt-1 text-[13px]" style={{ color: TOKENS.muted }}>
        This slot will summarize changes, explain impact, and propose a plan. Not active in Phase 1.
      </p>
    </div>
  );

  /* Items to render (pagination or virtualization) */
  const itemsToRender = useMemo(() => {
    if (enableVirtual) {
      return sorted.slice(virtRange.start, virtRange.end);
    }
    return sorted.slice(0, pageCount);
  }, [enableVirtual, sorted, pageCount, virtRange.start, virtRange.end]);

  return (
    <section className={className}>
      <Card className="border" style={{ borderColor: TOKENS.border }}>
        {/* Header row */}
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
                Quick Diagnosis
              </div>

              {/* Severity */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <FilterChip
                  active={sev.includes("critical")}
                  label="Critical"
                  tone="critical"
                  onClick={() => toggleSev("critical")}
                />
                <FilterChip
                  active={sev.includes("warning")}
                  label="Warning"
                  tone="warning"
                  onClick={() => toggleSev("warning")}
                />
                <FilterChip
                  active={sev.includes("info")}
                  label="Info"
                  tone="info"
                  onClick={() => toggleSev("info")}
                />
                <FilterChip
                  active={sev.includes("resolved")}
                  label="Resolved"
                  tone="success"
                  onClick={() => toggleSev("resolved")}
                />
              </div>

              {/* Category */}
              <div className="ml-1 flex flex-wrap items-center gap-2">
                {(["technical", "keywords", "content", "backlinks", "analytics"] as InsightCategory[]).map((c) => (
                  <FilterChip
                    key={c}
                    active={cats.includes(c)}
                    label={c[0].toUpperCase() + c.slice(1)}
                    onClick={() => toggleCat(c)}
                  />
                ))}
              </div>

              {/* Status */}
              <div className="ml-1 flex items-center gap-2">
                <FilterChip
                  active={statusSet.includes("open")}
                  label="Open"
                  onClick={() => toggleStatus("open")}
                />
                <FilterChip
                  active={statusSet.includes("snoozed")}
                  label="Snoozed"
                  onClick={() => toggleStatus("snoozed")}
                />
                <FilterChip
                  active={statusSet.includes("resolved")}
                  label="Resolved"
                  onClick={() => toggleStatus("resolved")}
                />
              </div>

              {/* Sort */}
              <div className="ml-2">
                <Select value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="impact">Impact</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 gap-2"
                onClick={() => (onAddToReport ? onAddToReport(sorted) : undefined)}
              >
                Add to Report <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="h-8 gap-2"
                onClick={() => (onExport ? onExport(sorted, "CSV") : doExportCsv())}
              >
                <FileDown className="h-4 w-4" />
                Export
              </Button>
              {showManageRules && (
                <Button variant="outline" className="h-8">
                  Manage Rules
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-3">
          {/* AI slot */}
          <div className="mb-3">{AiSlot}</div>

          {/* Empty / loading states */}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[220px] animate-pulse rounded-md border bg-[#FAFAFA]" style={{ borderColor: TOKENS.border }} />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-md border p-10 text-center"
              style={{ borderColor: TOKENS.border, background: TOKENS.subtle }}
            >
              <Rocket className="mb-2 h-6 w-6 text-green-500" />
              <div className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
                Nothing urgent right now 🎉
              </div>
              <div className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
                Try expanding the date range, run a crawl, or add more keywords.
              </div>
            </div>
          ) : (
            <>
              {/* List (masonry-like on xl) */}
              <div
                ref={scrollerRef}
                onScroll={enableVirtual ? computeVirtual : undefined}
                className="max-h-[70vh] overflow-auto"
                style={{ borderTop: `1px solid ${TOKENS.border}` }}
              >
                <div
                  className="grid grid-cols-1 gap-3 xl:grid-cols-2"
                  style={{
                    padding: "12px 0",
                    /* Virtualization padding */
                    ...(enableVirtual
                      ? {
                          paddingTop: virtRange.start * CARD_H,
                          paddingBottom: Math.max(0, (sorted.length - virtRange.end) * CARD_H),
                        }
                      : {}),
                  }}
                >
                  {itemsToRender.map((ins) => (
                    <InsightCard
                      key={ins.id}
                      insight={ins}
                      onCreateTask={_onCreateTask}
                      onOpenDeepLink={(i) => _onOpenDeepLink(i)}
                      onSnooze={_onSnooze}
                      onResolve={_onResolve}
                    />
                  ))}
                </div>
              </div>

              {/* Show more (pagination path) */}
              {!enableVirtual && pageCount < sorted.length && (
                <div className="mt-3 flex justify-center">
                  <Button className="h-9" onClick={() => setPageCount((n) => Math.min(sorted.length, n + DEFAULT_PAGE))}>
                    Show more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* ========================================================================================
 * OPTIONAL: Small deterministic mock generator (use only if you need to test quickly)
 * ----------------------------------------------------------------------------------------
 * Usage:
 *   <QuickDiagnosisStack insights={makeMockInsights(16)} />
 * Remove before production.
 * ====================================================================================== */
export function makeMockInsights(n = 12): Insight[] {
  const now = Date.now();
  const cats: InsightCategory[] = ["technical", "keywords", "content", "backlinks", "analytics"];
  const sevs: InsightSeverity[] = ["critical", "warning", "info"];
  const rand = (i: number) => {
    const x = Math.sin(i * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  const mkSeries = (i: number, type: "area" | "bar"): EvidenceSeries => ({
    type,
    tone: sevs[i % sevs.length],
    points: Array.from({ length: 14 }).map((_, k) => ({
      x: new Date(now - (13 - k) * 86400000).toISOString().slice(0, 10),
      y: Math.max(0, Math.round(40 + (rand(i + k) - 0.5) * 30)),
    })),
  });
  return Array.from({ length: n }).map((_, i) => {
    const sev = sevs[i % sevs.length];
    const cat = cats[i % cats.length];
    const status: InsightStatus = i % 10 === 0 ? "snoozed" : i % 7 === 0 ? "resolved" : "open";
    const title =
      cat === "keywords"
        ? `CTR down ${Math.round(10 + rand(i) * 35)}% for “best crm software” with stable impressions`
        : cat === "technical"
        ? `CWV failures spike on homepage (mobile)`
        : cat === "backlinks"
        ? `Lost RD spike last week`
        : cat === "analytics"
        ? `Organic CVR down ${Math.round(8 + rand(i) * 20)}% with stable sessions`
        : `Underperforming post: “Ultimate guide ${i}”`;
    return {
      id: String(10_000 + i),
      detectedAt: new Date(now - i * 36e5).toISOString(),
      category: cat,
      severity: sev,
      status,
      title,
      why:
        cat === "keywords"
          ? "Lower CTR with steady demand suggests snippet or intent mismatch—lost clicks at same ranking."
          : cat === "technical"
          ? "Core Web Vitals issues reduce rankings and user satisfaction."
          : cat === "backlinks"
          ? "Authority loss can depress rankings across the site."
          : "Conversion and user signals influence prioritization.",
      evidence: mkSeries(i, i % 2 ? "bar" : "area"),
      metrics: [
        { label: "Impressions", value: String(12000 + i * 37), delta: i % 2 ? "+2.1%" : "-1.2%", good: i % 2 === 1 },
        { label: "CTR", value: i % 2 ? "1.9%" : "3.1%", delta: i % 2 ? "-12%" : "+6%", good: i % 2 === 0 },
        { label: "Position", value: (7 + (i % 5)).toFixed(1), delta: i % 3 ? "-0.2" : "+0.1", good: i % 3 === 0 },
      ],
      affected: [
        { type: "keyword", id: "kw1", label: "best crm software" },
        { type: "url", id: "u1", label: "/blog/best-crm/" },
        { type: "url", id: "u2", label: "/blog/crm-compare/" },
        { type: "template", id: "t1", label: "Blog Post" },
        { type: "keyword", id: "kw2", label: "crm software" },
        { type: "keyword", id: "kw3", label: "best crm 2025" },
        { type: "url", id: "u3", label: "/pricing/" },
      ],
      suggested:
        cat === "keywords"
          ? [
              { label: "Rewrite title to include pricing/year" },
              { label: "Add FAQ schema" },
              { label: "Test meta description variant" },
            ]
          : cat === "technical"
          ? [
              { label: "Optimize LCP image / preload" },
              { label: "Inline critical CSS" },
              { label: "Reduce long tasks (INP)" },
            ]
          : [{ label: "Add internal links from hubs" }, { label: "Update anchors to target page" }],
      taskTemplate: {
        key: cat === "technical" ? "fix-cwv" : cat === "keywords" ? "improve-ctr" : "add-internal-links",
        title: title.replace(/”|“/g, '"'),
        description: "Auto-created from Quick Diagnosis.",
        assigneeHint: cat === "technical" ? "dev" : cat === "content" ? "content" : "seo",
        estimate: "M",
      },
      priorityScore: Math.round(60 + rand(i) * 40),
      impactScore: Math.round(40 + rand(i + 2) * 60),
      confidence: Math.round(50 + rand(i + 3) * 50),
      sources: cat === "technical" ? ["crawler", "psi"] : cat === "keywords" ? ["gsc"] : cat === "backlinks" ? ["backlinks"] : ["ga4"],
      gating: i % 9 === 0 ? { requires: ["gsc"], connected: false } : undefined,
    };
  });
}


