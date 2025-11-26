"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info as InfoIcon,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Plus,
  Sparkles,
  FileSearch,
  Zap,
  Wrench,
  Cpu,
  GitMerge as Merge,
  Link2,
  Layers,
  Archive,
  ExternalLink,
  MoreHorizontal,
  Search as SearchIcon,
} from "lucide-react";
import AIInsightExplainDrawerDemo from "./AIInsightExplain";

/**
 * Wranker • Competitor Profiles — Section 7: AI Opportunities
 * Single-file, drop‑in TSX with mock data and full interactions:
 *  - Header (title, Refresh, Export, View Detailed, Compare indicator)
 *  - Filters toolbar (search, Type/Impact/Source/Status chips, Grid/List toggle, Sort, Clear)
 *  - Results (Grid or List), infinite "Load more"
 *  - Card actions: Add to Task (drawer), Explain (modal), Deep link, Dismiss/Restore, More menu
 *  - Smart popovers on labels and headers
 *
 * Deps: react, tailwind, lucide-react (no charts library required).
 */

/* -------------------------------- TOKENS -------------------------------- */
const TOKENS = {
  brand: "#1090D0", // You
  brandHover: "#0C7FB6",
  valueBlue: "#0077FF", // Competitor / primary action
  pastelBlue: "#D9EEF8",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  success: "#10B981",
  danger: "#F04438",
  warn: "#F59E0B",
} as const;

/* ------------------------------- TYPES ---------------------------------- */
type Impact = "high" | "medium" | "low";
type TypeKey =
  | "content_gap"
  | "quick_win"
  | "onpage_fix"
  | "technical"
  | "internal_link"
  | "backlink_outreach"
  | "serp_feature"
  | "keyword_cluster"
  | "page_consolidation";
type SourceKind = "keyword" | "page" | "serp" | "backlink" | "competitor" | "traffic";
type Status = "new" | "in_review" | "added_to_task" | "dismissed";

type SourceRef = { kind: SourceKind; ref: string; label: string };
type EvidenceRef = { label: string; value: string };

export type AiOpportunity = {
  id: string;
  title: string;
  rationale: string;
  impact: Impact;
  impactScore?: number; // 0..100
  type: TypeKey;
  status: Status;
  sources: SourceRef[];
  evidence?: EvidenceRef[];
  metrics?: {
    oppTraffic?: number;
    oppValueUSD?: number;
    deltaVsYouPct?: number;
    confidence?: number; // 0..1
    effort?: "low" | "medium" | "high";
    timeframeDays?: number;
  };
  deeplink?: { label: "Keyword" | "SERP" | "Page" | "Backlink" | "Cluster"; href: string };
  createdAtISO: string;
  updatedAtISO?: string;
};

type AiFilters = {
  type: TypeKey[];
  impact: Impact[];
  source: SourceKind[];
  status: Status[];
  q?: string;
  sort?: "priority" | "impact_desc" | "recent" | "type";
  view?: "grid" | "list";
};

type ExportFmt = "CSV" | "PNG" | "PDF";

