"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info as InfoIcon,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  Target,
  Search as SearchIcon,
  ZoomIn,
  X as CloseIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  LabelList,
} from "recharts";

/**
 * Wranker • Competitor Profiles — Section 6: Competitive Summary
 * Drop‑in React + Tailwind TSX
 *
 * Implements the requested refinements:
 * - Inter / Inter Fallback fonts
 * - No emoji
 * - Branded (#008CCD) icons for section & card titles and actions
 * - Favicon shown for your project/domain
 * - Modular Toggle switches, Chips, Buttons (cursor-pointer on clickables)
 * - Table: all columns left-aligned
 * - Table: when Compare is ON, shows an additional "Δ You vs Them" column
 * - Table: when no extra column (Compare OFF), horizontal scrollbar is hidden
 */

 /* -------------------------------- TOKENS -------------------------------- */
const TOKENS = {
  brand: "#008CCD",       // You / branded icons
  valueBlue: "#0077FF",   // Focus competitor
  pastelBlue: "#D9EEF8",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  teal: "#14B8A6",
  purple: "#7C3AED",
  amber: "#F59E0B",
  rose: "#F43F5E",
  cyan: "#06B6D4",
  violet: "#8B5CF6",
  green: "#10B981",
} as const;

const SERIES_OTHERS = [TOKENS.teal, TOKENS.purple, TOKENS.amber, TOKENS.rose, TOKENS.cyan, TOKENS.violet, TOKENS.green];

/* ------------------------------- TYPES ---------------------------------- */
type CompetitorBrief = {
  domain: string;
  url?: string;
  commonKeywords: number;
  seKeywords: number;
  commonRefDomains: number;
  competitionLevel: number; // 0..100
  youVsThemDelta?: number;  // your score - theirs
  topOverlapExamples?: string[];
};

type MapPoint = {
  domain: string;
  keywords: number;       // x
  traffic: number;        // y
  trafficValue: number;   // bubble size basis
  role: "you" | "focus" | "other";
  commonKeywords: number;
  commonRefDomains: number;
  r: number;              // px radius
  color: string;
};

type OverlapRow = { domain: string; linksToYou: number; linksToComp: number };

/* ------------------------------- FORMATTERS ----------------------------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const kfmt = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : Math.abs(n) >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : nf(n));
const cur0 = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const cur = (n: number) => cur0.format(n);

/* -------------------------------- HELPERS ------------------------------- */
const SectionFont = {
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};
function classNames(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }
function shortDomain(d: string) { return d.replace(/^https?:\/\/(www\.)?/, ""); }
function clamp(n: number, a = 0, b = 100) { return Math.min(b, Math.max(a, n)); }
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!open) return; if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}

/* -------------------------------- PRIMITIVES ---------------------------- */
function InfoPopover({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} color={TOKENS.muted} className="ml-1" />
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

function Chip({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs", onClick ? "cursor-pointer" : "")}
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label?: string }) {
  return (
    <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 cursor-pointer">
      {label && <span className="text-sm text-[#374151]">{label}</span>}
      <span className={classNames("relative h-5 w-10 rounded-full transition", checked ? "bg-[color:var(--brand,#008CCD)]" : "bg-gray-300")} style={{ ["--brand" as any]: TOKENS.brand }}>
        <span className={classNames("absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-[2px]")} />
      </span>
    </button>
  );
}

function LegendEntities({ projectFaviconUrl, youDomain }: { projectFaviconUrl?: string; youDomain?: string }) {
  return (
    <span className="inline-flex items-center gap-3 text-xs text-[#6B7280]">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.valueBlue }} />
        Focus competitor
      </span>
      <span className="inline-flex items-center gap-1">
        {projectFaviconUrl ? <img src={projectFaviconUrl} alt="you" className="h-3.5 w-3.5 rounded-sm" /> : <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: TOKENS.brand }} />}
        You{youDomain ? ` (${shortDomain(youDomain)})` : ""}
      </span>
    </span>
  );
}

