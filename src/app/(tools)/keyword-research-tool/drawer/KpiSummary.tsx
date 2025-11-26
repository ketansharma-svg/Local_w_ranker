"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Info,
  BarChart3,
  Shield,
  Layers,
  MousePointer,
  Target,
  TrendingUp,
  AlertTriangle,
  FileDown,
} from "lucide-react";

/* ───────────────────────── Tokens (match Wranker) ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // branded icon color
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
type IntentKey = "informational" | "commercial" | "transactional" | "navigational" | "local";
type ZeroClick = "low" | "medium" | "high";

export interface KpiData {
  wkd?: number; // 0..100
  intent?: {
    primary?: IntentKey;
    mix?: Partial<Record<IntentKey, number>>; // 0..1 sum ~1
  };
  cpTop3Pct?: number; // % when not ranking
  yourRank?: number; // positive integer if ranking
  yourCpPct?: number; // % at current rank
  wos?: number; // 0..100
  tm?: number; // -2..+2
  zeroClickRisk?: ZeroClick | null; // show chip when "high" or "medium"
}

export interface KpiStripProps {
  mode: KrMode;
  data?: KpiData; // optional for resilience
  className?: string;
}

/* ───────────────────────── Helpers ───────────────────────── */
const INTENT_LABEL: Record<IntentKey, string> = {
  informational: "Informational",
  commercial: "Commercial",
  transactional: "Transactional",
  navigational: "Navigational",
  local: "Local",
};
const INTENT_ABBR: Record<IntentKey, "I" | "C" | "T" | "N" | "L"> = {
  informational: "I",
  commercial: "C",
  transactional: "T",
  navigational: "N",
  local: "L",
};
const INTENT_COLOR: Record<IntentKey, string> = {
  informational: "#6366F1", // indigo
  commercial: TK.ok,
  transactional: TK.critical,
  navigational: TK.warn,
  local: TK.action,
};

function fmtPct(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)}%`;
}
function fmtTM(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}
function wkdBand(n?: number): { band: "Easy" | "Moderate" | "Difficult" | "Very"; color: string } | null {
  if (n == null || Number.isNaN(n)) return null;
  if (n <= 29) return { band: "Easy", color: TK.ok };
  if (n <= 54) return { band: "Moderate", color: TK.warn };
  if (n <= 74) return { band: "Difficult", color: TK.orangeDark };
  return { band: "Very", color: TK.critical };
}
function zeroClickColor(z: ZeroClick): string {
  return z === "high" ? TK.critical : z === "medium" ? TK.warn : TK.ok;
}

/* ───────────────────────── Small UI atoms ───────────────────────── */
const SectionShell: React.FC<
  React.PropsWithChildren<{ title: string; onExport?: () => void; className?: string }>
> = ({ title, onExport, className, children }) => (
  <section
    className={`rounded-md border bg-white ${className || ""}`}
    style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm }}
  >
    <header
      className="px-4 py-3 border-b flex items-center justify-between"
      style={{ borderColor: TK.borderLight }}
    >
      <div className="flex items-center gap-2">
        <BarChart3 size={18} color={TK.brand} aria-hidden />
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-[#F7FAFC]"
          style={{ borderColor: TK.borderLight }}
          onClick={onExport}
          title="Export"
          aria-label="Export"
        >
          <FileDown className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Export</span>
        </button>
      </div>
    </header>
    <div className="p-3">{children}</div>
  </section>
);

const CardTitle: React.FC<React.PropsWithChildren<{ icon: React.ReactNode }>> = ({ icon, children }) => (
  <div className="flex items-center gap-1.5">
    <span className="inline-flex items-center" aria-hidden>
      {icon}
    </span>
    <span>{children}</span>
  </div>
);

const ChipBox: React.FC<React.PropsWithChildren<{ title?: string; noMin?: boolean }>> = ({
  children,
  title,
  noMin,
}) => (
  <div
    title={title}
    className={`rounded-[6px] border bg-white ${noMin ? "" : "min-w-[220px]"} px-3 py-2 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]`}
    style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm }}
    role="group"
  >
    {children}
  </div>
);

const LabelRow: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="flex items-center gap-1.5 text-[12px]" style={{ color: TK.muted }}>
    {children}
  </div>
);

const ValueRow: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="mt-1 flex items-center gap-2 text-[15px] font-semibold" style={{ color: TK.action }}>
    {children}
  </div>
);

const Tag: React.FC<React.PropsWithChildren<{ muted?: boolean }>> = ({ children, muted }) => (
  <span
    className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] ${
      muted ? "text-[color:var(--wr-muted,#6B7280)]" : ""
    }`}
    style={{ borderColor: TK.borderLight, background: "#fff" }}
  >
    {children}
  </span>
);