/* ------------------------------- FORMATTERS ----------------------------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const cur0 = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const cur = (n: number) => cur0.format(n);
const pct0 = (p: number, d = 0) => `${(p * 100).toFixed(d)}%`;
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/* ------------------------------- HELPERS -------------------------------- */
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);
  return ref;
}
function cap(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

/* ------------------------------ MAPPINGS -------------------------------- */
const TYPE_META: Record<
  TypeKey,
  { label: string; Icon: React.ComponentType<any>; tone: string; bg: string; def: string }
> = {
  content_gap: { label: "Content Gap", Icon: FileSearch, tone: "#14B8A6", bg: "rgba(20,184,166,.12)", def: "Topics/queries your competitor ranks for but you don't." },
  quick_win: { label: "Quick Win", Icon: Zap, tone: "#F59E0B", bg: "rgba(245,158,11,.12)", def: "Low‑effort, high‑impact actions." },
  onpage_fix: { label: "On‑page Fix", Icon: Wrench, tone: "#7C3AED", bg: "rgba(124,58,237,.14)", def: "Title, headings, markup, or content formatting fixes." },
  technical: { label: "Technical", Icon: Cpu, tone: "#6D28D9", bg: "rgba(109,40,217,.12)", def: "Crawl, index, speed, or canonical issues." },
  internal_link: { label: "Internal Link", Icon: Merge, tone: TOKENS.brand, bg: "rgba(16,144,208,.14)", def: "Suggested internal links to lift target pages." },
  backlink_outreach: { label: "Backlink Outreach", Icon: Link2, tone: "#06B6D4", bg: "rgba(6,182,212,.14)", def: "Prospects based on competitor linking domains or mentions." },
  serp_feature: { label: "SERP Feature", Icon: Sparkles, tone: TOKENS.valueBlue, bg: "rgba(0,119,255,.12)", def: "Opportunities to capture FS, PAA, Video, Image, etc." },
  keyword_cluster: { label: "Keyword Cluster", Icon: Layers, tone: "#22C55E", bg: "rgba(34,197,94,.14)", def: "Semantically related keyword sets to build a hub." },
  page_consolidation: { label: "Page Consolidation", Icon: Archive, tone: "#F43F5E", bg: "rgba(244,63,94,.12)", def: "Combine overlapping/weak pages to strengthen one URL." },
};

const IMPACT_META: Record<Impact, { bg: string; color: string }> = {
  high: { bg: "rgba(244,63,94,.10)", color: "#F43F5E" },
  medium: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
  low: { bg: "rgba(20,184,166,.12)", color: "#14B8A6" },
};

const STATUS_META: Record<
  Status,
  { label: string; style: React.CSSProperties; invert?: boolean }
> = {
  new: { label: "New", style: { background: "#F5F7FA", color: TOKENS.text, border: `1px solid ${TOKENS.border}` } },
  in_review: { label: "In review", style: { background: TOKENS.pastelBlue, color: TOKENS.valueBlue, border: `1px solid ${TOKENS.border}` } },
  added_to_task: { label: "Added to task", style: { background: "rgba(16,185,129,.14)", color: "#10B981" } },
  dismissed: { label: "Dismissed", style: { background: "#E5E7EB", color: TOKENS.muted } },
};

/* ------------------------------ PRIMITIVES ------------------------------- */
function InfoPopover({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={classNames(
          "invisible group-hover:visible absolute z-50 top-full mt-1 w-80 rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow",
          align === "right" ? "right-0" : "left-0"
        )}
        style={{ borderColor: TOKENS.border }}
      >
        {label}
      </span>
    </span>
  );
}

function ChipDropdownMulti<T extends string>({
  label,
  options,
  value,
  onChange,
  info,
  width = 220,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  info?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const selectedCount = value.length;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm"
        style={{ borderColor: TOKENS.border, background: TOKENS.surface, color: TOKENS.text }}
        aria-haspopup="menu"
        title={info || label}
      >
        {label}
        {selectedCount > 0 && (
          <span className="ml-1 rounded-full bg-[#F5F7FA] px-2 py-[2px] text-xs text-[#6B7280]">{selectedCount}</span>
        )}
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 rounded-[6px] border bg-white shadow"
          style={{ borderColor: TOKENS.border, width }}
        >
          <div className="max-h-[280px] overflow-auto p-2">
            {options.map((o) => {
              const active = value.includes(o.key);
              return (
                <label
                  key={o.key}
                  className={classNames(
                    "flex cursor-pointer items-center justify-between rounded px-2 py-2 text-sm hover:bg-gray-50"
                  )}
                >
                  <span>{o.label}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
                    checked={active}
                    onChange={(e) => {
                      const next = e.target.checked ? [...value, o.key] : value.filter((k) => k !== o.key);
                      onChange(next as T[]);
                    }}
                  />
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t p-2" style={{ borderColor: TOKENS.border }}>
            <button
              className="text-xs text-[#6B7280] hover:underline"
              onClick={() => onChange([])}
              title="Clear selection"
            >
              Clear
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#F5F7FA] px-2 py-1 text-xs"
              onClick={() => setOpen(false)}
            >
              <Check size={14} /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportMenu({ onExport, canPdf = false }: { onExport: (fmt: ExportFmt) => void; canPdf?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => setOpen((s) => !s)}
      >
        Export
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-[6px] border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {(["CSV", "PNG", "PDF"] as ExportFmt[]).map((fmt) => {
            const disabled = fmt === "PDF" && !canPdf;
            return (
              <button
                key={fmt}
                className={classNames(
                  "block w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                  disabled && "cursor-not-allowed text-gray-400 hover:bg-white"
                )}
                onClick={() => {
                  if (disabled) return;
                  onExport(fmt);
                  setOpen(false);
                }}
              >
                Export {fmt}
                {disabled && <span className="ml-2 text-xs">(Pro)</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- EXPLAIN MODAL ---------------------------- */
function Modal({
  open,
  onClose,
  title,
  children,
  width = 720,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; width?: number }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-1/2 top-[8%] translate-x-1/2 rounded-[6px] border bg-white shadow-xl" style={{ width, borderColor: TOKENS.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <h4 className="text-[16px] font-semibold">{title}</h4>
          <button className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- TASK DRAWER ------------------------------ */
function Drawer({
  open,
  onClose,
  title,
  width = 560,
  children,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; width?: number }>) {
  if (!open) return null;  // This ensures the Drawer is removed from DOM when closed
  
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col" style={{ width }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <h4 className="text-[16px] font-semibold">{title}</h4>
          <button className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}


/* ----------------------------- CARD ELEMENTS ---------------------------- */
function ImpactChip({ impact, score }: { impact: Impact; score?: number }) {
  const meta = IMPACT_META[impact];
  return (
    <div className="min-w-[88px]">
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: meta.bg, color: meta.color }}
        title={`Impact: ${cap(impact)}`}
      >
        {cap(impact)}
      </span>
      {typeof score === "number" && (
        <div className="mt-1 h-[2px] w-full overflow-hidden rounded" style={{ background: "#E5E7EB" }}>
          <div className="h-[2px]" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: meta.color }} />
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={m.style}
      title={`Status: ${m.label}`}
    >
      {m.label}
    </span>
  );
}

function TypeChip({ type }: { type: TypeKey }) {
  const m = TYPE_META[type];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs"
      style={{ background: m.bg, color: m.tone }}
      title={m.def}
    >
      <m.Icon size={14} color={m.tone} /> {m.label}
    </span>
  );
}

function MiniOppBar({
  value, // normalized 0..1
  showDelta,
  deltaPct,
}: {
  value: number;
  showDelta?: boolean;
  deltaPct?: number;
}) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-[6px] w-full overflow-hidden rounded-[6px] bg-[#E5E7EB]" title="Opportunity size (relative)">
        <div className="h-[6px]" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${TOKENS.valueBlue}, ${TOKENS.brand})` }} />
      </div>
      {showDelta && typeof deltaPct === "number" && (
        <span
          className={classNames(
            "inline-flex items-center rounded-full px-2 py-[2px] text-xs font-semibold",
            deltaPct >= 0 ? "text-[#1090D0]" : "text-[#F04438]"
          )}
          style={{ background: "#F5F7FA" }}
          title="Estimated uplift vs your current baseline"
        >
          {deltaPct > 0 ? "▲" : deltaPct < 0 ? "▼" : "—"} {Math.abs(deltaPct).toFixed(0)}% vs you
        </span>
      )}
    </div>
  );
}

/* --------------------------- MAIN CARD COMPONENT ------------------------ */
function AiCard({
  item,
  compareOn,
  maxOppValue,
  onAddTask,
  onExplain,
  onToggleStatus,
}: {
  item: AiOpportunity;
  compareOn: boolean;
  maxOppValue: number; // for bar normalization
  onAddTask: (it: AiOpportunity) => void;
  onExplain: (it: AiOpportunity) => void;
  onToggleStatus: (id: string) => void; // dismiss/restore
}) {
  const typeMeta = TYPE_META[item.type];
  const sourcesHint = (item.sources || []).slice(0, 3).map((s) => s.label).join(", ");
  const opp = item.metrics?.oppTraffic ?? 0;
  const norm = maxOppValue > 0 ? opp / maxOppValue : 0;

  const dismissed = item.status === "dismissed";
  return (
    <article
      aria-labelledby={`ai-${item.id}`}
      className={classNames(
        "flex h-full flex-col rounded-[6px] border p-3 shadow-sm transition-transform",
        "hover:-translate-y-[2px]",
        dismissed ? "opacity-60" : ""
      )}
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[6px]" style={{ background: typeMeta.bg }}>
            <typeMeta.Icon size={16} color={typeMeta.tone} />
          </span>
          <TypeChip type={item.type} />
        </div>
        <div className="flex items-center gap-2">
          <ImpactChip impact={item.impact} score={item.impactScore} />
          <StatusPill status={item.status} />
          <div className="relative">
            <button
              title="More"
              className="grid h-8 w-8 place-items-center rounded-[6px] border hover:bg-gray-50"
              style={{ borderColor: TOKENS.border }}
              onClick={() => alert("More actions coming soon")}
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <h5 id={`ai-${item.id}`} className="mt-2 text-[15px] font-semibold" style={{ color: TOKENS.text }}>
        {item.title}
      </h5>

      {/* Meta / Source */}
      <div className="mt-1 text-xs text-[#6B7280]">
        Source:&nbsp;
        <span className="inline-flex items-center gap-1">
          {(item.sources || []).slice(0, 1).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: TOKENS.valueBlue }} />
              {cap(s.kind)}
            </span>
          ))}
        </span>
        <span className="relative ml-1 inline-flex items-center group cursor-help">
          · {item.sources.length} signals
          <span
            role="tooltip"
            className="invisible group-hover:visible absolute left-0 top-full mt-1 w-[280px] rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow"
            style={{ borderColor: TOKENS.border }}
          >
            {sourcesHint || "No sources"}
          </span>
        </span>
      </div>

      {/* Rationale + Evidence */}
      <p className="mt-2 line-clamp-3 text-sm" style={{ color: TOKENS.text }}>
        {item.rationale}
      </p>
      {!!item.evidence?.length && (
        <ul className="mt-2 space-y-1">
          {item.evidence.slice(0, 3).map((e, idx) => (
            <li key={idx} className="text-xs text-[#374151]">
              • <span className="font-medium">{e.label}</span> — {e.value}
            </li>
          ))}
        </ul>
      )}

      {/* Opportunity bar + meta */}
      <div className="mt-3">
        <MiniOppBar
          value={norm}
          showDelta={compareOn}
          deltaPct={item.metrics?.deltaVsYouPct}
        />
        <div className="mt-1 text-xs text-[#6B7280]">
          {typeof item.metrics?.oppTraffic === "number" && (
            <span className="mr-3">Opp. traffic: <b className="tabular-nums">{nf(item.metrics.oppTraffic)}</b>/mo</span>
          )}
          {typeof item.metrics?.oppValueUSD === "number" && (
            <span>Value: <b className="tabular-nums">{cur(item.metrics.oppValueUSD)}</b></span>
          )}
          {typeof item.metrics?.confidence === "number" && (
            <span className="ml-3">Confidence: <b>{pct0(item.metrics.confidence, 0)}</b></span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAddTask(item)}
            className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white"
            style={{ background: TOKENS.brand }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TOKENS.brandHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TOKENS.brand)}
            title="Add to Task"
          >
            <Plus size={16} /> Add to Task
          </button>
          <button
            onClick={() => onExplain(item)}
            className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            title="Explain why we surfaced this"
          >
            🧠 Explain
          </button>
          {item.deeplink && (
            <a
              href={item.deeplink.href}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              target="_blank"
              rel="noopener noreferrer"
              title="Open related data"
            >
              {item.deeplink.label} <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {item.status !== "dismissed" ? (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              onClick={() => onToggleStatus(item.id)}
              title="Dismiss"
            >
              Dismiss
            </button>
          ) : (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              onClick={() => onToggleStatus(item.id)}
              title="Restore"
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* --------------------------- LIST ROW COMPONENT ------------------------- */
function AiRow({
  item,
  compareOn,
  maxOppValue,
  onAddTask,
  onExplain,
  onToggleStatus,
}: {
  item: AiOpportunity;
  compareOn: boolean;
  maxOppValue: number;
  onAddTask: (it: AiOpportunity) => void;
  onExplain: (it: AiOpportunity) => void;
  onToggleStatus: (id: string) => void;
}) {
  const typeMeta = TYPE_META[item.type];
  const opp = item.metrics?.oppTraffic ?? 0;
  const norm = maxOppValue > 0 ? opp / maxOppValue : 0;

  return (
    <div
      className={classNames(
        "flex w-full items-start gap-3 rounded-[6px] border p-3 hover:bg-[#FAFCFE]",
        item.status === "dismissed" && "opacity-60"
      )}
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[6px]" style={{ background: typeMeta.bg }}>
        <typeMeta.Icon size={16} color={typeMeta.tone} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            {item.title}
          </h5>
          <TypeChip type={item.type} />
          <ImpactChip impact={item.impact} score={item.impactScore} />
          <StatusPill status={item.status} />
        </div>
        <div className="mt-1 text-xs text-[#6B7280]">
          Source: {(item.sources || []).slice(0, 1).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: TOKENS.valueBlue }} />
              {cap(s.kind)}
            </span>
          ))}
          <InfoPopover
            label={(item.sources || []).slice(0, 3).map((s) => s.label).join(", ") || "No sources"}
          />
        </div>
        <p className="mt-1 line-clamp-2 text-sm" style={{ color: TOKENS.text }}>
          {item.rationale}
        </p>
        {!!item.evidence?.length && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {item.evidence.slice(0, 3).map((e, idx) => (
              <span key={idx} className="text-xs text-[#374151]">
                • <span className="font-medium">{e.label}</span> — {e.value}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2">
          <MiniOppBar value={norm} showDelta={compareOn} deltaPct={item.metrics?.deltaVsYouPct} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="text-right text-xs text-[#6B7280]">
          {typeof item.metrics?.oppTraffic === "number" && (
            <div>Opp: <b className="tabular-nums">{nf(item.metrics.oppTraffic)}</b>/mo</div>
          )}
          {typeof item.metrics?.oppValueUSD === "number" && <div>Value: <b>{cur(item.metrics.oppValueUSD)}</b></div>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddTask(item)}
            className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white"
            style={{ background: TOKENS.brand }}
          >
            <Plus size={16} /> Task
          </button>
          <button
            onClick={() => onExplain(item)}
            className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
          >
            🧠 Explain
          </button>
          {item.deeplink && (
            <a
              href={item.deeplink.href}
              className="grid h-9 w-9 place-items-center rounded-[6px] border hover:bg-gray-50"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              target="_blank"
              rel="noopener noreferrer"
              title="Open related data"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button
            className="grid h-9 w-9 place-items-center rounded-[6px] border hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            onClick={() => onToggleStatus(item.id)}
            title={item.status === "dismissed" ? "Restore" : "Dismiss"}
          >
            {item.status === "dismissed" ? <Check size={16} /> : <X size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- PRIORITY & FILTERS ------------------------- */
function priorityScore(it: AiOpportunity) {
  const w1 = 0.45,
    w2 = 0.25,
    w3 = 0.2,
    w4 = 0.1;
  const impactToScore = it.impact === "high" ? 100 : it.impact === "medium" ? 65 : 35;
  const confidence = Math.round((it.metrics?.confidence ?? 0.6) * 100);
  const opp = Math.min(100, Math.round(((it.metrics?.oppTraffic ?? 0) / 5000) * 100)); // normalized for demo
  const effortPenalty = it.metrics?.effort === "high" ? 25 : it.metrics?.effort === "medium" ? 10 : 0;
  return Math.round(w1 * impactToScore + w2 * confidence + w3 * opp - w4 * effortPenalty);
}

/* ----------------------------- MAIN SECTION ----------------------------- */
export default function AiOpportunitiesSectionMock() {
  // Demo: local compare indicator
  const [compareOn, setCompareOn] = useState(true);
  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
  // Data
  const [items, setItems] = useState<AiOpportunity[]>(() => makeMockSuggestions(28));
  const [filters, setFilters] = useState<AiFilters>({
    type: [],
    impact: [],
    source: [],
    status: [],
    view: "grid",
    sort: "priority",
    q: "",
  });

  // Explain modal + Task drawer
  const [exp, setExp] = useState<AiOpportunity | null>(null);
  const [task, setTask] = useState<AiOpportunity | null>(null);

  // Filtered
  const filtered = useMemo(() => {
    const q = (filters.q ?? "").trim().toLowerCase();
    return items.filter((it) => {
      if (filters.type.length && !filters.type.includes(it.type)) return false;
      if (filters.impact.length && !filters.impact.includes(it.impact)) return false;
      if (filters.status.length && !filters.status.includes(it.status)) return false;
      if (filters.source.length) {
        const kinds = new Set(it.sources.map((s) => s.kind));
        if (![...kinds].some((k) => filters.source.includes(k))) return false;
      }
      if (q) {
        const text = `${it.title} ${it.rationale} ${(it.sources || []).map((s) => s.label).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (filters.sort) {
      case "impact_desc":
        arr.sort((a, b) => (priorityScore(b) - priorityScore(a)) || (a.impact > b.impact ? -1 : 1));
        break;
      case "recent":
        arr.sort((a, b) => (new Date(b.updatedAtISO ?? b.createdAtISO).getTime() - new Date(a.updatedAtISO ?? a.createdAtISO).getTime()));
        break;
      case "type":
        arr.sort((a, b) => a.type.localeCompare(b.type) || priorityScore(b) - priorityScore(a));
        break;
      case "priority":
      default:
        arr.sort((a, b) => priorityScore(b) - priorityScore(a));
    }
    return arr;
  }, [filtered, filters.sort]);

  // Pagination (load more)
  const [visible, setVisible] = useState(12);
  useEffect(() => setVisible(12), [filters, items]);
  const page = sorted.slice(0, visible);

  // Max opp for bar normalization
  const maxOpp = useMemo(() => Math.max(1, ...sorted.map((i) => i.metrics?.oppTraffic ?? 0)), [sorted]);

  // Mutations
  function toggleStatus(id: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: it.status === "dismissed" ? "new" : "dismissed" } : it
      )
    );
  }
  function setAddedToTask(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "added_to_task" } : it)));
  }

  // Export CSV (filtered, sorted)
  function exportCSV() {
    const hdr = ["Title", "Impact", "Type", "Status", "OppTraffic", "OppValueUSD", "Confidence", "DeltaVsYou", "Sources"];
    const lines = sorted.map((it) =>
      [
        it.title,
        it.impact,
        it.type,
        it.status,
        it.metrics?.oppTraffic ?? "",
        it.metrics?.oppValueUSD ?? "",
        typeof it.metrics?.confidence === "number" ? Math.round(it.metrics.confidence * 100) + "%" : "",
        typeof it.metrics?.deltaVsYouPct === "number" ? `${it.metrics.deltaVsYouPct}%` : "",
        it.sources.map((s) => `${s.kind}:${s.ref}`).join("; "),
      ]
        .map((x) => JSON.stringify(String(x)))
        .join(",")
    );
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ai-opportunities.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="w-full bg-white mt-4">
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-[6px]" style={{ background: TOKENS.pastelBlue, border: `1px solid ${TOKENS.border}` }}>
                <Sparkles size={16} color={TOKENS.valueBlue} />
              </span>
              <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>AI Opportunities</h3>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#6B7280]">
                <InfoIcon size={12} /> Data‑backed suggestions with source evidence
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setItems(makeMockSuggestions(28))}
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50"
                style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                title="Refresh insights"
              >
                Refresh
              </button>
              <button
                onClick={() => alert("Open Domain Analysis")}
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50"
                style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              >
                View detailed Analysis
              </button>
              <ExportMenu onExport={(fmt) => (fmt === "CSV" ? exportCSV() : alert(`Export ${fmt}`))} />
              {/* Demo compare */}
              <button
                className="ml-2 inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm"
                style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
                onClick={() => setCompareOn((s) => !s)}
              >
                Compare: <b>{compareOn ? "ON" : "OFF"}</b>
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-[#6B7280]">{sorted.length} results</div>
        </div>

        {/* Filters toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search insights…"
              className="h-9 rounded-[6px] border pl-7 pr-2 text-sm"
              style={{ borderColor: TOKENS.border }}
            />
          </div>

          <ChipDropdownMulti<TypeKey>
            label="Type"
            value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            options={Object.keys(TYPE_META).map((k) => ({ key: k as TypeKey, label: TYPE_META[k as TypeKey].label }))}
            info="Filter by opportunity type."
          />
          <ChipDropdownMulti<Impact>
            label="Impact"
            value={filters.impact}
            onChange={(v) => setFilters((f) => ({ ...f, impact: v }))}
            options={[
              { key: "high", label: "High" },
              { key: "medium", label: "Medium" },
              { key: "low", label: "Low" },
            ]}
            info="Filter by impact level."
          />
          <ChipDropdownMulti<SourceKind>
            label="Source"
            value={filters.source}
            onChange={(v) => setFilters((f) => ({ ...f, source: v }))}
            options={[
              { key: "keyword", label: "Keyword" },
              { key: "page", label: "Page" },
              { key: "serp", label: "SERP" },
              { key: "backlink", label: "Backlink" },
              { key: "competitor", label: "Competitor" },
              { key: "traffic", label: "Traffic" },
            ]}
            info="Origin of the evidence."
          />
          <ChipDropdownMulti<Status>
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={[
              { key: "new", label: "New" },
              { key: "in_review", label: "In review" },
              { key: "added_to_task", label: "Added to task" },
              { key: "dismissed", label: "Dismissed" },
            ]}
            info="Workflow status."
          />

          {/* View toggle */}
          <div className="ml-2 inline-flex overflow-hidden rounded-[6px] border" style={{ borderColor: TOKENS.border }}>
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                className={classNames(
                  "h-9 px-3 text-sm",
                  filters.view === v ? "bg-[#F5F7FA] font-semibold" : "bg-white hover:bg-gray-50"
                )}
                onClick={() => setFilters((f) => ({ ...f, view: v }))}
              >
                {cap(v)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              onClick={() =>
                setFilters((f) => {
                  const order: AiFilters["sort"][] = ["priority", "impact_desc", "recent", "type"];
                  const i = order.indexOf(f.sort ?? "priority");
                  return { ...f, sort: order[(i + 1) % order.length] };
                })
              }
              title="Toggle sort"
            >
              Sort: <b>{filters.sort === "priority" ? "Priority" : filters.sort === "impact_desc" ? "Impact" : filters.sort === "recent" ? "Newest" : "Type"}</b>
              <ChevronRight size={14} className="text-[#9CA3AF]" />
            </button>
          </div>

          {(filters.type.length || filters.impact.length || filters.source.length || filters.status.length || (filters.q ?? "").trim()) && (
            <button
              className="ml-1 text-sm text-[#6B7280] hover:underline"
              onClick={() =>
                setFilters({ type: [], impact: [], source: [], status: [], view: filters.view, sort: "priority", q: "" })
              }
            >
              Clear all
            </button>
          )}
        </div>

        {/* Results */}
        <div className="mt-4">
          {page.length === 0 ? (
            <div className="grid place-items-center rounded-[6px] border p-10 text-center" style={{ borderColor: TOKENS.border }}>
              <div className="text-2xl">💡</div>
              <div className="mt-2 text-[15px] font-medium" style={{ color: TOKENS.text }}>
                No AI insights for current filters.
              </div>
              <div className="mt-1 text-sm text-[#6B7280]">
                Try <b>Refresh</b> or broaden Date/Type/Impact.
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => setItems(makeMockSuggestions(28))}
                  className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                >
                  Refresh
                </button>
                <button
                  onClick={() => setFilters({ ...filters, type: [], impact: [], source: [], status: [], q: "" })}
                  className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : filters.view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.map((it) => (
                <AiCard
                  key={it.id}
                  item={it}
                  compareOn={compareOn}
                  maxOppValue={maxOpp}
                  onAddTask={setTask}
                  onExplain={setExp}
                  onToggleStatus={toggleStatus}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {page.map((it) => (
                <AiRow
                  key={it.id}
                  item={it}
                  compareOn={compareOn}
                  maxOppValue={maxOpp}
                  onAddTask={setTask}
                  onExplain={setExp}
                  onToggleStatus={toggleStatus}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {visible < sorted.length && (
            <div className="mt-4 flex items-center justify-center">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm"
                style={{ borderColor: TOKENS.border, background: TOKENS.surface, color: TOKENS.text }}
                onClick={() => setVisible((v) => Math.min(sorted.length, v + 12))}
              >
                Load more ({sorted.length - visible} more)
              </button>
            </div>
          )}
          <div className="mt-2 text-xs text-[#6B7280]">Loaded {Math.min(visible, sorted.length)} of {sorted.length}</div>
        </div>
      </div>

      {/* Explain Modal */}
      
    <Drawer open={exp !== null} onClose={() => setExp(null)} title="🧠 Explain This Suggestion">
      <AIInsightExplainDrawerDemo />
    </Drawer>

      {/* Task Drawer */}
      <Drawer open={!!task} onClose={() => setTask(null)} title="Create Task from AI Insight">
        {task && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setAddedToTask(task.id);
              alert("Task created (demo)");
              setTask(null);
            }}
          >
            <div>
              <label className="text-sm font-medium" style={{ color: TOKENS.text }}>
                Title
              </label>
              <input
                className="mt-1 w-full rounded-[6px] border p-2 text-sm"
                style={{ borderColor: TOKENS.border }}
                defaultValue={task.title}
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: TOKENS.text }}>
                Description
              </label>
              <textarea
                className="mt-1 h-28 w-full rounded-[6px] border p-2 text-sm"
                style={{ borderColor: TOKENS.border }}
                defaultValue={`${task.rationale}

Evidence:
${(task.evidence || []).map((e) => `- ${e.label}: ${e.value}`).join("\n")}

Sources:
${task.sources.map((s) => `- ${cap(s.kind)} — ${s.label}`).join("\n")}
`}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm">Priority</label>
                <select className="mt-1 w-full rounded-[6px] border p-2 text-sm" style={{ borderColor: TOKENS.border }} defaultValue={task.impact === "high" ? "P1" : task.impact === "medium" ? "P2" : "P3"}>
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Medium)</option>
                  <option value="P3">P3 (Low)</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Assignee</label>
                <input className="mt-1 w-full rounded-[6px] border p-2 text-sm" style={{ borderColor: TOKENS.border }} placeholder="Unassigned" />
              </div>
              <div>
                <label className="text-sm">Due date</label>
                <input type="date" className="mt-1 w-full rounded-[6px] border p-2 text-sm" style={{ borderColor: TOKENS.border }} />
              </div>
            </div>
            <div>
              <label className="text-sm">Attachments</label>
              <div className="mt-1 rounded-[6px] border p-2 text-xs" style={{ borderColor: TOKENS.border }}>
                {task.deeplink ? (
                  <a className="underline" style={{ color: TOKENS.valueBlue }} href={task.deeplink.href} target="_blank" rel="noopener noreferrer">
                    {task.deeplink.label}
                  </a>
                ) : (
                  <span className="text-[#6B7280]">None</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm hover:bg-gray-50" style={{ borderColor: TOKENS.border, color: TOKENS.text }} onClick={() => setTask(null)}>
                Cancel
              </button>
              <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white" style={{ background: TOKENS.brand }}>
                Create Task
              </button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}

/* ------------------------------ MOCK DATA ------------------------------- */
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function makeMockSuggestions(n = 20): AiOpportunity[] {
  const keywords = [
    "schema generator", "technical seo checklist", "seo audit template", "rank tracker", "content brief tool",
    "link building outreach", "ai seo tools", "keyword clustering", "internal linking", "featured snippet"
  ];
  const pages = [
    "/tools/schema-generator", "/blog/technical-seo-checklist", "/templates/seo-audit", "/tools/rank-tracker",
    "/content/briefs", "/guides/link-outreach", "/blog/ai-seo-tools", "/guides/keyword-clustering", "/guides/internal-links"
  ];
  const rivals = ["serptrace.com", "growthverse.com", "toolstack.app", "semcraft.io", "comply.ai"];
  const types: TypeKey[] = [
    "content_gap","quick_win","onpage_fix","technical","internal_link","backlink_outreach","serp_feature","keyword_cluster","page_consolidation"
  ];
  const out: AiOpportunity[] = [];
  for (let i = 0; i < n; i++) {
    const t = sample(types);
    const impact: Impact = Math.random() < 0.45 ? "high" : Math.random() < 0.5 ? "medium" : "low";
    const oppTraffic = rand(200, 5400);
    const delta = Math.random() < 0.7 ? rand(5, 42) * (Math.random() < 0.8 ? 1 : -1) : undefined;
    const k = sample(keywords);
    const p = sample(pages);
    const rv = sample(rivals);
    const sKind: SourceKind[] = ["keyword", "page", "serp", "competitor", "traffic"];
    const srcs: SourceRef[] = [
      { kind: "keyword", ref: k, label: `KW: ${k}` },
      { kind: "page", ref: p, label: `Page: ${p}` },
      { kind: "competitor", ref: rv, label: `Competitor: ${rv}` },
      Math.random() > 0.4 ? { kind: "serp", ref: "FS", label: "SERP: Featured Snippet present" } : { kind: "traffic", ref: "trend", label: "Traffic trend anomaly" },
    ];
    out.push({
      id: `ai-${i + 1}`,
      title:
        t === "serp_feature"
          ? `Capture Featured Snippet for “${k}” on ${p}`
          : t === "internal_link"
          ? `Add 3 internal links to ${p} from high‑authority pages`
          : t === "keyword_cluster"
          ? `Build a cluster around “${k}”`
          : t === "backlink_outreach"
          ? `Outreach to rivals’ 12 domains linking to ${rv}`
          : t === "page_consolidation"
          ? `Consolidate overlapping guides into ${p}`
          : t === "onpage_fix"
          ? `Add H2 Q&A and FAQ schema on ${p}`
          : t === "technical"
          ? `Fix LCP on ${p} (mobile)`
          : t === "content_gap"
          ? `Publish a guide targeting “${k}”`
          : `Quick win: update intro on ${p}`,
      rationale:
        t === "serp_feature"
          ? `You rank #5; ${rv} owns FS. Add concise definition paragraph (40–60 words) and a table summary to increase snippet eligibility.`
          : t === "backlink_outreach"
          ? `${rv} has 14 referring domains that also link to your peers but not to you. Prioritize 6 with high WR score.`
          : t === "internal_link"
          ? `Target page lacks internal anchors from 5 relevant pages. Adding links with exact/partial anchors can lift it into Top‑10.`
          : t === "keyword_cluster"
          ? `Queries around “${k}” share intent. Create hub page + 5 spokes to improve coverage and E‑E‑A‑T.`
          : t === "technical"
          ? `Core Web Vitals show LCP p95=4.6s (mobile). Optimize hero image, enable lazy load, and serve AVIF.`
          : t === "page_consolidation"
          ? `3 pages compete for the same topic. Merge weaker pages into the strongest canonical to consolidate signals.`
          : t === "onpage_fix"
          ? `Missing FAQ schema and H2 questions. Implement Q&A layout to align with PAA triggers.`
          : t === "content_gap"
          ? `Competitors rank for ${k} (Top‑10) while you don't. Fill the content gap with a comprehensive guide.`
          : `Title CTR sub‑par for position. Add a numbers list and year in the title to boost CTR.`,
      impact,
      impactScore: rand(55, 96),
      type: t,
      status: "new",
      sources: srcs,
      evidence: [
        { label: "Common KW gap", value: `${rand(6, 42)} keywords` },
        { label: "SERP features", value: Math.random() < 0.5 ? "FS, PAA" : "PAA" },
      ],
      metrics: {
        oppTraffic,
        oppValueUSD: rand(2000, 38000),
        deltaVsYouPct: delta,
        confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
        effort: Math.random() < 0.6 ? "low" : Math.random() < 0.5 ? "medium" : "high",
        timeframeDays: rand(10, 45),
      },
      deeplink: { label: Math.random() < 0.5 ? "SERP" : "Keyword", href: "#" },
      createdAtISO: new Date(Date.now() - rand(0, 10) * 86400000).toISOString(),
      updatedAtISO: new Date().toISOString(),
    });
  }
  return out;
}