function ExportMenu({ onCSV }: { onCSV: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="inline-flex items-center gap-1">
          <Target size={14} color={TOKENS.brand} />
          Export
        </span>
        <ChevronDown size={16} color={TOKENS.muted} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-[6px] border bg-white shadow" style={{ borderColor: TOKENS.border }}>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer" onClick={() => { onCSV(); setOpen(false); }}>
            Export CSV (table)
          </button>
          <div className="block w-full px-3 py-2 text-left text-sm text-gray-400">Export PNG (map) — coming soon</div>
        </div>
      )}
    </div>
  );
}

function CompetitionPill({ value, color }: { value: number; color: string }) {
  const v = clamp(Math.round(value));
  return (
    <div className="min-w-[140px]">
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "#F3F4F6", color: "#374151" }}>
        Competition: {v}
      </span>
      <div className="mt-1 h-[6px] w-full overflow-hidden rounded bg-[#E5E7EB]">
        <div className="h-[6px]" style={{ width: `${v}%`, background: color, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
      </div>
    </div>
  );
}

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}

function DeltaChip({ delta }: { delta?: number }) {
  if (typeof delta !== "number") return <span className="text-[#6B7280] text-xs">—</span>;
  const d = Math.round(delta);
  const tone =
    d > 0
      ? { bg: "rgba(22,163,74,.10)", color: "#16A34A", sign: "+" }
      : d < 0
      ? { bg: "rgba(240,68,56,.12)", color: "#F04438", sign: "" }
      : { bg: "#F5F7FA", color: "#6B7280", sign: "" };
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: tone.bg, color: tone.color }}>
      {tone.sign}{d}
    </span>
  );
}

/* ------------------------------ TABLE PARTS ------------------------------ */
type SortKey = "domain" | "commonKW" | "seKW" | "commonRD" | "level" | "delta";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active?: boolean; dir?: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown size={14} color={TOKENS.muted} />;
  return dir === "asc" ? <ChevronUp size={14} color={TOKENS.brand} /> : <ChevronDown size={14} color={TOKENS.brand} />;
}

function Th({
  label,
  info,
  sortable,
  active,
  dir,
  onClick,
  sticky,
}: {
  label: string;
  info: string;
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
  sticky?: boolean;
}) {
  return (
    <th className={classNames("px-3 py-2 text-sm font-medium text-left", sticky ? "sticky left-0 bg-white z-10" : "")} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <span className="inline-flex items-center gap-1">
        {sortable ? (
          <button className="inline-flex items-center gap-1 hover:underline cursor-pointer" onClick={onClick} title={`Sort by ${label}`}>
            <span>{label}</span>
            <SortIcon active={active} dir={dir} />
          </button>
        ) : (
          <span>{label}</span>
        )}
        <InfoPopover label={info} />
      </span>
    </th>
  );
}

function Td({ children, sticky }: React.PropsWithChildren<{ sticky?: boolean }>) {
  return <td className={classNames("px-3 py-2 text-left", sticky ? "sticky left-0 bg-white z-10" : "")}>{children}</td>;
}

/* ---------------------------- OVERLAP DRAWER ----------------------------- */
function Drawer({ open, onClose, title, width = 700, projectFaviconUrl }: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; width?: number; projectFaviconUrl?: string }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col" style={{ width }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            {projectFaviconUrl ? <img src={projectFaviconUrl} alt="you" className="h-4 w-4 rounded-sm" /> : null}
            <h4 className="text-[16px] font-semibold">{title}</h4>
          </div>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100 cursor-pointer" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} color={TOKENS.muted} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{/* children */}</div>
      </aside>
    </div>
  );
}

