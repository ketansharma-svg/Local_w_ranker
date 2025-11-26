"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  X, ExternalLink, Wrench, Link2, Search, FilePlus2, Plus, Shield,
  Users, Clock3, TrendingUp, TrendingDown, Info, ChevronRight, Tag,
} from "lucide-react";

/* ───────────────────────── Tokens — aligned to existing sections ───────────────────────── */
const TK = {
  brand: "#008CCD",          // section brand
  valueBlue: "#0077FF",      // primary “info” value color
  pastelBlue: "#D9EEF8",
  border: "#EFF0F6",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};

/* ───────────────────────── Types ───────────────────────── */
export type DirectoryPeekData = {
  id: string;
  projectId?: string;
  name: string;
  domain: string;
  favicon?: string;

  owner?: { id: string; name: string; avatarUrl?: string; role?: "Owner" | "Editor" | "Viewer" };
  watchers?: { id: string; name: string; avatarUrl?: string }[];
  tags?: string[];
  lastUpdatedISO?: string;
  stale?: boolean;

  // Additional (not present in Directory KPIs)
  opportunityIndex: number;         // 0-100
  oppDeltaPP?: number;              // +/- pts vs prev period
  dilsScore: number;                // 0-100 (internal linking health)
  dilsDeltaPP?: number;
  indexablePct: number;             // 0-100
  indexableDeltaPP?: number;
  cwvPassPct: number;               // 0-100
  cwvDeltaPP?: number;

  // Backlinks & risks
  newRD?: number;
  lostRD?: number;
  cannibalCases?: number;
  orphanPct?: number;
  brokenPct?: number;
  redirectedPct?: number;

  // Opportunity drivers (for info popover)
  opportunityDrivers?: {
    keywordGapPct?: number;
    trafficUpsidePct?: number;
    intentWeightingPct?: number;
    note?: string;
  };

  // Top opportunities (keywords or clusters) for quick action
  topOpportunities?: { label: string; type: "keyword" | "cluster"; hint?: string }[];

  // Source freshness
  sources?: {
    ga4?: { lastSyncedISO?: string };
    gsc?: { lastSyncedISO?: string };
    crawler?: { lastSyncedISO?: string };
    backlinks?: { lastSyncedISO?: string };
  };

  notes?: string;
};

export type DirectoryQuickPeekProps = {
  open: boolean;
  data?: DirectoryPeekData | null;
  onClose: () => void;

  // Deeplinks
  onOpenProject?: (projectId?: string) => void;
  onOpenSiteAudit?: (projectId?: string) => void;
  onOpenBacklinks?: (projectId?: string) => void;
  onOpenKeywordGap?: (projectId?: string) => void;
  onOpenKeyword?: (kw: { keyword: string }) => void;

  // Actions
  onCreateTask?: (payload: {
    title: string; description?: string; tags?: string[]; context?: Record<string, unknown>;
    assigneeHint?: "seo" | "dev" | "content";
  }) => void;
  onAddToReport?: (payload: { id: string; title: string }) => void;
};

/* ───────────────────────── Helpers ───────────────────────── */
const intFmt = new Intl.NumberFormat();
const fmt = (n?: number | null) => (n == null || Number.isNaN(n) ? "—" : intFmt.format(Math.round(n)));
const fmtPct = (p?: number | null, digits = 1) => (p == null || Number.isNaN(p) ? "—" : `${p.toFixed(digits)}%`);
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
}

function DeltaPill({ v, invert = false }: { v?: number; invert?: boolean }) {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  const up = v >= 0;
  // good if up unless invert (e.g., lower better)
  const isGood = invert ? !up : up;
  const tone = isGood ? TK.success : TK.danger;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[11px]"
          style={{ color: tone, background: `${tone}1A` }}>
      <Icon className="h-3.5 w-3.5" />
      {up ? "+" : "−"}{Math.abs(v).toFixed(Math.abs(v) < 1 ? 1 : 0)}
    </span>
  );
}

function TitleBar({ icon, title, tooltip }: { icon: React.ReactNode; title: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded"
            style={{ color: TK.brand, background: "#F0F9FF", border: `1px solid ${TK.border}` }}>
        {icon}
      </span>
      <div className="text-[13px] font-semibold" title={tooltip} style={{ color: TK.text }}>
        {title}
      </div>
      {tooltip ? <Info className="h-3.5 w-3.5 text-[#9CA3AF]" /> : null}
    </div>  
  );
}

