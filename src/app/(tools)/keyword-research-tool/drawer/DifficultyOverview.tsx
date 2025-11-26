"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Info,
  Sparkles,
  ListChecks,
  FileText,
  ShieldCheck,
  MapPin,
  ActivitySquare,
  CalendarClock,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // Branded icon color
  action: "var(--wr-action, #0077FF)",
  valueBlue: "var(--wr-valueBlue, #4286F5)",
  pastel: "var(--wr-bg-pastel, #D9EEF8)",
  ok: "var(--wr-ok, #10B981)",
  warn: "var(--wr-warn, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  orangeDark: "#D97706",
  radius: "var(--wr-radius, 6px)",
  shadowSm: "var(--wr-shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
};

/* ───────────────────────── Types ───────────────────────── */
type KrMode = "no-domain" | "domain";

export type FactorKey =
  | "authority"
  | "onpage"
  | "brands"
  | "serpFeatures"
  | "intentUniformity"
  | "stability"
  | "contentAdvantageInverse";

type Evidence = Partial<{
  authority: { medianWR?: number; medianLR?: number; iqrWR?: number; highAuthHomepages?: number };
  onpage: { titleH1Match?: string; semanticFit?: "Low" | "Medium" | "High" };
  brands: { strongBrandsTop10?: number };
  serpFeatures: { featuresAboveFold?: string[] };
  intentUniformity: { mix?: string; entropy?: string };
  stability: { volatility?: "Low" | "Medium" | "High" };
  contentAdvantage: { topCoverage?: "Low" | "Medium" | "High"; yourDepth?: string };
}>;

export interface OverviewProps {
  mode: KrMode;
  snapshotAgeDays?: number;
  /** Factors in 0..1 scale */
  wkdBreakdown: Partial<Record<FactorKey, number>>;
  /** Optional custom weights (0..1). If omitted, defaults are applied. */
  weights?: Partial<Record<FactorKey, number>>;
  /** Optional evidence displayed in “Show details” */
  evidence?: Evidence;

  /** Opportunity inputs (optional) */
  cpPct?: number;
  hasFSOrKP?: boolean;
  seasonalMonths?: string[];
  nearWin?: { rank: number; deltaToTop3?: number } | null;
  commercialShare?: number;
  localSurface?: boolean;

  /** Optional: override auto bullets */
  bullets?: BulletInput[];

  /** Actions */
  onOpenSerp?: () => void;
  onOpenWkdHelp?: () => void;

  /** Loading state (skeletons) */
  loading?: boolean;
}

type BulletInput = {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  text: string;
  severity?: "low" | "medium" | "high";
  tag?: "schema" | "depth" | "brand" | "local" | "volatility" | "seasonal" | "nearwin" | "zeroclick";
};

/* ───────────────────────── Meta & helpers ───────────────────────── */
const FACTOR_META: Record<FactorKey, { label: string; tooltip: string }> = {
  authority: { label: "Authority", tooltip: "Median strength of top pages (WR/LR)." },
  onpage: { label: "On‑page", tooltip: "Title/H1 alignment & topical fit among top results." },
  brands: { label: "Brand dominance", tooltip: "Share of strong/household brands in Top‑10." },
  serpFeatures: { label: "SERP features", tooltip: "Crowding by FS, Shopping, Local, Top Stories, etc." },
  intentUniformity: { label: "Intent uniformity", tooltip: "Consistency of intent among top results." },
  stability: { label: "Stability", tooltip: "Lower volatility means tougher to displace." },
  contentAdvantageInverse: { label: "Content advantage", tooltip: "Relative depth/coverage vs top result." },
};

const DEFAULT_WEIGHTS: Record<FactorKey, number> = {
  authority: 0.25,
  onpage: 0.15,
  brands: 0.15,
  serpFeatures: 0.15,
  intentUniformity: 0.1,
  stability: 0.1,
  contentAdvantageInverse: 0.1,
};

