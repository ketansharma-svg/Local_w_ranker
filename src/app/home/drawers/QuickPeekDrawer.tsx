"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  X,
  ExternalLink,
  Wrench,
  Link2,
  Shield,
  Search,
  FilePlus2,
  Plus,
  Activity,
  Tags,
  Users,
  Clock3,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Info,
} from "lucide-react";

/* --------------------------------- TOKENS --------------------------------- */
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  border: "#EFF0F6",
  chipBg: "#FFFFFF",
  chipHover: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

/* ---------------------------------- TYPES --------------------------------- */
/** The payload you pass from the bubble click. Adjust/extend as needed. */
export type QuickPeekData = {
  id: string;
  projectId?: string;
  projectName: string;
  domain: string;
  /** Optional direct favicon URL; if omitted we'll derive /favicon.ico from domain */
  projectFaviconUrl?: string;

  // Bubble coordinates (for quadrant label)
  xHealth: number;           // 0–100 (X: Site Health Score)
  yOpportunity: number;      // 0–100 (Y: Opportunity Index)
  wrScore: number;           // 0–100 (color source in chart; badge here)
  sessions: number;          // bubble size source

  // Deltas (period vs previous)
  deltas?: {
    healthPP?: number;       // +/− points
    opportunityPP?: number;  // +/− points
    wrPP?: number;           // +/− points
    sessionsPct?: number;    // +/− %
  };

  // Components of Opportunity Index (for the “Why” mini insight)
  opportunityBreakdown?: {
    keywordGapPct?: number;       // 0–100
    trafficUpsidePct?: number;    // 0–100
    intentWeightingPct?: number;  // 0–100
    dampened?: boolean;           // true if capped by very low Health or WR
  };

  // Owner/People/Tags
  owner?: { id: string; name: string; avatarUrl?: string };
  watchers?: { id: string; name: string; avatarUrl?: string }[];
  tags?: string[];
  stale?: boolean;           // e.g., “no update in >30d”
  lastUpdatedISO?: string;

  // Lists (top of mind)
  topKeywords?: { keyword: string; pos: number; delta?: number; clicks?: number }[];
  topPages?: { url: string; estTraffic?: number; pageHealth?: number }[];

  // Quick bullets (from your Quick Diagnosis stack or inline rule pass)
  quickDiagnosis?: { text: string; severity?: "critical" | "warning" | "info" }[];

  // Freeform
  notes?: string;
};

/* --------------------------------- HELPERS -------------------------------- */
const intFmt = new Intl.NumberFormat();
const fmtInt = (n?: number | null) =>
  n == null || Number.isNaN(n) ? "—" : intFmt.format(Math.round(n));

const fmtPct = (p?: number | null, digits = 1) =>
  p == null || Number.isNaN(p) ? "—" : `${p.toFixed(digits)}%`;

const caretChip = (v?: number | null, invert = false) => {
  if (v == null || Number.isNaN(v)) return null;
  const good = invert ? v < 0 : v > 0;
  const Icon = v >= 0 ? TrendingUp : TrendingDown;
  const tone = good ? TOKENS.success : TOKENS.danger;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[11px]"
      style={{ color: tone, background: tone + "1A" }}
    >
      <Icon className="h-3.5 w-3.5" />
      {v > 0 ? "+" : "−"}
      {Math.abs(v).toFixed(v % 1 === 0 ? 0 : 1)}
    </span>
  );
};

function quadrantLabel(xHealth: number, yOpp: number) {
  const right = xHealth >= 50;
  const top = yOpp >= 50;
  if (right && top) return "Quick Wins";
  if (!right && top) return "Fix First";
  if (right && !top) return "Build Authority";
  return "Re‑think Strategy";
}

function badgeToneByScore(v?: number) {
  const n = v ?? 0;
  if (n >= 80) return { text: "Good", color: TOKENS.success, bg: "#10B9811A" };
  if (n >= 60) return { text: "Warning", color: TOKENS.warning, bg: "#F59E0B1A" };
  return { text: "Critical", color: TOKENS.danger, bg: "#EF44441A" };
}

function useCloseOnEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

