import React, { useMemo, useRef, useState } from "react";
import {
  Info,
  AlertTriangle,
  ArrowRight,
  Link2,
  SlidersHorizontal,
  Download,
} from "lucide-react";

/** ===============================
 *  Section 3 — Link Profile Risk Summary
 *  Backlink Audit → Overview Tab → Section 3
 *  - 100% stacked horizontal bar (flush)
 *  - Rounded ends (6px both sides), no gaps
 *  - Smart popover w/ colored dot annotation
 *  - Hover animation on hovered stack segment
 *  - Legend (no borders)
 *  - Modern chips + Filters button pattern
 *  - Branded (#008CCD) icons for title + CTAs
 *  - Inter / Inter Fallback font
 *  - Export button added in header
 *  - Fully responsive
 *  ================================= */

/** Latest tokens (reads CSS variables from your design system with safe fallbacks) */
const TOKENS = {
  brand: "var(--brand-600, #008CCD)",
  brandHover: "var(--brand-700, #0078B3)",
  text: "var(--text-strong, #0F172A)",
  textMuted: "var(--text-subtle, #64748B)",
  border: "var(--border-soft, #E5E7EB)",
  cardBg: "var(--surface-card, #FFFFFF)",
  chipBg: "var(--chip-bg, #F5F7FA)",
  chipHover: "var(--chip-hover, #EEF2F7)",
  surfaceSoft: "var(--surface-soft, #F8FAFC)",
  focusRing: "var(--focus-ring, rgba(0,140,205,0.35))",
  shadowSm: "var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.08))",
};

/** Keep stacked-bar colors unchanged (as currently used) */
const BAR_COLORS = {
  toxic: "#EF4444", // red
  suspicious: "#F97316", // orange
  safe: "#10B981", // green
  disavowed: "#3B82F6", // blue
  manual: "#CBD5E1", // cool gray (optional segment)
};

type SegmentKey = "toxic" | "suspicious" | "safe" | "disavowed" | "manual";

type RiskCounts = Partial<Record<SegmentKey, number>> & {
  /** Optional override; if omitted we auto-sum all provided counts */
  total?: number;
};

type NavigateTarget = {
  segment: SegmentKey;
  route: string;
  title: string;
};

type Props = {
  /** Counts for each segment. Omit "manual" if not relevant. */
  counts?: RiskCounts;
  /** Segment click → navigation (routes defined below as sensible defaults). */
  onNavigate?: (target: NavigateTarget) => void;
  /** CTA buttons under the bar. */
  onAuditToxic?: () => void;
  onOpenDisavow?: () => void;
  onViewAll?: () => void;
  /** Optional: export action in header */
  onExport?: () => void;
  /** Optional className for outer container. */
  className?: string;
  /** Optional custom title/subtext overrides. */
  title?: string;
  subtext?: string;
};

const LABEL: Record<SegmentKey, string> = {
  toxic: "Toxic",
  suspicious: "Suspicious",
  safe: "Safe",
  disavowed: "Disavowed",
  manual: "Manually Tracked",
};

const DESC: Record<SegmentKey, string> = {
  toxic: "Flagged due to link farms, spam anchors, PBNs, or WR < 20.",
  suspicious: "Weak trust signals, over-optimized anchors, or IP/TLD/geo risk.",
  safe: "Backlinks passed all audit checks.",
  disavowed: "Already added to your disavow list.",
  manual: "Links tracked manually (Health Monitor), not auto-detected.",
};

const DEFAULT_COUNTS: Required<RiskCounts> = {
  toxic: 414,
  suspicious: 723,
  safe: 1321,
  disavowed: 242,
  manual: 0, // set >0 to show the segment
  total: 2700, // if omitted, the component will auto-sum instead
};