/* ------------------------- TOP COMPETITORS TABLE ------------------------ */
function TopCompetitorsTable({
  rows,
  compareOn,
  focusDomain,
  onFocus,
  onOpenOverlap,
  colorFor,
  projectFaviconUrl,
  youDomain,
}: {
  rows: CompetitorBrief[];
  compareOn: boolean;
  focusDomain: string | null;
  onFocus: (domain: string) => void;
  onOpenOverlap: (domain: string) => void;
  colorFor: (domain: string) => string;
  projectFaviconUrl?: string;
  youDomain?: string;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("level");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...rows];
    const getter = (r: CompetitorBrief) => {
      switch (sortBy) {
        case "domain": return r.domain;
        case "commonKW": return r.commonKeywords;
        case "seKW": return r.seKeywords;
        case "commonRD": return r.commonRefDomains;
        case "level": return r.competitionLevel;
        case "delta": return r.youVsThemDelta ?? 0;
        default: return r.competitionLevel;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a) as any, bv = getter(b) as any;
      if (av === bv) return b.commonKeywords - a.commonKeywords || a.domain.localeCompare(b.domain);
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr.slice(0, 5);
  }, [rows, sortBy, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[6px] border" style={{ borderColor: TOKENS.border, background: TOKENS.pastelBlue }}>
            <SearchIcon size={14} color={TOKENS.brand} />
          </span>
          <h4 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>Top Organic Competitors</h4>
          <InfoPopover label="Top 5 domains most in conflict with your project under current filters." />
        </div>
        <LegendEntities projectFaviconUrl={projectFaviconUrl} youDomain={youDomain} />
      </div>

      {/* Hide horizontal scrollbar when no extra column */}
      <div className={compareOn ? "overflow-x-auto" : "overflow-x-hidden"}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="border-b" style={{ borderColor: TOKENS.border }}>
              <Th label="Domain" info="Root domain. Click to open profile." sortable active={sortBy==="domain"} dir={sortDir} onClick={() => toggleSort("domain")} sticky />
              <Th label="Common Keywords" info="Overlap with your top keywords." sortable active={sortBy==="commonKW"} dir={sortDir} onClick={() => toggleSort("commonKW")} />
              <Th label="SE Keywords" info="Competitor’s total organic keywords." sortable active={sortBy==="seKW"} dir={sortDir} onClick={() => toggleSort("seKW")} />
              <Th label="Common Referring Domains" info="Root domains linking to both you and the competitor." sortable active={sortBy==="commonRD"} dir={sortDir} onClick={() => toggleSort("commonRD")} />
              <Th label="Competition Level" info="Composite: overlap & traffic parity. Color = map color." sortable active={sortBy==="level"} dir={sortDir} onClick={() => toggleSort("level")} />
              {compareOn && <Th label="Δ You vs Them" info="Your competition score minus theirs." sortable active={sortBy==="delta"} dir={sortDir} onClick={() => toggleSort("delta")} />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const color = r.domain === focusDomain ? TOKENS.valueBlue : colorFor(r.domain);
              return (
                <tr
                  key={r.domain}
                  className={classNames("border-b hover:bg-[#FAFCFE] cursor-pointer", focusDomain === r.domain ? "bg-[#FAFCFE]" : "")}
                  style={{ borderColor: TOKENS.border }}
                  onClick={() => onFocus(r.domain)}
                  title="Focus this competitor on the map"
                >
                  <Td sticky>
                    <div className="flex items-center gap-2">
                      <ColorDot color={color} />
                      <button
                        className="font-medium underline decoration-1 cursor-pointer"
                        style={{ color: TOKENS.valueBlue }}
                        onClick={(e) => { e.stopPropagation(); alert(`Open Competitor Profile: ${r.domain}`); }}
                      >
                        {shortDomain(r.domain)}
                      </button>
                      <a
                        href={r.url ?? `https://${r.domain}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank" rel="noopener noreferrer"
                        title="Open in new tab"
                        className="cursor-pointer"
                      >
                        <ExternalLink size={12} color={TOKENS.muted} />
                      </a>
                    </div>
                  </Td>
                  <Td><span className="tabular-nums">{nf(r.commonKeywords)}</span></Td>
                  <Td><span className="tabular-nums">{nf(r.seKeywords)}</span></Td>
                  <Td>
                    <button
                      className="underline decoration-1 cursor-pointer"
                      style={{ color: TOKENS.valueBlue }}
                      onClick={(e) => { e.stopPropagation(); onOpenOverlap(r.domain); }}
                      title="View overlapping referring domains"
                    >
                      {nf(r.commonRefDomains)}
                    </button>
                  </Td>
                  <Td>
                    <CompetitionPill value={r.competitionLevel} color={color} />
                  </Td>
                  {compareOn && (
                    <Td>
                      <DeltaChip delta={r.youVsThemDelta} />
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Formula helper under table */}
      <div className="mt-2 text-xs text-[#6B7280]">
        <span className="inline-flex items-center gap-1">
          <Target size={12} color={TOKENS.brand} />
          Competition Level = 100 × (0.50·OverlapKW + 0.30·OverlapRD + 0.20·TrafficParity)
        </span>
        <InfoPopover
          label={`OverlapKW = |KW_you ∩ KW_comp| / |KW_you| • OverlapRD = |RD_you ∩ RD_comp| / |RD_you| • TrafficParity = min(1, Traffic_comp / Traffic_you).`}
          align="right"
        />
      </div>
    </div>
  );
}

/* ---------------------------- COMPETITIVE MAP ---------------------------- */
type MapControls = { logX: boolean; logY: boolean; labelFocus: boolean; search: string };

function CompetitiveMap({
  points,
  focusDomain,
  onFocus,
  controls,
  setControls,
  projectFaviconUrl,
  youDomain,
}: {
  points: MapPoint[];
  focusDomain: string | null;
  onFocus: (domain: string) => void;
  controls: MapControls;
  setControls: (u: Partial<MapControls>) => void;
  projectFaviconUrl?: string;
  youDomain?: string;
}) {
  const focusPt = points.find((p) => p.domain === focusDomain && p.role !== "you");
  const youPt = points.find((p) => p.role === "you");
  const others = points.filter((p) => p.role === "other");
  const focusArr = focusPt ? [focusPt] : [];
  const youArr = youPt ? [youPt] : [];

  const xVals = points.map((p) => p.keywords);
  const yVals = points.map((p) => p.traffic);
  const xMax = Math.max(...xVals, 1);
  const yMax = Math.max(...yVals, 1);

  const YouShape = (props: any) => { const { cx, cy, payload } = props; const r = payload.r ?? 12; return <circle cx={cx} cy={cy} r={r} fill={TOKENS.brand} stroke="#FFFFFF" strokeWidth={2} />; };
  const FocusShape = (props: any) => { const { cx, cy, payload } = props; const r = payload.r ?? 11; return <circle cx={cx} cy={cy} r={r} fill={TOKENS.valueBlue} stroke="#FFFFFF" strokeWidth={2} />; };
  const RivalShape = (props: any) => { const { cx, cy, payload } = props; const r = payload.r ?? 9; return <circle cx={cx} cy={cy} r={r} fill={payload.color} stroke="#FFFFFF" strokeWidth={1.5} />; };

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[6px] border" style={{ borderColor: TOKENS.border, background: TOKENS.pastelBlue }}>
            <Target size={14} color={TOKENS.brand} />
          </span>
          <h4 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>Competitive Positioning</h4>
          <InfoPopover label="X: total organic keywords (Top‑100). Y: estimated traffic. Bubble size = traffic value." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LegendEntities projectFaviconUrl={projectFaviconUrl} youDomain={youDomain} />
          <div className="flex items-center gap-3 text-sm">
            <ToggleSwitch checked={controls.logX} onChange={(v) => setControls({ logX: v })} label="Log X" />
            <ToggleSwitch checked={controls.logY} onChange={(v) => setControls({ logY: v })} label="Log Y" />
            <ToggleSwitch checked={controls.labelFocus} onChange={(v) => setControls({ labelFocus: v })} label="Label focus" />
          </div>
          <div className="relative">
            <SearchIcon size={14} color={TOKENS.muted} className="absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={controls.search}
              onChange={(e) => setControls({ search: e.target.value })}
              placeholder="Find domain…"
              className="h-9 rounded-[6px] border pl-7 pr-2 text-sm"
              style={{ borderColor: TOKENS.border }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && controls.search.trim()) {
                  const hit = points.find((p) => p.domain.toLowerCase().includes(controls.search.toLowerCase()) && p.role !== "you");
                  if (hit) onFocus(hit.domain);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="h-[360px]" role="img" aria-label="Competitive positioning scatter (keywords vs traffic)">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid vertical={false} stroke={TOKENS.border} />
            <XAxis
              type="number"
              dataKey="keywords"
              domain={[controls.logX ? 1 : 0, xMax * 1.05]}
              scale={controls.logX ? "log" : "auto"}
              tick={{ fontSize: 12, fill: TOKENS.muted }}
              tickFormatter={(v) => kfmt(v as number)}
              label={{ value: "Keywords", position: "insideBottom", offset: -2, fill: TOKENS.muted }}
            />
            <YAxis
              type="number"
              dataKey="traffic"
              domain={[controls.logY ? 1 : 0, yMax * 1.05]}
              scale={controls.logY ? "log" : "auto"}
              tick={{ fontSize: 12, fill: TOKENS.muted }}
              tickFormatter={(v) => kfmt(v as number)}
              label={{ value: "Traffic", angle: -90, position: "insideLeft", offset: 10, fill: TOKENS.muted }}
            />
            <RTooltip
              cursor={{ stroke: TOKENS.valueBlue, strokeDasharray: "3 3", strokeOpacity: 0.25 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as MapPoint;
                const tone = p.role === "you" ? TOKENS.brand : p.role === "focus" ? TOKENS.valueBlue : p.color;
                return (
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${TOKENS.border}`,
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 12,
                      boxShadow: "0 1px 2px rgba(17,24,39,.06)",
                    }}
                  >
                    <div className="font-medium text-[#111827] flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tone }} />
                      {p.domain}{p.role==="you" ? " (You)" : p.role==="focus" ? " (Focus)" : ""}
                    </div>
                    <div className="text-[#374151]">Keywords: <b>{nf(p.keywords)}</b></div>
                    <div className="text-[#374151]">Traffic: <b>{nf(p.traffic)}</b></div>
                    <div className="text-[#374151]">Traffic value: <b>{cur(p.trafficValue)}</b></div>
                    <div className="text-[#6B7280] mt-1">Common KW: {nf(p.commonKeywords)} • Common RD: {nf(p.commonRefDomains)}</div>
                    <div className="mt-1 flex gap-2">
                      <button className="rounded-[6px] border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer" style={{ borderColor: TOKENS.border }} onClick={() => alert(`Open Competitor Profile: ${p.domain}`)}>
                        View Profile
                      </button>
                      <button className="rounded-[6px] border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer" style={{ borderColor: TOKENS.border }} onClick={() => alert("Open Domain Analysis > Competition")}>
                        Domain Analysis
                      </button>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={others} shape={RivalShape} onClick={(d: any) => onFocus(d.domain as string)} />
            <Scatter data={focusArr} shape={FocusShape} onClick={(d: any) => onFocus(d.domain as string)}>
              {controls.labelFocus && <LabelList dataKey="domain" position="top" className="text-xs fill-[#111827]" />}
            </Scatter>
            <Scatter data={youArr} shape={YouShape} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
        <div>
          Focus: <b>{focusDomain ?? "—"}</b>
        </div>
        <div className="inline-flex items-center gap-1">
          <ZoomIn size={12} color={TOKENS.muted} /> Hover a bubble for details. Click a bubble or a row to set focus.
        </div>
      </div>
    </div>
  );
}

/* --------------------------- MAIN SECTION VIEW -------------------------- */
export default function CompetitiveSummarySectionMock() {
  // State
  const [compareOn, setCompareOn] = useState(true);
  const { you, comps, overlapsDomainMap } = useMemo(() => buildMockData(), []);
  const [focusDomain, setFocusDomain] = useState<string | null>(comps[0]?.domain ?? null);
  const [controls, setControls] = useState<MapControls>({ logX: false, logY: false, labelFocus: false, search: "" });

  // Color per domain
  const colorMap = useMemo(() => {
    const others = comps.map((c) => c.domain).filter((d) => d !== focusDomain);
    const map: Record<string, string> = {};
    others.forEach((d, i) => (map[d] = SERIES_OTHERS[i % SERIES_OTHERS.length]));
    if (focusDomain) map[focusDomain] = TOKENS.valueBlue;
    return map;
  }, [comps, focusDomain]);
  const colorFor = (domain: string) => (domain === focusDomain ? TOKENS.valueBlue : colorMap[domain] ?? SERIES_OTHERS[0]);

  // Table rows
  const tableRows: CompetitorBrief[] = useMemo(
    () =>
      comps.map((c) => ({
        domain: c.domain,
        url: `https://${c.domain}`,
        commonKeywords: c.commonKW,
        seKeywords: c.seKW,
        commonRefDomains: c.commonRD,
        competitionLevel: c.level,
        youVsThemDelta: c.delta,
        topOverlapExamples: c.examples,
      })),
    [comps]
  );

  // Map points
  const points: MapPoint[] = useMemo(() => {
    const rScale = (tv: number, minTV: number, maxTV: number) => {
      if (maxTV <= minTV) return 12;
      const t = Math.sqrt((tv - minTV) / (maxTV - minTV));
      return 8 + t * 14; // 8..22
    };
    const tvs = [you.trafficValue, ...comps.map((c) => c.trafficValue)];
    const minTV = Math.min(...tvs);
    const maxTV = Math.max(...tvs);
    const arr: MapPoint[] = [
      {
        domain: you.domain,
        keywords: you.seKW,
        traffic: you.traffic,
        trafficValue: you.trafficValue,
        role: "you",
        commonKeywords: 0,
        commonRefDomains: 0,
        r: rScale(you.trafficValue, minTV, maxTV),
        color: TOKENS.brand,
      },
      // ...comps.map((c) => ({
      //   domain: c.domain,
      //   keywords: c.seKW,
      //   traffic: c.traffic,
      //   trafficValue: c.trafficValue,
      //   role: c.domain === focusDomain ? "focus" : "other",
      //   commonKeywords: c.commonKW,
      //   commonRefDomains: c.commonRD,
      //   r: rScale(c.trafficValue, minTV, maxTV),
      //   color: c.domain === focusDomain ? TOKENS.valueBlue : colorFor(c.domain),
      // })),
    ];
    return arr;
  }, [you, comps, focusDomain, colorFor]);

  // Overlap drawer
  const [ovOpen, setOvOpen] = useState(false);
  const [ovDomain, setOvDomain] = useState<string | null>(null);
  const ovRows = useMemo<OverlapRow[]>(() => (ovDomain ? overlapsDomainMap[ovDomain] ?? [] : []), [ovDomain, overlapsDomainMap]);

  // CSV export
  function exportCSV() {
    const hdr = ["Domain", "CommonKeywords", "SEKeywords", "CommonRefDomains", "CompetitionLevel", ...(compareOn ? ["YouVsThemDelta"] : [])];
    const lines = tableRows.map((r) => {
      const cols = [r.domain, r.commonKeywords, r.seKeywords, r.commonRefDomains, Math.round(r.competitionLevel)];
      if (compareOn) cols.push(Math.round(r.youVsThemDelta ?? 0));
      return cols.map((x) => JSON.stringify(String(x))).join(",");
    });
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-competitors.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Scroll map into view when focusing from table
  const mapRef = useRef<HTMLDivElement | null>(null);
  function handleFocus(domain: string) {
    setFocusDomain(domain);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="w-full bg-white mt-4" style={SectionFont}>
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-[6px] border" style={{ borderColor: TOKENS.border, background: TOKENS.pastelBlue }}>
                <Target size={16} color={TOKENS.brand} />
              </span>
              <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>Competitive Summary</h3>
              <Chip>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.valueBlue }} /> Focus
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} /> You
                  </span>
                </span>
              </Chip>
              <Chip>
                <span className="inline-flex items-center gap-2">
                  <img src="/favicon.ico" alt="you" className="h-3.5 w-3.5 rounded-sm" />
                  <span className="text-[#374151]">{shortDomain(you.domain)}</span>
                </span>
              </Chip>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch checked={compareOn} onChange={setCompareOn} label="Compare" />
              <button
                onClick={() => alert("Open Domain Analysis > Competition")}
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                title="View detailed Analysis"
              >
                View detailed Analysis
              </button>
              <ExportMenu onCSV={exportCSV} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 grid grid-cols-1 gap-4">
          {/* A) Top competitors table */}
          <TopCompetitorsTable
            rows={tableRows}
            compareOn={compareOn}
            focusDomain={focusDomain}
            onFocus={handleFocus}
            onOpenOverlap={(d) => { setOvDomain(d); setOvOpen(true); }}
            colorFor={colorFor}
            projectFaviconUrl="/favicon.ico"
            youDomain={you.domain}
          />

          {/* B) Map */}
          <div ref={mapRef}>
            <CompetitiveMap
              points={points}
              focusDomain={focusDomain}
              onFocus={(d) => setFocusDomain(d)}
              controls={controls}
              setControls={(u) => setControls((prev) => ({ ...prev, ...u }))}
              projectFaviconUrl="/favicon.ico"
              youDomain={you.domain}
            />
          </div>
        </div>
      </div>

      {/* Overlap Drawer */}
      <Drawer open={ovOpen} onClose={() => setOvOpen(false)} title={`Referring Domains Overlap — ${ovDomain ?? ""}`} projectFaviconUrl="/favicon.ico">
        {ovRows.length ? (
          <div className="overflow-auto rounded-[6px] border" style={{ borderColor: TOKENS.border }}>
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB]">
                <tr className="text-left">
                  <th className="px-3 py-2">Domain</th>
                  <th className="px-3 py-2">Links to You</th>
                  <th className="px-3 py-2">Links to Competitor</th>
                </tr>
              </thead>
              <tbody>
                {ovRows.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-[#FAFCFE]" style={{ borderColor: TOKENS.border }}>
                    <td className="px-3 py-2">{r.domain}</td>
                    <td className="px-3 py-2">{nf(r.linksToYou)}</td>
                    <td className="px-3 py-2">{nf(r.linksToComp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid h-[160px] place-items-center text-sm text-[#6B7280]">No overlapping domains found.</div>
        )}
      </Drawer>
    </div>
  );
}

/* ------------------------------- MOCK DATA ------------------------------- */
function rand(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)); }
function pick<T>(arr: T[], n: number) { const a = [...arr]; const out: T[] = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; }

function buildMockData() {
  const you = {
    domain: "wranker.com",
    seKW: rand(3500, 7800),
    traffic: rand(70000, 160000),
    trafficValue: rand(120000, 420000),
    refDomains: rand(800, 1600),
  };

  const pool = ["comply.ai", "semcraft.io", "rankpilot.co", "serptrace.com", "keyflux.net", "backgrid.io", "growthverse.com", "toolstack.app"];
  const examplesKW = ["seo audit checklist", "best seo tools", "rank checker", "technical seo guide", "schema generator", "content strategy", "keyword research"];

  const comps = pool.map((d) => {
    const seKW = rand(2200, 12000);
    const traffic = rand(40000, 240000);
    const trafficValue = rand(90000, 520000);
    const ref = rand(700, 2200);
    const commonKW = Math.min(rand(180, 1500), seKW, you.seKW);
    const commonRD = Math.min(rand(60, 420), you.refDomains, ref);

    const w1 = 0.5, w2 = 0.3, w3 = 0.2;
    const overlapKW = commonKW / Math.max(1, you.seKW);
    const overlapRD = commonRD / Math.max(1, you.refDomains);
    const parity = Math.min(1, traffic / Math.max(1, you.traffic));
    const level = clamp(100 * (w1 * overlapKW + w2 * overlapRD + w3 * parity));

    const parityYou = Math.min(1, you.traffic / Math.max(1, traffic));
    const yourLevel = clamp(100 * (w1 * overlapKW + w2 * overlapRD + w3 * parityYou));
    const delta = Math.round(yourLevel - level);

    return {
      domain: d,
      seKW,
      traffic,
      trafficValue,
      ref,
      commonKW,
      commonRD,
      level,
      delta,
      examples: pick(examplesKW, 3),
    };
  });

  // Overlap drawer data (fake)
  const overlapsDomainMap: Record<string, OverlapRow[]> = {};
  comps.forEach((c) => {
    const n = rand(6, 14);
    const rows: OverlapRow[] = [];
    for (let i = 0; i < n; i++) rows.push({ domain: `site-${i + 1}.example.com`, linksToYou: rand(1, 18), linksToComp: rand(1, 24) });
    overlapsDomainMap[c.domain] = rows;
  });

  return { you, comps, overlapsDomainMap };
}