/* ------------------------------- SMALL ATOMS ------------------------------- */
function Chip({
  children,
  title,
  onClick,
}: React.PropsWithChildren<{ title?: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-gray-50"
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
    >
      {children}
    </button>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = badgeToneByScore(value);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: tone.color, background: tone.bg }}
      title={`${label}: ${value}`}
    >
      {label}: <b className="ml-0.5">{value}</b>
    </span>
  );
}

/** Branded section title with a subtle accent bar */
function SectionTitle({ children }: React.PropsWithChildren) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-1.5 rounded-sm" style={{ background: TOKENS.brand }} />
      <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.text }}>
        {children}
      </div>
    </div>
  );
}

function RowKV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="text-sm" style={{ color: TOKENS.muted }}>{k}</div>
      <div className="text-sm font-medium truncate" style={{ color: TOKENS.text }}>{v}</div>
    </div>
  );
}

/** Project favicon (prefers provided URL, falls back to domain/favicon.ico, then to a branded initial) */
function ProjectFavicon({ data }: { data?: QuickPeekData | null }) {
  const [fail, setFail] = React.useState(false);
  if (!data) return null;

  const host = (() => {
    const d = data.domain || "";
    try {
      const u = new URL(d.startsWith("http") ? d : `https://${d}`);
      return u.hostname;
    } catch {
      return d.replace(/^https?:\/\//, "").split("/")[0];
    }
  })();

  const src = !fail
    ? (data.projectFaviconUrl || (host ? `https://${host}/favicon.ico` : ""))
    : "";

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={`${data.projectName} favicon`}
        className="h-7 w-7 rounded-md"
        onError={() => setFail(true)}
      />
    );
  }

  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold"
      style={{ background: TOKENS.pastelBlue, color: TOKENS.brand }}
      aria-label={`${data.projectName} icon fallback`}
    >
      {data.projectName?.[0]?.toUpperCase() ?? "•"}
    </div>
  );
}

/** Minimal, accessible info tooltip */
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="cursor-pointer rounded p-1 hover:bg-gray-50"
        aria-label="More info"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info className="h-4 w-4 text-[#6B7280]" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 z-20 mt-1 w-64 rounded-md border bg-white p-2 text-xs shadow"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- MAIN ---------------------------------- */
