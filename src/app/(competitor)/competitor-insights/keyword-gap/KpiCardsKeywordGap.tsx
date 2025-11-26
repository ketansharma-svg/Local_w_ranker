import React from "react";

/** —————————————————————————————————————————————
 * Types
 * ————————————————————————————————————————————— */
type CompetitorBreakdown = { domain: string; count: number };

type KpiData = {
  missedKeywords: {
    total: number;
    breakdown?: CompetitorBreakdown[]; // show top 1–2 competitors
  };
  quickWins: {
    total: number; // KD < 35
    avgVolume?: number;
  };
  highVolumeGaps: {
    count: number; // volume > 1,000
    topCompetitorAvgRank?: number; // optional display
  };
  intentBreakdown: {
    informational?: number;  // fractions (0–1) preferred; raw counts also OK
    commercial?: number;
    transactional?: number;
    navigational?: number;
  };
};

type FilterChip =
  | { type: "competitor"; value: "all" | string }
  | { type: "difficulty"; value: "low" | "medium" | "high" }
  | { type: "volume"; op: "gte" | "range"; value: number | [number, number] }
  | {
      type: "intent";
      value: "Informational" | "Commercial" | "Transactional" | "Navigational";
    };

type Props = {
  /** Data for the four KPI cards. If omitted, demo data is used. */
  data?: KpiData;
  /** Called when a CTA is clicked so you can apply chips & scroll the table. */
  onApply?: (chips: FilterChip[], scrollTo?: "table" | "chart") => void;
  className?: string;
};

/** —————————————————————————————————————————————
 * Helpers
 * ————————————————————————————————————————————— */
