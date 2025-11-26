"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Info as InfoIcon,
  ChevronDown,
  Search,
  ExternalLink,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  PlayCircle,
  Newspaper,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Rectangle,
} from "recharts";

/**
 * Wranker • Competitor Profiles — Section 3: Organic Keywords Overview
 *
 * Refinement (per your note):
 * - **Position Trend**: ensured the second (You) stacked bar is visible when Compare is ON by
 *   switching from fixed `barSize` to `maxBarSize`, and tuning `barCategoryGap`/`barGap`
 *   so two grouped stacks render side‑by‑side reliably across widths.
 * - SERP Feature Presence already shows full names and icons adjacent to the titles.
 */

/* -------------------------------- TOKENS -------------------------------- */
const TOKENS = {
  brand: "#008CCD", // You / My Project + branded icons
  compBlue: "#0077FF", // Competitor
  pastelBlue: "#D9EEF8",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
} as const;

/* ----------------------------- COLOR HELPERS ----------------------------- */
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const COMP_TINT = {
  top3: hexToRgba(TOKENS.compBlue, 0.95),
  p4_10: hexToRgba(TOKENS.compBlue, 0.8),
  p11_20: hexToRgba(TOKENS.compBlue, 0.55),
  p21_100: hexToRgba(TOKENS.compBlue, 0.28),
};
const YOU_TINT = {
  top3: hexToRgba(TOKENS.brand, 0.95),
  p4_10: hexToRgba(TOKENS.brand, 0.8),
  p11_20: hexToRgba(TOKENS.brand, 0.55),
  p21_100: hexToRgba(TOKENS.brand, 0.28),
};

/* ------------------------------- FORMATTERS ------------------------------ */
const intFmt = new Intl.NumberFormat();
function fmtNum(n?: number | null, compact = true) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10000) {
    const u = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const x of u) if (Math.abs(n) >= x.v) return `${(n / x.v).toFixed(1)}${x.s}`;
  }
  return intFmt.format(n);
}
function fmtPct01(p?: number | null, d = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(d)}%`;
}
function fmtMonth(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/* --------------------------------- TYPES -------------------------------- */
export type BucketCounts = { top3: number; p4_10: number; p11_20: number; p21_100: number };
export type PositionTrendPoint = { t: string; comp: BucketCounts; you?: BucketCounts };
export type TopKeywordRow = {
  kw: string;
  comp_pos: number;
  vol: number;
  traffic_pct: number; // 0..1
  intent: "informational" | "navigational" | "commercial" | "transactional";
  serp?: Array<"FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES">;
  your_pos?: number;
};
export type Distribution = { comp: BucketCounts; you?: BucketCounts };
export type IntentShares = {
  comp: { info: number; nav: number; comm: number; trans: number };
  you?: { info: number; nav: number; comm: number; trans: number };
  examples?: { info?: string[]; nav?: string[]; comm?: string[]; trans?: string[] };
};
export type SerpFeatures = {
  comp: Record<"FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES", number>;
  you?: Record<"FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES", number>;
  denominator: number;
};
export type KeywordsSectionData = {
  position_trend: PositionTrendPoint[];
  granularity: "week" | "month";
  top10: TopKeywordRow[];
  distribution: Distribution;
  intent: IntentShares;
  serp_features: SerpFeatures;
};
type ExportFmt = "PNG" | "CSV" | "PDF";

/* ------------------------------ CONSTANTS -------------------------------- */
const BUCKET_LABELS: Record<keyof BucketCounts, string> = {
  top3: "Top 1–3",
  p4_10: "4–10",
  p11_20: "11–20",
  p21_100: "21–100",
};
const INTENT_LABEL: Record<"info" | "nav" | "comm" | "trans", string> = {
  info: "Informational",
  nav: "Navigational",
  comm: "Commercial",
  trans: "Transactional",
};
const INTENT_ABBR: Record<"info" | "nav" | "comm" | "trans", string> = {
  info: "Info",
  nav: "Nav",
  comm: "Comm",
  trans: "Trans",
};
const INTENT_COLORS = {
  info: "#14B8A6",
  nav: "#7C3AED",
  comm: "#F59E0B",
  trans: "#F43F5E",
} as const;

/* SERP feature meta — Lucide icons + colors */
const FEATURE_META: Record<
  "FS" | "PAA" | "IMAGE" | "SITELINKS" | "VIDEO" | "TOP_STORIES",
  { label: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string; className?: string }> }
> = {
  FS: { label: "Featured Snippet", color: "#F97316", Icon: FileText },
  PAA: { label: "People Also Ask", color: "#22C55E", Icon: HelpCircle },
  IMAGE: { label: "Image Pack", color: "#3B82F6", Icon: ImageIcon },
  SITELINKS: { label: "Sitelinks", color: "#8B5CF6", Icon: LinkIcon },
  VIDEO: { label: "Video", color: "#EF4444", Icon: PlayCircle },
  TOP_STORIES: { label: "Top Stories", color: "#0EA5E9", Icon: Newspaper },
};

/* ---------------------------- SHAPE HELPERS ------------------------------ */
function findTopKey<T extends string>(row: Record<string, number>, keys: readonly T[]): T {
  for (let i = keys.length - 1; i >= 0; i--) {
    if ((row[keys[i]] ?? 0) > 0) return keys[i];
  }
  return keys[keys.length - 1];
}
const roundedTopShape =
  (barKey: string, topField: string) => {
    const RoundedTopShapeComponent = (props: any) => {
      const isTop = props?.payload?.[topField] === barKey && props?.height > 0;
      return <Rectangle {...props} radius={isTop ? [6, 6, 0, 0] : 0} />;
    };
    RoundedTopShapeComponent.displayName = `RoundedTopShape_${barKey}`;
    return RoundedTopShapeComponent;
  };


/* --------------------------------- UI PRIMS ------------------------------ */
const SectionFont = {
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

function Dot({ color }: { color: string }) {
  return <span className="mr-1 inline-block h-[8px] w-[8px] rounded-full" style={{ background: color }} />;
}

function InfoPopover({ label }: { label: string }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className="invisible group-hover:visible absolute z-50 top-full mt-1 w-64 -translate-x-1/2 rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow"
        style={{ left: "50%", borderColor: TOKENS.border }}
      >
        {label}
      </span>
    </span>
  );
}

function TitleWithInfo({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="truncate text-[15px] font-semibold">{title}</div>
      <InfoPopover label={info} />
    </div>
  );
}

/* Toggle (modern) */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex cursor-pointer items-center gap-2"
      aria-pressed={checked}
    >
      {label && <span className="text-sm text-[#374151]">{label}</span>}
      <span
        className={`relative h-5 w-10 rounded-full transition ${checked ? "bg-[color:var(--brand,#008CCD)]" : "bg-gray-300"}`}
        style={{ ["--brand" as any]: TOKENS.brand }}
      >
        <span
          className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

/* Basic pill chip */
function Chip({
  children,
  onClick,
  active,
  outline = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  outline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${
        outline ? "border" : ""
      } ${onClick ? "cursor-pointer" : ""} ${active ? "bg-white" : "bg-[var(--chip-bg,#F5F7FA)]"}`}
      style={{ borderColor: TOKENS.border, ["--chip-bg" as any]: TOKENS.chipBg }}
    >
      {children}
    </button>
  );
}