const ROUTES: Record<SegmentKey, { route: string; title: string }> = {
  toxic: { route: "audit/backlinks?risk=toxic", title: "Toxic Backlinks" },
  suspicious: { route: "audit/backlinks?risk=suspicious", title: "Suspicious Backlinks" },
  safe: { route: "audit/backlinks?risk=safe", title: "Safe Backlinks" },
  disavowed: { route: "audit/disavow", title: "Disavow Manager" },
  manual: { route: "health/manual", title: "Manually Tracked Links" },
};

const fmtNum = (n: number) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "-";

const fmtPct = (n: number) =>
  `${n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Normalize percents so they sum to exactly 100.0 (1-decimal) */
function normalizePercents(items: { key: SegmentKey; count: number }[]) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (!total) {
    return items.map((i) => ({ key: i.key, count: i.count, percent: 0 }));
  }
  const raw = items.map((i) => (i.count / total) * 100);
  const down = raw.map((p) => Math.floor(p * 10) / 10);
  let remainder = Math.round((100 - down.reduce((s, v) => s + v, 0)) * 10); // in 0.1% ticks
  const fracs = raw.map((p, idx) => ({ idx, frac: p - down[idx] }));
  fracs.sort((a, b) => b.frac - a.frac);
  const adjusted = [...down];
  for (let i = 0; i < fracs.length && remainder > 0; i++) {
    adjusted[fracs[i].idx] = adjusted[fracs[i].idx] + 0.1;
    remainder--;
    if (i === fracs.length - 1 && remainder > 0) i = -1;
  }
  return items.map((it, i) => ({
    key: it.key,
    count: it.count,
    percent: Number(adjusted[i].toFixed(1)),
  }));
}

type HoverState = {
  key: SegmentKey;
  x: number;
  y: number;
};

export default function Section3LinkProfileRiskSummary({
  counts,
  onNavigate,
  onAuditToxic,
  onOpenDisavow,
  onViewAll,
  onExport,
  className,
  title,
  subtext,
}: Props) {
  const merged = { ...DEFAULT_COUNTS, ...(counts ?? {}) };
  const total =
    typeof merged.total === "number" && merged.total > 0
      ? merged.total
      : (["toxic", "suspicious", "safe", "disavowed", "manual"] as SegmentKey[]).reduce(
          (s, k) => s + (merged[k] || 0),
          0
        );

  // Build segment list (hide segments with zero count from the bar, but keep them in legend)
  const segments = useMemo(() => {
    const base: { key: SegmentKey; count: number; color: string; label: string }[] = [
      { key: "toxic", count: merged.toxic || 0, color: BAR_COLORS.toxic, label: LABEL.toxic },
      { key: "suspicious", count: merged.suspicious || 0, color: BAR_COLORS.suspicious, label: LABEL.suspicious },
      { key: "safe", count: merged.safe || 0, color: BAR_COLORS.safe, label: LABEL.safe },
      { key: "disavowed", count: merged.disavowed || 0, color: BAR_COLORS.disavowed, label: LABEL.disavowed },
    ];
    if ((merged.manual || 0) > 0) {
      base.push({ key: "manual", count: merged.manual || 0, color: BAR_COLORS.manual, label: LABEL.manual });
    }
    const forBar = base.filter((s) => s.count > 0);
    const normalized = normalizePercents(forBar);
    return {
      forLegend: base.map((b) => {
        const norm = normalized.find((n) => n.key === b.key);
        const percent = norm ? norm.percent : total ? Number(((b.count / total) * 100).toFixed(1)) : 0;
        return { ...b, percent };
      }),
      forBar: normalized,
    };
  }, [merged.toxic, merged.suspicious, merged.safe, merged.disavowed, merged.manual, total]);

  const barRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const handleSegmentClick = (key: SegmentKey) => {
    const target = ROUTES[key];
    onNavigate?.({ segment: key, route: target.route, title: target.title });
  };

  const lastIdx = segments.forBar.length - 1;

  return (
    <section
      className={["rounded-xl border p-4", className].filter(Boolean).join(" ")}
      style={{
        borderColor: TOKENS.border,
        background: TOKENS.cardBg,
        fontFamily:
          'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
      aria-label="Link Profile Risk Summary"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="inline-flex items-center justify-center rounded-md">
              <Link2 size={18} color={TOKENS.brand as string} />
            </span>
            <h3 className="truncate text-[18px] font-bold" style={{ color: TOKENS.text }}>
              {title ?? "Link Profile Risk Summary"}
            </h3>
            <button
              type="button"
              className="ml-1 inline-flex cursor-pointer items-center"
              title="Distribution of backlinks by risk category"
              aria-label="About this section"
            >
              <Info size={16} color={TOKENS.brand as string} />
            </button>
          </div>
          <p className="mt-1 text-[13px]" style={{ color: TOKENS.textMuted }}>
            {subtext ?? `Based on ${fmtNum(total)} total backlinks`}
          </p>
        </div>

        {/* Header Actions: Filters + Export */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={{ background: TOKENS.chipBg, color: TOKENS.text }}
            title="Open filters"
          >
            <SlidersHorizontal size={16} color={TOKENS.brand as string} />
            Filters
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={{ background: TOKENS.chipBg, color: TOKENS.text }}
            title="Export data"
          >
            <Download size={16} color={TOKENS.brand as string} />
            Export
          </button>
        </div>
      </div>

      {/* 100% Stacked Horizontal Bar */}
      <div ref={barRef} className="relative w-full" onMouseLeave={() => setHover(null)}>
        <div
          className="flex h-[32px] w-full overflow-hidden"
          style={{
            borderRadius: 6, // wrapper rounding (also round segments themselves)
          }}
          aria-hidden
        >
          {segments.forBar.map((seg, i) => {
            const key = seg.key;
            const color = (BAR_COLORS as any)[key] as string;
            const isFirst = i === 0;
            const isLast = i === lastIdx;
            const isHovered = hover?.key === key;

            const radiusStyle: React.CSSProperties = {
              borderTopLeftRadius: isFirst ? 6 : 0,
              borderBottomLeftRadius: isFirst ? 6 : 0,
              borderTopRightRadius: isLast ? 6 : 0,
              borderBottomRightRadius: isLast ? 6 : 0,
            };

            return (
              <button
                key={key}
                type="button"
                className="group h-full cursor-pointer outline-none focus-visible:ring-2"
                style={{
                  width: `${seg.percent}%`,
                  background: color,
                  ...radiusStyle,
                  transition: "transform 160ms ease, filter 160ms ease",
                  transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                  filter: isHovered ? "brightness(1.05)" : "none",
                }}
                aria-label={`${LABEL[key]}: ${fmtNum(seg.count)} (${fmtPct(seg.percent)}) — ${DESC[key]}`}
                title={`${LABEL[key]}: ${fmtNum(seg.count)} (${fmtPct(seg.percent)})`}
                onClick={() => handleSegmentClick(key)}
                onMouseMove={(e) => {
                  const rect = barRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHover({
                    key,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseEnter={(e) => {
                  const rect = barRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHover({
                    key,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSegmentClick(key);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Smart Popover (tooltip) with colored dot annotation */}
        {hover &&
          (() => {
            const seg = segments.forLegend.find((s) => s.key === hover.key)!;
            const label = LABEL[seg.key];
            const pct = fmtPct(seg.percent);
            const count = fmtNum(seg.count);
            const color = (BAR_COLORS as any)[seg.key] as string;

            // Positioning: keep tooltip inside container bounds
            const PADDING = 8;
            const CARD_W = 260;
            const CARD_H = 104;
            const bx = hover.x;
            const by = hover.y;
            let left = bx + 12;
            let top = by + 12;
            const rect = barRef.current?.getBoundingClientRect();
            if (rect) {
              if (left + CARD_W > rect.width - PADDING) left = rect.width - CARD_W - PADDING;
              if (top + CARD_H > rect.height + 120) top = rect.height + 120 - CARD_H;
            }

            const ctaLabel =
              hover.key === "toxic"
                ? "Audit Toxic Links"
                : hover.key === "suspicious"
                ? "Investigate"
                : hover.key === "safe"
                ? "View All Safe"
                : hover.key === "disavowed"
                ? "Review Disavow"
                : "View Links";

            return (
              <div
                className="pointer-events-none absolute z-10 w-[260px] rounded-lg border bg-white p-3"
                style={{
                  left,
                  top,
                  borderColor: TOKENS.border,
                  boxShadow: TOKENS.shadowSm as string,
                }}
                role="tooltip"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* colored dot annotation */}
                    <span
                      aria-hidden
                      className="inline-block h-[10px] w-[10px] rounded-full"
                      style={{ background: color }}
                    />
                    <div className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
                      {label}
                    </div>
                  </div>
                  <span className="ml-2 text-[12px]" style={{ color: TOKENS.textMuted }}>
                    {pct}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px]" style={{ color: TOKENS.textMuted }}>
                  {count} backlinks — {DESC[seg.key]}
                </div>
                <div className="mt-2">
                  <span
                    className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium transition-colors"
                    style={{
                      background: TOKENS.chipBg,
                      color: TOKENS.text,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSegmentClick(seg.key);
                    }}
                  >
                    <ArrowRight size={14} color={TOKENS.brand as string} />
                    {ctaLabel}
                  </span>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Legend — no borders */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {segments.forLegend.map((s) => (
          <button
            key={s.key}
            type="button"
            className="flex items-center justify-start gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:opacity-90"
            style={{ background: TOKENS.surfaceSoft, color: TOKENS.text }}
            onClick={() => handleSegmentClick(s.key)}
            title={`View ${LABEL[s.key]} links`}
          >
            <span
              aria-hidden
              className="inline-block h-[10px] w-[10px] rounded-full"
              style={{ background: (BAR_COLORS as any)[s.key] as string }}
            />
            <span className="text-[13px] font-medium">{LABEL[s.key]}</span>
            <span className="ml-auto text-[12px]" style={{ color: TOKENS.textMuted }}>
              {fmtNum(s.count)} · {fmtPct(s.percent)}
            </span>
          </button>
        ))}
      </div>

      {/* Smart suggestion (kept) — no emoji */}
      {(() => {
        const risky = (merged.toxic || 0) + (merged.suspicious || 0);
        const riskyPct = total ? (risky / total) * 100 : 0;
        if (riskyPct >= 40) {
          return (
            <div
              className="mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px]"
              style={{ background: "#FFF7ED", color: "#9A3412", border: "1px solid #FED7AA" }}
            >
              <AlertTriangle size={16} />
              <span>{`Over ${Math.round(riskyPct)}% of your profile is risky. Consider cleanup.`}</span>
            </div>
          );
        }
        return null;
      })()}

      {/* CTA Row — modern chips with branded icons */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (onAuditToxic ? onAuditToxic() : handleSegmentClick("toxic"))}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{ background: TOKENS.chipBg, color: TOKENS.text }}
          title="Open table filtered to Toxic links"
        >
          <ArrowRight size={16} color={TOKENS.brand as string} />
          Audit Toxic Links
        </button>
        <button
          type="button"
          onClick={() => (onOpenDisavow ? onOpenDisavow() : handleSegmentClick("disavowed"))}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{ background: TOKENS.chipBg, color: TOKENS.text }}
          title="Open Disavow Manager"
        >
          <ArrowRight size={16} color={TOKENS.brand as string} />
          Open Disavow Queue
        </button>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{ background: TOKENS.chipBg, color: TOKENS.text }}
          title="View all backlinks"
        >
          <ArrowRight size={16} color={TOKENS.brand as string} />
          View All Backlinks
        </button>
      </div>
    </section>
  );
}

/** Named export for convenience */
export { Section3LinkProfileRiskSummary as RiskSummaryBarSection };