export function QuickPeekDrawer({
  open,
  data,
  onClose,
  onOpenProject,
  onOpenSiteAudit,
  onOpenBacklinks,
  onOpenKeywordGap,
  onOpenKeyword,
  onOpenPage,

  onCreateTask,
  onAddToReport,
}) {
  // useCloseOnEsc(open, onClose);
  useLockBodyScroll(open);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  const qLabel = useMemo(
    () => (data ? quadrantLabel(data.xHealth, data.yOpportunity) : ""),
    [data]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        // onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Project quick peek"
        className="absolute right-0 top-0 h-full w-full max-w-[720px] shadow-xl"
        style={{ background: "#FFF", borderLeft: `1px solid ${TOKENS.border}` }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 border-b p-4"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ProjectFavicon data={data} />
              <div className="truncate text-base font-semibold" style={{ color: TOKENS.text }}>
                {data?.projectName ?? "—"}
              </div>
              {data?.stale && (
                <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700">
                  Stale
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="truncate text-sm" style={{ color: TOKENS.muted }}>
                {data?.domain}
              </span>
              <span className="text-[#9CA3AF]">•</span>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]"
                style={{ borderColor: TOKENS.border }}
              >
                Quadrant: <b className="ml-1">{qLabel}</b>
              </span>
              {/* KPI pills */}
              {!!data && (
                <>
                  <ScorePill label="Health" value={data.xHealth} />
                  <ScorePill label="Opportunity" value={data.yOpportunity} />
                  <ScorePill label="WR" value={data.wrScore} />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Add to Report */}
            <Chip
              title="Add to Report"
              onClick={() =>
                data && onAddToReport?.({ id: data.id, title: `${data.projectName} • Quick Peek` })
              }
            >
              <Plus className="h-3.5 w-3.5 text-[#6B7280]" />
              Add to Report
            </Chip>
            {/* Close */}
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="cursor-pointer rounded p-1 hover:bg-gray-50"
              aria-label="Close drawer"
              title="Close"
            >
              <X className="h-5 w-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[calc(100%-64px)] flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            {/* Owner / Tags / Last updated */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <SectionTitle>Ownership & Meta</SectionTitle>
                <div className="mt-2 space-y-2">
                  <RowKV
                    k="Owner"
                    v={
                      data?.owner ? (
                        <span className="inline-flex items-center gap-2">
                          {data.owner.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={data.owner.avatarUrl}
                              alt={data.owner.name}
                              className="h-5 w-5 rounded-full"
                            />
                          ) : (
                            <Users className="h-4 w-4 text-[#9CA3AF]" />
                          )}
                          {data.owner.name}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <RowKV
                    k="Tags"
                    v={
                      <div className="flex flex-wrap gap-1.5">
                        {data?.tags?.length ? (
                          data.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border px-2 text-[12px] leading-6"
                              style={{
                                borderColor: TOKENS.border,
                                background: TOKENS.chipBg,
                                color: TOKENS.text,
                              }}
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm" style={{ color: TOKENS.muted }}>
                            —
                          </span>
                        )}
                      </div>
                    }
                  />
                  <RowKV
                    k="Last updated"
                    v={
                      data?.lastUpdatedISO ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5 text-[#9CA3AF]" />
                          {new Date(data.lastUpdatedISO).toLocaleString()}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
              </div>

              {/* KPI mini-grid */}
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <SectionTitle>KPIs (current period)</SectionTitle>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[12px]" style={{ color: TOKENS.muted }}>
                      Organic Sessions
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="text-xl font-bold" style={{ color: TOKENS.valueBlue }}>
                        {fmtInt(data?.sessions)}
                      </div>
                      {caretChip(data?.deltas?.sessionsPct, false)}
                    </div>
                    {/* Note: No mini trend chart per requirements */}
                  </div>
                  <div>
                    <div className="text-[12px]" style={{ color: TOKENS.muted }}>
                      WR • Health • Opp (Δ)
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-1.5">
                      <div className="flex items-center justify-between">
                        <span>WR</span>
                        <div className="flex items-center gap-2">
                          <b style={{ color: TOKENS.valueBlue }}>{data?.wrScore ?? "—"}</b>
                          {caretChip(data?.deltas?.wrPP, false)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Health</span>
                        <div className="flex items-center gap-2">
                          <b style={{ color: TOKENS.valueBlue }}>{data?.xHealth ?? "—"}</b>
                          {caretChip(data?.deltas?.healthPP, false)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Opportunity</span>
                        <div className="flex items-center gap-2">
                          <b style={{ color: TOKENS.valueBlue }}>{data?.yOpportunity ?? "—"}</b>
                          {/* Positive delta is good for Opportunity */}
                          {caretChip(data?.deltas?.opportunityPP, false)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What drives Opportunity */}
                {!!data?.opportunityBreakdown && (
                  <div className="mt-3 rounded-md border p-2" style={{ borderColor: TOKENS.border }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-[12px] font-semibold" style={{ color: TOKENS.text }}>
                          What drives Opportunity
                        </div>
                        <InfoTooltip
                          text={
                            "Opportunity Index blends three signals: Keyword Gap (how much you could rank for), Traffic Upside (volume potential), and Intent Weighting (likelihood to convert). Higher values indicate stronger upside when combined with solid Health & WR."
                          }
                        />
                      </div>
                      {data.opportunityBreakdown.dampened && (
                        <span
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                          title="Capped by low Health or WR"
                        >
                          Dampened
                        </span>
                      )}
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                          Keyword Gap
                        </div>
                        <div className="text-sm font-semibold" style={{ color: TOKENS.valueBlue }}>
                          {fmtPct(data.opportunityBreakdown.keywordGapPct)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                          Traffic Upside
                        </div>
                        <div className="text-sm font-semibold" style={{ color: TOKENS.valueBlue }}>
                          {fmtPct(data.opportunityBreakdown.trafficUpsidePct)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                          Intent Weighting
                        </div>
                        <div className="text-sm font-semibold" style={{ color: TOKENS.valueBlue }}>
                          {fmtPct(data.opportunityBreakdown.intentWeightingPct)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Keywords / Pages */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="flex items-center justify-between">
                  <SectionTitle>Top Keywords</SectionTitle>
                  <Chip title="Open Keyword Gap" onClick={() => onOpenKeywordGap?.(data?.projectId)}>
                    <Search className="h-3.5 w-3.5 text-[#6B7280]" /> Gap
                  </Chip>
                </div>
                <div className="mt-2 divide-y" style={{ borderColor: TOKENS.border }}>
                  {(data?.topKeywords ?? []).slice(0, 6).map((k) => (
                    <button
                      key={k.keyword}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left hover:bg-gray-50"
                      onClick={() => onOpenKeyword?.({ keyword: k.keyword })}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{k.keyword}</div>
                        <div className="flex items-center gap-2 text-[12px]" style={{ color: TOKENS.muted }}>
                          <span>Pos {k.pos}</span>
                          {typeof k.delta === "number" && caretChip(k.delta * -1 /* lower is better */, true)}
                          {typeof k.clicks === "number" && <span>• Clicks {fmtInt(k.clicks)}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  ))}
                  {!(data?.topKeywords?.length) && (
                    <div className="py-2 text-sm" style={{ color: TOKENS.muted }}>
                      No keywords yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <SectionTitle>Top Organic Pages</SectionTitle>
                <div className="mt-2 divide-y" style={{ borderColor: TOKENS.border }}>
                  {(data?.topPages ?? []).slice(0, 6).map((p) => (
                    <button
                      key={p.url}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left hover:bg-gray-50"
                      onClick={() => onOpenPage?.({ url: p.url })}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.url}</div>
                        <div className="flex items-center gap-2 text-[12px]" style={{ color: TOKENS.muted }}>
                          {typeof p.estTraffic === "number" && <span>Est. Traffic {fmtInt(p.estTraffic)}</span>}
                          {typeof p.pageHealth === "number" && <span>• Health {p.pageHealth}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  ))}
                  {!(data?.topPages?.length) && (
                    <div className="py-2 text-sm" style={{ color: TOKENS.muted }}>
                      No pages yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Diagnosis */}
            {!!data?.quickDiagnosis?.length && (
              <div className="mt-4 rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <SectionTitle>Quick Diagnosis</SectionTitle>
                <ul className="mt-2 space-y-2">
                  {data.quickDiagnosis!.slice(0, 4).map((q, idx) => {
                    const color =
                      q.severity === "critical"
                        ? TOKENS.danger
                        : q.severity === "warning"
                        ? TOKENS.warning
                        : TOKENS.valueBlue;
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <Activity className="mt-0.5 h-4 w-4" style={{ color }} />
                        <span className="text-sm" style={{ color: TOKENS.text }}>
                          {q.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Notes */}
            {data?.notes && (
              <div className="mt-4 rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <SectionTitle>Notes</SectionTitle>
                <p className="mt-2 text-sm" style={{ color: TOKENS.text }}>
                  {data.notes}
                </p>
              </div>
            )}
          </div>

          {/* Sticky footer CTAs */}
          <div className="border-t p-3 mb-6" style={{ borderColor: TOKENS.border }}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-white"
                style={{ background: TOKENS.brand }}
                onClick={() => {
                  if (!data) return;
                  onCreateTask?.({
                    title: `[${qLabel}] ${data.projectName} — prioritize bubble`,
                    description: `Context:\n- Domain: ${data.domain}\n- Quadrant: ${qLabel}\n- Health: ${data.xHealth}\n- Opportunity: ${data.yOpportunity}\n- WR: ${data.wrScore}\n- Sessions: ${fmtInt(
                      data.sessions
                    )}\n\nSuggested next steps based on quadrant:\n• ${
                      qLabel === "Fix First"
                        ? "Resolve technical blockers (Site Audit) then re-evaluate."
                        : qLabel === "Build Authority"
                        ? "Pursue backlinks & topical depth."
                        : qLabel === "Re‑think Strategy"
                        ? "Reassess targeting & fix technical debt."
                        : "Ship content/interlinking for near-term lift."
                    }`,
                    tags: ["home:matrix", "quick-peek", ...(data?.tags ?? [])],
                    context: {
                      bubbleId: data.id,
                      projectId: data.projectId,
                      domain: data.domain,
                      quadrant: qLabel,
                    },
                    assigneeHint: qLabel === "Fix First" ? "dev" : "seo",
                  });
                }}
                title="Create Task"
              >
                <FilePlus2 className="h-4 w-4" />
                Create Task
              </button>

              <Chip title="Open Project" onClick={() => onOpenProject?.(data?.projectId)}>
                <ExternalLink className="h-3.5 w-3.5 text-[#6B7280]" />
                Open Project
              </Chip>

              <Chip title="Open Site Audit" onClick={() => onOpenSiteAudit?.(data?.projectId)}>
                <Wrench className="h-3.5 w-3.5 text-[#6B7280]" />
                Site Audit
              </Chip>

              <Chip title="Open Backlinks" onClick={() => onOpenBacklinks?.(data?.projectId)}>
                <Link2 className="h-3.5 w-3.5 text-[#6B7280]" />
                Backlinks
              </Chip>

              <Chip title="Open Keyword Gap" onClick={() => onOpenKeywordGap?.(data?.projectId)}>
                <Search className="h-3.5 w-3.5 text-[#6B7280]" />
                Keyword Gap
              </Chip>

              {/* <div className="ml-auto flex items-center gap-2">
                <span className="text-xs" style={{ color: TOKENS.muted }}>
                  Deeplinks map to your drawers & panels (KPI, Site Audit, Backlinks, Keyword tools).
                </span>
                <Shield className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ OPTIONAL DEMO ------------------------------ */
/** Remove this block in production. It helps you test the drawer quickly. */
export default function Demo_QuickPeekDrawer() {
  const [open, setOpen] = React.useState(true);
  const sample: QuickPeekData = {
    id: "bubble-1",
    projectId: "p1",
    projectName: "Wranker",
    domain: "wranker.com",
    projectFaviconUrl: "https://wranker.com/favicon.ico",
    xHealth: 62,
    yOpportunity: 78,
    wrScore: 64,
    sessions: 148000,
    deltas: { sessionsPct: 6.8, wrPP: 1.8, healthPP: 5.2, opportunityPP: 3.1 },
    opportunityBreakdown: {
      keywordGapPct: 64,
      trafficUpsidePct: 58,
      intentWeightingPct: 42,
      dampened: false,
    },
    owner: { id: "u1", name: "Priya S." },
    tags: ["US", "Mobile", "B2B"],
    stale: false,
    lastUpdatedISO: new Date().toISOString(),
    topKeywords: [
      { keyword: "technical seo audit", pos: 7.2, delta: -0.4, clicks: 920 },
      { keyword: "site health score", pos: 9.8, delta: -1.1, clicks: 540 },
      { keyword: "backlink analyzer", pos: 12.1, delta: 0.6, clicks: 310 },
    ],
    topPages: [
      { url: "/blog/technical-seo-audit-checklist", estTraffic: 5200, pageHealth: 74 },
      { url: "/features/link-analyzer", estTraffic: 3100, pageHealth: 83 },
      { url: "/guide/site-health-score", estTraffic: 1900, pageHealth: 79 },
    ],
    quickDiagnosis: [
      {
        text: "Near‑wins: 23 KW in positions 4–10; add internal links and snippet upgrades.",
        severity: "info",
      },
      { text: "Orphan pages at 6.2% exceed threshold.", severity: "warning" },
      { text: "Lost RD spike vs prev period (−41).", severity: "warning" },
    ],
    notes: "Prioritize internal links to the /guide cluster, then revisit CWV for the home page.",
  };

  return (
    <div className="p-4">
      <button
        className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TOKENS.border }}
        onClick={() => setOpen(true)}
      >
        Open Quick Peek
      </button>
      <QuickPeekDrawer
        open={open}
        data={sample}
        onClose={() => setOpen(false)}
        onOpenProject={(id) => alert(`Open project ${id}`)}
        onOpenSiteAudit={(id) => alert(`Open Site Audit for ${id}`)}
        onOpenBacklinks={(id) => alert(`Open Backlinks for ${id}`)}
        onOpenKeywordGap={(id) => alert(`Open Keyword Gap for ${id}`)}
        onOpenKeyword={(kw) => alert(`Open Keyword: ${kw.keyword}`)}
        onOpenPage={(p) => alert(`Open Page drawer for: ${p.url}`)}
        onCreateTask={(t) => alert(`Task created: ${t.title}`)}
        onAddToReport={(r) => alert(`Added to report: ${r.title}`)}
      />
    </div>
  );
}