/* Small circular gauge (brand) */
function TinyDonut({ value, size = 28, stroke = 4, color = TK.valueBlue, title }: { value: number; size?: number; stroke?: number; color?: string; title?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title ?? `Gauge ${value}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={TK.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

/* Avatar (initials fallback) */
function Avatar({ name, src, size = 20, title }: { name: string; src?: string; size?: number; title?: string }) {
  const initials = name.split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
  return (
    <div title={title ?? name}
         className="inline-flex items-center justify-center overflow-hidden rounded-full border"
         style={{ width: size, height: size, color: TK.brand, background: "#E3F2FD", borderColor: TK.border }}>
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%" }} /> : <span className="text-[11px] font-semibold">{initials}</span>}
    </div>
  );
}

/* Source badge */
function SourceBadge({ label, ts }: { label: string; ts?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
          title={ts ? new Date(ts).toLocaleString() : "Not synced"}
          style={{ borderColor: TK.border, color: TK.muted, background: "#FFF" }}>
      <Clock3 className="h-3.5 w-3.5 text-[#9CA3AF]" />
      {label}: {ts ? new Date(ts).toLocaleDateString() : "—"}
    </span>
  );
}

/* Clickable chip */
function Chip({ children, onClick, title }: React.PropsWithChildren<{ onClick?: () => void; title?: string }>) {
  return (
    <button type="button" title={title}
            onClick={onClick}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-[#F5F7FA]"
            style={{ borderColor: TK.border, background: TK.surface, color: TK.text }}>
      {children}
    </button>
  );
}

/* ───────────────────────── Drawer ───────────────────────── */
export function DirectoryQuickPeekDrawer({
  open, data, onClose,
  onOpenProject, onOpenSiteAudit, onOpenBacklinks, onOpenKeywordGap, onOpenKeyword,
  onCreateTask, onAddToReport,
}: DirectoryQuickPeekProps) {
  useLockBody(open);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (open) closeBtnRef.current?.focus(); }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      {/* <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden /> */}

      {/* Panel (wider for comfortable layout) */}
      <div role="dialog" aria-modal="true" className="absolute right-0 top-0 h-full bg-white shadow-xl"
           style={{ borderLeft: `1px solid ${TK.border}` }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b p-4" style={{ borderColor: TK.border }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {/* favicon → initials fallback */}
              <div className="inline-flex items-center justify-center rounded-md border"
                   style={{ width: 28, height: 28, borderColor: TK.border }}>
                {data?.favicon
                  ? <img src={data.favicon} alt="" className="h-5 w-5" />
                  : <span className="text-[12px] font-semibold" style={{ color: TK.brand }}>
                      {(data?.name || "?").slice(0,2).toUpperCase()}
                    </span>}
              </div>
              <div className="truncate text-base font-semibold" style={{ color: TK.text }}>
                {data?.name ?? "—"}
              </div>
              {data?.stale && (
                <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700">Stale</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="truncate text-sm" style={{ color: TK.muted }}>{data?.domain}</span>
              <span className="text-[#9CA3AF]">•</span>
              {data?.owner && (
                <span className="inline-flex items-center gap-2 text-sm" title={`Owner: ${data.owner.name}`}>
                  <Avatar name={data.owner.name} src={data.owner.avatarUrl} />
                  <span className="truncate">{data.owner.name}</span>
                </span>
              )}
              {Array.isArray(data?.tags) && data!.tags!.length > 0 && (
                <>
                  <span className="text-[#9CA3AF]">•</span>
                  <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: TK.muted }}>
                    <Tag className="h-3.5 w-3.5" /> {data!.tags!.slice(0,3).join(" · ")}{data!.tags!.length > 3 ? "…" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Chip title="Add to Report" onClick={() => data && onAddToReport?.({ id: data.id, title: `${data.name} • Quick Peek` })}>
              <Plus className="h-3.5 w-3.5 text-[#6B7280]" />
              Add to Report
            </Chip>
            <button ref={closeBtnRef} onClick={onClose} className="cursor-pointer rounded p-1 hover:bg-gray-50" aria-label="Close">
              <X className="h-5 w-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[calc(100%-64px)] flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            {/* Row A — Gauges (non-duplicative) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Opportunity Index */}
              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Search className="h-3.5 w-3.5" />} title="Opportunity Index"
                          tooltip="Composite of Keyword Gap, Traffic Upside, and Intent weighting; capped by very low health/authority." />
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <TinyDonut value={data?.opportunityIndex ?? 0} title="Opportunity Index" />
                    <div className="text-xl font-bold" style={{ color: TK.valueBlue }}>
                      {fmt(data?.opportunityIndex)}
                    </div>
                    <DeltaPill v={data?.oppDeltaPP} />
                  </div>
                </div>
                {data?.opportunityDrivers && (
                  <div className="mt-3 rounded border p-2" style={{ borderColor: TK.border }}>
                    <div className="mb-1 text-[12px] font-semibold" style={{ color: TK.text }}>
                      What drives Opportunity <Info className="ml-1 inline h-3.5 w-3.5 text-[#9CA3AF]"
                         />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><div className="text-[11px]" style={{ color: TK.muted }}>Gap</div>
                        <div className="text-sm font-semibold">{fmtPct(data.opportunityDrivers.keywordGapPct)}</div></div>
                      <div><div className="text-[11px]" style={{ color: TK.muted }}>Upside</div>
                        <div className="text-sm font-semibold">{fmtPct(data.opportunityDrivers.trafficUpsidePct)}</div></div>
                      <div><div className="text-[11px]" style={{ color: TK.muted }}>Intent</div>
                        <div className="text-sm font-semibold">{fmtPct(data.opportunityDrivers.intentWeightingPct)}</div></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Linking Health (DILS) */}
              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Shield className="h-3.5 w-3.5" />} title="Internal Linking Health (DILS)"
                          tooltip="Domain Internal Link Strength. Higher is better; affected by orphans, dangling, link depth." />
                <div className="mt-2 flex items-center gap-2">
                  <TinyDonut value={data?.dilsScore ?? 0} title="DILS" />
                  <div className="text-xl font-bold" style={{ color: TK.valueBlue }}>{fmt(data?.dilsScore)}</div>
                  <DeltaPill v={data?.dilsDeltaPP} />
                </div>
                <div className="mt-2 text-[12px]" style={{ color: TK.muted }}>
                  Tip: tackle orphans/dangling, add cross‑links from hubs & top pages.
                </div>
              </div>

              {/* Indexability Coverage */}
              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<ExternalLink className="h-3.5 w-3.5" />} title="Indexability Coverage"
                          tooltip="Share of pages that are indexable (noindex, canonicals, and robots rules considered)." />
                <div className="mt-2 flex items-center gap-2">
                  <TinyDonut value={data?.indexablePct ?? 0} title="Indexable %" />
                  <div className="text-xl font-bold" style={{ color: TK.valueBlue }}>{fmtPct(data?.indexablePct)}</div>
                  <DeltaPill v={data?.indexableDeltaPP} />
                </div>
              </div>

              {/* CWV Pass Rate */}
              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Wrench className="h-3.5 w-3.5" />} title="CWV Pass Rate"
                          tooltip="% of pages passing Core Web Vitals (field data preferred)." />
                <div className="mt-2 flex items-center gap-2">
                  <TinyDonut value={data?.cwvPassPct ?? 0} title="CWV Pass %" />
                  <div className="text-xl font-bold" style={{ color: TK.valueBlue }}>{fmtPct(data?.cwvPassPct)}</div>
                  <DeltaPill v={data?.cwvDeltaPP} />
                </div>
              </div>
            </div>

            {/* Row B — Backlinks & Risks */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Link2 className="h-3.5 w-3.5" />} title="Backlinks & Authority" />
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[11px]" style={{ color: TK.muted }}>New RD</div>
                    <div className="text-sm font-semibold">{fmt(data?.newRD)}</div>
                  </div>
                  <div>
                    <div className="text-[11px]" style={{ color: TK.muted }}>Lost RD</div>
                    <div className="text-sm font-semibold">{fmt(data?.lostRD)}</div>
                  </div>
                  <div>
                    <div className="text-[11px]" style={{ color: TK.muted }}>Net</div>
                    <div className="text-sm font-semibold">{typeof data?.newRD === "number" && typeof data?.lostRD === "number" ? fmt((data!.newRD!) - (data!.lostRD!)) : "—"}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip title="Open Backlinks" onClick={() => onOpenBacklinks?.(data?.projectId)}>
                    <Link2 className="h-3.5 w-3.5 text-[#6B7280]" /> Open Backlinks
                  </Chip>
                </div>
              </div>

              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Shield className="h-3.5 w-3.5" />} title="Risk & Anomalies" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded border p-2 text-sm" style={{ borderColor: TK.border }}>
                    <div className="text-[11px]" style={{ color: TK.muted }}>Orphan pages</div>
                    <div className="mt-0.5 font-semibold">{fmtPct(data?.orphanPct)}</div>
                  </div>
                  <div className="rounded border p-2 text-sm" style={{ borderColor: TK.border }}>
                    <div className="text-[11px]" style={{ color: TK.muted }}>Broken links</div>
                    <div className="mt-0.5 font-semibold">{fmtPct(data?.brokenPct)}</div>
                  </div>
                  <div className="rounded border p-2 text-sm" style={{ borderColor: TK.border }}>
                    <div className="text-[11px]" style={{ color: TK.muted }}>Redirected links</div>
                    <div className="mt-0.5 font-semibold">{fmtPct(data?.redirectedPct)}</div>
                  </div>
                  <div className="rounded border p-2 text-sm" style={{ borderColor: TK.border }}>
                    <div className="text-[11px]" style={{ color: TK.muted }}>Cannibalization cases</div>
                    <div className="mt-0.5 font-semibold">{fmt(data?.cannibalCases)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row C — Top Opportunities & Source Freshness */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Search className="h-3.5 w-3.5" />} title="Top Opportunities" />
                <div className="mt-2 divide-y" style={{ borderColor: TK.border }}>
                  {(data?.topOpportunities ?? []).slice(0, 6).map((o, i) => (
                    <button key={i}
                            className="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left hover:bg-gray-50"
                            onClick={() => o.type === "keyword" ? onOpenKeyword?.({ keyword: o.label }) : onOpenKeywordGap?.(data?.projectId)}>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{o.label}</div>
                        {o.hint && <div className="text-[12px]" style={{ color: TK.muted }}>{o.hint}</div>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  ))}
                  {!(data?.topOpportunities?.length) && (
                    <div className="py-2 text-sm" style={{ color: TK.muted }}>No suggestions yet.</div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip title="Keyword Gap" onClick={() => onOpenKeywordGap?.(data?.projectId)}>
                    <Search className="h-3.5 w-3.5 text-[#6B7280]" /> Keyword Gap
                  </Chip>
                </div>
              </div>

              <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Clock3 className="h-3.5 w-3.5" />} title="Sources & Freshness" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SourceBadge label="GA4" ts={data?.sources?.ga4?.lastSyncedISO} />
                  <SourceBadge label="GSC" ts={data?.sources?.gsc?.lastSyncedISO} />
                  <SourceBadge label="Crawler" ts={data?.sources?.crawler?.lastSyncedISO} />
                  <SourceBadge label="Backlinks" ts={data?.sources?.backlinks?.lastSyncedISO} />
                </div>
                <div className="mt-2 text-[12px]" style={{ color: TK.muted }}>
                  Last updated: {data?.lastUpdatedISO ? new Date(data.lastUpdatedISO).toLocaleString() : "—"}
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            {data?.notes && (
              <div className="mt-4 rounded-md border p-3" style={{ borderColor: TK.border }}>
                <TitleBar icon={<Shield className="h-3.5 w-3.5" />} title="Notes" />
                <p className="mt-2 text-sm" style={{ color: TK.text }}>{data.notes}</p>
              </div>
            )}
          </div>

          {/* Footer CTAs (sticky) */}
          <div className="border-t p-3 mb-4" style={{ borderColor: TK.border }}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-white"
                style={{ background: TK.brand }}
                title="Create Task"
                onClick={() => data && onCreateTask?.({
                  title: `[Quick Peek] ${data.name} — next actions`,
                  description:
                    `Context:\n` +
                    `• Opportunity ${fmt(data.opportunityIndex)} (Δ ${data?.oppDeltaPP ?? 0}pp)\n` +
                    `• DILS ${fmt(data.dilsScore)} • Indexable ${fmtPct(data.indexablePct)} • CWV ${fmtPct(data.cwvPassPct)}\n` +
                    `• Risks: Orphan ${fmtPct(data.orphanPct)}, Broken ${fmtPct(data.brokenPct)}, Redirected ${fmtPct(data.redirectedPct)}, Cannibal ${fmt(data.cannibalCases)}\n\n` +
                    `Suggested next steps:\n• Fix top risks in Site Audit\n• Close keyword gaps and ship supporting content\n• Strengthen internal links from hubs/top pages\n• Pursue clean RD growth where relevant`,
                  tags: ["directory:quick-peek", ...(data.tags ?? [])],
                  context: { projectId: data.projectId, domain: data.domain },
                  assigneeHint: "seo",
                })}
              >
                <FilePlus2 className="h-4 w-4" />
                Create Task
              </button>

              <Chip title="Open Project" onClick={() => onOpenProject?.(data?.projectId)}>
                <ExternalLink className="h-3.5 w-3.5 text-[#6B7280]" /> Open Project
              </Chip>
              <Chip title="Open Site Audit" onClick={() => onOpenSiteAudit?.(data?.projectId)}>
                <Wrench className="h-3.5 w-3.5 text-[#6B7280]" /> Site Audit
              </Chip>
              <Chip title="Open Backlinks" onClick={() => onOpenBacklinks?.(data?.projectId)}>
                <Link2 className="h-3.5 w-3.5 text-[#6B7280]" /> Backlinks
              </Chip>
              <Chip title="Keyword Gap" onClick={() => onOpenKeywordGap?.(data?.projectId)}>
                <Search className="h-3.5 w-3.5 text-[#6B7280]" /> Keyword Gap
              </Chip>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs" style={{ color: TK.muted }}>Deeplinks map to your existing panels.</span>
                <Shield className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Minimal wiring example (List/Grid/Matrix) ─────────────────────────
   HOW TO WIRE:
   1) Keep a local drawer state {open:boolean, data?:DirectoryPeekData}
   2) In your Directory row/card onClick handler, build DirectoryPeekData and set {open:true, data}
   3) Render <DirectoryQuickPeekDrawer open={open} data={data} onClose={()=>set({open:false})} ...handlers />
*/
export default function Demo_DirectoryQuickPeekDrawer() {
  const [open, setOpen] = React.useState(true);
  const [peek, setPeek] = React.useState<DirectoryPeekData | null>(null);

    const d: DirectoryPeekData = {
      id: "proj-1",
      projectId: "proj-1",
      name: "Wranker HQ",
      domain: "wranker.com",
      favicon: "https://www.google.com/s2/favicons?domain=wranker.com&sz=32",
      owner: { id: "u1", name: "Priya Sharma" },
      tags: ["B2B", "US", "Mobile"],
      lastUpdatedISO: new Date().toISOString(),

      // Additional-only KPIs
      opportunityIndex: 76, oppDeltaPP: 3.2,
      dilsScore: 68, dilsDeltaPP: 2.1,
      indexablePct: 92, indexableDeltaPP: 1.0,
      cwvPassPct: 61, cwvDeltaPP: -2.4,

      // Backlinks & Risks
      newRD: 24, lostRD: 12,
      orphanPct: 4.8, brokenPct: 0.9, redirectedPct: 6.2, cannibalCases: 3,

      opportunityDrivers: { keywordGapPct: 58, trafficUpsidePct: 49, intentWeightingPct: 41,
        note: "Gaps in product terms; strong upside in how‑to clusters." },
      topOpportunities: [
        { label: "technical seo checklist", type: "keyword", hint: "High intent, pos ~11–14" },
        { label: "site health guide", type: "cluster", hint: "Needs 2 support pages + interlinks" },
        { label: "internal link best practices", type: "keyword", hint: "Low comp, high CTR" },
      ],
      sources: {
        ga4: { lastSyncedISO: new Date().toISOString() },
        gsc: { lastSyncedISO: new Date().toISOString() },
        crawler: { lastSyncedISO: new Date().toISOString() },
        backlinks: { lastSyncedISO: new Date().toISOString() },
      },
      notes: "Prioritize internal link fixes and ship 2 supporting articles for the /guide cluster.",
    };

  return (
<>
      <DirectoryQuickPeekDrawer
        open={open}
        data={d}
        onClose={() => setOpen(false)}
        onOpenProject={(id) => alert(`Open project ${id}`)}
        onOpenSiteAudit={(id) => alert(`Open Site Audit for ${id}`)}
        onOpenBacklinks={(id) => alert(`Open Backlinks for ${id}`)}
        onOpenKeywordGap={(id) => alert(`Open Keyword Gap for ${id}`)}
        onOpenKeyword={(kw) => alert(`Open Keyword: ${kw.keyword}`)}
        onCreateTask={(t) => alert(`Task: ${t.title}`)}
        onAddToReport={(r) => alert(`Added to report: ${r.title}`)}
      />
</>
  );
}
