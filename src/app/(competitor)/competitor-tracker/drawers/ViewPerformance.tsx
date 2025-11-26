"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Info as InfoIcon,
  ExternalLink,
  Plus,
  Search as SearchIcon,
  ClipboardPlus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*                                   TOKENS                                    */
/* -------------------------------------------------------------------------- */
const TK = {
  brand: "#1090D0", // Primary CTA (You)
  valueBlue: "#0077FF", // Competitor primary accents
  text: "#282829",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  surface: "#FFFFFF",
  success: "#16A34A",
  warn: "#F59E0B",
  danger: "#F04438",
  radius: 6,
} as const;

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                     */
/* -------------------------------------------------------------------------- */
type SerpFlag = "FS" | "PAA" | "SITELINKS" | "IMAGE" | "VIDEO" | "TOP_STORIES";

export type PerformanceModalData = {
  competitorDomain: string;
  urlPath: string;
  fullUrl: string;
  pageTitle?: string;
  keywordsRanked: number;
  avgRankTop10?: number;
  serpFeatures?: SerpFlag[];
  trend: Array<{
    dateISO: string;
    points: { [keyword: string]: number | null }; // 1..100 (lower is better) or null if not ranked
  }>;
  yourClosest?: {
    urlPath: string;
    fullUrl: string;
    matchScorePct: number; // 0..100
    kwOverlap: number;
  } | null;
};

export type ViewPerformanceModalProps = {
  open: boolean;
  onClose: () => void;
  data?: PerformanceModalData;
  onTrackPage?: (url: string) => void;
  onOpenAnalyzer?: (url: string) => void;
  onCreateTask?: (url: string) => void;
  permissions?: { canAnalyze?: boolean; canTrack?: boolean };
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                    */
/* -------------------------------------------------------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
const nf = (n: number) => new Intl.NumberFormat().format(n);
const fmt1 = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
const shortPath = (p: string, max = 48) => (p.length <= max ? p : `${p.slice(0, Math.floor((max - 1) / 2))}…${p.slice(-Math.floor((max - 1) / 2))}`);
const SERP_LABEL: Record<SerpFlag, string> = {
  FS: "Featured Snippet",
  PAA: "People Also Ask",
  SITELINKS: "Sitelinks",
  IMAGE: "Image Pack",
  VIDEO: "Video",
  TOP_STORIES: "Top Stories",
};
const SERP_EMOJI: Record<SerpFlag, string> = {
  FS: "🔥",
  PAA: "💡",
  SITELINKS: "⭐",
  IMAGE: "🖼️",
  VIDEO: "🎥",
  TOP_STORIES: "📰",
};
const PALETTE = ["#0077FF", "#1090D0", "#16A34A", "#F59E0B", "#F04438"];

/* -------------------------------------------------------------------------- */
/*                                  PRIMITIVES                                 */
/* -------------------------------------------------------------------------- */
function InfoPopover({ label, side = "right" }: { label: string; side?: "left" | "right" }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={classNames(
          "invisible group-hover:visible absolute z-[100] w-72 rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow",
          side === "right" ? "left-full ml-2 top-1/2 -translate-y-1/2" : "right-full mr-2 top-1/2 -translate-y-1/2"
        )}
        style={{ borderColor: TK.border }}
      >
        {label}
      </span>
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  title,
}: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 h-9 px-3 rounded-md text-white shadow-sm",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"
      )}
      style={{ background: TK.brand }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
  title,
}: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; title?: string }>) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
      )}
      style={{ borderColor: TK.border, color: TK.text }}
    >
      {children}
    </button>
  );
}

function Pill({
  children,
  title,
}: React.PropsWithChildren<{ title?: string }>) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]"
      title={title}
    >
      {children}
    </span>
  );
}

function MatchBadge({ value }: { value: number }) {
  let bg = "#ECFDF5";
  let fg = "#065F46";
  if (value < 50) {
    bg = "#FEF2F2";
    fg = "#991B1B";
  } else if (value < 80) {
    bg = "#FFFBEB";
    fg = "#92400E";
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: bg, color: fg }}
      title="Semantic + keyword overlap score"
    >
      Match {value}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