function bandFromScore(
  score01?: number
): { band: "Easy" | "Moderate" | "Difficult" | "Very"; color: string } | null {
  if (score01 == null || Number.isNaN(score01)) return null;
  const n = Math.max(0, Math.min(1, score01)) * 100;
  if (n <= 29) return { band: "Easy", color: TK.ok };
  if (n <= 54) return { band: "Moderate", color: TK.warn };
  if (n <= 74) return { band: "Difficult", color: TK.orangeDark };
  return { band: "Very", color: TK.critical };
}

function pct(n?: number): string {
  return n == null || Number.isNaN(n) ? "—" : `${Math.round(n)}%`;
}

function sevRank(s?: "low" | "medium" | "high") {
  return s === "high" ? 3 : s === "medium" ? 2 : s === "low" ? 1 : 0;
}

/* ───────────────────────── Micro UI ───────────────────────── */
const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" color={TK.brand} aria-hidden />
        <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
};

const Pill: React.FC<{ children: React.ReactNode; tone?: "default" | "warn" }> = ({
  children,
  tone = "default",
}) => (
  <span
    className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full"
    style={{
      border: `1px solid ${TK.borderLight}`,
      background: tone === "warn" ? "#FFFBEB" : "#FFF",
      color: tone === "warn" ? TK.warn : TK.muted,
    }}
  >
    {children}
  </span>
);

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: color }} />
);

/* Row showing label + info + contribution bar */
const FactorRow: React.FC<{
  label: string;
  tooltip: string;
  score01?: number; // 0..1 for band color
  contributionPct?: number; // 0..100 for bar width
  evidence?: string;
}> = ({ label, tooltip, score01, contributionPct, evidence }) => {
  const band = bandFromScore(score01);
  const width = Math.max(0, Math.min(100, contributionPct ?? 0));
  const [hover, setHover] = React.useState(false);

  return (
    <div
      className="flex items-center gap-3 py-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="listitem"
    >
      <div className="min-w-[180px] flex items-center gap-1.5">
        <span className="text-[12px] font-medium" style={{ color: TK.text }}>
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={`${label} info`}
              className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
            >
              <Info size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1">
        <div className="w-full h-2 rounded-full bg-gray-100 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${width}%`, background: band ? band.color : "#CBD5E1" }}
          />
        </div>
        {evidence && (
          <div className="text-xs mt-1" style={{ color: TK.muted }}>
            {evidence}
          </div>
        )}
      </div>

      <div className="w-[80px] text-right text-[12px]" style={{ color: TK.muted }}>
        {pct(contributionPct)}
      </div>

      {hover && band && (
        <span
          className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px]"
          style={{ border: `1px solid ${TK.borderLight}`, color: band.color, background: "#FFF" }}
        >
          <Dot color={band.color} /> {band.band}
        </span>
      )}
    </div>
  );
};