/* Entity legend with favicon for "You" */
function LegendEntities({ compareOn, projectFaviconUrl }: { compareOn: boolean; projectFaviconUrl?: string }) {
  return (
    <div className="flex items-center gap-4 text-xs text-[#6B7280]">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} />
        Competitor
      </span>
      {compareOn && (
        <span className="inline-flex items-center gap-1">
          {projectFaviconUrl ? (
            <img src={projectFaviconUrl} alt="project" className="h-3.5 w-3.5 rounded-sm" />
          ) : (
            <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: TOKENS.brand }} />
          )}
          You
        </span>
      )}
    </div>
  );
}

function ExportMenu({ onExport, canPdf = true }: { onExport?: (fmt: ExportFmt) => void; canPdf?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border px-3 text-sm"
        style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
      >
        Export
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-[6px] border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          {(["PNG", "CSV", "PDF"] as ExportFmt[]).map((fmt) => (
            <button
              key={fmt}
              className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                fmt === "PDF" && !canPdf ? "text-gray-400 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (fmt === "PDF" && !canPdf) return;
                onExport?.(fmt);
                setOpen(false);
              }}
            >
              Export {fmt}
              {fmt === "PDF" && !canPdf && <span className="ml-2 text-xs">(Upgrade)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyCard({ title, info, height = 220 }: { title: string; info?: string; height?: number }) {
  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex items-center justify-between">
        <TitleWithInfo title={title} info={info ?? ""} />
      </div>
      <div className="grid place-items-center text-sm text-[#6B7280]" style={{ height }}>
        No data for selected filters.
      </div>
    </div>
  );
}

/* --------------------------------- BLOCK A --------------------------------
 * Position Trend — TWO grouped stacks when compareOn = true
 * (Refined sizing so "You" stack is always visible.)
 * -------------------------------------------------------------------------*/
function TrendTooltip({ active, payload, label, compareOn }: any & { compareOn: boolean }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload as any;
  const compTotal = row._compTotal || 0;
  const youTotal = row._youTotal || 0;

  const Item = ({
    title,
    colors,
    vals,
    total,
  }: {
    title: string;
    colors: typeof COMP_TINT | typeof YOU_TINT;
    vals: { top3: number; p4_10: number; p11_20: number; p21_100: number };
    total: number;
  }) => (
    <div className="mt-1">
      <div className="font-medium text-[#111827]">{title}</div>
      <div className="text-[12px]">
        <Dot color={colors.top3} /> Top 1–3 — <b>{fmtNum(vals.top3, false)}</b>
        {total ? <span className="text-[#6B7280]"> ({fmtPct01(vals.top3 / total)})</span> : null}
      </div>
      <div className="text-[12px]">
        <Dot color={colors.p4_10} /> 4–10 — <b>{fmtNum(vals.p4_10, false)}</b>
        {total ? <span className="text-[#6B7280]"> ({fmtPct01(vals.p4_10 / total)})</span> : null}
      </div>
      <div className="text-[12px]">
        <Dot color={colors.p11_20} /> 11–20 — <b>{fmtNum(vals.p11_20, false)}</b>
        {total ? <span className="text-[#6B7280]"> ({fmtPct01(vals.p11_20 / total)})</span> : null}
      </div>
      <div className="text-[12px]">
        <Dot color={colors.p21_100} /> 21–100 — <b>{fmtNum(vals.p21_100, false)}</b>
        {total ? <span className="text-[#6B7280]"> ({fmtPct01(vals.p21_100 / total)})</span> : null}
      </div>
      <div className="mt-0.5 text-[12px] text-[#6B7280]">Total: {fmtNum(total, false)}</div>
    </div>
  );

  return (
    <div
      role="tooltip"
      style={{
        background: "#fff",
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 6,
        padding: "6px 8px",
        fontSize: 12,
        pointerEvents: "none",
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
      }}
    >
      <div style={{ color: TOKENS.muted }}>{fmtMonth(label)}</div>
      <Item
        title="Competitor"
        colors={COMP_TINT}
        vals={{ top3: row.comp_top3, p4_10: row.comp_p4_10, p11_20: row.comp_p11_20, p21_100: row.comp_p21_100 }}
        total={compTotal}
      />
      {compareOn && (
        <Item
          title="You"
          colors={YOU_TINT}
          vals={{ top3: row.you_top3, p4_10: row.you_p4_10, p11_20: row.you_p11_20, p21_100: row.you_p21_100 }}
          total={youTotal}
        />
      )}
    </div>
  );
}

function PositionTrendChart({
  points,
  compareOn,
}: {
  points: PositionTrendPoint[];
  compareOn: boolean;
}) {
  const data = useMemo(() => {
    const rows = points.map((p) => ({
      date: p.t,
      comp_top3: p.comp.top3,
      comp_p4_10: p.comp.p4_10,
      comp_p11_20: p.comp.p11_20,
      comp_p21_100: p.comp.p21_100,
      you_top3: p.you?.top3 ?? 0,
      you_p4_10: p.you?.p4_10 ?? 0,
      you_p11_20: p.you?.p11_20 ?? 0,
      you_p21_100: p.you?.p21_100 ?? 0,
      _compTotal: p.comp.top3 + p.comp.p4_10 + p.comp.p11_20 + p.comp.p21_100,
      _youTotal: (p.you?.top3 ?? 0) + (p.you?.p4_10 ?? 0) + (p.you?.p11_20 ?? 0) + (p.you?.p21_100 ?? 0),
    }));

    const compKeys = ["comp_top3", "comp_p4_10", "comp_p11_20", "comp_p21_100"] as const;
    const youKeys = ["you_top3", "you_p4_10", "you_p11_20", "you_p21_100"] as const;
    return rows.map((r) => ({
      ...r,
      __cmpTopKey: findTopKey(r as Record<string, number |any>, compKeys),
      __youTopKey: findTopKey(r as Record<string, number |any>, youKeys),
    }));
  }, [points]);

  // Critical fix: let Recharts auto-fit bars via maxBarSize (not hard barSize),
  // and keep reasonable intra-/inter-category gaps so two grouped stacks always show.
  const MAX_BAR = compareOn ? 14 : 18;

  return (
    <ResponsiveContainer>
      <BarChart
        data={data}
        margin={{ top: 10, right: 18, left: 2, bottom: 6 }}
        barCategoryGap={compareOn ? "25%" : "35%"}
        barGap={compareOn ? 6 : 8}
      >
        <CartesianGrid vertical={false} stroke={TOKENS.border} />
        <XAxis dataKey="date" tickFormatter={fmtMonth} tick={{ fontSize: 12, fill: TOKENS.muted }} />
        <YAxis tickFormatter={(n) => fmtNum(n as number)} tick={{ fontSize: 12, fill: TOKENS.muted }} />
        <RTooltip content={<TrendTooltip compareOn={compareOn} />} />

        {/* Competitor stack (left) */}
        <Bar dataKey="comp_top3" stackId="cmp" name="Comp • Top 1–3" maxBarSize={MAX_BAR} fill={COMP_TINT.top3} shape={roundedTopShape("comp_top3", "__cmpTopKey")} />
        <Bar dataKey="comp_p4_10" stackId="cmp" name="Comp • 4–10" maxBarSize={MAX_BAR} fill={COMP_TINT.p4_10} shape={roundedTopShape("comp_p4_10", "__cmpTopKey")} />
        <Bar dataKey="comp_p11_20" stackId="cmp" name="Comp • 11–20" maxBarSize={MAX_BAR} fill={COMP_TINT.p11_20} shape={roundedTopShape("comp_p11_20", "__cmpTopKey")} />
        <Bar dataKey="comp_p21_100" stackId="cmp" name="Comp • 21–100" maxBarSize={MAX_BAR} fill={COMP_TINT.p21_100} shape={roundedTopShape("comp_p21_100", "__cmpTopKey")} />

        {/* You stack (right) — brand color */}
        {compareOn && (
          <>
            <Bar dataKey="you_top3" stackId="you" name="You • Top 1–3" maxBarSize={MAX_BAR} fill={YOU_TINT.top3} shape={roundedTopShape("you_top3", "__youTopKey")} />
            <Bar dataKey="you_p4_10" stackId="you" name="You • 4–10" maxBarSize={MAX_BAR} fill={YOU_TINT.p4_10} shape={roundedTopShape("you_p4_10", "__youTopKey")} />
            <Bar dataKey="you_p11_20" stackId="you" name="You • 11–20" maxBarSize={MAX_BAR} fill={YOU_TINT.p11_20} shape={roundedTopShape("you_p11_20", "__youTopKey")} />
            <Bar dataKey="you_p21_100" stackId="you" name="You • 21–100" maxBarSize={MAX_BAR} fill={YOU_TINT.p21_100} shape={roundedTopShape("you_p21_100", "__youTopKey")} />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PositionTrendCard({
  points,
  compareOn,
  projectFaviconUrl,
}: {
  points: PositionTrendPoint[];
  compareOn: boolean;
  projectFaviconUrl?: string;
}) {
  if (!points?.length) return <EmptyCard title="Position Trend" info="Stacked rank buckets over time." />;

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <TitleWithInfo title="Position Trend" info="Grouped stacked bars by month. With Compare ON, Competitor (left) and You (right) appear side-by-side." />
        <LegendEntities compareOn={compareOn} projectFaviconUrl={projectFaviconUrl} />
      </div>

      <div className="h-[300px]" role="img" aria-label="Position buckets over time">
        <PositionTrendChart points={points} compareOn={compareOn} />
      </div>
    </div>
  );
}

/* --------------------------------- BLOCK B --------------------------------
 * Top Organic Keywords (table)
 * -------------------------------------------------------------------------*/
const FEATURE_ORDER: Array<keyof SerpFeatures["comp"]> = ["FS", "PAA", "IMAGE", "SITELINKS", "VIDEO", "TOP_STORIES"];
function IntentPillCompact({ code }: { code: TopKeywordRow["intent"] }) {
  const map = {
    informational: { abbr: INTENT_ABBR.info, color: INTENT_COLORS.info, title: INTENT_LABEL.info },
    navigational: { abbr: INTENT_ABBR.nav, color: INTENT_COLORS.nav, title: INTENT_LABEL.nav },
    commercial: { abbr: INTENT_ABBR.comm, color: INTENT_COLORS.comm, title: INTENT_LABEL.comm },
    transactional: { abbr: INTENT_ABBR.trans, color: INTENT_COLORS.trans, title: INTENT_LABEL.trans },
  } as const;
  const m = map[code];
  return (
    <span className="inline-flex items-center gap-1 text-xs" title={m.title}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: m.color }} />
      <span>{m.abbr}</span>
    </span>
  );
}

function SerpInlineBadges({
  features,
  onSnapshot,
  kw,
}: {
  features?: TopKeywordRow["serp"];
  onSnapshot?: (kw: string) => void;
  kw: string;
}) {
  if (!features?.length) return null;
  const items = features.slice(0, 3);
  return (
    <div className="flex items-center gap-1">
      {items.map((f) => {
        const meta = FEATURE_META[f];
        const Icon = meta.Icon;
        return (
          <span
            key={f}
            className="inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[11px]"
            style={{ background: TOKENS.chipBg, color: meta.color, border: `1px solid ${TOKENS.border}` }}
            title={meta.label}
          >
            <Icon size={12} color={meta.color} />
            {f}
          </span>
        );
      })}
      <button
        type="button"
        className="ml-1 inline-flex items-center rounded px-1 text-[11px] text-[#6B7280] hover:underline cursor-pointer"
        onClick={() => onSnapshot?.(kw)}
        title="Open SERP Snapshot"
      >
        Snapshot <ExternalLink size={12} className="ml-1" color={TOKENS.brand} />
      </button>
    </div>
  );
}

function TopKeywordsCard({
  rows,
  compareOn,
  onRowOpen,
  onSnapshot,
}: {
  rows: TopKeywordRow[];
  compareOn: boolean;
  onRowOpen?: (kw: string) => void;
  onSnapshot?: (kw: string) => void;
}) {
  const top10 = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => (b.traffic_pct ?? 0) - (a.traffic_pct ?? 0) || (b.vol ?? 0) - (a.vol ?? 0) || a.comp_pos - b.comp_pos)
        .slice(0, 10),
    [rows]
  );

  if (!rows?.length) return <EmptyCard title="Top Organic Keywords" info="Top terms by estimated traffic share." />;

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex items-center justify-between">
        <TitleWithInfo title="Top Organic Keywords" info="Top 10 by estimated traffic contribution. Click a row to open the Keyword Analyzer." />
        <LegendEntities compareOn={compareOn} />
      </div>

      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[#6B7280]">
              <th className="py-2 pr-3 font-medium">
                Keyword <InfoPopover label="Query text for the current Device/Country/Date filters." />
              </th>
              <th className="py-2 pr-3 font-medium text-right">
                Position (Comp) <InfoPopover label="Best competitor position for this keyword." />
              </th>
              <th className="py-2 pr-3 font-medium text-right">
                Volume <InfoPopover label="Estimated monthly search volume." />
              </th>
              <th className="py-2 pr-3 font-medium text-right">
                Traffic % <InfoPopover label="Share of competitor organic traffic attributed to this keyword." />
              </th>
              <th className="py-2 pr-3 font-medium">
                Intent <InfoPopover label="User intent category (Info, Nav, Commercial, Transactional)." />
              </th>
              {compareOn && (
                <th className="py-2 pr-3 font-medium text-right">
                  Your Pos <InfoPopover label="Your best position (— if not ranking)." />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {top10.map((r) => (
              <tr
                key={r.kw}
                className="cursor-pointer border-t hover:bg-[#FAFCFE]"
                style={{ borderColor: TOKENS.border }}
                onClick={() => onRowOpen?.(r.kw)}
                title="Open Keyword Analyzer"
              >
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#111827]">{r.kw}</span>
                    <SerpInlineBadges features={r.serp} onSnapshot={onSnapshot} kw={r.kw} />
                  </div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <span
                    className={`inline-flex items-center justify-end rounded px-1 py-[1px] text-xs ${
                      r.comp_pos <= 3 ? "bg-green-50 text-green-700" : r.comp_pos <= 10 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    #{r.comp_pos}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.vol)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtPct01(r.traffic_pct)}</td>
                <td className="py-2 pr-3">
                  <IntentPillCompact code={r.intent} />
                </td>
                {compareOn && <td className="py-2 pr-3 text-right tabular-nums">{typeof r.your_pos === "number" ? `#${r.your_pos}` : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------- BLOCK C --------------------------------
 * Position Distribution — grouped bars
 * -------------------------------------------------------------------------*/
function PositionDistributionCard({
  dist,
  compareOn,
  projectFaviconUrl,
}: {
  dist: Distribution;
  compareOn: boolean;
  projectFaviconUrl?: string;
}) {
  const hasAny =
    (dist?.comp?.top3 ?? 0) +
      (dist?.comp?.p4_10 ?? 0) +
      (dist?.comp?.p11_20 ?? 0) +
      (dist?.comp?.p21_100 ?? 0) +
      (dist?.you?.top3 ?? 0) +
      (dist?.you?.p4_10 ?? 0) +
      (dist?.you?.p11_20 ?? 0) +
      (dist?.you?.p21_100 ?? 0) >
    0;

  if (!hasAny) return <EmptyCard title="Keyword Position Distribution" info="Aggregate counts by rank bucket." height={240} />;

  const data = (["top3", "p4_10", "p11_20", "p21_100"] as (keyof BucketCounts)[]).map((k) => ({
    bucket: k === "top3" ? BUCKET_LABELS.top3 : k === "p4_10" ? BUCKET_LABELS.p4_10 : k === "p11_20" ? BUCKET_LABELS.p11_20 : BUCKET_LABELS.p21_100,
    comp: dist?.comp?.[k] ?? 0,
    you: dist?.you?.[k] ?? 0,
  }));

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex items-center justify-between">
        <TitleWithInfo title="Keyword Position Distribution" info="Aggregate keyword counts by rank bucket." />
        <LegendEntities compareOn={compareOn} projectFaviconUrl={projectFaviconUrl} />
      </div>

      <div className="h-[240px]" role="img" aria-label="Position distribution by bucket">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 18, left: 2, bottom: 6 }} barGap={6} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={TOKENS.border} />
            <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: TOKENS.muted }} />
            <YAxis tickFormatter={(n) => fmtNum(n as number)} tick={{ fontSize: 12, fill: TOKENS.muted }} />
            <RTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as any;
                return (
                  <div
                    role="tooltip"
                    style={{
                      background: "#fff",
                      border: `1px solid ${TOKENS.border}`,
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 12,
                      pointerEvents: "none",
                      boxShadow: "0 1px 2px rgba(17,24,39,.06)",
                    }}
                  >
                    <div style={{ color: TOKENS.muted }}>{label}</div>
                    <div>
                      <Dot color={TOKENS.compBlue} /> Competitor — <b>{fmtNum(row.comp, false)}</b>
                    </div>
                    {compareOn && (
                      <div>
                        <Dot color={TOKENS.brand} /> You — <b>{fmtNum(row.you, false)}</b>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="comp" name="Competitor" fill={TOKENS.compBlue} radius={[6, 6, 0, 0]} />
            {compareOn && <Bar dataKey="you" name="You" fill={TOKENS.brand} radius={[6, 6, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------------- BLOCK D --------------------------------
 * Intent Distribution — 100% stacks + compact table
 * -------------------------------------------------------------------------*/
function IntentDistributionCard({
  shares,
  totals,
  compareOn,
  projectFaviconUrl,
}: {
  shares: IntentShares;
  totals: { comp: number; you: number };
  compareOn: boolean;
  projectFaviconUrl?: string;
}) {
  const anyShare = (shares?.comp?.info ?? 0) + (shares?.comp?.nav ?? 0) + (shares?.comp?.comm ?? 0) + (shares?.comp?.trans ?? 0) > 0;
  if (!anyShare) return <EmptyCard title="Keyword Intent Distribution" info="Share of keywords by user intent." height={240} />;

  const baseRows = [
    { entity: "Competitor", ...(shares?.comp ?? { info: 0, nav: 0, comm: 0, trans: 0 }) },
    ...(compareOn && shares?.you ? [{ entity: "You", ...(shares.you as any) }] : []),
  ];

  const rows = baseRows.map((r) => ({
    ...r,
    __topKey: findTopKey(r as Record<string, number>, ["info", "nav", "comm", "trans"] as const),
  }));

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex items-center justify-between">
        <TitleWithInfo title="Keyword Intent Distribution" info="Share of keywords by intent; flat stacks with 6px rounding on the top edge only." />
        <LegendEntities compareOn={compareOn} projectFaviconUrl={projectFaviconUrl} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Chart */}
        <div className="h-[240px] lg:col-span-2" role="img" aria-label="Intent share (100% stacked bars)">
          <ResponsiveContainer>
            <BarChart data={rows as any[]} margin={{ top: 10, right: 18, left: 2, bottom: 6 }} stackOffset="expand">
              <CartesianGrid vertical={false} stroke={TOKENS.border} />
              <XAxis dataKey="entity" tick={{ fontSize: 12, fill: TOKENS.muted }} />
              <YAxis tickFormatter={(n) => `${Math.round((n as number) * 100)}%`} tick={{ fontSize: 12, fill: TOKENS.muted }} />
              <RTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const it = payload[0].payload as any;
                  const total = label === "Competitor" ? totals.comp : totals.you;
                  return (
                    <div
                      role="tooltip"
                      style={{
                        background: "#fff",
                        border: `1px solid ${TOKENS.border}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        fontSize: 12,
                        pointerEvents: "none",
                        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
                      }}
                    >
                      <div style={{ color: TOKENS.muted }}>{label}</div>
                      {(["info", "nav", "comm", "trans"] as const).map((k) => (
                        <div key={k}>
                          <Dot color={(INTENT_COLORS as any)[k]} />
                          {INTENT_ABBR[k]} — <b>{fmtPct01(it[k])}</b>
                          {total ? <span className="text-[#6B7280]"> ({fmtNum(Math.round(it[k] * total), false)})</span> : null}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="info" name="Informational" stackId="s" fill={INTENT_COLORS.info} shape={roundedTopShape("info", "__topKey")} />
              <Bar dataKey="nav" name="Navigational" stackId="s" fill={INTENT_COLORS.nav} shape={roundedTopShape("nav", "__topKey")} />
              <Bar dataKey="comm" name="Commercial" stackId="s" fill={INTENT_COLORS.comm} shape={roundedTopShape("comm", "__topKey")} />
              <Bar dataKey="trans" name="Transactional" stackId="s" fill={INTENT_COLORS.trans} shape={roundedTopShape("trans", "__topKey")} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mini table */}
        <div className="lg:col-span-3">
          <div className="rounded-[6px] border" style={{ borderColor: TOKENS.border }}>
            <div className="grid grid-cols-6 gap-0 border-b p-2 text-xs font-medium text-[#6B7280]" style={{ borderColor: TOKENS.border }}>
              <div className="col-span-2">
                Intent <InfoPopover label="Intent abbreviation with color dot. Hover to see full name." />
              </div>
              <div className="text-right">
                Comp <InfoPopover label="Competitor keyword count and % for each intent." />
              </div>
              <div className="text-right">
                You <InfoPopover label="Your keyword count and % for each intent." />
              </div>
              <div className="col-span-2 text-right">
                Examples <InfoPopover label="Up to two example queries for the intent." />
              </div>
            </div>

            {(["info", "nav", "comm", "trans"] as const).map((k) => {
              const cShare = shares?.comp?.[k] ?? 0;
              const yShare = shares?.you?.[k] ?? 0;
              const cCnt = totals?.comp ? Math.round(cShare * totals.comp) : undefined;
              const yCnt = totals?.you ? Math.round(yShare * totals.you) : undefined;
              const ex = shares?.examples?.[k]?.slice(0, 2)?.join(", ");
              return (
                <div key={k} className="grid grid-cols-6 gap-0 border-t p-2 text-sm" style={{ borderColor: TOKENS.border }}>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: (INTENT_COLORS as any)[k] }} />
                    <span title={INTENT_LABEL[k]}>{INTENT_ABBR[k]}</span>
                  </div>
                  <div className="text-right">
                    {cCnt !== undefined ? (
                      <>
                        <span className="tabular-nums">{fmtNum(cCnt, false)}</span>{" "}
                        <span className="text-xs text-[#6B7280]">({fmtPct01(cShare)})</span>
                      </>
                    ) : (
                      <span className="text-[#6B7280]">{fmtPct01(cShare)}</span>
                    )}
                  </div>
                  <div className="text-right">
                    {shares.you ? (
                      yCnt !== undefined ? (
                        <>
                          <span className="tabular-nums">{fmtNum(yCnt, false)}</span>{" "}
                          <span className="text-xs text-[#6B7280]">({fmtPct01(yShare)})</span>
                        </>
                      ) : (
                        <span className="text-[#6B7280]">{fmtPct01(yShare)}</span>
                      )
                    ) : (
                      <span className="text-[#9CA3AF]">—</span>
                    )}
                  </div>
                  <div className="col-span-2 truncate text-right text-xs text-[#6B7280]" title={ex || ""}>
                    {ex || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- BLOCK E --------------------------------
 * SERP Feature Presence — full names + icon placed near the feature title
 * -------------------------------------------------------------------------*/
function FeatureCard({
  code,
  compCount,
  youCount,
  denom,
  compareOn,
  onOpen,
}: {
  code: keyof SerpFeatures["comp"];
  compCount: number;
  youCount?: number;
  denom: number;
  compareOn: boolean;
  onOpen?: () => void;
}) {
  const meta = FEATURE_META[code];
  const Icon = meta.Icon;
  const compPct = Math.min(1, Math.max(0, compCount / Math.max(1, denom)));
  const youPct = Math.min(1, Math.max(0, (youCount ?? 0) / Math.max(1, denom)));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex cursor-pointer items-center justify-between rounded-[6px] border p-3 text-left hover:bg-[#FAFCFE]"
      style={{ borderColor: TOKENS.border }}
      title={`Open ${meta.label} snapshot`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          {/* Icon near title; full feature name shown */}
          <div className="truncate text-sm font-medium text-[#111827]">
            <span className="inline-flex items-center gap-1.5">
              <Icon size={16} color={meta.color} />
              {meta.label}
            </span>
          </div>
          <div className="text-xs text-[#6B7280]">
            • Comp: {fmtNum(compCount, false)} ({fmtPct01(compPct)})
            {compareOn && (
              <>
                {" "}
                • You: {fmtNum(youCount ?? 0, false)} ({fmtPct01(youPct)})
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="ml-4 w-[140px] sm:w-[160px]">
        <div className="h-2 w-full overflow-hidden rounded bg-[#E5E7EB]" aria-label="Competitor coverage">
          <div className="h-2" style={{ width: `${Math.round(compPct * 100)}%`, background: TOKENS.compBlue }} />
        </div>
        {compareOn && (
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-[#E5E7EB]" aria-label="Your coverage">
            <div className="h-2" style={{ width: `${Math.round(youPct * 100)}%`, background: TOKENS.brand }} />
          </div>
        )}
      </div>

      {/* Hover numbers */}
      <div
        className="invisible group-hover:visible absolute -top-8 right-0 rounded-[6px] border bg-white px-2 py-1 text-[11px] shadow"
        style={{ borderColor: TOKENS.border }}
        role="tooltip"
      >
        <span className="mr-2">
          <Dot color={TOKENS.compBlue} />
          Comp: <b>{fmtNum(compCount, false)}</b> ({fmtPct01(compPct)})
        </span>
        {compareOn && (
          <span>
            <Dot color={TOKENS.brand} />
            You: <b>{fmtNum(youCount ?? 0, false)}</b> ({fmtPct01(youPct)})
          </span>
        )}
      </div>
    </button>
  );
}

function SerpFeaturesCard({
  data,
  compareOn,
  onOpenFeature,
}: {
  data: SerpFeatures;
  compareOn: boolean;
  onOpenFeature?: (f: keyof SerpFeatures["comp"]) => void;
}) {
  const denom = Math.max(1, data?.denominator || 1);

  return (
    <div className="rounded-[6px] border p-4 shadow-sm" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 flex items-center justify-between">
        <TitleWithInfo title="SERP Feature Presence" info="Coverage per feature. Hover bars to see counts and percentages." />
        <LegendEntities compareOn={compareOn} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {FEATURE_ORDER.map((f) => (
          <FeatureCard
            key={f}
            code={f}
            compCount={data?.comp?.[f] ?? 0}
            youCount={data?.you?.[f] ?? 0}
            denom={denom}
            compareOn={compareOn}
            onOpen={() => onOpenFeature?.(f)}
          />
        ))}
      </div>

      <div className="mt-2 text-xs text-[#6B7280]">Denominator: {fmtNum(denom, false)} tracked keywords.</div>
    </div>
  );
}

/* --------------------------- INTERNAL SECTION ---------------------------- */
type InternalProps = {
  data: KeywordsSectionData;
  compareOn?: boolean;
  projectFaviconUrl?: string; // favicon for “You”
  onExport?: (fmt: ExportFmt) => void;
  onViewDetailed?: () => void;
  onOpenKeyword?: (kw: string) => void;
  onOpenSerpSnapshot?: (kw: string) => void;
  onOpenSerpFeature?: (feature: keyof SerpFeatures["comp"]) => void;
  canExportPdf?: boolean;
  className?: string;
};

function KeywordsOverviewSection({
  data,
  compareOn: compareDefault = true,
  projectFaviconUrl,
  onExport,
  onViewDetailed,
  onOpenKeyword,
  onOpenSerpSnapshot,
  onOpenSerpFeature,
  canExportPdf = true,
  className,
}: InternalProps) {
  const [compareOn, setCompareOn] = useState<boolean>(!!compareDefault);

  useEffect(() => {
    setCompareOn(!!compareDefault);
  }, [compareDefault]);

  const totals = useMemo(() => {
    const sum = (b?: BucketCounts) => (b ? b.top3 + b.p4_10 + b.p11_20 + b.p21_100 : 0);
    return { comp: sum(data?.distribution?.comp), you: sum(data?.distribution?.you) };
  }, [data?.distribution]);

  return (
    <section id="keywords" className={className} style={SectionFont}>
      {/* Section header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Branded section icon */}
          <span className="grid h-8 w-8 place-items-center rounded-[6px] border" style={{ borderColor: TOKENS.border, background: TOKENS.pastelBlue }}>
            <Search size={16} color={TOKENS.brand} />
          </span>
          <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
            Organic Keywords Overview
          </h3>
          <Chip outline>
            <span className="inline-flex items-center gap-1 text-[#6B7280]">
              <InfoIcon size={12} /> Trend • Top KW • Position/Intent • SERP
            </span>
          </Chip>
        </div>

        <div className="flex items-center gap-2">
          <ToggleSwitch checked={compareOn} onChange={setCompareOn} label="Compare" />
          <button
            onClick={onViewDetailed}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border bg-white px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            title="View detailed Analysis"
          >
            View detailed Analysis
          </button>
          <ExportMenu onExport={onExport} canPdf={canExportPdf} />
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 gap-4 lg:gap-5">
        {/* A) Position Trend */}
        <PositionTrendCard points={data.position_trend ?? []} compareOn={compareOn} projectFaviconUrl={projectFaviconUrl} />

        {/* B/C) Top Keywords + Position Distribution */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TopKeywordsCard rows={data.top10 ?? []} compareOn={compareOn} onRowOpen={onOpenKeyword} onSnapshot={onOpenSerpSnapshot} />
          </div>
          <div className="lg:col-span-2">
            <PositionDistributionCard dist={data.distribution} compareOn={compareOn} projectFaviconUrl={projectFaviconUrl} />
          </div>
        </div>

        {/* D/E) Intent Distribution + SERP Feature Presence */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <IntentDistributionCard shares={data.intent} totals={totals} compareOn={compareOn} projectFaviconUrl={projectFaviconUrl} />
          </div>
          <div className="lg:col-span-2">
            <SerpFeaturesCard data={data.serp_features} compareOn={compareOn} onOpenFeature={onOpenSerpFeature} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- MOCK GENERATORS --------------------------- */
function rnd(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}
function monthsBack(steps: number) {
  return Array.from({ length: steps }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (steps - 1 - i));
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
}
function makeTrendPoints(steps = 8): PositionTrendPoint[] {
  return monthsBack(steps).map((t) => {
    const comp: BucketCounts = { top3: rnd(15, 30), p4_10: rnd(30, 60), p11_20: rnd(50, 90), p21_100: rnd(180, 260) };
    const you: BucketCounts = { top3: rnd(6, 15), p4_10: rnd(15, 35), p11_20: rnd(30, 70), p21_100: rnd(120, 200) };
    return { t, comp, you };
  });
}
function makeTop10(): TopKeywordRow[] {
  const intents: TopKeywordRow["intent"][] = ["informational", "navigational", "commercial", "transactional"];
  const sets: TopKeywordRow["serp"][] = [
    ["FS"],
    ["PAA"],
    ["FS", "PAA"],
    ["IMAGE"],
    ["SITELINKS"],
    ["VIDEO"],
    ["TOP_STORIES"],
    [],
  ];
  return Array.from({ length: 12 }).map((_, i) => ({
    kw: i % 3 === 0 ? `ai seo tools ${i}` : i % 3 === 1 ? `keyword research ${i}` : `rank checker ${i}`,
    comp_pos: rnd(1, 25),
    vol: rnd(800, 12000),
    traffic_pct: Math.max(0.01, Math.min(0.15, Math.random() * 0.15)),
    intent: intents[rnd(0, intents.length - 1)],
    serp: sets[rnd(0, sets.length - 1)],
    your_pos: Math.random() > 0.25 ? rnd(4, 50) : undefined,
  }));
}
function buildMockData(): KeywordsSectionData {
  return {
    position_trend: makeTrendPoints(8),
    granularity: "month",
    top10: makeTop10(),
    distribution: {
      comp: { top3: 24, p4_10: 44, p11_20: 70, p21_100: 220 },
      you: { top3: 9, p4_10: 21, p11_20: 58, p21_100: 150 },
    },
    intent: {
      comp: { info: 0.62, nav: 0.18, comm: 0.14, trans: 0.06 },
      you: { info: 0.58, nav: 0.19, comm: 0.17, trans: 0.06 },
      examples: {
        info: ["what is serp", "how to rank"],
        nav: ["brand login"],
        comm: ["best seo tools"],
        trans: ["buy seo software"],
      },
    },
    serp_features: {
      comp: { FS: 22, PAA: 18, IMAGE: 15, SITELINKS: 9, VIDEO: 6, TOP_STORIES: 3 },
      you: { FS: 8, PAA: 12, IMAGE: 9, SITELINKS: 6, VIDEO: 2, TOP_STORIES: 0 },
      denominator: 1000,
    },
  };
}

/* ----------------------------- DEFAULT EXPORT ---------------------------- */
export default function KeywordsOverviewPanelMock() {
  const [data] = useState<KeywordsSectionData>(() => buildMockData());
  const [compareOn, setCompareOn] = useState(true);

  return (
    <div className="w-full bg-white mt-4" style={SectionFont}>
      <div className="mx-auto w-full">
        {/* Demo controls */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-[#6B7280]">Demo: toggle compare</div>
          <ToggleSwitch checked={compareOn} onChange={setCompareOn} label="Compare" />
        </div>

        <KeywordsOverviewSection
          data={data}
          compareOn={compareOn}
          projectFaviconUrl="/favicon.ico"
          onExport={(fmt) => alert(`Export ${fmt}`)}
          onViewDetailed={() => alert("Open Domain Analysis")}
          onOpenKeyword={(kw) => alert(`Open Keyword Analyzer: ${kw}`)}
          onOpenSerpSnapshot={(kw) => alert(`Open SERP Snapshot: ${kw}`)}
          onOpenSerpFeature={(f) => alert(`Open SERP Feature Snapshot: ${FEATURE_META[f].label}`)}
          canExportPdf={false}
        />
      </div>
    </div>
  );
}