export function ViewPerformanceModal({
  open,
  onClose,
  data,
  onTrackPage,
  onOpenAnalyzer,
  onCreateTask,
  permissions = { canAnalyze: true, canTrack: true },
}: ViewPerformanceModalProps) {
  const d = useMemo(() => data ?? mockData(), [data]);

  // derive keyword list (top 5 labels)
  const keywordSet = useMemo(() => {
    const keys = new Set<string>();
    d.trend.forEach((t) => Object.keys(t.points).forEach((k) => keys.add(k)));
    return Array.from(keys).slice(0, 5);
  }, [d.trend]);

  const [visible, setVisible] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const init: Record<string, boolean> = {};
    keywordSet.forEach((k) => (init[k] = true));
    setVisible(init);
  }, [keywordSet.join("|")]); // reinit on keyword set change

  const chartData = useMemo(
    () =>
      d.trend.map((t) => {
        const row: any = { date: fmtDate(t.dateISO) };
        keywordSet.forEach((k) => (row[k] = t.points[k] ?? null));
        return row;
      }),
    [d.trend, keywordSet]
  );

  const hasAnyPoint = useMemo(
    () => chartData.some((r) => keywordSet.some((k) => r[k] != null)),
    [chartData, keywordSet]
  );

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const modalRef = useRef<HTMLDivElement | null>(null);
  // focus first actionable on open
  useEffect(() => {
    if (!open) return;
    const btn = modalRef.current?.querySelector<HTMLButtonElement>('button[data-auto-focus="true"]');
    btn?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[600px] flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perf-modal-title"
        ref={modalRef}
        style={{ borderLeft: `1px solid ${TK.border}` }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 bg-white" style={{ borderColor: TK.border }}>
          <div className="min-w-0">
            <div id="perf-modal-title" className="text-[16px] font-semibold">
              Performance Overview — {shortPath(d.urlPath)}
            </div>
            <div className="text-xs text-[#6B7280]">Competitor: {d.competitorDomain}</div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100"
            title="Close"
            data-auto-focus="true"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {/* Meta strip */}
          <div className="rounded-[6px] border p-3" style={{ borderColor: TK.border }}>
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">
                    {d.pageTitle ? (
                      <span title={d.pageTitle} className="line-clamp-1">
                        {d.pageTitle}
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF]">Untitled page</span>
                    )}
                  </div>
                </div>
                <a
                  href={d.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline decoration-1"
                  style={{ color: TK.valueBlue }}
                  title="Open live page"
                >
                  Open <ExternalLink size={14} />
                </a>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <Pill title="Total ranked keywords (Top 100)">Keywords Ranked: <b className="tabular-nums">{nf(d.keywordsRanked)}</b></Pill>
                <Pill title="Average of current Top 10 best ranks">{`Avg Rank (Top 10): `}
                  <b className="tabular-nums">{typeof d.avgRankTop10 === "number" ? `#${fmt1(d.avgRankTop10)}` : "—"}</b>
                </Pill>
                <div className="ml-1 flex flex-wrap items-center gap-1">
                  {(d.serpFeatures?.length ?? 0) > 0 ? (
                    d.serpFeatures!.map((f) => (
                      <span
                        key={f}
                        className="rounded bg-[#F5F7FA] px-1.5 py-[1px] text-[11px]"
                        title={SERP_LABEL[f]}
                        style={{ color: TK.valueBlue }}
                      >
                        {SERP_EMOJI[f]} {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#9CA3AF]">No SERP features</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart card */}
          <div className="mt-3 rounded-[6px] border p-3" style={{ borderColor: TK.border }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Rank Trend — Top 5 Keywords</div>
              <InfoPopover label="Lower is better. Y‑axis is inverted (#1 at the top). Legend toggles lines on/off." />
            </div>

            {/* Legend toggles */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {keywordSet.map((k, i) => {
                const on = !!visible[k];
                return (
                  <button
                    key={k}
                    onClick={() => setVisible((s) => ({ ...s, [k]: !s[k] }))}
                    className={classNames(
                      "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs",
                      on ? "font-semibold" : ""
                    )}
                    style={{
                      borderColor: TK.border,
                      background: on ? "#F0F7FF" : "#FFFFFF",
                      color: on ? PALETTE[i % PALETTE.length] : TK.text,
                    }}
                    title={on ? "Hide series" : "Show series"}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    {k}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            <div className="mt-2 h-[260px]">
              {hasAnyPoint ? (
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={TK.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: TK.muted }} />
                    <YAxis domain={[1, 100]} reversed tick={{ fontSize: 12, fill: TK.muted }} />
                    <RTooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div
                            className="rounded border bg-white p-2 text-[12px] leading-tight"
                            style={{ borderColor: TK.border, color: TK.text }}
                          >
                            <div className="text-[#6B7280]">{label}</div>
                            {payload
                              .filter((p) => p.value != null)
                              .map((p, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ background: (p.color as string) || TK.valueBlue }}
                                  />
                                  <span>{p.name}:</span>
                                  <b className="tabular-nums">#{p.value as number}</b>
                                </div>
                              ))}
                          </div>
                        ) : null
                      }
                    />
                    {keywordSet.map((k, i) =>
                      visible[k] ? (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={k}
                          name={k}
                          stroke={PALETTE[i % PALETTE.length]}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      ) : null
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm text-[#6B7280]">Not enough data to plot yet.</div>
              )}
            </div>
          </div>

          {/* Closest match card */}
          {d.yourClosest ? (
            d.yourClosest === null ? (
              <div className="mt-3 rounded-[6px] border p-3" style={{ borderColor: TK.border }}>
                <div className="text-sm font-medium">No similar page found</div>
                <div className="mt-1 text-sm text-[#6B7280]">
                  You’re not targeting overlapping keywords yet. Consider creating a competing page.
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-[6px] border p-3" style={{ borderColor: TK.border }}>
                <div className="text-sm font-medium">✅ Closest Page on Your Site</div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <a
                      href={d.yourClosest.fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline decoration-1"
                      style={{ color: TK.brand }}
                      title={d.yourClosest.fullUrl}
                    >
                      {shortPath(d.yourClosest.urlPath)} <ExternalLink size={14} className="text-[#9CA3AF]" />
                    </a>
                    <MatchBadge value={Math.round(d.yourClosest.matchScorePct)} />
                    <Pill title="Shared ranking keywords">KW Overlap: <b className="tabular-nums">{d.yourClosest.kwOverlap}</b></Pill>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="text-xs text-[#6B7280]">Tip: Lower position is better. Y‑axis is inverted.</div>
          <div className="flex items-center gap-2">
            <PrimaryButton
              onClick={() => (permissions.canTrack === false ? undefined : onTrackPage?.(d.fullUrl))}
              disabled={permissions.canTrack === false}
              title={permissions.canTrack === false ? "Only Admins/Owners can track pages" : "Track this page"}
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Track This Page</span>
            </PrimaryButton>

            <GhostButton
              onClick={() => (permissions.canAnalyze === false ? undefined : onOpenAnalyzer?.(d.fullUrl))}
              disabled={permissions.canAnalyze === false}
              title={permissions.canAnalyze === false ? "Upgrade to access Keyword Analyzer" : "Open in Keyword Analyzer"}
            >
              <SearchIcon size={16} />
              Open in Keyword Analyzer
            </GhostButton>

            <GhostButton onClick={() => onCreateTask?.(d.fullUrl)} title="Create competing page task">
              <ClipboardPlus size={16} />
              Create Task
            </GhostButton>

            <GhostButton onClick={onClose} title="Close this modal">
              Close
            </GhostButton>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MOCK DATA (DEMO)                              */
/* -------------------------------------------------------------------------- */
function mockData(): PerformanceModalData {
  const keywords = ["ai seo tools", "seo checklist", "rank checker", "schema generator", "content strategy"];
  const days = 30;
  const today = new Date();

  const trend = Array.from({ length: days }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const points: Record<string, number> = {};
    keywords.forEach((k, idx) => {
      const base = 10 + idx * 5;
      const wobble = Math.round((Math.sin((i + idx) / 3) + Math.random() * 0.7) * 4);
      points[k] = Math.max(1, Math.min(60, base + wobble));
    });
    return { dateISO: d.toISOString().slice(0, 10), points };
  });

  return {
    competitorDomain: "comp1.com",
    urlPath: "/ai-tools-guide",
    fullUrl: "https://comp1.com/ai-tools-guide",
    pageTitle: "Top AI Tools for SEO in 2025",
    keywordsRanked: 56,
    avgRankTop10: 14.8,
    serpFeatures: ["FS", "PAA"],
    trend,
    yourClosest: {
      urlPath: "/tools/ai-seo",
      fullUrl: "https://you.com/tools/ai-seo",
      matchScorePct: 72,
      kwOverlap: 18,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               DEMO EXPORT (opt)                             */
/* -------------------------------------------------------------------------- */
/**
 * Optional demo wrapper. Remove in production and import <ViewPerformanceModal /> directly.
 */
export default function Demo_ViewPerformanceModal() {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-4xl p-4">
        <button
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          style={{ borderColor: TK.border }}
          onClick={() => setOpen(true)}
        >
          Open “View Performance” Modal
        </button>
      </div>
      <ViewPerformanceModal
        open={open}
        onClose={() => setOpen(false)}
        // data={/* pass real data here */ undefined}
        onTrackPage={(url) => alert(`Track page: ${url}`)}
        onOpenAnalyzer={(url) => alert(`Open Keyword Analyzer for: ${url}`)}
        onCreateTask={(url) => alert(`Create task for: ${url}`)}
        permissions={{ canAnalyze: true, canTrack: true }}
      />
    </div>
  );
}