/* Difficulty breakdown card */
const DifficultyBreakdown: React.FC<{
  snapshotAgeDays?: number;
  breakdown: Partial<Record<FactorKey, number>>;
  weights?: Partial<Record<FactorKey, number>>;
  evidence?: Evidence;
  onOpenWkdHelp?: () => void;
}> = ({ snapshotAgeDays, breakdown, weights, evidence, onOpenWkdHelp }) => {
  const W = { ...DEFAULT_WEIGHTS, ...(weights || {}) };

  const factors: { key: FactorKey; value?: number }[] = React.useMemo(
    () => [
      { key: "authority", value: breakdown.authority },
      { key: "onpage", value: breakdown.onpage },
      { key: "brands", value: breakdown.brands },
      { key: "serpFeatures", value: breakdown.serpFeatures },
      { key: "intentUniformity", value: breakdown.intentUniformity },
      { key: "stability", value: breakdown.stability },
      { key: "contentAdvantageInverse", value: breakdown.contentAdvantageInverse },
    ],
    [breakdown]
  );

  const total = React.useMemo(() => {
    let sum = 0;
    for (const f of factors) {
      const v = typeof f.value === "number" ? Math.max(0, Math.min(1, f.value)) : null;
      if (v != null) sum += (W[f.key] || 0) * v;
    }
    return sum;
  }, [factors, W]);

  const rows = React.useMemo(() => {
    return factors.map((f) => {
      const v = typeof f.value === "number" ? Math.max(0, Math.min(1, f.value)) : undefined;
      const w = W[f.key] || 0;
      const contrib = total > 0 && v != null ? ((w * v) / total) * 100 : 0;
      return {
        key: f.key,
        score01: v,
        contributionPct: contrib,
        meta: FACTOR_META[f.key],
        evidence: factorEvidenceString(f.key, evidence),
      };
    });
  }, [factors, W, total, evidence]);

  const [openDetails, setOpenDetails] = React.useState(false);

  return (
    <div className="rounded-md bg-white" style={{ border: `1px solid ${TK.borderLight}`, boxShadow: TK.shadowSm }}>
      <header className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
        <div className="flex items-center gap-2">
          <h4 className="text-[14px] font-semibold" style={{ color: TK.text }}>
            Difficulty breakdown
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 cursor-pointer"
            onClick={onOpenWkdHelp}
            title="How WKD is calculated"
          >
            How WKD is calculated
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {typeof snapshotAgeDays === "number" && (
            <Pill tone={snapshotAgeDays > 7 ? "warn" : "default"}>SERP snapshot: {snapshotAgeDays}d ago</Pill>
          )}
          <button
            className="inline-flex items-center gap-1 text-sm cursor-pointer"
            onClick={() => setOpenDetails((v) => !v)}
            aria-expanded={openDetails}
            style={{ color: TK.action }}
          >
            {openDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Show details
          </button>
        </div>
      </header>

      <div className="p-4">
        <div role="list" className="space-y-2">
          {rows.map((r) => (
            <FactorRow
              key={r.key}
              label={r.meta.label}
              tooltip={r.meta.tooltip}
              score01={r.score01}
              contributionPct={r.contributionPct}
              evidence={!openDetails ? undefined : r.evidence}
            />
          ))}
        </div>
      </div>

      {openDetails && (
        <div className="px-4 pb-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {detailItemsFromEvidence(evidence).map((it, idx) => (
              <div key={idx} className="rounded-md border p-3 bg-white" style={{ borderColor: TK.borderLight }}>
                <div className="text-[12px] font-medium mb-1" style={{ color: TK.text }}>
                  {it.label}
                </div>
                <div className="text-[12px]" style={{ color: TK.muted }}>
                  {it.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* Opportunity rationale card */
const OpportunityRationale: React.FC<{
  mode: KrMode;
  bullets?: BulletInput[];
  cpPct?: number;
  hasFSOrKP?: boolean;
  seasonalMonths?: string[];
  nearWin?: { rank: number; deltaToTop3?: number } | null;
  contentGapScore01?: number;
  brandDomScore01?: number;
  stabilityScore01?: number;
  commercialShare?: number;
  localSurface?: boolean;
  onOpenSerp?: () => void;
}> = ({
  mode,
  bullets,
  cpPct,
  hasFSOrKP,
  seasonalMonths,
  nearWin,
  contentGapScore01,
  brandDomScore01,
  stabilityScore01,
  commercialShare,
  localSurface,
  onOpenSerp,
}) => {
  const autoBullets = React.useMemo<BulletInput[]>(() => {
    const out: BulletInput[] = [];

    if ((cpPct != null && cpPct <= 15) && hasFSOrKP) {
      out.push({
        id: "zeroclick",
        icon: <Sparkles className="h-4 w-4" />,
        title: "Featured surfaces suppress clicks",
        text: "Featured Snippet + PAA above the fold. Expect lower CP% unless you capture FS.",
        severity: "high",
        tag: "zeroclick",
      });
    }

    if ((contentGapScore01 ?? 0.5) >= 0.45) {
      out.push({
        id: "schema",
        icon: <ListChecks className="h-4 w-4" />,
        title: "Add FAQ/HowTo schema for footprint",
        text: "Few top results use rich schema—enrich results to lift CP% and differentiators.",
        severity: "medium",
        tag: "schema",
      });
    }

    if ((contentGapScore01 ?? 0.6) >= 0.6) {
      out.push({
        id: "depth",
        icon: <FileText className="h-4 w-4" />,
        title: "Depth & coverage gap vs top results",
        text: "Top results cover more subtopics; expand coverage for parity.",
        severity: "high",
        tag: "depth",
      });
    }

    if ((brandDomScore01 ?? 0) >= 0.55) {
      out.push({
        id: "brand",
        icon: <ShieldCheck className="h-4 w-4" />,
        title: "Household brands dominate Top‑10",
        text: "Expect higher effort; target long‑tail or intersecting modifiers.",
        severity: "medium",
        tag: "brand",
      });
    }

    if ((stabilityScore01 ?? 0.5) <= 0.35) {
      out.push({
        id: "volatility",
        icon: <ActivitySquare className="h-4 w-4" />,
        title: "SERP volatile—room to break in",
        text: "Recent position changes increase entry likelihood; publish and iterate quickly.",
        severity: "medium",
        tag: "volatility",
      });
    }

    if (localSurface) {
      out.push({
        id: "local",
        icon: <MapPin className="h-4 w-4" />,
        title: "Local pack visible; add local signals",
        text: "Add local qualifiers, GMB optimization, and location schema if applicable.",
        severity: "low",
        tag: "local",
      });
    }

    if (seasonalMonths && seasonalMonths.length > 0) {
      out.push({
        id: "seasonal",
        icon: <CalendarClock className="h-4 w-4" />,
        title: `Seasonal peak (${seasonalMonths.join("–")})`,
        text: "Publish 6–8 weeks before peak. Repurpose during off‑season.",
        severity: "medium",
        tag: "seasonal",
      });
    }

    if (mode === "domain" && nearWin?.rank && nearWin.rank >= 4 && nearWin.rank <= 15) {
      const delta = nearWin.deltaToTop3 != null ? `Δ${nearWin.deltaToTop3}` : "close";
      out.push({
        id: "nearwin",
        icon: <TrendingUp className="h-4 w-4" />,
        title: `Near‑Win: #${nearWin.rank} (${delta} to Top‑3)`,
        text: "Retarget page with FAQ + internal links; expect CP% lift.",
        severity: "high",
        tag: "nearwin",
      });
    }

    out.sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
    return out.slice(0, 6);
  }, [
    mode,
    cpPct,
    hasFSOrKP,
    seasonalMonths,
    nearWin,
    contentGapScore01,
    brandDomScore01,
    stabilityScore01,
    localSurface,
  ]);

  const finalBullets = bullets && bullets.length ? bullets : autoBullets;

  const callouts: { label: string; color: string }[] = [];
  const cp = cpPct ?? 0;
  if ((stabilityScore01 ?? 0.5) <= 0.4 || cp >= 20) callouts.push({ label: "Quick win", color: TK.ok });
  if ((commercialShare ?? 0) >= 0.3) callouts.push({ label: "MoFU", color: TK.action });
  if (localSurface) callouts.push({ label: "Local priority", color: TK.action });
  if (seasonalMonths && seasonalMonths.length > 0) callouts.push({ label: "Seasonal", color: "#6366F1" });

  return (
    <div className="rounded-md bg-white" style={{ border: `1px solid ${TK.borderLight}`, boxShadow: TK.shadowSm }}>
      <header className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
        <h4 className="text-[14px] font-semibold" style={{ color: TK.text }}>
          Opportunity rationale
        </h4>
        <button
          className="inline-flex items-center gap-1 text-sm cursor-pointer"
          onClick={onOpenSerp}
          title="Open SERP snapshot"
          style={{ color: TK.valueBlue }}
        >
          View full SERP <ExternalLink size={16} />
        </button>
      </header>

      <div className="p-4">
        {finalBullets.length === 0 ? (
          <div className="text-sm" style={{ color: TK.muted }}>
            No specific opportunities detected. Check SERP Summary for more context.
          </div>
        ) : (
          <ul className="space-y-3">
            {finalBullets.map((b, i) => (
              <li key={b.id || i} className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 text-[#9E9E9E]">{b.icon || <Sparkles className="h-4 w-4" />}</span>
                <div className="flex-1">
                  <div className="text-[13px]">
                    <span className="font-semibold" style={{ color: TK.text }}>
                      {b.title}
                    </span>
                    {b.severity && (
                      <span
                        className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px]"
                        style={{
                          border: `1px solid ${TK.borderLight}`,
                          color:
                            b.severity === "high"
                              ? TK.critical
                              : b.severity === "medium"
                              ? TK.warn
                              : TK.muted,
                          background: "#FFF",
                        }}
                      >
                        {b.severity[0].toUpperCase() + b.severity.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: TK.muted }}>
                    {b.text}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {callouts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {callouts.map((c, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px]"
                style={{ border: `1px solid ${TK.borderLight}`, color: c.color, background: "#FFF" }}
              >
                <Dot color={c.color} /> {c.label}
              </span>
            ))}
            <div className="text-[11px] ml-auto" style={{ color: TK.muted }}>
              Generated from current snapshot and site context
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* Evidence helpers */
function factorEvidenceString(key: FactorKey, ev?: Evidence): string | undefined {
  if (!ev) return undefined;
  switch (key) {
    case "authority": {
      const e = ev.authority;
      const parts = [
        e?.medianWR != null ? `Median WR ${e.medianWR}` : null,
        e?.medianLR != null ? `Median LR ${e.medianLR}` : null,
        e?.highAuthHomepages != null ? `High‑auth homepages: ${e.highAuthHomepages}` : null,
      ].filter(Boolean);
      return parts.join(" • ") || undefined;
    }
    case "onpage": {
      const e = ev.onpage;
      const parts = [e?.titleH1Match ? `Title/H1 match: ${e.titleH1Match}` : null, e?.semanticFit ? `Semantic fit: ${e.semanticFit}` : null].filter(Boolean);
      return parts.join(" • ") || undefined;
    }
    case "brands": {
      const e = ev.brands;
      if (e?.strongBrandsTop10 != null) return `Strong brands in Top‑10: ${e.strongBrandsTop10}`;
      return undefined;
    }
    case "serpFeatures": {
      const e = ev.serpFeatures;
      if (e?.featuresAboveFold?.length) return `${e.featuresAboveFold.join(", ")} above fold`;
      return undefined;
    }
    case "intentUniformity": {
      const e = ev.intentUniformity;
      const parts = [e?.mix ? `Intent mix: ${e.mix}` : null, e?.entropy ? `Entropy: ${e.entropy}` : null].filter(Boolean);
      return parts.join(" • ") || undefined;
    }
    case "stability": {
      const e = ev.stability;
      if (e?.volatility) return `30‑day volatility: ${e.volatility}`;
      return undefined;
    }
    case "contentAdvantageInverse": {
      const e = ev.contentAdvantage;
      const parts = [e?.topCoverage ? `Top result coverage: ${e.topCoverage}` : null, e?.yourDepth ? `Your depth: ${e.yourDepth}` : null].filter(Boolean);
      return parts.join(" • ") || undefined;
    }
    default:
      return undefined;
  }
}

function detailItemsFromEvidence(ev?: Evidence): { label: string; value: string }[] {
  if (!ev) return [];
  const out: { label: string; value: string }[] = [];

  if (ev.authority) {
    const s = [
      ev.authority.medianWR != null ? `Median WR ${ev.authority.medianWR}` : null,
      ev.authority.medianLR != null ? `Median LR ${ev.authority.medianLR}` : null,
      ev.authority.iqrWR != null ? `IQR WR ${ev.authority.iqrWR}` : null,
      ev.authority.highAuthHomepages != null ? `High‑auth homepages ${ev.authority.highAuthHomepages}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
    if (s) out.push({ label: "Authority evidence", value: s });
  }

  if (ev.onpage) {
    const s = [ev.onpage.titleH1Match ? `Title/H1 match: ${ev.onpage.titleH1Match}` : null, ev.onpage.semanticFit ? `Semantic fit: ${ev.onpage.semanticFit}` : null]
      .filter(Boolean)
      .join(" • ");
    if (s) out.push({ label: "On‑page evidence", value: s });
  }

  if (ev.brands) {
    const s = ev.brands.strongBrandsTop10 != null ? `Strong brands in Top‑10: ${ev.brands.strongBrandsTop10}` : "";
    if (s) out.push({ label: "Brand evidence", value: s });
  }

  if (ev.serpFeatures?.featuresAboveFold?.length) {
    out.push({ label: "SERP features evidence", value: `${ev.serpFeatures.featuresAboveFold.join(", ")} above fold` });
  }

  if (ev.intentUniformity) {
    const s = [ev.intentUniformity.mix ? `Intent mix: ${ev.intentUniformity.mix}` : null, ev.intentUniformity.entropy ? `Entropy: ${ev.intentUniformity.entropy}` : null]
      .filter(Boolean)
      .join(" • ");
    if (s) out.push({ label: "Intent evidence", value: s });
  }

  if (ev.stability?.volatility) {
    out.push({ label: "Stability evidence", value: `30‑day volatility: ${ev.stability.volatility}` });
  }

  if (ev.contentAdvantage) {
    const s = [ev.contentAdvantage.topCoverage ? `Top result coverage: ${ev.contentAdvantage.topCoverage}` : null, ev.contentAdvantage.yourDepth ? `Your depth: ${ev.contentAdvantage.yourDepth}` : null]
      .filter(Boolean)
      .join(" • ");
    if (s) out.push({ label: "Content advantage evidence", value: s });
  }

  return out;
}

/* ───────────────────────── Exported component with MOCK DATA defaults ───────────────────────── */

/** Deep-merge helper for Evidence (keeps nested keys) */
function mergeEvidence(base?: Evidence, override?: Evidence): Evidence | undefined {
  if (!base && !override) return undefined;
  return {
    ...base,
    ...override,
    authority: { ...(base?.authority || {}), ...(override?.authority || {}) },
    onpage: { ...(base?.onpage || {}), ...(override?.onpage || {}) },
    brands: { ...(base?.brands || {}), ...(override?.brands || {}) },
    serpFeatures: { ...(base?.serpFeatures || {}), ...(override?.serpFeatures || {}) },
    intentUniformity: { ...(base?.intentUniformity || {}), ...(override?.intentUniformity || {}) },
    stability: { ...(base?.stability || {}), ...(override?.stability || {}) },
    contentAdvantage: { ...(base?.contentAdvantage || {}), ...(override?.contentAdvantage || {}) },
  };
}

/**
 * Drawer: Keyword Analyzer Drawer
 * Section 2: Keyword Difficulty Overview
 *
 * Renders with **mock demo data by default**. Pass props to override.
 */
type KeywordDifficultyOverviewProps = Partial<OverviewProps>;

export default function KeywordDifficultyOverview(props: KeywordDifficultyOverviewProps = {}) {
  // ---- Mock demo data (used unless overridden via props) ----
  const demo: OverviewProps = {
    mode: "domain",
    snapshotAgeDays: 2,
    wkdBreakdown: {
      authority: 0.82,
      onpage: 0.74,
      brands: 0.68,
      serpFeatures: 0.7,
      intentUniformity: 0.85,
      stability: 0.75,
      contentAdvantageInverse: 0.3,
    },
    evidence: {
      authority: { medianWR: 74, medianLR: 61, highAuthHomepages: 3 },
      onpage: { titleH1Match: "6/10", semanticFit: "High" },
      brands: { strongBrandsTop10: 5 },
      serpFeatures: { featuresAboveFold: ["FS", "PAA", "Images"] },
      intentUniformity: { mix: "70% Info / 30% Comm" },
      stability: { volatility: "Low" },
      contentAdvantage: { topCoverage: "High", yourDepth: "Medium" },
    },
    cpPct: 18,
    hasFSOrKP: true,
    seasonalMonths: ["Apr", "Jun"],
    nearWin: { rank: 8, deltaToTop3: 2 },
    commercialShare: 0.32,
    localSurface: false,
    onOpenSerp: () => alert("Open SERP Snapshot"),
    onOpenWkdHelp: () => alert("Open docs: How WKD is calculated"),
  };

  // ---- Merge props over demo (null-safe everywhere) ----
  const mode: KrMode = props.mode ?? demo.mode;
  const snapshotAgeDays = props.snapshotAgeDays ?? demo.snapshotAgeDays;
  const wkdBreakdown: Partial<Record<FactorKey, number>> = {
    ...demo.wkdBreakdown,
    ...(props.wkdBreakdown || {}),
  };
  const weights = { ...DEFAULT_WEIGHTS, ...(props.weights || {}) };
  const evidence = mergeEvidence(demo.evidence, props.evidence);

  const cpPct = props.cpPct ?? demo.cpPct;
  const hasFSOrKP = props.hasFSOrKP ?? demo.hasFSOrKP;
  const seasonalMonths = props.seasonalMonths ?? demo.seasonalMonths;
  const nearWin = props.nearWin ?? demo.nearWin;
  const commercialShare = props.commercialShare ?? demo.commercialShare;
  const localSurface = props.localSurface ?? demo.localSurface;
  const bullets = props.bullets; // if provided, overrides auto
  const onOpenSerp = props.onOpenSerp ?? demo.onOpenSerp;
  const onOpenWkdHelp = props.onOpenWkdHelp ?? demo.onOpenWkdHelp;

  return (
    <div
      className="rounded-md border bg-white"
      style={{
        borderColor: TK.borderLight,
        boxShadow: TK.shadowSm,
        fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui",
        color: TK.text,
      }}
    >
      <TooltipProvider delayDuration={150}>
        {/* Section title with branded icon */}
        <SectionHeader
          title="Keyword Difficulty Overview"
          right={
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[12px]"
                style={{ borderColor: TK.borderLight, background: "#FFF", color: TK.muted }}
                title="Context"
              >
                <Dot color={mode === "domain" ? TK.ok : TK.valueBlue} />
                {mode === "domain" ? "Domain‑aware" : "No‑domain"}
              </span>
              <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={onOpenWkdHelp} title="How WKD is calculated">
                How WKD works
              </Button>
            </div>
          }
        />

        <div className="p-4 space-y-3">
          {/* Card A: Difficulty breakdown */}
          <DifficultyBreakdown
            snapshotAgeDays={snapshotAgeDays}
            breakdown={wkdBreakdown}
            weights={weights}
            evidence={evidence}
            onOpenWkdHelp={onOpenWkdHelp}
          />

          {/* Card B: Opportunity rationale */}
          <OpportunityRationale
            mode={mode}
            bullets={bullets}
            cpPct={cpPct}
            hasFSOrKP={hasFSOrKP}
            seasonalMonths={seasonalMonths}
            nearWin={nearWin}
            contentGapScore01={wkdBreakdown.contentAdvantageInverse}
            brandDomScore01={wkdBreakdown.brands}
            stabilityScore01={wkdBreakdown.stability}
            commercialShare={commercialShare}
            localSurface={localSurface}
            onOpenSerp={onOpenSerp}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