const Dot: React.FC<{ color: string; title?: string }> = ({ color, title }) => (
  <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: color }} title={title} />
);

/* ───────────────────────── Smart Hover Popover (charts) ───────────────────────── */
const SmartPopover: React.FC<{ anchor: DOMRect | null; children: React.ReactNode }> = ({ anchor, children }) => {
  if (!anchor) return null;
  const leftMax = typeof window !== "undefined" ? window.innerWidth - 260 : anchor.left;
  const style: React.CSSProperties = {
    position: "fixed",
    top: anchor.bottom + 8,
    left: Math.min(anchor.left, leftMax),
    zIndex: 350,
    background: "#fff",
    border: `1px solid ${TK.borderLight}`,
    borderRadius: 8,
    boxShadow: TK.shadowSm,
    padding: 10,
    width: 240,
    pointerEvents: "none",
  };
  return <div style={style}>{children}</div>;
};

/* ───────────────────────── Intent mix stacked bar (with smart popover) ───────────────────────── */
const IntentStack: React.FC<{
  mix?: Partial<Record<IntentKey, number>>;
}> = ({ mix }) => {
  const entries = (Object.keys(INTENT_LABEL) as IntentKey[])
    .map((k) => ({ key: k, v: Math.max(0, Math.min(1, mix?.[k] ?? 0)) }))
    .filter((e) => e.v > 0);
  const total = entries.reduce((s, e) => s + e.v, 0) || 0;
  const normalized = total > 0 ? entries.map((e) => ({ ...e, pct: (e.v / total) * 100 })) : [];
  const text = normalized
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map((e) => `${INTENT_LABEL[e.key].split(" ")[0]} ${Math.round(e.pct)}%`)
    .join(" • ");

  const [rect, setRect] = React.useState<DOMRect | null>(null);

  return (
    <>
      <div
        className="w-full cursor-pointer"
        onMouseEnter={(e) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        <div className="flex w-full h-2 overflow-hidden rounded-full" style={{ background: "#F3F4F6" }}>
          {normalized.length === 0 ? (
            <div className="h-full w-full" style={{ background: "#E5E7EB" }} />
          ) : (
            normalized.map(({ key, pct }) => (
              <div
                key={key}
                className="h-full"
                style={{ width: `${pct}%`, background: INTENT_COLOR[key] }}
                title={`${INTENT_LABEL[key]} • ${Math.round(pct)}%`}
              />
            ))
          )}
        </div>
        <div className="mt-1 text-xs" style={{ color: TK.muted }}>
          {text || "—"}
        </div>
      </div>

      <SmartPopover anchor={rect}>
        <div className="text-xs">
          <div className="font-semibold mb-1">Intent Mix</div>
          {normalized.length === 0 ? (
            <div style={{ color: TK.muted }}>No intent distribution</div>
          ) : (
            <ul className="space-y-1">
              {normalized
                .sort((a, b) => b.pct - a.pct)
                .map((e) => (
                  <li key={e.key} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Dot color={INTENT_COLOR[e.key]} />
                      {INTENT_LABEL[e.key]}
                    </span>
                    <span>{Math.round(e.pct)}%</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </SmartPopover>
    </>
  );
};

/* ───────────────────────── WOS mini bar (with smart popover) ───────────────────────── */
const MiniBar: React.FC<{ value?: number; color?: string }> = ({ value, color = TK.valueBlue }) => {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const bucket: { label: "Low" | "Medium" | "High"; color: string } =
    v >= 70 ? { label: "High", color: TK.ok } : v >= 40 ? { label: "Medium", color: TK.warn } : { label: "Low", color: color };

  return (
    <>
      <div
        className="w-full h-2 rounded-full bg-gray-100 relative overflow-hidden cursor-pointer"
        onMouseEnter={(e) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </div>

      <SmartPopover anchor={rect}>
        <div className="text-xs">
          <div className="font-semibold mb-1">WOS • Opportunity Score</div>
          <div className="mb-2">
            Score: <strong>{Math.round(v)}</strong> / 100
          </div>
          <ul className="space-y-1">
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Dot color={TK.valueBlue} /> <span>Low (&lt; 40)</span>
              </span>
              <span>{v < 40 ? "current" : ""}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Dot color={TK.warn} /> <span>Medium (40–69)</span>
              </span>
              <span>{v >= 40 && v < 70 ? "current" : ""}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Dot color={TK.ok} /> <span>High (70+)</span>
              </span>
              <span>{v >= 70 ? "current" : ""}</span>
            </li>
          </ul>
          <div className="mt-2">
            Bucket:{" "}
            <span className="inline-flex items-center gap-2">
              <Dot color={bucket.color} /> <strong>{bucket.label}</strong>
            </span>
          </div>
        </div>
      </SmartPopover>
    </>
  );
};

/* ───────────────────────── TM badge ───────────────────────── */
const TmBadge: React.FC<{ tm?: number }> = ({ tm }) => {
  const val = tm ?? 0;
  const dir = val > 0.25 ? "up" : val < -0.25 ? "down" : "flat";
  const col = dir === "up" ? TK.ok : dir === "down" ? TK.critical : TK.muted;
  return (
    <span className="inline-flex items-center gap-1">
      <TrendingUp size={16} style={{ color: col }} aria-hidden />
      <span style={{ color: TK.action, fontWeight: 600 }}>{fmtTM(tm)}</span>
    </span>
  );
};

/* ───────────────────────── KPI Strip ───────────────────────── */
export const KpiStrip: React.FC<KpiStripProps> = ({ mode, data, className }) => {
  const d: KpiData = data ?? {};
  const band = wkdBand(d.wkd);
  const cpIsYours = mode === "domain" && !!d.yourRank && d.yourRank > 0 && d.yourCpPct != null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3 ${className || ""}`} style={{ alignItems: "stretch" }}>
        {/* WKD (Difficulty) */}
        <ChipBox title="Competition based on current SERP strength, features & brands.">
          <div className="flex items-center justify-between">
            <LabelRow>
              <CardTitle icon={<Shield size={14} color={TK.brand} />}>WKD • Difficulty</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="WKD info"
                    className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
                    title="What is WKD?"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Competition based on current SERP strength, features & brands.</TooltipContent>
              </Tooltip>
            </LabelRow>
            {band && (
              <Tag muted>
                <Dot color={band.color} /> <span className="ml-1">{band.band}</span>
              </Tag>
            )}
          </div>
          <ValueRow>
            <span>{d.wkd != null ? Math.round(d.wkd) : "—"}</span>
          </ValueRow>
        </ChipBox>

        {/* Intent mix */}
        <ChipBox title="Primary & secondary intents inferred from query & SERP.">
          <div className="flex items-center justify-between">
            <LabelRow>
              <CardTitle icon={<Layers size={14} color={TK.brand} />}>Intent mix</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Intent info"
                    className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
                    title="How intent is inferred"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Primary &amp; secondary intents inferred from query &amp; SERP.</TooltipContent>
              </Tooltip>
            </LabelRow>
            {d.intent?.primary && (
              <Tag>
                <Dot color={INTENT_COLOR[d.intent.primary]} />
                <span className="ml-1">{INTENT_ABBR[d.intent.primary]}</span>
              </Tag>
            )}
          </div>
          <div className="mt-2">
            <IntentStack mix={d.intent?.mix} />
          </div>
        </ChipBox>

        {/* CP% */}
        <ChipBox title="Expected organic click share after SERP feature damping.">
          <div className="flex items-center justify-between">
            <LabelRow>
              <CardTitle icon={<MousePointer size={14} color={TK.brand} />}>CP% • Click Potential</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="CP info"
                    className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
                    title="Click Potential"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Expected organic click share after SERP feature damping.</TooltipContent>
              </Tooltip>
            </LabelRow>
          </div>
          <ValueRow>
            {cpIsYours ? (
              <>
                <span>{fmtPct(d.yourCpPct)}</span>
                <Tag muted>@ #{d.yourRank}</Tag>
              </>
            ) : (
              <>
                <span>{fmtPct(d.cpTop3Pct)}</span>
                <Tag muted>Top‑3</Tag>
              </>
            )}
          </ValueRow>
        </ChipBox>

        {/* WOS */}
        <ChipBox title="Volume × CP% × (1−WKD) with momentum & fit.">
          <div className="flex items-center justify-between">
            <LabelRow>
              <CardTitle icon={<Target size={14} color={TK.brand} />}>WOS • Opportunity Score</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="WOS info"
                    className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
                    title="Opportunity Score"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Volume × CP% × (1−WKD) with momentum &amp; fit.</TooltipContent>
              </Tooltip>
            </LabelRow>
            <span className="text-xs" style={{ color: TK.muted }}>
              0–100
            </span>
          </div>
          <ValueRow>
            <span>{d.wos != null ? Math.round(d.wos) : "—"}</span>
          </ValueRow>
          <div className="mt-2">
            <MiniBar value={d.wos ?? 0} />
          </div>
        </ChipBox>

        {/* TM • Trend momentum */}
        <ChipBox>
          <div className="flex items-center justify-between">
            <LabelRow>
              <CardTitle icon={<TrendingUp size={14} color={TK.brand} />}>TM • Trend momentum</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="TM info"
                    className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
                    title="Trend momentum"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Momentum over the selected period.</TooltipContent>
              </Tooltip>
            </LabelRow>
            <span className="text-xs" style={{ color: TK.muted }}>
              −2…+2
            </span>
          </div>
          <ValueRow>
            <TmBadge tm={d.tm} />
          </ValueRow>
        </ChipBox>

        {/* Zero‑click risk (conditional) */}
        {(d.zeroClickRisk === "high" || d.zeroClickRisk === "medium") && (
          <ChipBox noMin>
            <div className="flex items-center justify-between">
              <LabelRow>
                <CardTitle icon={<AlertTriangle size={14} color={TK.brand} />}>Zero‑click risk</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Zero click info"
                      className="text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-[4px] cursor-pointer"
                      title="Zero‑click risk"
                    >
                      <Info size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Featured surfaces likely siphon clicks from blue links.</TooltipContent>
                </Tooltip>
              </LabelRow>
              <span
                className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{
                  border: `1px solid ${TK.borderLight}`,
                  color: zeroClickColor(d.zeroClickRisk as ZeroClick),
                  background: "#FFF",
                }}
              >
                <Dot color={zeroClickColor(d.zeroClickRisk as ZeroClick)} />
                {d.zeroClickRisk === "high" ? "High" : "Medium"}
              </span>
            </div>
            <div className="mt-1 text-xs" style={{ color: TK.muted }}>
              FS/knowledge panels may reduce organic clicks.
            </div>
          </ChipBox>
        )}
      </div>
    </TooltipProvider>
  );
};

/* ───────────────────────── Export helpers ───────────────────────── */
function exportKpiJSON(data: KpiData = {}) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "keyword-kpi-summary.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ───────────────────────── Drop‑in Section Component ───────────────────────── */
type KeywordKpiSummaryProps = {
  mode?: KrMode;
  data?: KpiData;
  className?: string;
  onExport?: () => void;
};

export default function KeywordKpiSummary({
  mode = "domain",
  data,
  className,
  onExport,
}: KeywordKpiSummaryProps) {
  // Mock data (used when `data` prop is not provided)
  const mock: KpiData =
    mode === "domain"
      ? {
          wkd: 62,
          intent: {
            primary: "informational",
            mix: { informational: 0.52, commercial: 0.28, navigational: 0.1, local: 0.1 },
          },
          cpTop3Pct: 21,
          yourRank: 7,
          yourCpPct: 8,
          wos: 68,
          tm: 1.2,
          zeroClickRisk: "medium",
        }
      : {
          wkd: 44,
          intent: {
            primary: "commercial",
            mix: { commercial: 0.45, informational: 0.35, transactional: 0.2 },
          },
          cpTop3Pct: 26,
          wos: 57,
          tm: 0.6,
          zeroClickRisk: "low",
        };

  // Use provided data or fall back to the mock above
  const safe: KpiData = data ?? mock;

  return (
    <div
      className={className}
      style={{ fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui", color: TK.text }}
    >
      <SectionShell title="Keyword KPI Summary" onExport={onExport ?? (() => exportKpiJSON(safe))}>
        <KpiStrip mode={mode} data={safe} />
      </SectionShell>
    </div>
  );
}