const k = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`;
const moneyK = (n?: number) => (n == null ? "" : `${k(n)}/mo`);
const fmt = (n: number) => new Intl.NumberFormat().format(n);

/** Interprets either a fraction (0–1) or an absolute count with total=1 */
function percentLabel(value?: number, assumeFraction = true) {
  if (value == null) return "—";
  const p = assumeFraction ? value * 100 : value;
  return `${Math.round(p)}%`;
}

const InfoLine: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between text-sm">
    <span className="text-slate-600">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

/** —————————————————————————————————————————————
 * Component
 * ————————————————————————————————————————————— */
export const KpiCardsKeywordGap: React.FC<Props> = ({
  data,
  onApply,
  className,
}) => {
  // Demo data if none provided
  const d: KpiData =
    data ??
    ({
      missedKeywords: {
        total: 2384,
        breakdown: [
          { domain: "competitor1.com", count: 1740 },
          { domain: "competitor2.com", count: 1020 },
        ],
      },
      quickWins: { total: 486, avgVolume: 880 },
      highVolumeGaps: { count: 612, topCompetitorAvgRank: 6.3 },
      intentBreakdown: { informational: 0.62, commercial: 0.24, transactional: 0.14 },
    } as KpiData);

  // Determine dominant intent
  const intents = {
    Informational: d.intentBreakdown.informational ?? 0,
    Commercial: d.intentBreakdown.commercial ?? 0,
    Transactional: d.intentBreakdown.transactional ?? 0,
    Navigational: d.intentBreakdown.navigational ?? 0,
  };
  const topIntentEntry = Object.entries(intents).sort((a, b) => b[1] - a[1])[0];

  const Cta: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
  }> = ({ onClick, children, title }) => (
    <button
      type="button"
      className="mt-1 inline-flex items-center gap-1 text-[#1090D0] text-sm font-medium hover:underline focus:underline"
      onClick={onClick}
      title={title}
    >
      {children}
      <span aria-hidden>→</span>
    </button>
  );

  const Card: React.FC<{
    icon: string;
    title: string;
    tooltip?: string;
    children: React.ReactNode;
  }> = ({ icon, title, tooltip, children }) => (
    <div
      className="min-w-[250px] rounded-xl border border-[#D2EFFF] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      role="region"
      aria-label={title}
      title={tooltip}
    >
      <div className="mb-2 flex items-center gap-2 text-slate-800">
        <span className="text-xl leading-none">{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );

  return (
    <section className={["w-full", className].filter(Boolean).join(" ")}>
      {/* 4-card responsive grid (wraps on tablet/mobile) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 w-full mt-2">
        {/* 1) ❌ Missed Keywords */}
        <Card
          icon="❌"
          title="Missed Keywords"
          tooltip="Keywords competitors rank for but your project does not."
        >
          <InfoLine label="Total" value={fmt(d.missedKeywords.total)} />
          {d.missedKeywords.breakdown?.slice(0, 2).map((b) => (
            <InfoLine key={b.domain} label={b.domain} value={fmt(b.count)} />
          ))}

          <Cta
            title="Open table filtered to all competitors"
            onClick={() =>
              onApply?.([{ type: "competitor", value: "all" }], "table") ??
              console.log("[CTA] View in Table → competitor:all")
            }
          >
            View in Table
          </Cta>
        </Card>

        {/* 2) ⚡ Quick Wins (KD < 35) */}
        <Card icon="⚡" title="Quick Wins" tooltip="Low KD = difficulty < 35.">
          <InfoLine label="Low Difficulty" value={fmt(d.quickWins.total)} />
          {d.quickWins.avgVolume != null && (
            <InfoLine label="Avg. Volume" value={moneyK(d.quickWins.avgVolume)} />
          )}

          <Cta
            title="Filter to Difficulty: Low + sensible volume"
            onClick={() =>
              onApply?.(
                [
                  { type: "difficulty", value: "low" },
                  { type: "volume", op: "gte", value: 100 }, // tweak threshold if you prefer
                ],
                "table"
              ) ?? console.log("[CTA] Show Quick Wins → KD<35 & vol>=100")
            }
          >
            Show Quick Wins
          </Cta>
        </Card>

        {/* 3) 📈 High Volume Gaps */}
        <Card
          icon="📈"
          title="High Volume Gaps"
          tooltip="Missed keywords with search volume > 1,000/mo."
        >
          <InfoLine label="Volume > 1,000" value={fmt(d.highVolumeGaps.count)} />
          {d.highVolumeGaps.topCompetitorAvgRank != null && (
            <InfoLine
              label="Top Competitor Avg Rank"
              value={`#${d.highVolumeGaps.topCompetitorAvgRank}`}
            />
          )}

          <Cta
            title="Filter to volume ≥ 1,000"
            onClick={() =>
              onApply?.([{ type: "volume", op: "gte", value: 1000 }], "table") ??
              console.log("[CTA] Prioritize These → vol>=1000")
            }
          >
            Prioritize These
          </Cta>
        </Card>

        {/* 4) 🧭 Intent Breakdown (Dominant Intent) */}
        <Card
          icon="🧭"
          title="Dominant Intent"
          tooltip="Distribution of missed keywords by search intent."
        >
          <InfoLine
            label={topIntentEntry?.[0] ?? "—"}
            value={percentLabel(topIntentEntry?.[1] ?? 0, true)}
          />

          {/* Small grid of all intents */}
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-600">Informational</span>
            <span className="text-right font-semibold text-slate-900">
              {percentLabel(d.intentBreakdown.informational, true)}
            </span>
            <span className="text-slate-600">Commercial</span>
            <span className="text-right font-semibold text-slate-900">
              {percentLabel(d.intentBreakdown.commercial, true)}
            </span>
            <span className="text-slate-600">Transactional</span>
            <span className="text-right font-semibold text-slate-900">
              {percentLabel(d.intentBreakdown.transactional, true)}
            </span>
            {d.intentBreakdown.navigational != null && (
              <>
                <span className="text-slate-600">Navigational</span>
                <span className="text-right font-semibold text-slate-900">
                  {percentLabel(d.intentBreakdown.navigational, true)}
                </span>
              </>
            )}
          </div>

          <Cta
            title={`Filter by top intent: ${topIntentEntry?.[0] ?? ""}`}
            onClick={() =>
              onApply?.(
                [
                  {
                    type: "intent",
                    value: (topIntentEntry?.[0] as any) ?? "Informational",
                  },
                ],
                "table"
              ) ?? console.log("[CTA] Filter by Intent →", topIntentEntry?.[0])
            }
          >
            Filter by Intent
          </Cta>
        </Card>
      </div>
    </section>
  );
};

/** —————————————————————————————————————————————
 * Optional Demo Wrapper (remove if not needed)
 * ————————————————————————————————————————————— */
export const DemoKeywordGapKpis: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        KPI Summary – Keyword Gap Analyzer
      </h2>

      <KpiCardsKeywordGap
        onApply={(chips, where) => {
          // Wire these to your table filters and smooth-scroll to the table.
          // For the demo we just log them:
          // eslint-disable-next-line no-console
          console.log("Apply filters:", chips, "→ Scroll to:", where);
        }}
      />
    </div>
  );
};
export default KpiCardsKeywordGap;